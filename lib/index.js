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
let lastTime = Date.now();
function apply(ctx, config) {
    ctx.on('ready', async () => {
        const bai = await ai.init(config, ctx, exports.name);
        const bsoul = await soul.init(config, ctx, exports.name);
        const beye = eye.init(config, ctx.root.config.nickname, exports.name);
        const bcache = cache.init(config);
        if (config.isLog)
            logger.info(`Initialization: AI(${bai ? '√' : 'X'}) Soul(${bsoul ? '√' : 'X'}) Eye(${beye ? '√' : 'X'}) Cache(${bcache ? '√' : 'X'})`);
        lastTime = Date.now();
    });
    // ctx.middleware(async (session, next) => {
    //   // TODO: clear memory cache and delete user's vectors from pinecone
    //   // const deleteCommand = eye.parseCommand(session.message)
    //   // 1. delete by prompt -> embeddings and similarity score
    //   // 2. delete by username
    //   // only enables forgetting in PRIVATE CHAT
    //   // deletecommand: {which: 'local'|'remote'|'both', timediff: number, username: string}
    //   // if (deleteCommand) {... return '已删除5/5条消息'} else {return next()}
    //   return next()
    // }, true)
    ctx.middleware(async (session, next) => {
        const now = Date.now();
        if (now - lastTime < config.msgCooldown * 1000) {
            if (config.isLog)
                logger.info(`Cooldown: ${now - lastTime}ms < ${config.msgCooldown * 1000}ms, skipping...`);
            return next();
        }
        lastTime = now;
        const input = eye.readInput(ctx, session);
        const username = session.userId; // only alphanumeric characters are allowed!!!
        if (!input)
            return next();
        if (!cache.get(username)) { // if empty cache, fill it with sample prompts
            const sampleprompts = eye.samplePrompt(username);
            sampleprompts.forEach(p => cache.push(username, p));
        }
        const knowledges = await soul.compute(input, ctx);
        const iembeddings = await ai.embed(input, ctx);
        const ikeywords = await ai.chat(eye.keywordPrompt(input, username), ctx);
        if (config.isDebug)
            logger.info(`Keywords: ${JSON.stringify(ikeywords)}`);
        const imetadata = eye.getMetadata(input, ikeywords, username);
        const irelated = await soul.recall(iembeddings, imetadata, ctx); // get related messages
        if (config.isDebug)
            logger.info(`Related: ${irelated}`);
        await soul.remember(iembeddings, imetadata, ctx); // save current message to vector database
        const pask = eye.askPrompt(input, username, irelated, knowledges, soul.isAccurate, cache.get(username));
        if (config.isDebug)
            logger.info(`Prompt: ${JSON.stringify(pask)}`);
        cache.push(username, eye.userPrompt(input, username)); // save original input to cache
        const rask = await ai.chat(pask, ctx);
        if (config.isDebug)
            logger.info(`Reply: ${JSON.stringify(rask)}`);
        cache.push(username, rask); // save reply to cache
        const rasktext = rask['content'];
        const rtembeddings = await ai.embed(rasktext, ctx);
        const rtkeywords = await ai.chat(eye.keywordPrompt(rasktext, username), ctx);
        if (config.isDebug)
            logger.info(`Reply Keywords: ${JSON.stringify(rtkeywords)}`);
        const rtmetadata = eye.getMetadata(rasktext, rtkeywords, config.botName); // config.botName
        await soul.remember(rtembeddings, rtmetadata, ctx); // save reply to vector database
        if (config.isReplyWithAt && session.subtype === 'group')
            return (0, koishi_1.h)('at', { id: session.userId }) + rasktext;
        return rasktext;
    });
}
exports.apply = apply;
