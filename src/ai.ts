import { Configuration, OpenAIApi, ChatCompletionRequestMessage, ChatCompletionRequestMessageRoleEnum, CreateChatCompletionRequest, CreateCompletionRequest } from 'openai'
import { Logger } from 'koishi'
import { Config, AIInvariant } from './config'
import { IDict } from './types'

/// This is a class that represents the state of the AI.
export class AI {
    // private constructor
    private constructor(
        // private state
        private readonly _logger: Logger,
        private readonly _invariant: AIInvariant,
        private readonly _openai: OpenAIApi,
        private readonly _models: IDict<string[]>,
        private  _islog: boolean,
        private  _name: string,
        private _chatmodel: string,
        private _codemodel: string,
        private _embedmodel: string,
    ) {}
    // static methods (factory)
    public static async create(config: Config) {
        const logger = new Logger('@tomlbz/openai/ai')
        const islog = config.isLog
        const name = config.botName
        const invariant : AIInvariant = {
            nTokens: config.nTokens,
            temperature: config.temperature,
            presencePenalty: config.presencePenalty,
            frequencyPenalty: config.frequencyPenalty,
        }
        const openai = new OpenAIApi(new Configuration({apiKey: config.apiKey}))
        const excludeModels = ['deprecated', 'beta', 'if', 'search', 'similarity', 'edit', 'insert', ':']
        const ftype = (model: string) => {
            if (model.includes('whisper')) return 'audio'
            if (model.includes('embedding')) return 'embed'
            if (model.includes('code')) return 'code'
            if (model.includes('turbo') || model.includes('text') ) return 'chat'
            return 'generic'
        }
        const models = await (await openai.listModels()).data.data.filter((model) => {
            return !excludeModels.some((exclude) => model.id.includes(exclude))
        }).reduce((acc, model) => {
            const type = ftype(model.id)
            if (!acc[type]) acc[type] = []
            acc[type].push(model.id)
            return acc
        }, {} as IDict<string[]>)
        const usablemodels = AI._usableModels(models, config.chatModel, config.codeModel)
        const chat = usablemodels['chat'][0]
        const code = usablemodels['code'][0]
        const embed = usablemodels['embed'][0]
        if (chat && islog) logger.info(`OpenAI connected. Chat model: ${chat}`)
        else if (islog) logger.warn('OpenAI connection failed. Please check your API key or internet connection.')
        return new AI(logger, invariant, openai, models, islog, name, chat, code, embed)
    }

    private static _usableModels(models: IDict<string[]>, chatmodel: string, codemodel: string) {
        const newdict = {} as IDict<string[]>
        for (const type in models) {
            newdict[type] = models[type].filter((model) => {
                if (type === 'chat') return model.includes(chatmodel)
                if (type === 'audio') return model.includes('whisper')
                if (type === 'code') return model.includes(codemodel)
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
        return newdict
    }

    // private methods
    private formChatMsg(prompt: IDict<string>[]) : ChatCompletionRequestMessage[] {
        return prompt.map((p) => {
            return {
                role: p['role'] as ChatCompletionRequestMessageRoleEnum,
                content: p['content'],
                name: p['name']
            } as ChatCompletionRequestMessage
        })
    }
    private formTextMsg(prompt: IDict<string>[]) : string {
        return prompt.reduce((acc, p) => {
            acc += `{"role": "${p['role']}", "content": "${p['content']}", "name": "${p['name']}"}\n`
            return acc
        }, '').trim()
    }

    // public methods
    public async chat(prompt: IDict<string>[]) : Promise<IDict<string>> {
        if (this._islog) this._logger.info(`Chat model: ${this._chatmodel}`)
        if (this._chatmodel.includes('turbo')) return await this.chat_turbo(prompt)
        else return await this.chat_text(prompt)
    }
    private async chat_turbo(prompt: IDict<string>[]) : Promise<IDict<string>> {
        const req = {
            model: this._chatmodel,
            messages: this.formChatMsg(prompt),
            // stop is unspecified for chat.
            max_tokens: this._invariant.nTokens,
            temperature: this._invariant.temperature,
            presence_penalty: this._invariant.presencePenalty,
            frequency_penalty: this._invariant.frequencyPenalty,
            user: this._name // set user as bot name
        } as CreateChatCompletionRequest
        const comp = await this._openai.createChatCompletion(req as any)
        const msg = comp.data.choices[0].message
        return {role: msg.role, content: msg.content.trim(), name: this._name}
    }
    private async chat_text(prompt: IDict<string>[]) : Promise<IDict<string>> {
        const req = {
            model: this._chatmodel,
            prompt: this.formTextMsg(prompt),
            stop: '}',
            max_tokens: this._invariant.nTokens,
            temperature: this._invariant.temperature,
            presence_penalty: this._invariant.presencePenalty,
            frequency_penalty: this._invariant.frequencyPenalty,
            user: this._name // set user as bot name
        } as CreateCompletionRequest
        let msg = await (await this._openai.createCompletion(req)).data.choices[0].text + '}'
        msg = msg.match(/{.*}/g)[0] // extract json from response
        const obj = JSON.parse(msg) // try parsing msg as json
        if (obj.role && obj.content && obj.name) return obj as IDict<string>
        else { // manual parse: find content, then extract content
            let content = msg.split(',').filter((part) => part.includes('"content":'))[0].split(':')[1].trim()
            if (content[0] === '"') content = content.slice(1)
            if (content[content.length - 1] === '"') content = content.slice(0, content.length - 1)
            return {role: 'assistant', content: content, name: this._name} as IDict<string>
        }
    }

    public async embed(prompt: string) : Promise<number[]> {
        const req = {
            model: this._embedmodel,
            input: prompt.trim(),
            user: this._name // set user as bot name
        }
        return await (await this._openai.createEmbedding(req)).data.data[0].embedding
    }

    public async code(prompt: string) : Promise<string> {
        const req = {
            model: this._codemodel,
            prompt: prompt.trim(),
            max_tokens: this._invariant.nTokens,
            temperature: this._invariant.temperature,
            presence_penalty: this._invariant.presencePenalty,
            frequency_penalty: this._invariant.frequencyPenalty,
            user: this._name // set user as bot name
        }
        return await (await this._openai.createCompletion(req)).data.choices[0].text
    }

    public update(config : Config) {
        this._islog = config.isLog
        this._name = config.botName
        this._invariant.nTokens = config.nTokens
        this._invariant.temperature = config.temperature
        this._invariant.presencePenalty = config.presencePenalty
        this._invariant.frequencyPenalty = config.frequencyPenalty
        const usablemodels = AI._usableModels(this._models, config.chatModel, config.codeModel)
        const chat = usablemodels['chat'][0]
        const code = usablemodels['code'][0]
        const embed = usablemodels['embed'][0]
        this._chatmodel = chat
        this._codemodel = code
        this._embedmodel = embed
    }

}