import { Context } from 'koishi';
import { Config } from './config';
import { IDict } from './types';
export declare class AI {
    private _islog;
    private _name;
    private _logger;
    private _openaiKey;
    private _allmodels;
    private _chatmodel;
    private _keywordmodel;
    private _apiAdress;
    private _codemodel;
    private _embedmodel;
    private _audiomodel;
    private _nTokens;
    private _temperature;
    private _presencePenalty;
    private _frequencyPenalty;
    constructor();
    init(config: Config, context: Context, parentName?: string): Promise<boolean>;
    private _currentApiUrl;
    private _modelType;
    private _listModels;
    private _updateModels;
    private formTextMsg;
    getBalance(context: Context): Promise<Balance>;
    chat(prompt: IDict<string>[], context: Context): Promise<IDict<string>>;
    private chat_turbo;
    private chat_text;
    keys(prompt: string, context: Context): Promise<string[]>;
    embed(prompt: string, context: Context): Promise<number[]>;
    listen(file: string, prompt: string, context: Context): Promise<string>;
    code(prompt: string, context: Context): Promise<string>;
}
export interface Balance {
    total_used: number;
    total_granted: number;
    total_available: number;
}
