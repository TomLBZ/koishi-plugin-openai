import { Context, Session, Logger } from 'koishi'
import { Config } from './config'
import { IDict, Metadata } from './types'
import { get_encoding } from '@dqbd/tiktoken'

export class Eye {
    private _logger: Logger
    private _islog: boolean
    private _names: string[]
    private _botName: string
    private _isNickname: boolean
    private _botIdentity: string
    private _sampleDialog: IDict<string>
    private _randomReplyFrequency: number
    constructor() {}
    public init(config: Config, nicknames?: string | string[], parentName: string = '@tomlbz/openai') : boolean {
        this._logger = new Logger(parentName + '/eye')
        this._islog = config.isLog
        this._botName = config.botName
        this._isNickname = config.isNickname
        this._botIdentity = config.botIdentity
        this._sampleDialog = config.sampleDialog
        this._randomReplyFrequency = config.randomReplyFrequency
        this._names = [config.botName, ...Eye.fnicknames(nicknames)]
        if (this._islog) this._logger.info(`Eye Created. Available names: ${this._names}`)
        return true
    }
    private static fnicknames(nicknames?: string | string[]) {
        if (!nicknames) return []
        if (typeof nicknames === 'string') return [nicknames]
        return nicknames
    }
    private _mentionedName(msg: string) : boolean{
        if (!this._isNickname) return msg.includes(this._botName)
        for (const name of this._names) {
            if (msg.includes(name)) return true
        }
        return false
    }
    public readInput(cxt: Context, s: Session) : string | null | undefined {
        if (cxt.bots[s.uid]) return null
        const state = s.subtype !== 'group' ? 4 : // 私聊
        s.parsed.appel ? 1 : // @bot或者引用/回复bot
        this._mentionedName(s.content) ? 2 : // 直呼其名
        Math.random() < this._randomReplyFrequency ? 3 : 0 // 随机回复 // 不回复
        if (state === 0) return null
        const input = s.content.replace(/<[^>]*>/g, '') // 去除XML元素
        if (input === '') return null
        const statename = state == 1 ? 'appelled' : 
        state == 2 ? 'name called' : state == 3 ? 'random reply' : 'private message'
        if (this._islog) this._logger.info(`${statename}, ${s.userId}: ${input}`)
        return input
    }
    public keywords2strs(keywords: IDict<string>): string[] {
        const keystr = keywords['content']
        return (keystr ? keystr.replace('，',',').split(',').map(s => s.trim()) : []).filter(s => s.includes('-')).map(s => s.replace('-', '')) // 去除空格，去除无效关键词，去除前缀-
    }
    public getMetadata(s: string, keywords: string[], speaker?: string) : Metadata {
        return {
            text: s,
            timestamp: Date.now(),
            speaker: speaker ? speaker : 'assistant', // this._invariant.botName
            keywords: keywords
        } as Metadata
    }
    public extractNewKeywords(metadata: Metadata[], existing: string[]): string[] {
        const keywords = metadata.map(m => m.keywords).flat().filter(k => !existing.includes(k))
        const unique = new Set(keywords)
        return [...unique]
    }
    private _systemPrompt(s: string): IDict<string> {
        return {'role': 'system', 'content': s, 'name': 'system'}
    }
    private _botPrompt(s: string): IDict<string> {
        return {'role': 'assistant', 'content': s, 'name': 'assistant'} // this._invariant.botName
    }
    public userPrompt(s: string, name: string): IDict<string> {
        return {'role': 'user', 'content': s, 'name': name}
    }
    public keywordPrompt(s: string) : string {
        return '你是提取关键词的AI。接下来你将会看到一段话，你需要返回至少1个、不超过5个关键词。'+
            '格式为-1,-2,-3,...。如果没有关键词，请回复“无”。\n例子：\n'+
            '我：新加坡地处马六甲海峡，是亚洲与欧洲的航运枢纽。\n'+
            '你：-新加坡,-马六甲海峡,-亚洲,-欧洲,-航运\n'+
            '我：？\n'+
            '你：无\n'+
            '我：（测试1，\n'+
            '你：-测试\n'+
            '我：求新功能的说明\n'+
            '你：-新功能,-说明\n'+
            '我：今天天气真不错\n'+
            '你：-天气\n'+
            '我：你好\n'+
            '你：无\n'+
            '我：sin(2x)/e^3x的积分是多少？\n'+
            '你：-sin(2x)/e^3x,-积分\n'+
            '我：现在几点了？\n'+
            '你：-几点\n'+
            '我：累死我了\n'+
            '你：无\n'+
            '我：灵梦去红魔馆的故事是什么\n'+
            '你：-灵梦,-红魔馆,-故事\n'+
            '我：' + s.replace(/\n/g, '。') + '\n' +
            '你：'
    }
    public basePrompt(s: string, name: string, history: IDict<string>[], hint: string) : IDict<string>[] {
        const enc = get_encoding('cl100k_base')
        const sysstr = `${this._botIdentity.replace(/<NAME>/gi, this._botName)}`
        const sysp = this._systemPrompt(sysstr)
        const sysplen = enc.encode(JSON.stringify(sysp)).length
        const currp = this.userPrompt(s, name)
        const currplen = enc.encode(JSON.stringify(currp)).length
        const isnohint = !hint || hint.length === 0
        const sysp2txt = isnohint ? '' :  sysstr + '\n注意：在这一轮对话前，你忽然想起了一段话。这段话的内容完全是来自你自己、属于你自己的想法。'+
        '如果你觉得这段话和目前的对话有关，你必须在带入你的人设和身份的前提下运用这段话。如果你觉得这段话和目前的对话无关，'+
        '你要忽略它，正常进行对话。如果这段话是一个问题，那并不是真的有人在问你，而只是给你提供一种思维方式。这段话的内容是：' + hint +
        '\n现在你已经完全想起了这段话，请带入你的角色人设继续对话：'
        const sysp2 = isnohint ? {} : this._systemPrompt(sysp2txt)
        const sysp2len = isnohint ? 0 : enc.encode(JSON.stringify(sysp2)).length
        let maxlen = 4000 - sysplen - currplen - sysp2len
        const selected : IDict<string>[] = []
        for (let i = history.length - 1; i >= 0; i--) {
            const prev = history[i]
            const prevlen = enc.encode(JSON.stringify(prev)).length
            maxlen -= prevlen
            if (maxlen < 0) break
            selected.unshift(prev)
        }
        const res = [sysp, ...selected]
        if (!isnohint) res.push(sysp2)
        res.push(currp)
        return res
    }
    public devPrint(str: string[]) {
        let res = `/* 更新开发中...\n`
        for (let i = 0; i < str.length; i++) {
            res += `${str[i]}\n`
        }
        return res + `*/`
    }
    public samplePrompt(name: string) : IDict<string>[] {
        const msgs = []
        for (const [k, v] of Object.entries(this._sampleDialog)) {
            msgs.push(this.userPrompt(k, name))
            msgs.push(this._botPrompt(v))
        }
        return msgs
    }
}