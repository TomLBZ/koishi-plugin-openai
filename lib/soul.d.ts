import { Context } from 'koishi';
import { Config } from './config';
import { Metadata } from './types';
export declare class Soul {
    private _islog;
    private _logger;
    private _pineconeIndex;
    private _pineconeKey;
    private _pineconeReg;
    private _pineconeName;
    private _pineconeBaseUtl;
    private _pineconeNamespace;
    private _pineconeTopK;
    private _wolframAppId;
    private _searchTopK;
    private _search;
    private _translate;
    isAccurate: boolean;
    constructor();
    init(config: Config, context: Context, parentName?: string): Promise<boolean>;
    private _describeIndex;
    remember(embeddings: number[], metadata: Metadata, context: Context): Promise<void>;
    private _recalldb;
    recall(embeddings: number[], metadata: Metadata, context: Context): Promise<string[]>;
    private _wolframCheckComputable;
    private _wolframGetShortAnswer;
    compute(query: string, context: Context): Promise<string[]>;
}
