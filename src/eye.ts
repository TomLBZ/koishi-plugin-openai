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
    public getMetadata(s: string, keywords: IDict<string>, speaker?: string) : Metadata {
        const keystr = keywords['content']
        const keystrs = (keystr ? keystr.replace('，',',').split(',').map(s => s.trim()) : []).filter(s => s.includes('-')).map(s => s.replace('-', ''))
        if (this._islog) this._logger.info(`Keywords: ${keystrs && keystrs.length > 0 ? keystrs : 'none'}`)
        return {
            text: s,
            timestamp: Date.now(),
            speaker: speaker ? speaker : 'assistant', // this._invariant.botName
            keywords: keystrs
        } as Metadata
    }
    public systemPrompt(s: string): IDict<string> {
        return {'role': 'system', 'content': s, 'name': 'system'}
    }
    public userPrompt(s: string, name: string): IDict<string> {
        return {'role': 'user', 'content': s, 'name': name}
    }
    public botPrompt(s: string): IDict<string> {
        return {'role': 'assistant', 'content': s, 'name': 'assistant'} // this._invariant.botName
    }
    public keywordPrompt(s: string, name: string) : IDict<string>[] {
        return [
            this.systemPrompt('你是提取关键词的AI。接下来你将会看到一段话，你需要返回至少1个、不超过5个关键词。格式为-1,-2,-3,...。'),
            this.userPrompt('求新功能的说明', name),
            this.botPrompt('-新功能,-说明'),
            this.userPrompt('新加坡经济发展很好是因为地理位置得天独厚。它地处马六甲海峡，是亚洲与欧洲的航运枢纽。', name),
            this.botPrompt('-新加坡,-经济发展,-地理位置,-马六甲海峡,-航运'),
            this.userPrompt('？', name),
            this.botPrompt('未发现关键词'),
            this.userPrompt('（测试1，', name),
            this.botPrompt('-测试'),
            this.userPrompt(s, name)
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
    public samplePrompt(name: string) : IDict<string>[] {
        const msgs = []
        for (const [k, v] of Object.entries(this._sampleDialog)) {
            msgs.push(this.userPrompt(k, name))
            msgs.push(this.botPrompt(v))
        }
        return msgs
    }
    public askPrompt(s: string, name: string, related: string[], knowledge: string[], isaccurate: boolean, prevs: IDict<string>[]) : IDict<string>[] {
        const enc = get_encoding('cl100k_base')
        const sysp = this.systemPrompt(`${this._botIdentity.replace(/<NAME>/gi, this._botName)}`)
        const sysplen = enc.encode(JSON.stringify(sysp)).length
        const rel = related.map(s => `[${s}]`).join('|')
        const relstr = rel ? '相关记忆：' + rel : ''
        const know = knowledge.map(s => `[${s}]`).join('|')
        const kn = `${isaccurate ? '正确答案' : '也许有用的网络信息'}：${know}`
        if (this._islog) this._logger.info(`Knowledge: ${kn}`)
        const orderedkstr = isaccurate ? `${kn}\n${relstr}` : `${relstr}\n${kn}`
        const currp = this.userPrompt(`${s}\n\n${orderedkstr}`, name)
        const currplen = enc.encode(JSON.stringify(currp)).length
        const maxlen = 4000 - sysplen - currplen
        const selected : IDict<string>[] = []
        let acculen = 0
        for (let i = prevs.length - 1; i >= 0; i--) {
            const prev = prevs[i]
            acculen += enc.encode(JSON.stringify(prev)).length
            if (acculen > maxlen) break
            selected.unshift(prev)
        }        
        return [sysp, ...selected, currp]
    }
}