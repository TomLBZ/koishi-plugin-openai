"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apply = exports.Config = exports.name = void 0;
const koishi_1 = require("koishi");
const openai_1 = require("openai");
exports.name = '@tomlbz/openai';
exports.Config = koishi_1.Schema.object({
    botname: koishi_1.Schema.string().description("机器人的名字").default('半灵').required(),
    apikey: koishi_1.Schema.string().role('secret').description("OpenAI 的 API Key").required(),
    model: koishi_1.Schema.string().description("机器人的模型").default('text-davinci-002').required(),
    ntokens: koishi_1.Schema.number().max(256).min(16).description("机器人的最大回复长度").default(64).required(),
    temperature: koishi_1.Schema.number().max(1).min(0).description("机器人的回复温度，越高越随机").default(0.9).required(),
    presencePenalty: koishi_1.Schema.number().max(2).min(-2).description("机器人的重复惩罚，越高越不易重复已出现的符号").default(0.6).required(),
    frequencyPenalty: koishi_1.Schema.number().max(2).min(-2).description("机器人的频率惩罚，越高越不易重复已回答的语句").default(0).required(),
    randomReplyFrequency: koishi_1.Schema.number().max(1).min(0).description("机器人未被直接呼叫（未被@、未被直呼其名）时的随机回复概率").default(0.1).required(),
    botIdentitySettings: koishi_1.Schema.string().description("机器人的人设").default('聪明、友好、学识渊博的式神，外表是可爱的银发少女，梦想是成为世界最强').required(),
    botMoePoint: koishi_1.Schema.string().description("机器人说话时的萌点").default('会以类似“(๑•̀ㅂ•́)و✧”、“(◍•ᴗ•◍)”的可爱的颜文字符号结尾').required(),
    memoryShortLength: koishi_1.Schema.number().max(16).min(2).description("机器人的短期记忆（位于内存中）长度").default(4).required(),
    memoryLongLength: koishi_1.Schema.number().max(256).min(2).description("机器人的长期记忆（位于数据库中，目前未实现）长度").default(16).required(),
});
const conversation = new Map();
function generatePrompt(userId, str, config) {
    const map = conversation.get(userId);
    let prompt = `下面是人类与${config.botname}的对话。${config.botname}是${config.botIdentitySettings}。说话时，${config.botname}${config.botMoePoint}。\n`;
    map.forEach((value, key) => {
        prompt += `人类：${key}\n${config.botname}：${value}\n`;
    });
    prompt += `人类：${str}\n${config.botname}：`;
    return prompt;
}
async function getOpenAIReply(session, config) {
    const configuration = new openai_1.Configuration({
        apiKey: config.apikey,
    });
    const openai = new openai_1.OpenAIApi(configuration);
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
function getReplyCondition(session, config) {
    if (session.subtype === 'group') {
        if (session.parsed.appel)
            return true;
        if (session.content.includes(config.botname))
            return true;
        if (Math.random() < config.randomReplyFrequency)
            return true;
        return false;
    }
    else {
        return true;
    }
}
function apply(ctx, config) {
    // write your plugin here
    ctx.middleware(async (session, next) => {
        if (ctx.bots[session.uid])
            return; // ignore bots from self
        if (getReplyCondition(session, config)) {
            if (!conversation.has(session.uid)) {
                conversation.set(session.uid, new Map());
            }
            const reply = await getOpenAIReply(session, config);
            const conv = conversation.get(session.uid);
            while (conv.size >= config.memoryShortLength) {
                conv.delete(conv.keys().next().value);
            } // remove the oldest messages
            conv.set(session.content, reply);
            return reply;
        }
        return next();
    });
}
exports.apply = apply;
