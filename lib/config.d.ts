import { Dict, Schema } from 'koishi';
export interface Config {
    apikey: string;
    model: string;
    botname: string;
    botIdentity: string;
    sampleDialog: Dict<string, string>;
    ntokens: number;
    temperature: number;
    presencePenalty: number;
    frequencyPenalty: number;
    randomReplyFrequency: number;
    textMemoryLength: number;
    summaryMemoryLength: number;
    topicMemoryLength: number;
    islog: boolean;
}
export declare const Config: Schema<Config>;
