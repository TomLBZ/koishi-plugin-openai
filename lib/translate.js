"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Translate = void 0;
const koishi_1 = require("koishi");
class Translate {
    constructor() { }
    async init(config, context, parentName = '@tomlbz/openai') {
        this._logger = new koishi_1.Logger(parentName + '/translate');
        this._islog = config.isLog;
        this._azureKey = config.azureTranslateKey;
        this._azureRegion = config.azureTranslateRegion;
        this.mode = await this._azureKey ? 'bing' : this.testTransl(context) ? 'google' : 'none'; //'baidu'
    }
    async testTransl(context) {
        const url = 'https://translate.google.com/translate_a/single?client=gtx&sl=auto&tl=zh-CN&dt=t&q=Who+is+Tom';
        const res = await context.http.get(url); //fetch(url)
        return res.ok;
    }
    async translate(query, tlang, context) {
        if (this._islog)
            this._logger.info(`Translate Mode: ${this.mode}`);
        if (this.mode === 'google')
            return await this._googleTranslate(query, tlang, context);
        if (this.mode === 'bing')
            return await this._bingTranslate(query, tlang, context);
        //if (this.mode === 'baidu') return await this._baiduTranslate(query, tlang)
        return '';
    }
    async _googleTranslate(query, tlang, context) {
        const url = `https://translate.google.com/translate_a/single?client=gtx&sl=auto&tl=${tlang}&dt=t&q=${encodeURIComponent(query)}`;
        const res = await context.http.get(url); //fetch(url)
        return res[0][0][0];
    }
    async _bingTranslate(query, tlang, context) {
        const url = `https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=${tlang}`;
        const res = await context.http.post(url, [{ 'Text': query }], {
            headers: {
                'Ocp-Apim-Subscription-Key': this._azureKey,
                'Ocp-Apim-Subscription-Region': this._azureRegion,
                'Content-Type': 'application/json'
            }
        });
        return res[0].translations[0].text;
    }
    async _baiduTranslate(query, tlang, context) {
        // todo
        return '';
    }
}
exports.Translate = Translate;
