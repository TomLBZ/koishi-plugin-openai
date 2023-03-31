import { IDict } from "./types";
import { Config } from "./config";
export declare class Cache {
    private _cache;
    private _cacheLen;
    private _cacheSaveInterval;
    private _cacheSaveDir;
    private _pushcount;
    private _islog;
    private _logger;
    constructor();
    init(config: Config): boolean;
    update(config: Config): boolean;
    push(name: string, msg: IDict<string>): void;
    get(name: string): IDict<string>[];
    remove(name: string): void;
    save(): void;
    load(): void;
}
