import { Context, Logger } from "koishi";
import { Config } from "./config";
import { Balance, IDict } from "./types";
import { get_encoding } from "@dqbd/tiktoken";

/// This is a class that represents the state of the AI.
export class AI {
  private _islog: boolean;
  private _name: string;
  private _logger: Logger;
  private _openaiKey: string;
  private _allmodels: IDict<string[]>;
  private _chatmodel: string;
  private _keywordmodel: string;
  private _apiAdress: string;
  private _codemodel: string;
  private _embedmodel: string;
  private _audiomodel: string;
  private _nTokens: number;
  private _temperature: number;
  private _presencePenalty: number;
  private _frequencyPenalty: number;
  constructor() {}
  public async init(
    config: Config,
    context: Context,
    parentName: string = "@tomlbz/openai"
  ): Promise<boolean> {
    this._islog = config.isLog;
    this._name = config.botName;
    this._logger = new Logger(parentName + "/ai");
    this._nTokens = config.nTokens;
    this._temperature = config.temperature;
    this._presencePenalty = config.presencePenalty;
    this._frequencyPenalty = config.frequencyPenalty;
    this._openaiKey = config.apiKey;
    this._apiAdress = config.apiAdress;
    this._allmodels = await this._listModels(context);
    return this._updateModels(
      config.chatModel,
      config.keywordModel,
      config.codeModel
    );
  }

  private _currentApiUrl(postfix: string): string {
    return this._apiAdress + "/" + postfix;
  }

  private _modelType(model: string): string {
    if (model.includes("whisper")) return "audio";
    if (model.includes("embedding")) return "embed";
    if (model.includes("code")) return "code";
    if (model.includes("turbo")) return "chat";
    if (model.includes("text")) {
      if (model.includes("davinci")) return "chat";
      else return "keyword";
    }
    return "generic";
  }

  private async _listModels(context: Context): Promise<IDict<string[]>> {
    const excludeModels = [
      "deprecated",
      "beta",
      "if",
      "search",
      "similarity",
      "edit",
      "insert",
      ":",
    ];

    let response: { code: string | number; message?: any; data: any[] /* ? */ };

    try {
      response = await context.http.get(this._currentApiUrl("models"), {
        headers: { Authorization: `Bearer ${this._openaiKey}` },
      });
    } catch (e) {

      this._logger.error(
        "Error when listing openai models, Result: " + e.response
          ? (e.response ? e.response.data : e)
          : e
      );

      // return fake empty models
      return {};
    }

    return response.data
      .filter((model) => {
        return !excludeModels.some((exclude) => model.id.includes(exclude));
      })
      .reduce((acc, model) => {
        const type = this._modelType(model.id);
        if (!acc[type]) acc[type] = [];
        acc[type].push(model.id);
        return acc;
      }, {} as IDict<string[]>);
  }
  private _updateModels(
    confchat: string,
    confkey: string,
    confcode: string
  ): boolean {
    const newdict = {} as IDict<string[]>;
    for (const type in this._allmodels) {
      newdict[type] = this._allmodels[type]
        .filter((model) => {
          if (type === "chat") return model.includes(confchat);
          if (type === "audio") return model.includes("whisper");
          if (type === "code") return model.includes(confcode);
          if (type === "embed") return model.includes("embedding");
          if (type === "keyword") return model.includes(confkey);
          return false;
        })
        .sort((a, b) => {
          if (a.length === b.length) {
            // convert last char to number
            const a1 = a[a.length - 1];
            const b1 = b[b.length - 1];
            if (a1 >= "0" && a1 <= "9" && b1 >= "0" && b1 <= "9")
              return Number(b1) - Number(a1);
            else return b.localeCompare(a);
          } else return a.length - b.length;
        });
    }

    this._chatmodel = newdict["chat"] ? newdict["chat"][0] : null;
    this._codemodel = newdict["code"] ? newdict["code"][0] : null;
    this._embedmodel = newdict["embed"] ? newdict["embed"][0] : null;
    this._audiomodel = newdict["audio"] ? newdict["audio"][0] : null;
    this._keywordmodel = newdict["keyword"] ? newdict["keyword"][0] : null;

    if (this._islog) {
      if (this._chatmodel)
        this._logger.info(`OpenAI Connected. Chat model: ${this._chatmodel}`);
      else {
        this._logger.error(
          "OpenAI connection failed. Please check your API key or internet connection."
        );
        return false;
      }
    }
    return true;
  }
  private formTextMsg(prompt: IDict<string>[]): string {
    return prompt
      .reduce((acc, p) => {
        acc += `{"role": "${p["role"]}", "content": "${p["content"]}", "name": "${p["name"]}"}\n`;
        return acc;
      }, "")
      .trim();
  }

  // public methods
  public async getBalance(context: Context): Promise<Balance> {
    let baseUrl = this._apiAdress ?? "https://api.openai.com";

    if (baseUrl.indexOf("/v1") != -1) {
      baseUrl = baseUrl.replace("/v1", "");
    }
    return await context.http.get(
      `${baseUrl}/dashboard/billing/credit_grants`,
      {
        headers: {
          Authorization: `Bearer ${this._openaiKey}`,
          "Content-Type": "application/json",
        },
      }
    );
  }

