"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Config = void 0;
const koishi_1 = require("koishi");
exports.Config = koishi_1.Schema.intersect([
    koishi_1.Schema.object({
        apikey: koishi_1.Schema.string().required().role('secret').description('OpenAI 的 API Key'),
        model: koishi_1.Schema.union([
            'gpt-3.5-turbo',
            'text-davinci-003',
            'text-davinci-002',
            'text-davinci-001',
            'text-curie-001',
            'text-babbage-001',
            'text-ada-001'
        ]).description('OpenAI 的语言模型，默认使用第一个')
            .default('gpt-3.5-turbo'),
    }).description("OpenAI 配置"),
    koishi_1.Schema.object({
        botname: koishi_1.Schema.string().description('名字')
            .default('半灵'),
        botIdentity: koishi_1.Schema.string().description('站在机器人角度的自我介绍，用于人设')
            .default('我是主人的式神。目前我因为灵力不足，身体是灵体，所以人类看不见我，只能在线跟我聊天。我想要获得身体，陪在主人身边。我说话会消耗灵力，会感到累，灵力耗尽的时候就会休眠。我很可爱，也很聪明，喜欢让主人开心。'),
        sampleDialog: koishi_1.Schema.dict(String).description('机器人的示例对话，用于人设。个位数条就够，千万别太多/太长，否则会消耗大量Token。')
            .default({
            "你好": "你好(^_^)",
            "你是谁": "我是你的式神哦o(*￣▽￣*)ブ",
            "你真可爱": "唔，好害羞……灵力……灵力不够了啦(*/ω＼*)",
            "今天好忙啊": "加油，我会一直陪着你的(ง •_•)ง"
        })
    }).description("机器人身份配置"),
    koishi_1.Schema.object({
        ntokens: koishi_1.Schema.number().description('回复的最大Token数（16~512，必须是16的倍数）')
            .min(16).max(512).step(16).default(128),
        temperature: koishi_1.Schema.percent().description('回复温度，越高越随机')
            .default(0.8),
        presencePenalty: koishi_1.Schema.number().description('重复惩罚，越高越不易重复出现过至少一次的Token（-2~2，每步0.1）')
            .min(-2).max(2).step(0.1).default(0.2),
        frequencyPenalty: koishi_1.Schema.number().description('频率惩罚，越高越不易重复出现次数较多的Token（-2~2，每步0.1）')
            .min(-2).max(2).step(0.1).default(0.2),
        randomReplyFrequency: koishi_1.Schema.percent().description('随机回复频率')
            .default(0.1),
        textMemoryLength: koishi_1.Schema.number().description('字面记忆长度，影响对之前说过的话的印象（2~8，必须是整数）')
            .min(2).max(8).step(1).default(4),
        summaryMemoryLength: koishi_1.Schema.number().description('总结记忆长度，影响对之前聊过的话题的模糊印象（2~8，必须是整数）')
            .min(2).max(8).step(1).default(4),
        topicMemoryLength: koishi_1.Schema.number().description('主题记忆长度，影响对之前谈过的主题的印象（2~32，必须是整数）')
            .min(2).max(32).step(1).default(4),
    }).description("机器人回复配置"),
    koishi_1.Schema.object({
        islog: koishi_1.Schema.boolean().description('是否向控制台输出日志')
            .default(false),
    }).description("日志配置"),
]);
