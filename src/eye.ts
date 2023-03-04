import { Context, Session, Logger } from 'koishi'
import { Config, EyeInvariant } from './config'
import { IDict, Metadata } from './types'

export class Eye {
    private constructor(
        private readonly _logger: Logger,
        private readonly _invariant: EyeInvariant,
        private _islog: boolean,
        private _names: string[]
    ) {}
    public static create(config: Config, nicknames?: string | string[]) {
        const logger = new Logger('@tomlbz/openai/eye')
        const islog = config.isLog
        const invariant : EyeInvariant = {
            botName: config.botName,
            isNickname: config.isNickname,
            botIdentity: config.botIdentity,
            sampleDialog: config.sampleDialog,
            randomReplyFrequency: config.randomReplyFrequency
        }
        const names = [config.botName, ...Eye.fnicknames(nicknames)]
        if (islog) logger.info(`Eye Created. Available names: ${names}`)
        return new Eye(logger, invariant, islog, names)
    }
    private static fnicknames(nicknames?: string | string[]) {
        if (!nicknames) return []
        if (typeof nicknames === 'string') return [nicknames]
        return nicknames
    }
    public readInput(cxt: Context, s: Session) : string | null | undefined {
        if (cxt.bots[s.uid]) return null
        const state = s.subtype !== 'group' ? 4 : // 私聊
        s.parsed.appel ? 1 : // @bot或者引用/回复bot
        s.content in this._names ? 2 : // 直呼其名
        Math.random() < this._invariant.randomReplyFrequency ? 3 : 0 // 随机回复 // 不回复
        if (state === 0) return null
        const input = s.content.replace(/<[^>]*>/g, '') // 去除XML元素
        if (input === '') return null
        const statename = state == 1 ? 'appelled' : 
        state == 2 ? 'name called' : state == 3 ? 'random reply' : 'private message'
        if (this._islog) this._logger.info(`${statename}, input: ${input}.`)
        return input
    }
    public getMetadata(s: string, keywords: IDict<string>, speaker?: string) : Metadata {
        const keystr = keywords['content']
        const keystrs = (keystr ? keystr.split(',').map(s => s.trim()) : []).filter(s => s.includes('-')).map(s => s.replace('-', ''))
        if (this._islog) this._logger.info(`Keywords: ${keystrs ? keystrs : 'none'}`)
        return {
            text: s,
            timestamp: Date.now(),
            speaker: speaker ? speaker : this._invariant.botIdentity,
            keywords: keystrs
        } as Metadata
    }
    public keywordPrompt(s: string, name: string) : IDict<string>[] {
        return [
            {'role': 'system', 'content': '你是提取关键词的AI。接下来你将会看到一段话，你需要返回至少1个、不超过5个关键词。格式为-1,-2,-3,...。', 'name': 'system'},
            {'role': 'user', 'content': '新加坡经济发展很好是因为地理位置得天独厚。它地处马六甲海峡，是亚洲与欧洲的航运枢纽。', 'name': name},
            {'role': 'assistant', 'content': '-新加坡,-经济发展,-地理位置,-马六甲海峡,-航运', 'name': 'assistant'},
            {'role': 'user', 'content': '（测试1，', 'name': name},
            {'role': 'assistant', 'content': '-测试', 'name': 'assistant'},
            {'role': 'user', 'content': '？', 'name': name},
            {'role': 'assistant', 'content': '未发现关键词', 'name': 'assistant'},
            {'role': 'user', 'content': '求新功能的说明', 'name': name},
            {'role': 'assistant', 'content': '-新功能,-说明', 'name': 'assistant'},
            {'role': 'user', 'content': s, 'name': name},
        ]
    }
    public displayDict(idict: IDict<string>) {
        return '{'.concat(Object.keys(idict).map(k => `${k}:${idict[k]}`).join(','), '}')
    }
    public displayMeta(m: Metadata) {
        return '{'.concat(Object.keys(m).map(k => `${k}:${m[k]}`).join(','), '}')
    }
    public devPrint(str: string[]) {
        let res = `/* 更新开发中...\n`
        for (let i = 0; i < str.length; i++) {
            res += `${str[i]}\n`
        }
        return res + `*/`
    }
    public update(config: Config, nicknames?: string | string[]) {
        this._islog = config.isLog
        this._invariant.botName = config.botName
        this._invariant.isNickname = config.isNickname
        this._invariant.botIdentity = config.botIdentity
        this._invariant.sampleDialog = config.sampleDialog
        this._invariant.randomReplyFrequency = config.randomReplyFrequency
        this._names = [config.botName, ...Eye.fnicknames(nicknames)]
    }
}