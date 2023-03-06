import { Logger } from 'koishi'
import { PineconeClient } from '@pinecone-database/pinecone'
import { VectorOperationsApi, UpsertOperationRequest, QueryOperationRequest, DescribeIndexStatsOperationRequest } from '@pinecone-database/pinecone/dist/pinecone-generated-ts-fetch'
import { Config } from './config'
import { Metadata } from './types'
import { Search } from './search'
import getUuidByString from 'uuid-by-string'
import { Translate } from './translate'

export class Soul {
    private _pinecone: PineconeClient
    private _index: VectorOperationsApi
    private _islog: boolean
    private _logger: Logger
    private _pineconeIndex: string
    private _pineconeKey: string
    private _pineconeReg: string
    private _pineconeNamespace: string
    private _pineconeTopK: number
    private _wolframAppId: string
    private _searchTopK: number
    private _search: Search
    private _translate: Translate
    constructor(){}
    public async init(config: Config, parentName: string = '@tomlbz/openai') : Promise<boolean> {
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
        await this._search.init(config, loggerName)
        this._translate = new Translate()
        await this._translate.init(config, loggerName)
        if (this._islog) this._logger.info(`Mem(${this._pineconeKey ? "Long+Cache" : "Cache-Only"}), TransL(${this._translate.mode}), Search(${this._search.mode})`)
        return this._pineconeKey ? await this._getPinecone() : true
    }
    private async _getPinecone() : Promise<boolean> {
        const preg = this._pineconeReg ? this._pineconeReg : 'us-east1-gcp'
        const pindex = this._pineconeIndex ? this._pineconeIndex : 'openai'
        const pnamespace = this._pineconeNamespace ? this._pineconeNamespace : 'koishi'
        if (!this._pinecone) {
            this._pinecone = new PineconeClient()
            await this._pinecone.init({environment: preg, apiKey: this._pineconeKey})
            if (!this._pinecone) {
                if (this._islog) this._logger.warn('Pinecone initialization failed, please check your API key or internet connection')
                return false
            }
        }
        this._index = this._pinecone.Index(pindex)
        const query : DescribeIndexStatsOperationRequest = { describeIndexStatsRequest: {filter : {} }}
        const count = await (await this._index.describeIndexStats(query)).namespaces[pnamespace].vectorCount
        if (typeof count !== 'number') {
            if (this._islog) this._logger.warn(`Pinecone failed to connected to ${pindex}/${pnamespace}`)
            this._index = null
            return false
        }
        if (this._islog) this._logger.info(`Pinecone connected to ${pindex}/${pnamespace}. Count: ${count}`)
        return true
    }

    public async remember(embeddings: number[], metadata: Metadata) {
        if (this._pinecone) await this._rememberdb(embeddings, metadata)
    }
    private async _rememberdb(embeddings: number[], metadata: Metadata) {
        const req : UpsertOperationRequest = { upsertRequest: {
            vectors: [{
                id: getUuidByString(metadata.text, 5),
                values: embeddings,
                metadata: metadata,
            }],
            namespace: this._pineconeNamespace}}
        const response = await this._index.upsert(req)
        if (this._islog) {
            if (typeof response.upsertedCount === 'number') this._logger.info(`Pinecone upserted ${response.upsertedCount} vectors`)
            else this._logger.info(`Pinecone had an unknown error while upserting vectors`)
        }
    }
    public async recallNext(embeddings: number[], metadata: Metadata) : Promise<string[]> {
        if (this._pinecone) {
            const meta = await this._recalldb(embeddings, metadata)
            const relatedkeyset = new Set(meta.flatMap(m => m.keywords))
            const originalkeyset = new Set(metadata.keywords)
            const metadatacopy = {...metadata}
            metadatacopy.keywords = [...relatedkeyset].filter(key => !originalkeyset.has(key))
            const nextmeta = await this._recalldb(embeddings, metadatacopy)
            if (this._islog) this._logger.info(`Next Keywords: ${metadatacopy.keywords}`)
            const texts = nextmeta.map(m => m.text)
            if (this._islog) this._logger.info(`Pinecone found ${texts.length} matches`)
            return texts
        }
        else return []
    }
    public async recall(embeddings: number[], metadata: Metadata) : Promise<string[]> {
        if (this._pinecone) {
            const meta = await this._recalldb(embeddings, metadata)
            const texts = meta.map(m => m.text)
            if (this._islog) this._logger.info(`Pinecone found ${texts.length} matches`)
            return texts
        }
        else return []
    }
    private async _recalldb(embeddings: number[], metadata: Metadata) : Promise<Metadata[]> {
        const filter = {
            keywords: {"$in": metadata.keywords}
        }
        const req : QueryOperationRequest = { queryRequest: {
                namespace: this._pineconeNamespace,
                topK: this._pineconeTopK,
                filter: filter,
                includeValues: false,
                includeMetadata: true,
                vector: embeddings,}}
        const response = await this._index.query(req)
        return response.matches.map(match => match.metadata as Metadata)
    }
    private async _wolframCheckComputable(query: string) : Promise<boolean> {
        const jsonstring = `http://www.wolframalpha.com/queryrecognizer/query.jsp?appid=DEMO&mode=Default&i=${encodeURIComponent(query)}&output=json`
        try {
            const json = await (await fetch(jsonstring)).json()
            return json.query[0].accepted === 'true'
        } catch (e) { return false }
    }
    private async _wolframGetShortAnswer(query: string) : Promise<string> {
        const url = `http://api.wolframalpha.com/v1/result?appid=${this._wolframAppId}&i=${encodeURIComponent(query)}&units=metric`
        const res = await fetch(url)
        return await res.text()
    }
    public async compute(query: string) : Promise<string[]> {
        if ( this._wolframAppId) {
            const engquery = await this._translate.translate(query, 'en-US')
            if (await this._wolframCheckComputable(engquery)) {
                const engres = await this._wolframGetShortAnswer(engquery)
                if (!engres.includes('Wolfram|Alpha did not understand your input')) {
                    if (this._islog) this._logger.info(`Knowledge Mode: WolframAlpha`)
                    const res = await this._translate.translate(engres, 'zh-CN')
                    return [res] // this is from WolframAlpha
                }
            }
        }
        return await this._search.search(query, this._searchTopK) // this is from search engine
    }
}