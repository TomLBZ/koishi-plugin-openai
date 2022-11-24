"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryDict = void 0;
const fs_extra_1 = __importDefault(require("fs-extra"));
class MemoryDict {
    constructor(textMemLen, summaryMemLen, topicMemLen) {
        this.textMemDict = new Map();
        this.summaryMemDict = new Map();
        this.topicMemDict = new Map();
        this.textMemLen = textMemLen;
        this.summaryMemLen = summaryMemLen;
        this.topicMemLen = topicMemLen;
    }
    updateLengths(textMemLen, summaryMemLen, topicMemLen) {
        this.textMemLen = textMemLen;
        this.summaryMemLen = summaryMemLen;
        this.topicMemLen = topicMemLen;
    }
    createMemory(key) {
        let created = false;
        if (!this.textMemDict.has(key)) {
            this.textMemDict.set(key, []);
            created = true;
        }
        if (!this.summaryMemDict.has(key)) {
            this.summaryMemDict.set(key, []);
        }
        if (!this.topicMemDict.has(key)) {
            this.topicMemDict.set(key, []);
        }
        return created;
    }
    getTextMemory(key) {
        return this.textMemDict.get(key);
    }
    getSummaryMemory(key) {
        return this.summaryMemDict.get(key);
    }
    getTopicMemory(key) {
        return this.topicMemDict.get(key);
    }
    updateTextMemory(key, value) {
        const tMemory = this.textMemDict.get(key);
        while (tMemory.length >= this.textMemLen) {
            tMemory.shift();
        }
        tMemory.push(value);
    }
    updateSummaryMemory(key, value) {
        const sMemory = this.summaryMemDict.get(key);
        while (sMemory.length >= this.summaryMemLen) {
            sMemory.shift();
        }
        sMemory.push(value);
    }
    updateTopicMemory(key, value) {
        const tMemory = this.topicMemDict.get(key);
        while (tMemory.length >= this.topicMemLen) {
            tMemory.shift();
        }
        tMemory.push(value);
    }
    saveMemory() {
        const dir = './openaimemory';
        if (!fs_extra_1.default.existsSync(dir)) {
            fs_extra_1.default.mkdirSync(dir);
        }
        let j = JSON.stringify(Object.fromEntries(this.textMemDict));
        fs_extra_1.default.writeJSONSync(`${dir}/textMemDict.json`, j);
        j = JSON.stringify(Object.fromEntries(this.summaryMemDict));
        fs_extra_1.default.writeJSONSync(`${dir}/summaryMemDict.json`, j);
        j = JSON.stringify(Object.fromEntries(this.topicMemDict));
        fs_extra_1.default.writeJSONSync(`${dir}/topicMemDict.json`, j);
    }
    loadMemory() {
        const dir = './openaimemory';
        let o = null;
        if (fs_extra_1.default.existsSync(`${dir}/textMemDict.json`)) {
            o = JSON.parse(fs_extra_1.default.readJSONSync(`${dir}/textMemDict.json`));
            this.textMemDict = new Map(Object.entries(o));
        }
        if (fs_extra_1.default.existsSync(`${dir}/summaryMemDict.json`)) {
            o = JSON.parse(fs_extra_1.default.readJSONSync(`${dir}/summaryMemDict.json`));
            this.summaryMemDict = new Map(Object.entries(o));
        }
        if (fs_extra_1.default.existsSync(`${dir}/topicMemDict.json`)) {
            o = JSON.parse(fs_extra_1.default.readJSONSync(`${dir}/topicMemDict.json`));
            this.topicMemDict = new Map(Object.entries(o));
        }
    }
}
exports.MemoryDict = MemoryDict;
