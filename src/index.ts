import { Context, Dict, Logger, Session } from 'koishi'
import { Config } from './config'
import { MemoryDict } from './memory'
import { getBasePrompts, getReply, getSummary, getTopic } from './prompt'
import { Eye } from './eye'
import { Soul } from './soul'
import { AI } from './ai'

export * from './config'
export const reactive = true
export const name = '@tomlbz/openai'

const logger = new Logger('@tomlbz/openai')
const memory = new MemoryDict(0, 0, 0)
memory.loadMemory()
let textUpdates = 0
// global variables
let eye: Eye = null
let soul: Soul = null
let ai: AI = null

function onFirstMemory(mem: MemoryDict, uid: string, username: string, sampleDialog: Dict<string, string>){
  for (let key in sampleDialog) {
    mem.updateTextMemory(uid, `${username}：${key}\n我：${sampleDialog[key]}`)
  }
  textUpdates = mem.getTextMemory(uid).length
}

export function apply(ctx: Context, config: Config) {
  ctx.on('ready', async () => {
    ai = await AI.create(config)
    soul = await Soul.create(config)
    eye = Eye.create(config, ctx.root.config.nickname)
  })
  ctx.on('dispose', async () => {
    ai = null
    soul = null
    eye = null
  })
  ctx.middleware(async (session, next) => {
    ai.update(config)
    soul.update(config)
    eye.update(config)
    if (config.isLog) logger.info('Updated config.')
    const isdebug = true // debugging mode does not call openai API
    const input = eye.readInput(ctx, session)
    if (!input) return next()
    const ppt = eye.keywordPrompt(input, session.username)
    const keywords = await ai.chat(ppt)
    const metadata = eye.getMetadata(input, keywords, session.username)
    const embeddings = await ai.embed(input)
    await soul.remember(embeddings, metadata) // save to database
    const related = await soul.think(embeddings, metadata) // get related metadata
    return eye.devPrint(related)
    // get info from session
    const uid = session.uid
    const botname = config.botName
    const username = session.username
    const botIdentity = config.botIdentity
    const textMemLen = config.textMemoryLength
    const summaryMemLen = config.summaryMemoryLength
    const topicMemLen = config.topicMemoryLength
    // update memory lengths
    memory.updateLengths(textMemLen, summaryMemLen, topicMemLen)
    // create memory for user if not exists
    if (memory.createMemory(session.uid)){
      if (config.isLog) logger.info(`created memory for ${session.uid}`)
      onFirstMemory(memory, uid, username, config.sampleDialog)
    }
    // get base prompts before any updates from the memory
    const bprompt = getBasePrompts(uid, username, botname, botIdentity, memory)
    let issave = false // memory saves itself when issave is true
    // if text mem is full, make a summary every textMemLen updates
    if (textUpdates >= textMemLen) {
      // if summary mem is full, make a topic from [0] every time
      const summem = memory.getSummaryMemory(uid)
      if (summem.length >= summaryMemLen) {
        issave = true
        const topic = await getTopic(bprompt, username, summem[0], config, isdebug)
        if (config.isLog) logger.info(`topic prompt:\n${topic}\n`)
        memory.updateTopicMemory(uid, isdebug ? input : topic)
      }
      const summary = await getSummary(bprompt, username, config, isdebug)
      if (config.isLog) logger.info(`summary prompt:\n${summary}\n`)
      memory.updateSummaryMemory(uid, isdebug ? input : summary)
      textUpdates = 0
    }
    const reply = await getReply(bprompt, username, input, config, isdebug)
    if (config.isLog) logger.info(`reply prompt:\n${reply}\n`)
    const replyText = isdebug ? input : `${username}：${input}\n我：${reply}`
    memory.updateTextMemory(uid, replyText)
    textUpdates++
    if (issave) memory.saveMemory()
    const memshape = `${JSON.stringify(memory.getTextMemory(uid))}\n${JSON.stringify(memory.getSummaryMemory(uid))}\n${JSON.stringify(memory.getTopicMemory(uid))}`
    return isdebug ? memshape : reply
  })
}
