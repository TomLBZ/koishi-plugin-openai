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
        this.mode = await this.testTransl(context) ? 'Google' : this._azureKey ? 'Bing' : 'None'; //'baidu'
    }
    async testTransl(context) {
        const url = 'https://translate.google.com/translate_a/single?client=gtx&sl=auto&tl=zh-CN&dt=t&q=Who+is+Tom';
        try {
            const res = await context.http.get(url); //fetch(url)
            return res[0][0].length > 0;
        }
        catch (_) {
            return false;
        }
    }
    async translate(query, tlang, context) {
        if (this.mode === 'Google')
            return await this._googleTranslate(query, tlang, context);
        if (this.mode === 'Bing')
            return await this._bingTranslate(query, tlang, context);
        //if (this.mode === 'baidu') return await this._baiduTranslate(query, tlang)
        return '';
    }
    async _googleTranslate(query, tlang, context) {
        try {
            const url = `https://translate.google.com/translate_a/single?client=gtx&sl=auto&tl=${tlang}&dt=t&q=${encodeURIComponent(query)}`;
            const res = await context.http.get(url); //fetch(url)
            return res[0][0][0];
        }
        catch (_) {
            this._logger.error('Google Translate Failed');
            return '';
        }
    }
    async _bingTranslate(query, tlang, context) {
        try {
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
        catch (_) {
            this._logger.error('Bing Translate Failed');
            return '';
        }
    }
    async _baiduTranslate(query, tlang, context) {
        // todo
        return '';
    }
}
exports.Translate = Translate;
