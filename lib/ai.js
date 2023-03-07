"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AI = void 0;
const koishi_1 = require("koishi");
const tiktoken_1 = require("@dqbd/tiktoken");
/// This is a class that represents the state of the AI.
class AI {
    constructor() { }
    async init(config, context, parentName = '@tomlbz/openai') {
        this._islog = config.isLog;
        this._name = config.botName;
        this._logger = new koishi_1.Logger(parentName + '/ai');
        this._nTokens = config.nTokens;
        this._temperature = config.temperature;
        this._presencePenalty = config.presencePenalty;
        this._frequencyPenalty = config.frequencyPenalty;
        this._openaiKey = config.apiKey;
        this._allmodels = await this._listModels(context);
        return this._updateModels(config.chatModel, config.keywordModel, config.codeModel);
    }
    _modelType(model) {
        if (model.includes('whisper'))
            return 'audio';
        if (model.includes('embedding'))
            return 'embed';
        if (model.includes('code'))
            return 'code';
        if (model.includes('turbo'))
            return 'chat';
        if (model.includes('text')) {
            if (model.includes('davinci'))
                return 'chat';
            else
                return 'keyword';
        }
        return 'generic';
    }
    async _listModels(context) {
        const excludeModels = ['deprecated', 'beta', 'if', 'search', 'similarity', 'edit', 'insert', ':'];
        const response = await context.http.get('https://api.openai.com/v1/models', { headers: { 'Authorization': `Bearer ${this._openaiKey}` } });
        return response.data.filter((model) => {
            return !excludeModels.some((exclude) => model.id.includes(exclude));
        }).reduce((acc, model) => {
            const type = this._modelType(model.id);
            if (!acc[type])
                acc[type] = [];
            acc[type].push(model.id);
            return acc;
        }, {});
    }
    _updateModels(confchat, confkey, confcode) {
        const newdict = {};
        for (const type in this._allmodels) {
            newdict[type] = this._allmodels[type].filter((model) => {
                if (type === 'chat')
                    return model.includes(confchat);
                if (type === 'audio')
                    return model.includes('whisper');
                if (type === 'code')
                    return model.includes(confcode);
                if (type === 'embed')
                    return model.includes('embedding');
                if (type === 'keyword')
                    return model.includes(confkey);
                return false;
            }).sort((a, b) => {
                if (a.length === b.length) { // convert last char to number
                    const a1 = a[a.length - 1];
                    const b1 = b[b.length - 1];
                    if (a1 >= '0' && a1 <= '9' && b1 >= '0' && b1 <= '9')
                        return Number(b1) - Number(a1);
                    else
                        return b.localeCompare(a);
                }
                else
                    return a.length - b.length;
            });
        }
        this._chatmodel = newdict['chat'][0];
        this._codemodel = newdict['code'][0];
        this._embedmodel = newdict['embed'][0];
        this._audiomodel = newdict['audio'][0];
        this._keywordmodel = newdict['keyword'][0];
        if (this._islog) {
            if (this._chatmodel)
                this._logger.info(`OpenAI Connected. Chat model: ${this._chatmodel}`);
            else {
                this._logger.warn('OpenAI connection failed. Please check your API key or internet connection.');
                return false;
            }
        }
        return true;
    }
    formTextMsg(prompt) {
        return prompt.reduce((acc, p) => {
            acc += `{"role": "${p['role']}", "content": "${p['content']}", "name": "${p['name']}"}\n`;
            return acc;
        }, '').trim();
    }
    // public methods
    async chat(prompt, context) {
        try {
            const enc = (0, tiktoken_1.get_encoding)('cl100k_base');
            const len = enc.encode(JSON.stringify(prompt)).length;
            if (this._islog)
                this._logger.info(`Chat prompt length: ${len}`);
            if (this._chatmodel.includes('turbo'))
                return await this.chat_turbo(prompt, context);
            else
                return await this.chat_text(prompt, context);
        }
        catch (_) {
            this._logger.error(`OpenAI API (${this._chatmodel}) Failed`);
            return { role: 'assistant', content: '', name: 'assistant' };
        }
    }
    async chat_turbo(prompt, context) {
        const response = await context.http.post('https://api.openai.com/v1/chat/completions', {
            model: this._chatmodel,
            messages: prompt,
            max_tokens: this._nTokens,
            temperature: this._temperature,
            presence_penalty: this._presencePenalty,
            frequency_penalty: this._frequencyPenalty,
            user: this._name // set user as bot name
        }, { headers: {
                'Authorization': `Bearer ${this._openaiKey}`,
                'Content-Type': 'application/json'
            }
        });
        const msg = response.choices[0].message;
        return { role: msg.role, content: msg.content.trim(), name: 'assistant' }; // this._name
    }
    async chat_text(prompt, context) {
        const response = await context.http.post('https://api.openai.com/v1/completions', {
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
        });
        let msg = response.choices[0].text + '}';
        msg = msg.match(/{.*}/g)[0]; // extract json from response
        const obj = JSON.parse(msg); // try parsing msg as json
        if (obj.role && obj.content && obj.name)
            return obj;
        else { // manual parse: find content, then extract content
            let content = msg.split(',').filter((part) => part.includes('"content":'))[0].split(':')[1].trim();
            if (content[0] === '"')
                content = content.slice(1);
            if (content[content.length - 1] === '"')
                content = content.slice(0, content.length - 1);
            return { role: 'assistant', content: content, name: 'assistant' }; // this._name
        }
    }
    async keys(prompt, context) {
        try {
            const response = await context.http.post('https://api.openai.com/v1/completions', {
                model: this._keywordmodel,
                prompt: prompt,
                stop: '\n',
                max_tokens: this._nTokens,
                temperature: this._temperature,
                presence_penalty: this._presencePenalty,
                frequency_penalty: this._frequencyPenalty,
                user: this._name // set user as bot name
            }, { headers: {
                    'Authorization': `Bearer ${this._openaiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            let msgs = response.choices[0].text.replace('，', ',').split(',').map(s => s.trim());
            msgs = msgs.filter(s => s.includes('-')).map(s => s.replace('-', '')).filter(s => s.length > 0);
            return msgs;
        }
        catch (_) {
            this._logger.error(`OpenAI API (${this._keywordmodel}) Failed`);
            return [];
        }
    }
    async embed(prompt, context) {
        try {
            const res = await context.http.post('https://api.openai.com/v1/embeddings', {
                model: this._embedmodel,
                input: prompt.trim(),
                user: this._name // set user as bot name
            }, { headers: {
                    'Authorization': `Bearer ${this._openaiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            return res.data[0].embedding;
        }
        catch (_) {
            this._logger.error(`OpenAI API (${this._embedmodel}) Failed`);
            return [];
        }
    }
    async listen(file, prompt, context) {
        try {
            const res = await context.http.post('https://api.openai.com/v1/audio/transcriptions', {
                file: file,
                model: this._audiomodel,
                prompt: prompt
            }, { headers: {
                    'Authorization': `Bearer ${this._openaiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            return res.text;
        }
        catch (_) {
            this._logger.error(`OpenAI API (${this._audiomodel}) Failed`);
            return '';
        }
    }
    async code(prompt, context) {
        // TODO: add support for code completion
        // API Not Released Yet
        return '';
    }
}
exports.AI = AI;
