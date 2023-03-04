import { Logger } from 'koishi'
import { PineconeClient } from '@pinecone-database/pinecone'
import { VectorOperationsApi, UpsertOperationRequest, QueryOperationRequest, DescribeIndexStatsOperationRequest } from '@pinecone-database/pinecone/dist/pinecone-generated-ts-fetch'
import { Config, SoulInvariant } from './config'
import { Metadata } from './types'
import getUuidByString from 'uuid-by-string'

export class Soul {
    private _pinecone: PineconeClient
    private _index: VectorOperationsApi
    private _islog: boolean
    private _logger: Logger
    private _invariant: SoulInvariant
    constructor(){}
    public async init(config: Config) : Promise<boolean> {
        this._islog = config.isLog
        this._logger = new Logger('@tomlbz/openai/soul')
        this._invariant = {
            pineconeEnabled: config.pineconeEnabled,
            pineconeIndex: config.pineconeIndex,
            pineconeKey: config.pineconeKey,
            pineconeReg: config.pineconeReg,
            pineconeNamespace: config.pineconeNamespace,
            pineconeTopK: config.pineconeTopK,
            wolframAddress: config.wolframAddress,
            wolframAppId: config.wolframAppId
        }
        const isdb = config.pineconeEnabled && config.pineconeReg && config.pineconeKey && config.pineconeIndex
        if (isdb) return await this._getPinecone()
        else return true
    }
    private async _getPinecone() : Promise<boolean> {
        if (!this._pinecone) {
            this._pinecone = new PineconeClient()
            await this._pinecone.init({environment: this._invariant.pineconeReg, apiKey: this._invariant.pineconeKey})
            if (!this._pinecone) {
                if (this._islog) this._logger.warn('Pinecone initialization failed, please check your API key or internet connection')
                return false
            }
        }
        this._index = this._pinecone.Index(this._invariant.pineconeIndex)
        const query : DescribeIndexStatsOperationRequest = { describeIndexStatsRequest: {filter : {} }}
        const count = await (await this._index.describeIndexStats(query)).namespaces[this._invariant.pineconeNamespace].vectorCount
        if (typeof count !== 'number') {
            if (this._islog) this._logger.warn(`Pinecone failed to connected to ${this._invariant.pineconeIndex}/${this._invariant.pineconeNamespace}`)
            this._index = null
            return false
        }
        if (this._islog) this._logger.info(`Pinecone connected to ${this._invariant.pineconeIndex}/${this._invariant.pineconeNamespace}. Count: ${count}`)
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
            namespace: this._invariant.pineconeNamespace}}
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
                namespace: this._invariant.pineconeNamespace,
                topK: this._invariant.pineconeTopK,
                filter: filter,
                includeValues: false,
                includeMetadata: true,
                vector: embeddings,}}
        const response = await this._index.query(req)
        return response.matches.map(match => match.metadata as Metadata)
    }
    public async update(config: Config) : Promise<boolean> {
        this._islog = config.isLog
        this._invariant.pineconeEnabled = config.pineconeEnabled
        this._invariant.pineconeIndex = config.pineconeIndex
        this._invariant.pineconeKey = config.pineconeKey
        this._invariant.pineconeReg = config.pineconeReg
        this._invariant.pineconeNamespace = config.pineconeNamespace
        this._invariant.pineconeTopK = config.pineconeTopK
        this._invariant.wolframAddress = config.wolframAddress
        this._invariant.wolframAppId = config.wolframAppId
        const isdb = config.pineconeEnabled && config.pineconeReg && config.pineconeKey && config.pineconeIndex
        if (!isdb) {
            this._pinecone = null
            return true
        }
        else if (!this._pinecone || !this._index) {
            return await this._getPinecone()
        }
    }
}