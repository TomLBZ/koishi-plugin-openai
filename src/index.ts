import { Context, Logger } from 'koishi'
import { Config } from './config'
import { Eye } from './eye'
import { Soul } from './soul'
import { AI } from './ai'
import { Cache } from './cache'

export * from './config'
export const reactive = true
export const name = '@tomlbz/openai'

// global variables
const logger = new Logger('@tomlbz/openai')
const ai: AI = new AI()
const soul: Soul = new Soul()
const eye: Eye = new Eye()
const cache: Cache = new Cache()

export function apply(ctx: Context, config: Config) {
  ctx.on('ready', async () => {
    const bai = await ai.init(config)
    const bsoul = await soul.init(config)
    const beye = eye.init(config, ctx.root.config.nickname)
    const bcache = cache.init(config)
    if (config.isLog) logger.info(`Initialization: AI(${bai ? '√' : 'X'}) Soul(${bsoul ? '√' : 'X'}) Eye(${beye ? '√' : 'X'}) Cache(${bcache ? '√' : 'X'})`)
  })
  ctx.middleware(async (session, next) => {
    const input = eye.readInput(ctx, session)
    if (!input) return next()
    if (!cache.get(session.username)) { // if empty cache, fill it with sample prompts
      const sampleprompts = eye.samplePrompt(session.username)
      sampleprompts.forEach(p => cache.push(session.username, p))
    }
    const iembeddings = await ai.embed(input)
    const ikeywords = await ai.chat(eye.keywordPrompt(input, session.username))
    const imetadata = eye.getMetadata(input, ikeywords, session.username)
    const irelated = await soul.recallNext(iembeddings, imetadata) // get related messages
    await soul.remember(iembeddings, imetadata) // save current message to vector database
    const pask = eye.askPrompt(input, session.username, irelated, cache.get(session.username))
    cache.push(session.username, eye.userPrompt(input, session.username)) // save original input to cache
    const rask = await ai.chat(pask)
    cache.push(session.username, rask) // save reply to cache
    const rasktext = rask['content']
    const rtembeddings = await ai.embed(rasktext)
    const rtkeywords = await ai.chat(eye.keywordPrompt(rasktext, session.username))
    const rtmetadata = eye.getMetadata(rasktext, rtkeywords, config.botName) // config.botName
    await soul.remember(rtembeddings, rtmetadata) // save reply to vector database
    return eye.devPrint([JSON.stringify(cache.get(session.username))])
  })
}
