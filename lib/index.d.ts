import { Context, Schema } from 'koishi';
export declare const name = "openai";
export interface Config {
    apikey: string;
    botname: string;
    language: string;
    model: string;
    ntokens: number;
    temperature: number;
    presencePenalty: number;
    frequencyPenalty: number;
    randomReplyFrequency: number;
}
export declare const Config: Schema<Config>;
export declare function apply(ctx: Context, config: Config): void;
