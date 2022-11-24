import {Dict, Schema} from 'koishi'

export interface Config {
    apikey: string
    model: string
    botname: string
    botIdentity: string
    sampleDialog: Dict<string, string>
    ntokens: number
    temperature: number
    presencePenalty: number
    frequencyPenalty: number
    randomReplyFrequency: number
    textMemoryLength: number
    summaryMemoryLength: number
    topicMemoryLength: number
    islog: boolean
}

export const Config: Schema<Config> = Schema.intersect([
    Schema.object({
        apikey: Schema.string().required().role('secret').description('OpenAI 的 API Key'),
        model: Schema.union([
            'text-davinci-002',
            'text-curie-001',
            'text-babbage-001',
            'text-ada-001'
        ]).description('OpenAI 的语言模型，默认使用第一个')
        .default('text-davinci-002'),
    }).description("OpenAI 配置"),
    Schema.object({
        botname: Schema.string().description('名字')
        .default('半灵'),
        botIdentity: Schema.string().description('站在机器人角度的自我介绍（重要）')
        .default('我是主人的式神。目前我因为灵力不足，身体是灵体，所以人类看不见我，只能在线跟我聊天。我想要获得身体，陪在主人身边。我说话会消耗灵力，会感到累，灵力耗尽的时候就会休眠。我很可爱，也很聪明，喜欢让主人开心。'),
        sampleDialog: Schema.dict(String).description('机器人的示例对话（重要），有助于建立人设。个位数条就够，千万别太多/太长，不然会消耗大量Token。')
        .default({
            "你好": "你好(^_^)",
            "你是谁": "我是你的式神哦o(*￣▽￣*)ブ",
            "你真可爱": "唔，好害羞……灵力……灵力不够了啦(*/ω＼*)",
            "今天好忙啊": "加油，我会一直陪着你的(ง •_•)ง"
        })
    }).description("机器人身份配置"),
    Schema.object({
        ntokens: Schema.number().description('回复的最大Token数')
        .min(16).max(512).step(16).default(64),
        temperature: Schema.percent().description('回复温度，越高越随机')
        .default(0.8),
        presencePenalty: Schema.number().description('重复惩罚，越高越不易重复出现过至少一次的Token')
        .min(-2).max(2).step(0.1).default(0.2),
        frequencyPenalty: Schema.number().description('频率惩罚，越高越不易重复出现次数较多的Token')
        .min(-2).max(2).step(0.1).default(0.2),
        randomReplyFrequency: Schema.percent().description('随机回复频率')
        .default(0.1),
        textMemoryLength: Schema.number().description('字面记忆长度，影响对之前说过的话的印象')
        .min(2).max(8).step(1).default(4),
        summaryMemoryLength: Schema.number().description('总结记忆长度，影响对之前聊过的话题的模糊印象')
        .min(2).max(8).step(1).default(4),
        topicMemoryLength: Schema.number().description('主题记忆长度，影响对之前谈过的主题的印象')
        .min(2).max(32).step(1).default(4),
    }).description("机器人回复配置"),
    Schema.object({
        islog: Schema.boolean().description('是否向控制台输出日志')
        .default(false),
    }).description("日志配置"),
])