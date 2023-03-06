import { Config } from "./config"
import { Logger } from "koishi"

export class Translate {
    public mode: string
    private _azureKey: string
    private _azureRegion: string
    private _islog: boolean
    private _logger: Logger
    constructor() {}
    public async init(config: Config, parentName: string = '@tomlbz/openai') : Promise<void> {
        this._logger = new Logger(parentName + '/translate')
        this._islog = config.isLog
        this._azureKey = config.azureTranslateKey
        this._azureRegion = config.azureTranslateRegion
        this.mode = await this._azureKey ? 'bing' : this.testTransl() ? 'google' : 'none' //'baidu'
    }
    private async testTransl() : Promise<boolean> {
        const url = 'https://translate.google.com/translate_a/single?client=gtx&sl=auto&tl=zh-CN&dt=t&q=Who+is+Tom'
        const res = await fetch(url)
        return res.ok
    }
    public async translate(query: string, tlang: string) : Promise<string> {
        if (this._islog) this._logger.info(`Translate Mode: ${this.mode}`)
        if (this.mode === 'google') return await this._googleTranslate(query, tlang)
        if (this.mode === 'bing') return await this._bingTranslate(query, tlang)
        //if (this.mode === 'baidu') return await this._baiduTranslate(query, tlang)
        return ''
    }
    private async _googleTranslate(query: string, tlang: string) : Promise<string> {
        const url = `https://translate.google.com/translate_a/single?client=gtx&sl=auto&tl=${tlang}&dt=t&q=${encodeURIComponent(query)}`
        const res = await fetch(url)
        const json = await res.json()
        return json[0][0][0]
    }
    private async _bingTranslate(query: string, tlang: string) : Promise<string> {
        const url = `https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=${tlang}`
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Ocp-Apim-Subscription-Key': this._azureKey,
                'Ocp-Apim-Subscription-Region': this._azureRegion,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify([{ 'Text': query }])
        })
        const json = await res.json()
        return json[0].translations[0].text
    }
    private async _baiduTranslate(query: string, tlang: string) : Promise<string> {
        // todo
        return ''
    }
}