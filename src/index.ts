import { Context, Dict, Logger, Session } from 'koishi'
import { Config } from './config'
import { MemoryDict } from './memory'
import { getBasePrompts, getReply, getSummary, getTopic } from './prompt'

export * from './config'
export const reactive = true
export const name = '@tomlbz/openai'

const logger = new Logger('@tomlbz/openai')
const memory = new MemoryDict(0, 0, 0)
memory.loadMemory()
let textUpdates = 0

function getReplyCondition(session: Session, config: Config){
  if (session.subtype === 'group') { // 群聊
    if (session.parsed.appel) return 1 // @bot
    if (session.content.includes(config.botname)) return 2 // 包含botname
    if (Math.random() < config.randomReplyFrequency) return 3 // 随机回复
    return 0 // 不回复
  } else {
    return 4 // 私聊
  }
}

function onFirstMemory(mem: MemoryDict, uid: string, username: string, sampleDialog: Dict<string, string>){
  for (let key in sampleDialog) {
    mem.updateTextMemory(uid, `${username}：${key}\n我：${sampleDialog[key]}`)
  }
  textUpdates = mem.getTextMemory(uid).length
}

export function apply(ctx: Context, config: Config) {
  ctx.middleware(async (session, next) => {
    const islog = true // logging mode produces logs for all prompts
    const isdebug = false // debugging mode does not call openai API
    if (ctx.bots[session.uid]) return // ignore bots from self
    const condition = getReplyCondition(session, config)
    if (condition === 0) return next() // 不回复
    const input = session.content.replace(/<[^>]*>/g, '') // 去除XML元素
    if ( input === '' ) return next() // ignore empty message
    if (islog) logger.info(`condition ${condition} met, replying`)
    // get info from session
    const uid = session.uid
    const botname = config.botname
    const username = session.username
    const botIdentity = config.botIdentity
    const textMemLen = config.textMemoryLength
    const summaryMemLen = config.summaryMemoryLength
    const topicMemLen = config.topicMemoryLength
    // update memory lengths
    memory.updateLengths(textMemLen, summaryMemLen, topicMemLen)
    // create memory for user if not exists
    if (memory.createMemory(session.uid)){
      if (islog) logger.info(`created memory for ${session.uid}`)
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
        if (islog) logger.info(`topic prompt:\n${topic}\n`)
        memory.updateTopicMemory(uid, isdebug ? input : topic)
      }
      const summary = await getSummary(bprompt, username, config, isdebug)
      if (islog) logger.info(`summary prompt:\n${summary}\n`)
      memory.updateSummaryMemory(uid, isdebug ? input : summary)
      textUpdates = 0
    }
    const reply = await getReply(bprompt, username, input, config, isdebug)
    if (islog) logger.info(`reply prompt:\n${reply}\n`)
    const replyText = isdebug ? input : `${username}：${input}\n我：${reply}`
    memory.updateTextMemory(uid, replyText)
    textUpdates++
    if (issave) memory.saveMemory()
    const memshape = `${JSON.stringify(memory.getTextMemory(uid))}\n${JSON.stringify(memory.getSummaryMemory(uid))}\n${JSON.stringify(memory.getTopicMemory(uid))}`
    return isdebug ? memshape : reply
  })
}
