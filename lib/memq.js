"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemQ = void 0;
const fs_extra_1 = __importDefault(require("fs-extra"));
class MemQ {
    constructor(shortMemoryLength, longMemoryLength) {
        this.shortMemory = [];
        this.longMemory = [];
        this.shortMemoryLength = shortMemoryLength;
        this.longMemoryLength = longMemoryLength;
    }
    updateLength(shortMemoryLength, longMemoryLength) {
        this.shortMemoryLength = shortMemoryLength;
        this.longMemoryLength = longMemoryLength;
    }
    getShortMemory() {
        return this.shortMemory;
    }
    getLongMemory() {
        return this.longMemory;
    }
    pushShortMemory(text) {
        this.shortMemory.push(text);
        if (this.shortMemory.length > this.shortMemoryLength) {
            this.shortMemory.shift();
        }
    }
    pushLongMemory(text) {
        this.longMemory.push(text);
        if (this.longMemory.length > this.longMemoryLength) {
            this.longMemory.shift();
        }
    }
    saveMemory() {
        fs_extra_1.default.writeFileSync('shortMemory.json', JSON.stringify(this.shortMemory));
        fs_extra_1.default.writeFileSync('longMemory.json', JSON.stringify(this.longMemory));
    }
    loadMemory() {
        this.shortMemory = JSON.parse(fs_extra_1.default.readFileSync('shortMemory.json').toString());
        this.longMemory = JSON.parse(fs_extra_1.default.readFileSync('longMemory.json').toString());
    }
    clearMemory(shortMemTexts, longMemTexts) {
        this.shortMemory = [];
        this.longMemory = [];
        if (shortMemTexts) {
            this.shortMemory = shortMemTexts;
        }
        if (longMemTexts) {
            this.longMemory = longMemTexts;
        }
    }
    initMemory(shortMemTexts, longMemTexts) {
        if (fs_extra_1.default.existsSync('shortMemory.json') && fs_extra_1.default.existsSync('longMemory.json')) {
            this.loadMemory();
        }
        else {
            this.clearMemory(shortMemTexts, longMemTexts);
        }
    }
}
exports.MemQ = MemQ;
