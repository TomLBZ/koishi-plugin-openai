import { Context, Schema } from 'koishi';
export declare const name = "@tomlbz/openai";
export interface Config {
    apikey: string;
    botname: string;
    model: string;
    ntokens: number;
    temperature: number;
    presencePenalty: number;
    frequencyPenalty: number;
    randomReplyFrequency: number;
    botIdentitySettings: string;
    botMoePoint: string;
    memoryShortLength: number;
    memoryLongLength: number;
}
export declare const Config: Schema<Config>;
export declare function apply(ctx: Context, config: Config): void;
