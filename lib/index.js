"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apply = exports.name = exports.reactive = void 0;
const koishi_1 = require("koishi");
const eye_1 = require("./eye");
const soul_1 = require("./soul");
const ai_1 = require("./ai");
const cache_1 = require("./cache");
__exportStar(require("./config"), exports);
exports.reactive = true;
exports.name = '@tomlbz/openai';
// global variables
const logger = new koishi_1.Logger('@tomlbz/openai');
const ai = new ai_1.AI();
const soul = new soul_1.Soul();
const eye = new eye_1.Eye();
const cache = new cache_1.Cache();
function apply(ctx, config) {
    ctx.on('ready', async () => {
        const bai = await ai.init(config);
        const bsoul = await soul.init(config);
        const beye = eye.init(config, ctx.root.config.nickname);
        const bcache = cache.init(config);
        if (config.isLog)
            logger.info(`Initialization: AI(${bai ? '√' : 'X'}) Soul(${bsoul ? '√' : 'X'}) Eye(${beye ? '√' : 'X'}) Cache(${bcache ? '√' : 'X'})`);
    });
    ctx.middleware(async (session, next) => {
        const input = eye.readInput(ctx, session);
        if (!input)
            return next();
        if (!cache.get(session.username)) { // if empty cache, fill it with sample prompts
            const sampleprompts = eye.samplePrompt(session.username);
            sampleprompts.forEach(p => cache.push(session.username, p));
        }
        const iembeddings = await ai.embed(input);
        const ikeywords = await ai.chat(eye.keywordPrompt(input, session.username));
        const imetadata = eye.getMetadata(input, ikeywords, session.username);
        const irelated = await soul.recallNext(iembeddings, imetadata); // get related messages
        await soul.remember(iembeddings, imetadata); // save current message to vector database
        const pask = eye.askPrompt(input, session.username, irelated, cache.get(session.username));
        cache.push(session.username, eye.userPrompt(input, session.username)); // save original input to cache
        const rask = await ai.chat(pask);
        cache.push(session.username, rask); // save reply to cache
        const rasktext = rask['content'];
        const rtembeddings = await ai.embed(rasktext);
        const rtkeywords = await ai.chat(eye.keywordPrompt(rasktext, config.botName));
        const rtmetadata = eye.getMetadata(rasktext, rtkeywords, config.botName);
        await soul.remember(rtembeddings, rtmetadata); // save reply to vector database
        return eye.devPrint([JSON.stringify(cache.get(session.username))]);
    });
}
exports.apply = apply;
