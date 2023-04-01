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
exports.name = "@tomlbz/openai";
// global variables
const logger = new koishi_1.Logger("@tomlbz/openai");
const ai = new ai_1.AI();
const soul = new soul_1.Soul();
const eye = new eye_1.Eye();
const cache = new cache_1.Cache();
let lastTime = 0;
function apply(ctx, config) {
    const replyMessage = async (session, message) => {
        if (config.isLog) {
            logger.info(`Reply: ${message}`);
        }
        session.send(config.isReplyWithAt && session.subtype === "group"
            ? (0, koishi_1.h)("at", { id: session.userId }) + message
            : message);
    };
    ctx.on("ready", async () => {
        const bai = await ai.init(config, ctx, exports.name);
        if (bai == false) {
            logger.error("AI initialization failed");
            lastTime = -1;
            return;
        }
        const bsoul = await soul.init(config, ctx, exports.name);
        const beye = eye.init(config, ctx.root.config.nickname, exports.name);
        const bcache = cache.init(config);
        if (config.isLog)
            logger.info(`Initialization: AI(${bai ? "√" : "X"}) Soul(${bsoul ? "√" : "X"}) Eye(${beye ? "√" : "X"}) Cache(${bcache ? "√" : "X"})`);
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
        if (lastTime == -1)
            return next();
        const input = eye.readInput(ctx, session);
        const username = session.userId; // only alphanumeric characters are allowed!!!
        if (!input || input.length === 0)
            return next();
        const now = Date.now();
        if (lastTime == 0) {
            if (config.isLog)
                logger.info("init.....");
            // await replyMessage(session, "还在初始化中....");
            return next();
        }
        if (now - lastTime < config.msgCooldown * 1000) {
            if (config.isLog)
                logger.info(`Cooldown: ${now - lastTime}ms < ${config.msgCooldown * 1000}ms, skipping...`);
            // await replyMessage("冷却中....");
            return next();
        }
        lastTime = now;
        if (!cache.get(username)) {
            // if empty cache, fill it with sample prompts
            const sampleprompts = eye.samplePrompt(username);
            sampleprompts.forEach((p) => cache.push(username, p));
        }
        const t = {
            start: 0,
            openai: 0,
            wolfram: 0,
            pinecone: 0,
            search: 0,
            cache: 0, // cache
        };
        // ======== 处理输入向量 ========
        t.start = Date.now();
        const iembeddings = await ai.embed(input, ctx); // 计算输入的向量
        const ikeywords = await ai.keys(eye.keywordPrompt(input), ctx); // 获取关键词数组
        const imetadata = eye.getMetadata(input, ikeywords, username); // 生成输入向量的元数据
        if (config.isLog)
            logger.info(`Input Keywords: ${JSON.stringify(ikeywords)}`); // 打印输入的关键词
        t.openai += Date.now() - t.start;
        // ======== 有计算结果，无需检索数据库，无需搜索 ========
        t.start = Date.now();
        let mainprompt = eye.basePrompt(input, username, cache.get(username), ""); // 生成无提示的基础会话
        let hint = await soul.compute(input, ctx); // 获取WolframAlpha的计算结果为hint
        t.wolfram += Date.now() - t.start;
        t.start = Date.now();
        if (hint && hint.length > 0) {
            // 计算结果不为空，无需用其他任何知识，因为Wolfram永远正确
            if (config.isLog)
                logger.info(`Knowledge Mode: WolframAlpha: ${hint}`);
            mainprompt = eye.basePrompt(input, username, cache.get(username), hint); // 生成基础会话
            t.wolfram += Date.now() - t.start;
            t.start = Date.now();
        }
        else {
            // ======== 需要检索数据库，或者搜索 ========
            const mdatas = await soul.recall(iembeddings, ikeywords, ctx); // 检索包含关键词的向量中与输入最相似的TopK个向量元数据
            const mkeywords = eye.extractNewKeywords(mdatas, ikeywords); // 提取这些向量中的新关键词，不包含输入中有的关键词
            if (config.isLog)
                logger.info(`Memory Keywords: ${JSON.stringify(mkeywords)}`);
            let info = []; // 用于存储检索结果
            t.pinecone += Date.now() - t.start;
            t.start = Date.now();
            if (mkeywords && mkeywords.length > 0) {
                // 如果有新关键词，可以检索数据库
                const ametadatas = await soul.recall(iembeddings, mkeywords, ctx); // 检索包含新关键词的向量中与输入最相似的TopK个向量元数据
                info = ametadatas.map((m) => m.text); // 提取这些向量的文本，可能为空
                if (config.isLog)
                    logger.info(`Pinecone found ${info.length} matches`);
                t.pinecone += Date.now() - t.start;
                t.start = Date.now();
            } // 如果没有新关键词，或者检索结果不足，需要上网搜索
            if (!info || info.length < config.searchTopK) {
                if (ikeywords && ikeywords.length > 0) {
                    // 如果输入有关键词，可以搜索
                    const webres = await soul.search(input, ctx); // 搜索原始输入
                    if (webres && webres.length > 0) {
                        // 如果搜索结果不为空，可以加入info
                        if (config.isLog)
                            logger.info(`Knowledge Mode: ${soul.searchMode}`);
                        info.push(...webres); // 将搜索结果添加到info中
                    }
                }
                t.search += Date.now() - t.start;
                t.start = Date.now();
            }
            else if (config.isLog)
                logger.info(`Knowledge Mode: Long-term Memory`);
            const usedinfo = info.slice(0, config.searchTopK); // 保留前K个结果
            if (usedinfo && usedinfo.length > 0) {
                // 如果有记忆或搜索结果，可以生成主会话
                const infotext = usedinfo.join("。"); // 将usedinfo数组拼接成字符串
                mainprompt = eye.basePrompt(input, username, cache.get(username), infotext); // 生成基础会话
            }
            t.pinecone += Date.now() - t.start;
            t.start = Date.now();
        } // ======== 生成回复 ========
        if (config.isDebug)
            logger.info(`Main Prompt: ${JSON.stringify(mainprompt)}`);
        const reply = await ai.chat(mainprompt, ctx); // 获取回复
        // reply['content'] = reply['content'].replace(/\n/g, '。') // 将回复中的换行符替换成句号
        const rtext = reply["content"]; // 获取回复的文本
        const rembeddings = await ai.embed(rtext, ctx); // 计算回复的向量
        const rkeywords = await ai.keys(eye.keywordPrompt(rtext), ctx); // 获取关键词数组
        if (config.isLog)
            logger.info(`Reply Keywords: ${JSON.stringify(rkeywords)}`);
        const rtmetadata = eye.getMetadata(rtext, rkeywords, config.botName); // 生成回复向量的元数据
        t.openai += Date.now() - t.start;
        t.start = Date.now();
        // ======== 更新记忆 ========
        cache.push(username, eye.userPrompt(input, username)); // 将原始输入保存到短期记忆
        reply["content"] = reply["content"].trim();
        if (reply["content"] && reply["content"].length > 0)
            cache.push(username, reply); // 将回复保存到短期记忆
        t.cache += Date.now() - t.start;
        t.start = Date.now();
        await soul.remember(iembeddings, imetadata, ctx); // 用原始元数据存储输入的向量
        if (reply["content"] && reply["content"].length > 0)
            await soul.remember(rembeddings, rtmetadata, ctx); // 用回复元数据存储回复的向量
        t.pinecone += Date.now() - t.start;
        // ======== 打印统计信息 ========
        if (config.isLog) {
            logger.info(`Pinecone: ${t.pinecone}ms, Wolfram: ${t.wolfram}ms, Search(${soul.searchMode}): ${t.search}ms, OpenAI: ${t.openai}ms, Cache: ${t.cache}ms`);
            const totaltime = t.pinecone + t.wolfram + t.search + t.openai + t.cache;
            const maxtime = Math.max(t.pinecone, t.wolfram, t.search, t.openai, t.cache);
            const maxlabel = Object.keys(t).find((key) => t[key] === maxtime);
            const percent = ((maxtime / totaltime) * 100).toFixed(2);
            logger.info(`Slowest: ${maxlabel} with ${percent}% of the time`);
        }
        if (config.isLog)
            logger.info(`Reply: ${rtext}`);
        return config.isReplyWithAt && session.subtype === "group"
            ? (0, koishi_1.h)("at", { id: session.userId }) + rtext
            : rtext; // 按情况@发送者
    });
    ctx
        .command("balance", "查询API KEY的可用的供API调用的余额")
        .alias("余额")
        .action(async ({ session }) => {
        const balance = await ai.getBalance(ctx);
        const replyText = `余额：$${balance.total_used.toFixed(2)} / $${balance.total_granted.toFixed(2)}\n已用 ${((balance.total_used / balance.total_granted) *
            100).toFixed(2)}%`;
        await replyMessage(session, replyText);
    });
}
exports.apply = apply;
