import { Context, Logger } from 'koishi'
import { Config } from './config'
import { Metadata } from './types'
import { Search } from './search'
import getUuidByString from 'uuid-by-string'
import { Translate } from './translate'

export class Soul {
    private _islog: boolean
    private _logger: Logger
    private _pineconeIndex: string
    private _pineconeKey: string
    private _pineconeReg: string
    private _pineconeName: string
    private _pineconeBaseUtl: string
    private _pineconeNamespace: string
    private _pineconeTopK: number
    private _wolframAppId: string
    private _searchTopK: number
    private _search: Search
    private _translate: Translate
    public searchMode: string
    public translateMode: string
    constructor(){}
    public async init(config: Config, context: Context, parentName: string = '@tomlbz/openai') : Promise<boolean> {
        const loggerName = parentName + '/soul'
        this._islog = config.isLog
        this._logger = new Logger(loggerName)
        this._pineconeIndex = config.pineconeIndex
        this._pineconeKey = config.pineconeKey
        this._pineconeReg = config.pineconeReg
        this._pineconeNamespace = config.pineconeNamespace
        this._pineconeTopK = config.pineconeTopK
        this._wolframAppId = config.wolframAppId
        this._searchTopK = config.searchTopK
        this._search = new Search()
        await this._search.init(config, context, loggerName)
        this._translate = new Translate()
        await this._translate.init(config, context, loggerName)
        if (this._islog) this._logger.info(`Mem(${this._pineconeKey ? "Long+Cache" : "Cache-Only"}), TransL(${this._translate.mode}), Search(${this._search.mode})`)
        if (this._pineconeKey) { // key is key, env is reg
            const ctrlpath = `https://controller.${this._pineconeReg}.pinecone.io`
            const whoami = `${ctrlpath}/actions/whoami`
            try { const res = await context.http.get(whoami, { headers: {
                    'Content-Type': 'application/json',
                    'Api-Key': this._pineconeKey }})
                this._pineconeName = res.project_name as string
                this._pineconeBaseUtl = `https://${this._pineconeIndex}-${this._pineconeName}.svc.${this._pineconeReg}.pinecone.io`
                const desc = await this._describeIndex(context)
                if (!desc) throw new Error('Pinecone failed to describe index')
                if (this._islog) this._logger.info(`Pinecone: ${this._pineconeReg}/${this._pineconeIndex}, Dimension: ${desc}`)
            } catch (e) {
                this._logger.warn(e)
                this._logger.warn(`Pinecone failed, please check your API fields or the internet connection [${e}]`)
                return false
            }
        }
        this.searchMode = this._search.mode
        this.translateMode = this._translate.mode
        return true
    }
    private async _describeIndex(context: Context) : Promise<string> {
        if (!this._pineconeKey) return '' // no key, no pinecone
        const url = `https://controller.${this._pineconeReg}.pinecone.io/databases/${this._pineconeIndex}`
        const res = await context.http.get( url, { headers: {
            'Api-Key': this._pineconeKey,
            'Content-Type': 'application/json' }})
        return res.database.dimension as string
    }
    public async remember(embeddings: number[], metadata: Metadata, context: Context) {
        if (!this._pineconeKey) return // no key, no pinecone
        const res = await context.http.post(
            `${this._pineconeBaseUtl}/vectors/upsert`, {
                vectors: [{
                    id: getUuidByString(metadata.text, 5),
                    values: embeddings,
                    metadata: metadata,
                }],
                namespace: this._pineconeNamespace
            }, { headers: {
                'Api-Key': this._pineconeKey,
                'Content-Type': 'application/json' }})
        if (this._islog) {
            if (typeof res.upsertedCount === 'number') this._logger.info(`Pinecone upserted ${res.upsertedCount} vectors`)
            else this._logger.info(`Pinecone had an unknown error while upserting vectors`)
        }
    }
    public async recall(embeddings: number[], keywords: string[], context: Context) : Promise<Metadata[]> {
        if (!this._pineconeKey) return [] // no key, no pinecone
        const data: {[id: string]: any} = {
            'namespace': this._pineconeNamespace,
            'topK': this._pineconeTopK,
            'includeValues': false,
            'includeMetadata': true,
            'vector': embeddings
        }
        if (keywords && keywords.length > 0) data['filter'] = { keywords: {"$in": keywords} }
        const res = await context.http.post(
            `${this._pineconeBaseUtl}/query`, data as any, { headers: {
                'Api-Key': this._pineconeKey,
                'Content-Type': 'application/json'}})
        return res.matches.map(match => match.metadata as Metadata)
    }
    private async _wolframCheckComputable(query: string, context: Context) : Promise<boolean> {
        const jsonstring = `http://www.wolframalpha.com/queryrecognizer/query.jsp?appid=DEMO&mode=Default&i=${encodeURIComponent(query)}&output=json`
        try {
            const res = await context.http.get<any>(jsonstring) // fetch(jsonstring)
            return res.query[0].accepted === 'true'
        } catch (e) { return false }
    }
    private async _wolframGetShortAnswer(query: string, context: Context) : Promise<string> {
        try {
            const url = `http://api.wolframalpha.com/v1/result?appid=${this._wolframAppId}&i=${encodeURIComponent(query)}&units=metric`
            return await context.http.get<any>(url) // await fetch(url)
        } catch (_) {
            this._logger.error('WolframAlpha Failed')
            return ''
        }
    }
    public async compute(query: string, context: Context) : Promise<string> {
        if (this._wolframAppId) {
            const engquery = await this._translate.translate(query, 'en-US', context)
            if (await this._wolframCheckComputable(engquery, context)) {
                let engres: string = await this._wolframGetShortAnswer(engquery, context)
                engres = String(engres)
                if (!engres.includes('Wolfram|Alpha did not understand your input')) {
                    return await this._translate.translate(engres, 'zh-CN', context)
                }
            }
        }
        return ''
    }
    public async search(query: string, context: Context) : Promise<string[]> {
        return await this._search.search(query, this._searchTopK, context)
    }
}