import { IDict } from "./types";
import { writeJSONSync, readJSONSync, existsSync, mkdirSync } from "fs-extra";
import { Config } from "./config";
import { Logger } from "koishi";

export class Cache {
    private _cache: Map<string, IDict<string>[]>
    private _cacheLen: number
    private _cacheSaveInterval: number
    private _cacheSaveDir: string
    private _pushcount: number
    private _islog: boolean
    private _logger: Logger
    constructor() {}
    public init(config: Config) : boolean {
        this._pushcount = 0
        this._cacheLen = config.cacheSize
        this._cacheSaveInterval = Math.min(config.cacheSaveInterval, this._cacheLen)
        this._cacheSaveDir = config.cacheSaveDir
        this._islog = config.isLog
        this._logger = new Logger('@tomlbz/openai/cache')
        this.load() // load cache from file or create a new one
        return true
    }
    public update(config: Config) : boolean {
        this._cacheLen = config.cacheSize
        this._cacheSaveInterval = Math.min(config.cacheSaveInterval, this._cacheLen)
        this._cacheSaveDir = config.cacheSaveDir
        this.load() // load cache from file or create a new one
        return true
    }
    public push(name: string, msg: IDict<string>): void {
        if (!this._cache.has(name)) this._cache.set(name, []);
        const cache = this._cache.get(name)
        // if there is some element in cache with the same content, remove it
        cache.forEach((e, i) => {if (e.content === msg.content) cache.splice(i, 1)})
        while (cache.length >= this._cacheLen) cache.shift()
        cache.push(msg)
        this._pushcount++
        if (this._pushcount >= this._cacheSaveInterval) {
            // sleep for 0.2 second to avoid too many file operations
            setTimeout(() => {
                if (this._islog) this._logger.info('Saving cache...')
                this.save()
                this._pushcount = 0
            }, 200)
        }
    }
    public get(name: string): IDict<string>[] {
        return this._cache.get(name)
    }
    public save() {
        if (!existsSync(this._cacheSaveDir)) mkdirSync(this._cacheSaveDir)
        const str = JSON.stringify(Object.fromEntries(this._cache))
        writeJSONSync(`${this._cacheSaveDir}/cache.json`, str)
    }
    public load() {
        if (existsSync(`${this._cacheSaveDir}/cache.json`)) {
            const o =JSON.parse(readJSONSync(`${this._cacheSaveDir}/cache.json`))
            this._cache = new Map(Object.entries(o))
            if (this._islog) this._logger.info(`Cache loaded from ${this._cacheSaveDir}/cache.json`)
        } else {
            this._cache = new Map()
            if (this._islog) this._logger.info('New empty cache created')
        }
    }
}
