import { Config } from "./config";
import { Context } from "koishi";
export declare class Translate {
    mode: string;
    private _azureKey;
    private _azureRegion;
    private _islog;
    private _logger;
    constructor();
    init(config: Config, context: Context, parentName?: string): Promise<void>;
    private testTransl;
    translate(query: string, tlang: string, context: Context): Promise<string>;
    private _googleTranslate;
    private _bingTranslate;
    private _baiduTranslate;
}
