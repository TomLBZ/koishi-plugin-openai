import { Context, Schema, Session } from 'koishi';
import { Configuration, OpenAIApi} from "openai";

export const name = 'openai';

export interface Config {
  apikey: string;
  botname: string;
  model: string;
  ntokens: number;
  temperature: number;
  presencePenalty: number;
  frequencyPenalty: number;
  randomReplyFrequency: number;
  botIdentitySettings: string;
  botMoePoint: string;
  memoryShortLength: number;
  memoryLongLength: number;
}

export const Config: Schema<Config> = Schema.object({
  botname: Schema.string().description("机器人的名字").default('半灵').required(),
  apikey: Schema.string().role('secret').description("OpenAI 的 API Key").required(),
  model: Schema.string().description("机器人的模型").default('text-davinci-002').required(),
  ntokens: Schema.number().max(256).min(16).description("机器人的最大回复长度").default(64).required(),
  temperature: Schema.number().max(1).min(0).description("机器人的回复温度，越高越随机").default(0.9).required(),
  presencePenalty: Schema.number().max(2).min(-2).description("机器人的重复惩罚，越高越不易重复已出现的符号").default(0.6).required(),
  frequencyPenalty: Schema.number().max(2).min(-2).description("机器人的频率惩罚，越高越不易重复已回答的语句").default(0).required(),
  randomReplyFrequency: Schema.number().max(1).min(0).description("机器人未被直接呼叫（未被@、未被直呼其名）时的随机回复概率").default(0.1).required(),
  botIdentitySettings: Schema.string().description("机器人的人设").default('聪明、友好、学识渊博的式神，外表是可爱的银发少女，梦想是成为世界最强').required(),
  botMoePoint: Schema.string().description("机器人说话时的萌点").default('会在句尾使用颜文字').required(),
  memoryShortLength: Schema.number().max(16).min(2).description("机器人的短期记忆（位于内存中）长度").default(4).required(),
  memoryLongLength: Schema.number().max(256).min(2).description("机器人的长期记忆（位于数据库中，目前未实现）长度").default(16).required(),
});

const conversation = new Map<string, Map<string, string>>();

function generatePrompt(userId: string, str: string, config: Config) {
  const map = conversation.get(userId);
  let prompt = `下面是人类与${config.botname}的对话。${config.botname}是${config.botIdentitySettings}。说话时，${config.botname}${config.botMoePoint}。\n`;
  map.forEach((value, key) => {
    prompt += `人类：${key}\n${config.botname}：${value}\n`;
  });
  prompt += `人类：${str}\n${config.botname}：`;
  return prompt;
}

async function getOpenAIReply(session: Session, config: Config) {
  const configuration = new Configuration({
    apiKey: config.apikey,
  });
  const openai = new OpenAIApi(configuration);
  const completion = await openai.createCompletion({
    model: config.model,
    prompt: generatePrompt(session.uid, session.content, config),
    max_tokens: config.ntokens,
    temperature: config.temperature,
    presence_penalty: config.presencePenalty,
    frequency_penalty: config.frequencyPenalty,
    stop: ["人类："],
    user: config.botname
  });
  return completion.data.choices[0].text;
}

function getReplyCondition(session: Session, config: Config){
  if (session.subtype === 'group') {
    if (session.parsed.appel || session.content.includes(config.botname)){
      return true;
    } else if (Math.random() < config.randomReplyFrequency){
      return true;
    }
    return false;
  } else {
    return true;
  }
}

export function apply(ctx: Context, config: Config) {
  // write your plugin here
  ctx.middleware(async (session, next) => {
    if (ctx.bots[session.uid]) return // ignore bots from self
    if (getReplyCondition(session, config)) {
      if (!conversation.has(session.uid)) {
        conversation.set(session.uid, new Map<string, string>());
      }
      const reply = await getOpenAIReply(session, config);
      const conv = conversation.get(session.uid);
      while (conv.size >= config.memoryShortLength) {
        conv.delete(conv.keys().next().value);
      } // remove the oldest messages
      conv.set(session.content, reply);
      session.send(reply);
    }
    return next();
  })
}
