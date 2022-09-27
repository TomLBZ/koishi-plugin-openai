import { Context, Schema } from 'koishi'
import { Configuration, OpenAIApi} from "openai";

export const name = 'koishi-plugin-openai'

export interface Config {
  apikey: string;
  botname: string;
  language: string;
}

export const Config: Schema<Config> = Schema.object({
  botname: Schema.string().default('幽梦'),
  apikey: Schema.string().required(),
  language: Schema.string().default('zh'),
})

function generatePrompt(str: string, config: Config) {
  if (config.language === 'zh') {
    return `下面是人类与${config.botname}的对话。${config.botname}是热心、聪明、有创意、友好、阳光、可爱的式神。
人类: 你是谁？
${config.botname}: 我是${config.botname}，是一个可爱的式神。(●'◡'●)
人类: ${str}
${config.botname}:`;
  } else if (config.language === 'en') {
    return `This is a conversation between a Human and ${config.botname}. ${config.botname} is a kind, smart, creative, friendly, positive, and cute Shikigami.
Human: Who are you?
${config.botname}: I am ${config.botname}, a cute Shikigami. (●'◡'●)
Human: ${str}
${config.botname}:`;
  }
}

export function apply(ctx: Context, config: Config) {
  // write your plugin here
  ctx.middleware(async (session, next) => {
    if (ctx.bots[session.uid]) return // ignore bots from self
    const configuration = new Configuration({
      apiKey: config.apikey,
    });
    const openai = new OpenAIApi(configuration);
    const completion = await openai.createCompletion({
      model: "text-davinci-002",
      prompt: generatePrompt(session.content, config),
      max_tokens: 64,
      temperature: 0.9,
      top_p: 1,
      presence_penalty: 0.7,
      frequency_penalty: 1.4,
      best_of: 1,
      n: 1,
      stream: false,
      stop: ["\\"],
      user: "yuumu"
    });
    if (session.parsed.appel) {
      return completion.data.choices[0].text;
    }
    return next()
  })
}
