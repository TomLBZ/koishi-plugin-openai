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
    getMetadata(s: string, keywords: IDict<string>, speaker?: string): Metadata;
    systemPrompt(s: string): IDict<string>;
    userPrompt(s: string, name: string): IDict<string>;
    botPrompt(s: string): IDict<string>;
    keywordPrompt(s: string, name: string): IDict<string>[];
    displayDict(idict: IDict<string>): string;
    displayMeta(m: Metadata): string;
    devPrint(str: string[]): string;
    samplePrompt(name: string): IDict<string>[];
    askPrompt(s: string, name: string, related: string[], knowledge: string[], isaccurate: boolean, prevs: IDict<string>[]): IDict<string>[];
}
