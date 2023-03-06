import { Context, Logger } from 'koishi'
import { Config } from './config'
import { IDict } from './types'

/// This is a class that represents the state of the AI.
export class AI {
    private _islog: boolean
    private _name: string
    private _logger: Logger
    private _openaiKey: string
    private _allmodels: IDict<string[]>
    private _chatmodel: string
    private _codemodel: string
    private _embedmodel: string
    private _audiomodel: string
    private _nTokens: number
    private _temperature: number
    private _presencePenalty: number
    private _frequencyPenalty: number
    constructor() {}
    public async init(config: Config, context: Context, parentName: string = '@tomlbz/openai') : Promise<boolean> {
        this._islog = config.isLog
        this._name = config.botName
        this._logger = new Logger(parentName + '/ai')
        this._nTokens = config.nTokens
        this._temperature = config.temperature
        this._presencePenalty = config.presencePenalty
        this._frequencyPenalty = config.frequencyPenalty
        this._openaiKey = config.apiKey
        this._allmodels = await this._listModels(context)
        return this._updateModels(config.chatModel, config.codeModel)
    }
    private _modelType(model: string) : string {
        if (model.includes('whisper')) return 'audio'
        if (model.includes('embedding')) return 'embed'
        if (model.includes('code')) return 'code'
        if (model.includes('turbo') || model.includes('text') ) return 'chat'
        return 'generic'
    }
    private async _listModels(context: Context) : Promise<IDict<string[]>> {
        const excludeModels = ['deprecated', 'beta', 'if', 'search', 'similarity', 'edit', 'insert', ':']
        const response = await context.http.get(
            'https://api.openai.com/v1/models', { headers: {'Authorization': `Bearer ${this._openaiKey}`}})
        return response.data.filter((model) => {
            return !excludeModels.some((exclude) => model.id.includes(exclude))
        }).reduce((acc, model) => { const type = this._modelType(model.id)
            if (!acc[type]) acc[type] = []
            acc[type].push(model.id)
            return acc }, {} as IDict<string[]>)
    }

    private _updateModels(confchatmodel: string, confcodemodel: string) : boolean {
        const newdict = {} as IDict<string[]>
        for (const type in this._allmodels) {
            newdict[type] = this._allmodels[type].filter((model) => {
                if (type === 'chat') return model.includes(confchatmodel)
                if (type === 'audio') return model.includes('whisper')
                if (type === 'code') return model.includes(confcodemodel)
                if (type === 'embed') return model.includes('embedding')
                return false
            }).sort((a, b) => {
                if (a.length === b.length) { // convert last char to number
                    const a1 = a[a.length - 1]
                    const b1 = b[b.length - 1]
                    if (a1 >= '0' && a1 <= '9' && b1 >= '0' && b1 <= '9') return Number(b1) - Number(a1)
                    else return b.localeCompare(a)
                } else return a.length - b.length
            })
        }
        this._chatmodel = newdict['chat'][0]
        this._codemodel = newdict['code'][0]
        this._embedmodel = newdict['embed'][0]
        this._audiomodel = newdict['audio'][0]
        if (this._islog) {
            if (this._chatmodel) this._logger.info(`OpenAI Connected. Chat model: ${this._chatmodel}`)
            else {
                this._logger.warn('OpenAI connection failed. Please check your API key or internet connection.')
                return false
            }
        }
        return true
    }

    private formTextMsg(prompt: IDict<string>[]) : string {
        return prompt.reduce((acc, p) => {
            acc += `{"role": "${p['role']}", "content": "${p['content']}", "name": "${p['name']}"}\n`
            return acc
        }, '').trim()
    }

    // public methods
    public async chat(prompt: IDict<string>[], context: Context) : Promise<IDict<string>> {
        if (this._islog) this._logger.info(`Chat model: ${this._chatmodel}`)
        if (this._chatmodel.includes('turbo')) return await this.chat_turbo(prompt, context)
        else return await this.chat_text(prompt, context)
    }
    private async chat_turbo(prompt: IDict<string>[], context: Context) : Promise<IDict<string>> {
        const response = await context.http.post(
            'https://api.openai.com/v1/chat/completions', {
                model: this._chatmodel,
                messages: prompt as any,
                max_tokens: this._nTokens,
                temperature: this._temperature,
                presence_penalty: this._presencePenalty,
                frequency_penalty: this._frequencyPenalty,
                user: this._name // set user as bot name
            }, { headers: {
                'Authorization': `Bearer ${this._openaiKey}`,
                'Content-Type': 'application/json'
            }
        })
        const msg = response.choices[0].message
        return {role: msg.role, content: msg.content.trim(), name: 'assistant'} // this._name
    }
    private async chat_text(prompt: IDict<string>[], context: Context) : Promise<IDict<string>> {
        const response = await context.http.post(
            'https://api.openai.com/v1/completions', {
                model: this._chatmodel,
                prompt: this.formTextMsg(prompt),
                stop: '}',
                max_tokens: this._nTokens,
                temperature: this._temperature,
                presence_penalty: this._presencePenalty,
                frequency_penalty: this._frequencyPenalty,
                user: this._name // set user as bot name
            }, { headers: {
                'Authorization': `Bearer ${this._openaiKey}`,
                'Content-Type': 'application/json'
            }
        })
        let msg = response.choices[0].text + '}'
        msg = msg.match(/{.*}/g)[0] // extract json from response
        const obj = JSON.parse(msg) // try parsing msg as json
        if (obj.role && obj.content && obj.name) return obj as IDict<string>
        else { // manual parse: find content, then extract content
            let content = msg.split(',').filter((part) => part.includes('"content":'))[0].split(':')[1].trim()
            if (content[0] === '"') content = content.slice(1)
            if (content[content.length - 1] === '"') content = content.slice(0, content.length - 1)
            return {role: 'assistant', content: content, name: 'assistant'} as IDict<string> // this._name
        }
    }
    public async embed(prompt: string, context: Context) : Promise<number[]> {
        const res = await context.http.post(
            'https://api.openai.com/v1/embeddings', {
                model: this._embedmodel,
                input: prompt.trim(),
                user: this._name // set user as bot name
            }, { headers: {
                'Authorization': `Bearer ${this._openaiKey}`,
                'Content-Type': 'application/json'
            }
        })
        return res.data[0].embedding
    }
    public async listen(file: string, prompt: string, context: Context) : Promise<string> {
        const res = await context.http.post(
            'https://api.openai.com/v1/audio/transcriptions', {
                file: file,
                model: this._audiomodel,
                prompt: prompt
            }, { headers: {
                'Authorization': `Bearer ${this._openaiKey}`,
                'Content-Type': 'application/json'
            }
        })
        return res.text
    }
    public async code(prompt: string, context: Context) : Promise<string> {
        // TODO: add support for code completion
        // API Not Released Yet
        return ''
    }
}