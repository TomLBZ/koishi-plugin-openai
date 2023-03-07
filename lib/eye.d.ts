import { Context, Session } from 'koishi';
import { Config } from './config';
import { IDict, Metadata } from './types';
export declare class Eye {
    private _logger;
    private _islog;
    private _names;
    private _botName;
    private _isNickname;
    private _botIdentity;
    private _sampleDialog;
    private _randomReplyFrequency;
    constructor();
    init(config: Config, nicknames?: string | string[], parentName?: string): boolean;
    private static fnicknames;
    private _mentionedName;
    readInput(cxt: Context, s: Session): string | null | undefined;
    keywords2strs(keywords: IDict<string>): string[];
    getMetadata(s: string, keywords: string[], speaker?: string): Metadata;
    extractNewKeywords(metadata: Metadata[], existing: string[]): string[];
    private _systemPrompt;
    private _botPrompt;
    userPrompt(s: string, name: string): IDict<string>;
    keywordPrompt(s: string): string;
    basePrompt(s: string, name: string, history: IDict<string>[], hint: string): IDict<string>[];
    devPrint(str: string[]): string;
    samplePrompt(name: string): IDict<string>[];
}
