import { Logger } from 'koishi'
import { PineconeClient } from '@pinecone-database/pinecone'
import { VectorOperationsApi, UpsertOperationRequest, QueryOperationRequest, DescribeIndexStatsOperationRequest } from '@pinecone-database/pinecone/dist/pinecone-generated-ts-fetch'
import { Config, SoulInvariant } from './config'
import { Metadata } from './types'

export class Soul {
    private constructor(
        private readonly _logger: Logger,
        private readonly _invariant: SoulInvariant,
        private readonly _pinecone: PineconeClient,
        private _islog: boolean,
        private _index: VectorOperationsApi
    ){}
    public static async create(config: Config) {
        const logger = new Logger('@tomlbz/openai/soul')
        const islog = config.isLog
        const invariant : SoulInvariant = {
            pineconeIndex: config.pineconeIndex,
            pineconeKey: config.pineconeKey,
            pineconeReg: config.pineconeReg,
            pineconeNamespace: config.pineconeNamespace,
            pineconeTopK: config.pineconeTopK,
            wolframAddress: config.wolframAddress,
            wolframAppId: config.wolframAppId
        }
        const pinecone = config.pineconeReg && config.pineconeKey && config.pineconeIndex ? new PineconeClient() : null
        let index : VectorOperationsApi = null
        if (pinecone) {
            await pinecone.init({ environment: config.pineconeReg, apiKey: config.pineconeKey })
            index = pinecone.Index(config.pineconeIndex)
            const query : DescribeIndexStatsOperationRequest = { describeIndexStatsRequest: {filter : {} }}
            const count = await (await index.describeIndexStats(query)).namespaces[config.pineconeNamespace].vectorCount
            if (typeof count === 'number' && islog) logger.info(`Pinecone connected to ${config.pineconeIndex}/${config.pineconeNamespace}. Count: ${count}`)
            else if (islog) logger.warn('Pinecone connection failed.')
        } else if (islog) logger.info('Pinecone disabled: configurations incomplete. Using local memory only.')
        return new Soul(logger, invariant, pinecone, islog, index)
    }
    public async remember(embeddings: number[], metadata: Metadata) {
        if (this._pinecone) await this._rememberdb(embeddings, metadata)
        else await this._rememberfile(embeddings, metadata)
    }
    private async _rememberdb(embeddings: number[], metadata: Metadata) {
        const req : UpsertOperationRequest = { upsertRequest: {
            vectors: [{
                id: metadata.timestamp.toString(),
                values: embeddings,
                metadata: metadata,
            }],
            namespace: this._invariant.pineconeNamespace}}
        const response = await this._index.upsert(req)
        if (this._islog) {
            if (typeof response.upsertedCount === 'number') this._logger.info(`Pinecone upserted ${response.upsertedCount} vectors.`)
            else this._logger.info(`Pinecone had an unknown error.`)
        }
    }
    private async _rememberfile(embeddings: number[], metadata: Metadata) {
        if (this._islog) this._logger.warn('Not Implemented Yet')
    }
    public async think(embeddings: number[], metadata: Metadata) : Promise<string[]> {
        if (this._pinecone) return await this._thinkdb(embeddings, metadata)
        else return await this._thinkfile(embeddings, metadata)
    }
    private async _thinkdb(embeddings: number[], metadata: Metadata) : Promise<string[]> {
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
        const texts = response.matches.map(match => match.metadata as Metadata).map(m => m.text)
        if (this._islog) this._logger.info(`Pinecone found ${texts.length} matches.`)
        return texts
    }
    private async _thinkfile(embeddings: number[], metadata: Metadata) : Promise<string[]> {
        if (this._islog) this._logger.warn('Not Implemented Yet')
        return []
    }
    public update(config: Config) {
        this._islog = config.isLog
        this._invariant.pineconeIndex = config.pineconeIndex
        this._invariant.pineconeKey = config.pineconeKey
        this._invariant.pineconeReg = config.pineconeReg
        this._invariant.pineconeNamespace = config.pineconeNamespace
        this._invariant.pineconeTopK = config.pineconeTopK
        this._invariant.wolframAddress = config.wolframAddress
        this._invariant.wolframAppId = config.wolframAppId
        this._index = this._pinecone.Index(config.pineconeIndex)
    }
}