import { MemoryDict } from './memory'
import { Configuration, OpenAIApi} from "openai"
import { Config } from './config'

export function getBasePrompts(uid: string, username: string, botname: string, botIdentity: string, memory: MemoryDict) {
    const aboutme = `#关于我：\n我叫${botname}，我的主人叫${username}。${botIdentity}\n`
    const textMemory = memory.getTextMemory(uid)
    const summaryMemory = memory.getSummaryMemory(uid)
    const topicMemory = memory.getTopicMemory(uid)
    let topics = '刚认识不久，还没有话题'
    if (topicMemory.length > 0) {
        topics = topicMemory.join('、')
    }
    topics = `#我和${username}以前聊过的话题：\n${topics}\n`
    let summaries = '刚开始聊天，还没有总结'
    if (summaryMemory.length > 0) {
        summaries = summaryMemory.join('\n')
    }
    summaries = `#我和${username}最近的聊天总结：\n${summaries}\n`
    let texts = textMemory.join('\n');
    texts = `#我和${username}的对话:\n${texts}`
    return [aboutme, topics, summaries, texts]
}

export async function getReply(bprompts: string[], username: string, input: string, config: Config, isdebug: boolean) {
    const prompt = `${bprompts.join('')}\n${username}：${input}\n我：`
    if (isdebug) return prompt
    const configuration = new Configuration({
      apiKey: config.apikey,
    })
    const openai = new OpenAIApi(configuration)
    const completion = await openai.createCompletion({
      model: config.model,
      prompt: prompt,
      max_tokens: config.ntokens,
      temperature: config.temperature,
      presence_penalty: config.presencePenalty,
      frequency_penalty: config.frequencyPenalty,
      stop: [`\n${username}：`],
      user: config.botname
    })
    return completion.data.choices[0].text.trim()
}

export async function getSummary(bprompts: string[], username: string, config: Config, isdebug: boolean) {
    const prompt = `${bprompts[0]}${bprompts[3]}\n#用一段话总结我和${username}的对话\n`
    if (isdebug) return prompt
    const configuration = new Configuration({
      apiKey: config.apikey,
    })
    const openai = new OpenAIApi(configuration)
    const completion = await openai.createCompletion({
      model: config.model,
      prompt: prompt,
      max_tokens: config.ntokens,
      temperature: config.temperature,
      presence_penalty: config.presencePenalty,
      frequency_penalty: config.frequencyPenalty,
      user: config.botname
    })
    return completion.data.choices[0].text.trim()
}

export async function getTopic(bprompts: string[], username: string, summary: string, config: Config, isdebug: boolean) {
    const prompt = `${bprompts[0]}#用一段话总结我和${username}的对话\n${summary}\n#找出上一句话的三个主题词，例如：太阳、月亮、星星\n`
    if (isdebug) return prompt
    const configuration = new Configuration({
      apiKey: config.apikey,
    })
    const openai = new OpenAIApi(configuration)
    const completion = await openai.createCompletion({
      model: config.model,
      prompt: prompt,
      max_tokens: config.ntokens,
      temperature: config.temperature,
      presence_penalty: config.presencePenalty,
      frequency_penalty: config.frequencyPenalty,
      user: config.botname
    })
    return completion.data.choices[0].text.trim()
}