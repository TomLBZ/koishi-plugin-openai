import { Dict, Schema } from 'koishi';
export interface Config {
    apiKey: string;
    chatModel: string;
    codeModel: string;
    textMemoryLength: number;
    summaryMemoryLength: number;
    topicMemoryLength: number;
    isLog: boolean;
    nTokens: number;
    temperature: number;
    presencePenalty: number;
    frequencyPenalty: number;
    pineconeEnabled: boolean;
    pineconeReg: string;
    pineconeKey: string;
    pineconeIndex: string;
    pineconeNamespace: string;
    pineconeTopK: number;
    wolframAddress: string;
    wolframAppId: string;
    botName: string;
    isNickname: boolean;
    botIdentity: string;
    sampleDialog: Dict<string, string>;
    randomReplyFrequency: number;
    cacheSize: number;
    cacheSaveInterval: number;
    cacheSaveDir: string;
}
export interface AIInvariant {
    nTokens: number;
    temperature: number;
    presencePenalty: number;
    frequencyPenalty: number;
}
export interface SoulInvariant {
    pineconeEnabled: boolean;
    pineconeReg: string;
    pineconeKey: string;
    pineconeIndex: string;
    pineconeNamespace: string;
    pineconeTopK: number;
    wolframAddress: string;
    wolframAppId: string;
}
export interface EyeInvariant {
    botName: string;
    isNickname: boolean;
    botIdentity: string;
    sampleDialog: Dict<string, string>;
    randomReplyFrequency: number;
}
export declare const Config: Schema<Config>;
