"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apply = exports.Config = exports.name = void 0;
const koishi_1 = require("koishi");
const openai_1 = require("openai");
exports.name = 'koishi-plugin-openai';
exports.Config = koishi_1.Schema.object({
    botname: koishi_1.Schema.string().description("机器人的名字\nName of the bot").default('半灵').required(),
    apikey: koishi_1.Schema.string().role('secret').description("OpenAI 的 API Key\nThe API Key for OpenAI").required(),
    language: koishi_1.Schema.union(['zh', 'en']).description("机器人的语言\nLanguage of the bot").default('zh').required(),
    model: koishi_1.Schema.string().description("机器人的模型\nModel of the bot").default('text-davinci-002').required(),
    ntokens: koishi_1.Schema.number().max(256).min(16).description("机器人的回复长度\nLength of the bot's reply").default(64).required(),
    nreplies: koishi_1.Schema.number().max(5).min(1).description("机器人的回复数量\nNumber of the bot's reply").default(1).required(),
    temperature: koishi_1.Schema.number().max(1).min(0).description("机器人的回复温度，越高越随机\nTemperature of the bot's reply. The higher the temperature, the more random the reply.").default(0.9).required(),
    presencePenalty: koishi_1.Schema.number().max(2).min(-2).description("机器人的重复惩罚，越高越不重复已出现的语料\nPresence penalty of the bot's reply. The higher the penalty, the less likely the bot repeats tokens that has appeared so far.").default(0.6).required(),
    frequencyPenalty: koishi_1.Schema.number().max(2).min(-2).description("机器人的频率惩罚，越高越不频繁已回答的语句\nFrequency penalty of the bot's reply. The higher the penalty, the less likely the bot repeats the same line as reply.").default(0).required(),
});
function generatePrompt(str, config) {
    if (config.language === 'zh') {
        return `下面是人类与“${config.botname}”的对话。“${config.botname}”是热心、聪明、有创意、友好、阳光、可爱的式神。
人类: “你是谁？”
“${config.botname}”: 我是“${config.botname}”，是一个可爱的式神。(●'◡'●)
人类: “${str}”
“${config.botname}”:`;
    }
    else if (config.language === 'en') {
        return `This is a conversation between a Human and "${config.botname}". "${config.botname}" is a kind, smart, creative, friendly, positive, and cute Shikigami.
Human: "Who are you?"
"${config.botname}": I am "${config.botname}", a cute Shikigami. (●'◡'●)
Human: "${str}"
"${config.botname}":`;
    }
}
function apply(ctx, config) {
    // write your plugin here
    ctx.middleware(async (session, next) => {
        if (ctx.bots[session.uid])
            return; // ignore bots from self
        if (session.parsed.appel) {
            const configuration = new openai_1.Configuration({
                apiKey: config.apikey,
            });
            const openai = new openai_1.OpenAIApi(configuration);
            const completion = await openai.createCompletion({
                model: config.model,
                prompt: generatePrompt(session.content, config),
                max_tokens: config.ntokens,
                temperature: config.temperature,
                presence_penalty: config.presencePenalty,
                frequency_penalty: config.frequencyPenalty,
                n: config.nreplies,
                user: config.botname
            });
            return completion.data.choices[0].text;
        }
        return next();
    });
}
exports.apply = apply;
