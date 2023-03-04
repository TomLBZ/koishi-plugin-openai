import {Dict, Schema} from 'koishi'

export interface Config {
    // used during init only
    apiKey: string
    chatModel: string
    codeModel: string
    isLog: boolean
    // needed by the ai
    nTokens: number
    temperature: number
    presencePenalty: number
    frequencyPenalty: number
    // needed by the soul
    pineconeEnabled: boolean
    pineconeReg: string
    pineconeKey: string
    pineconeIndex: string
    pineconeNamespace: string
    pineconeTopK: number
    wolframAddress: string
    wolframAppId: string
    // needed by the eye
    botName: string
    isNickname: boolean
    botIdentity: string
    sampleDialog: Dict<string, string>
    randomReplyFrequency: number
    // needed by the cache
    cacheSize: number
    cacheSaveInterval: number
    cacheSaveDir: string
}

export interface AIInvariant {
    nTokens: number
    temperature: number
    presencePenalty: number
    frequencyPenalty: number
}

export interface SoulInvariant {
    pineconeEnabled: boolean
    pineconeReg: string
    pineconeKey: string
    pineconeIndex: string
    pineconeNamespace: string
    pineconeTopK: number
    wolframAddress: string
    wolframAppId: string
}

export interface EyeInvariant {
    botName: string
    isNickname: boolean
    botIdentity: string
    sampleDialog: Dict<string, string>
    randomReplyFrequency: number
}

export const Config: Schema<Config> = Schema.intersect([
    Schema.object({
        apiKey: Schema.string().required().role('secret').description('OpenAI 的 API Key'),
        chatModel: Schema.union([
            'turbo',
            'davinci',
            'curie',
            'babbage',
            'ada'
        ]).description('对话模型，默认使用turbo').default('turbo'),
        codeModel: Schema.union([
            'davinci',
            'cushman'
        ]).description('代码模型，默认使用davinci').default('davinci')
    }).description('OpenAI'),
    Schema.object({
        botName: Schema.string().description('名字').default('半灵'),
        isNickname: Schema.boolean().description('是否允许全局设置中的昵称引发回复')
        .default(true),
        botIdentity: Schema.string().description('机器人人设，用"你是..."开头')
        .default('你是居住在幻想乡的可爱少女。你很聪明、善解人意。你没有身体，说话会消耗灵力、感到疲惫。但你很喜欢和人聊天。'),
        sampleDialog: Schema.dict(String).description('机器人的示例对话，用于人设。个位数条就够，千万别太多/太长，否则会消耗大量Token。')
        .default({
            "你好": "你好(^_^)",
            "你真可爱": "唔，好害羞……灵力不够了啦(*/ω＼*)",
            "今天好忙啊": "加油，我会一直陪着你的(ง •_•)ง"
        })
    }).description('机器人身份'),
    Schema.object({
        cacheSize: Schema.number().description('缓存大小，影响对之前聊过的话的印象（2~32，必须是整数）')
        .min(2).max(32).step(1).default(8),
        cacheSaveInterval: Schema.number().description('缓存保存间隔，单位为条，为小于缓存大小的正整数')
        .min(1).step(1).default(4),
        cacheSaveDir: Schema.string().description('缓存保存目录，用于持久化缓存').default('cache'),
    }).description('本地缓存（用于存储短期记忆）'),
    Schema.object({
        pineconeEnabled: Schema.boolean().description('是否启用Pinecone数据库').default(false),
        pineconeReg: Schema.string().description('Pinecone数据库的区域'),
        pineconeIndex: Schema.string().description('Pinecone数据库的索引名称'),
        pineconeKey: Schema.string().role('secret').description('Pinecone数据库的API Key'),
        pineconeNamespace: Schema.string().description('Pinecone数据库的命名空间').default('koishi'),
        pineconeTopK: Schema.number().description('Pinecone数据库的TopK（用于记忆检索）')
        .min(1).max(5).default(3),
    }).description('Pinecone数据库（可选，用于存储/查询长期记忆）'),
    Schema.object({
        wolframAddress: Schema.string().description('WolframEngine的地址'),
        wolframAppId: Schema.string().role('secret').description('WolframEngine的AppId'),
    }).description('WolframEngine（可选，用于数学演算）'),
    Schema.object({
        nTokens: Schema.number().description('回复的最大Token数（16~512，必须是16的倍数）')
        .min(16).max(512).step(16).default(128),
        temperature: Schema.percent().description('回复温度，越高越随机')
        .default(0.8),
        presencePenalty: Schema.number().description('重复惩罚，越高越不易重复出现过至少一次的Token（-2~2，每步0.1）')
        .min(-2).max(2).step(0.1).default(0.2),
        frequencyPenalty: Schema.number().description('频率惩罚，越高越不易重复出现次数较多的Token（-2~2，每步0.1）')
        .min(-2).max(2).step(0.1).default(0.2),
        randomReplyFrequency: Schema.percent().description('随机回复频率')
        .default(0.2),
    }).description('回复选项'),
    Schema.object({
        isLog: Schema.boolean().description('是否向控制台输出日志')
        .default(false),
    }).description('调试'),
])