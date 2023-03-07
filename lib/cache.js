"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cache = void 0;
const fs_extra_1 = require("fs-extra");
const koishi_1 = require("koishi");
class Cache {
    constructor() { }
    init(config) {
        this._pushcount = 0;
        this._cacheLen = config.cacheSize;
        this._cacheSaveInterval = Math.min(config.cacheSaveInterval, this._cacheLen);
        this._cacheSaveDir = config.cacheSaveDir;
        this._islog = config.isLog;
        this._logger = new koishi_1.Logger('@tomlbz/openai/cache');
        this.load(); // load cache from file or create a new one
        return true;
    }
    update(config) {
        this._cacheLen = config.cacheSize;
        this._cacheSaveInterval = Math.min(config.cacheSaveInterval, this._cacheLen);
        this._cacheSaveDir = config.cacheSaveDir;
        this.load(); // load cache from file or create a new one
        return true;
    }
    push(name, msg) {
        if (!this._cache.has(name))
            this._cache.set(name, []);
        const cache = this._cache.get(name);
        // if there is some element in cache with the same content, remove it
        cache.forEach((e, i) => { if (e.content === msg.content)
            cache.splice(i, 1); });
        while (cache.length >= this._cacheLen)
            cache.shift();
        cache.push(msg);
        this._pushcount++;
        if (this._pushcount >= this._cacheSaveInterval) {
            // sleep for 1 second to avoid too many file operations
            setTimeout(() => {
                if (this._islog)
                    this._logger.info('Saving cache...');
                this.save();
                this._pushcount = 0;
            }, 1000);
        }
    }
    get(name) {
        return this._cache.get(name);
    }
    save() {
        if (!(0, fs_extra_1.existsSync)(this._cacheSaveDir))
            (0, fs_extra_1.mkdirSync)(this._cacheSaveDir);
        const str = JSON.stringify(Object.fromEntries(this._cache));
        (0, fs_extra_1.writeJSONSync)(`${this._cacheSaveDir}/cache.json`, str);
    }
    load() {
        if ((0, fs_extra_1.existsSync)(`${this._cacheSaveDir}/cache.json`)) {
            const o = JSON.parse((0, fs_extra_1.readJSONSync)(`${this._cacheSaveDir}/cache.json`));
            this._cache = new Map(Object.entries(o));
            if (this._islog)
                this._logger.info(`Cache loaded from ${this._cacheSaveDir}/cache.json`);
        }
        else {
            this._cache = new Map();
            if (this._islog)
                this._logger.info('New empty cache created');
        }
    }
}
exports.Cache = Cache;
