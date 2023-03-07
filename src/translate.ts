import { Config } from "./config"
import { Context, Logger } from "koishi"

export class Translate {
    public mode: string
    private _azureKey: string
    private _azureRegion: string
    private _islog: boolean
    private _logger: Logger
    constructor() {}
    public async init(config: Config, context: Context, parentName: string = '@tomlbz/openai') : Promise<void> {
        this._logger = new Logger(parentName + '/translate')
        this._islog = config.isLog
        this._azureKey = config.azureTranslateKey
        this._azureRegion = config.azureTranslateRegion
        this.mode = await this.testTransl(context) ? 'Google' : this._azureKey ? 'Bing' : 'None' //'baidu'
    }
    private async testTransl(context: Context) : Promise<boolean> {
        const url = 'https://translate.google.com/translate_a/single?client=gtx&sl=auto&tl=zh-CN&dt=t&q=Who+is+Tom'
        try {
            const res = await context.http.get<Response>(url) //fetch(url)
            return res[0][0].length > 0
        } catch (_) { return false }
    }
    public async translate(query: string, tlang: string, context: Context) : Promise<string> {
        if (this.mode === 'Google') return await this._googleTranslate(query, tlang, context)
        if (this.mode === 'Bing') return await this._bingTranslate(query, tlang, context)
        //if (this.mode === 'baidu') return await this._baiduTranslate(query, tlang)
        return ''
    }
    private async _googleTranslate(query: string, tlang: string, context: Context) : Promise<string> {
        try {
            const url = `https://translate.google.com/translate_a/single?client=gtx&sl=auto&tl=${tlang}&dt=t&q=${encodeURIComponent(query)}`
            const res = await context.http.get<any>(url) //fetch(url)
            return res[0][0][0]
        } catch (_) {
            this._logger.error('Google Translate Failed')
            return ''
        }
    }
    private async _bingTranslate(query: string, tlang: string, context: Context) : Promise<string> {
        try {
            const url = `https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=${tlang}`
            const res = await context.http.post<any>(url, [{ 'Text': query }], {
                headers: {
                    'Ocp-Apim-Subscription-Key': this._azureKey,
                    'Ocp-Apim-Subscription-Region': this._azureRegion,
                    'Content-Type': 'application/json'
                }
            })
            return res[0].translations[0].text
        } catch (_) {
            this._logger.error('Bing Translate Failed')
            return ''
        }
    }
    private async _baiduTranslate(query: string, tlang: string, context: Context) : Promise<string> {
        // todo
        return ''
    }
}