  public async chat(
    prompt: IDict<string>[],
    context: Context
  ): Promise<IDict<string>> {
    try {
      const enc = get_encoding("cl100k_base");
      const len = enc.encode(JSON.stringify(prompt)).length;
      if (this._islog) this._logger.info(`Chat prompt length: ${len}`);
      if (this._chatmodel.includes("turbo"))
        return await this.chat_turbo(prompt, context);
      else return await this.chat_text(prompt, context);
    } catch (_) {
      this._logger.error(`OpenAI API (${this._chatmodel}) Failed`);
      return { role: "assistant", content: "", name: "assistant" };
    }
  }
  private async chat_turbo(
    prompt: IDict<string>[],
    context: Context
  ): Promise<IDict<string>> {
    const response = await context.http.post(
      this._currentApiUrl("chat/completions"),
      {
        model: this._chatmodel,
        messages: prompt as any,
        max_tokens: this._nTokens,
        temperature: this._temperature,
        presence_penalty: this._presencePenalty,
        frequency_penalty: this._frequencyPenalty,
        user: this._name, // set user as bot name
      },
      {
        headers: {
          Authorization: `Bearer ${this._openaiKey}`,
          "Content-Type": "application/json",
        },
      }
    );
    const msg = response.choices[0].message;
    return { role: msg.role, content: msg.content, name: "assistant" }; // this._name
  }
  private async chat_text(
    prompt: IDict<string>[],
    context: Context
  ): Promise<IDict<string>> {
    const response = await context.http.post(
      this._currentApiUrl("completions"),
      {
        model: this._chatmodel,
        prompt: this.formTextMsg(prompt),
        stop: "}",
        max_tokens: this._nTokens,
        temperature: this._temperature,
        presence_penalty: this._presencePenalty,
        frequency_penalty: this._frequencyPenalty,
        user: this._name, // set user as bot name
      },
      {
        headers: {
          Authorization: `Bearer ${this._openaiKey}`,
          "Content-Type": "application/json",
        },
      }
    );
    let msg = response.choices[0].text + "}";
    msg = msg.match(/{.*}/g)[0]; // extract json from response
    const obj = JSON.parse(msg); // try parsing msg as json
    if (obj.role && obj.content && obj.name) return obj as IDict<string>;
    else {
      // manual parse: find content, then extract content
      let content = msg
        .split(",")
        .filter((part) => part.includes('"content":'))[0]
        .split(":")[1]
        .trim();
      if (content[0] === '"') content = content.slice(1);
      if (content[content.length - 1] === '"')
        content = content.slice(0, content.length - 1);
      return {
        role: "assistant",
        content: content,
        name: "assistant",
      } as IDict<string>; // this._name
    }
  }
  public async keys(prompt: string, context: Context): Promise<string[]> {
    try {
      const response = await context.http.post(
        this._currentApiUrl("completions"),
        {
          model: this._keywordmodel,
          prompt: prompt,
          stop: "\n",
          max_tokens: this._nTokens,
          temperature: this._temperature,
          presence_penalty: this._presencePenalty,
          frequency_penalty: this._frequencyPenalty,
          user: this._name, // set user as bot name
        },
        {
          headers: {
            Authorization: `Bearer ${this._openaiKey}`,
            "Content-Type": "application/json",
          },
        }
      );
      let msgs: string[] = response.choices[0].text
        .replace("，", ",")
        .split(",")
        .map((s) => s.trim());
      msgs = msgs
        .filter((s) => s.includes("-"))
        .map((s) => s.replace("-", ""))
        .filter((s) => s.length > 0);
      return msgs;
    } catch (_) {
      this._logger.error(`OpenAI API (${this._keywordmodel}) Failed`);
      return [];
    }
  }
  public async embed(prompt: string, context: Context): Promise<number[]> {
    try {
      const res = await context.http.post(
        this._currentApiUrl("embeddings"),
        {
          model: this._embedmodel,
          input: prompt.trim(),
          user: this._name, // set user as bot name
        },
        {
          headers: {
            Authorization: `Bearer ${this._openaiKey}`,
            "Content-Type": "application/json",
          },
        }
      );
      return res.data[0].embedding;
    } catch (_) {
      this._logger.error(`OpenAI API (${this._embedmodel}) Failed`);
      return [];
    }
  }
  public async listen(
    file: string,
    prompt: string,
    context: Context
  ): Promise<string> {
    try {
      const res = await context.http.post(
        this._currentApiUrl("audio/transcriptions"),
        {
          file: file,
          model: this._audiomodel,
          prompt: prompt,
        },
        {
          headers: {
            Authorization: `Bearer ${this._openaiKey}`,
            "Content-Type": "application/json",
          },
        }
      );
      return res.text;
    } catch (_) {
      this._logger.error(`OpenAI API (${this._audiomodel}) Failed`);
      return "";
    }
  }
  public async code(prompt: string, context: Context): Promise<string> {
    // TODO: add support for code completion
    // API Not Released Yet
    return "";
  }
}
