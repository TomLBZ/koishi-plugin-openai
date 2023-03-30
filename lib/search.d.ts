import { Context } from 'koishi';
import { Config } from './config';
export declare class Search {
    mode: string;
    private _logger;
    private _islog;
    private _googleSearchAdress;
    private _azureKey;
    private _azureRegion;
    constructor();
    init(config: Config, context: Context, parentName?: string): Promise<void>;
    private _currentGoogleSearchBaseUrl;
    private testSearch;
    private _reduceElement;
    private _getCommonClassName;
    private _keepCommonClass;
    private _reduceGoogleItems;
    private _checkClassName;
    private _checkClassNames;
    private _keepClassNames;
    private _parseResults;
    private googleSearch;
    private baiduSearch;
    private _isValidString;
    private bingSearch;
    search(query: string, topk: number, context: Context): Promise<string[]>;
}
