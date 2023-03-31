"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Search = void 0;
const koishi_1 = require("koishi");
const jsdom_1 = require("jsdom");
class Search {
    constructor() { }
    async init(config, context, parentName = "@tomlbz/openai") {
        this._logger = new koishi_1.Logger(parentName + "/search");
        this._islog = config.isLog;
        this._azureKey = config.azureSearchKey;
        this._azureRegion = config.azureSearchRegion;
        if (config.searchOnWeb == false) {
            this.mode = "None";
            return;
        }
        this.mode = (await this.testSearch(context))
            ? "Google"
            : this._azureKey
                ? "Bing"
                : "Baidu";
    }
    async testSearch(context) {
        const url = "https://www.google.com/search?q=Who+is+Tom";
        try {
            const res = await context.http.get(url); //fetch(url)
            return String(res).includes("<!doctype html>");
        }
        catch (_) {
            return false;
        }
    }
    _reduceElement(elem, islenfilter = false) {
        // reduces nesting of single child elements
        let child = elem;
        let whilecount = 0;
        while (child.children.length > 0) {
            if (child.children.length > 1) {
                if (!islenfilter)
                    break; // do not reduce if there are multiple children
                const clone = child.cloneNode(true); // clones element
                for (let i = clone.children.length - 1; i >= 0; i--)
                    clone.children[i].remove(); // remove all children
                child.appendChild(clone); // append the clone to children
                let maxlen = 0;
                let index = 0;
                for (let i = 0; i < child.children.length; i++) {
                    if (child.children[i].textContent.length > maxlen) {
                        maxlen = child.children[i].textContent.length;
                        index = i; // next child is the one with the longest text
                    }
                }
                child = child.children[index];
            }
            else
                child = child.children[0]; // if there is only one child, reduce it
            whilecount++;
            if (whilecount > 100) {
                this._logger.error("Error: infinite loop in _reduceElement()");
                break;
            }
        }
        if (child !== elem)
            elem.parentElement.replaceChild(child, elem);
    }
    _getCommonClassName(elements) {
        const classnames = {};
        for (const e of elements) {
            const classname = e.className;
            if (classname) {
                if (classnames[classname])
                    classnames[classname]++;
                else
                    classnames[classname] = 1;
            }
        }
        if (!classnames)
            return "";
        const keys = Object.keys(classnames);
        if (!keys || keys.length === 0)
            return "";
        return keys.reduce((a, b) => (classnames[a] > classnames[b] ? a : b));
    }
    _keepCommonClass(elem) {
        // removes all elements that do not have the most common classname
        if (!elem.children.length || elem.children.length === 0)
            return;
        const common = this._getCommonClassName(elem.children);
        for (let i = elem.children.length - 1; i >= 0; i--) {
            const e = elem.children[i];
            if (e.className !== common)
                e.remove();
        }
    }
    _reduceGoogleItems(main) {
        for (let i = main.children.length - 1; i >= 0; i--) {
            const e = main.children[i];
            if (e.children.length === 2) {
                // if the first child has a h3 element
                const h3element = e.children[0].querySelector("h3");
                if (h3element) {
                    // h3 element must exist for valid google search result
                    e.children[0].replaceWith(h3element); // replace the first child with the h3 element
                    this._reduceElement(e.children[0]);
                    this._reduceElement(e.children[1], true);
                    continue;
                }
            }
            e.remove();
        }
    }
    _checkClassName(elem, classnames) {
        for (const classname of classnames)
            if (elem.className.includes(classname) ||
                classname.includes(elem.className))
                return true;
        return false;
    }
    _checkClassNames(elem, titlename, contentname) {
        if (elem.children.length !== 2)
            return false;
        const names = [titlename, contentname];
        return (this._checkClassName(elem.children[0], names) &&
            this._checkClassName(elem.children[1], names));
    }
    _keepClassNames(elem, titlename, contentname) {
        if (elem.children.length === 0)
            return; // c-container has no children
        let whilecount = 0;
        while (!this._checkClassNames(elem, titlename, contentname)) {
            let all_classnames = "";
            for (const e of elem.children) {
                if (e.className)
                    all_classnames += e.className + " ";
            }
            if (this._islog)
                this._logger.info(`${whilecount}: all classnames: ${all_classnames}`);
            for (let i = elem.children.length - 1; i >= 0; i--) {
                // last
                const e = elem.children[i]; // e: current element (has-tts)
                if (this._checkClassName(e, [titlename, contentname]))
                    continue; // e has correct name
                if (e.children && e.children.length > 0) {
                    // e has children, move them to parent
                    for (let j = e.children.length - 1; j >= 0; j--)
                        e.parentElement.append(e.children[j]);
                }
                e.remove(); // remove e from parent after appending all children
            }
            whilecount++;
            if (whilecount > 100) {
                this._logger.error("Error: infinite loop in _keepClassNames()");
                break;
            }
        }
    }
    _parseResults(elem) {
        const col1 = [];
        const col2 = [];
        for (const e of elem.children) {
            if (e.children.length === 2) {
                col1.push(e.children[0]);
                col2.push(e.children[1]);
            }
        }
        const classname1 = this._getCommonClassName(col1);
        const classname2 = this._getCommonClassName(col2);
        const results = { title: [], description: [] };
        for (let i = 0; i < col1.length; i++) {
            const e1 = col1[i];
            const e2 = col2[i];
            if (e1.className === classname1 && e2.className === classname2) {
                results.title.push(e1.textContent);
                results.description.push(e2.textContent);
            }
        }
        return results;
    }
    async googleSearch(query, topk, context) {
        try {
            const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
            const resp = await context.http.get(url);
            const restext = String(resp); //await resp.text()
            const htmldom = new jsdom_1.JSDOM(restext).window.document;
            const main = htmldom.querySelector("#main");
            if (!main) {
                if (this._islog)
                    this._logger.info("Google search failed, maybe blocked by Google");
                return [];
            }
            const tobeRemoved = main.querySelectorAll("script,noscript,style,meta,button,input,img,svg,canvas,header,footer,video,audio,embed");
            tobeRemoved.forEach((e) => e.remove());
            for (const e of main.children)
                this._reduceElement(e);
            this._keepCommonClass(main);
            this._reduceGoogleItems(main);
            const classnames = ".".concat(main.children[0].className.replace(/ /g, "."));
            if (!classnames.length || classnames.length == 0)
                return [];
            const dictres = this._parseResults(main);
            const res = dictres["description"].slice(0, topk);
            return res.length ? res : [];
        }
        catch (message) {
            this._logger.error(message);
            this._logger.error("Error: Google Search Failed");
            return [];
        }
    }
    async baiduSearch(query, topk, context) {
        const requestConfig = (keyword) => {
            return {
                params: {
                    wd: keyword,
                },
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36",
                    Referer: "https://www.baidu.com/s?ie=utf-8&f=8&rsv_bp=1&rsv_idx=2&ch=&tn=baiduhome_pg&bar=&wd=123&oq=123&rsv_pq=896f886f000184f4&rsv_t=fdd2CqgBgjaepxfhicpCfrqeWVSXu9DOQY5WyyWqQYmsKOC%2Fl286S248elzxl%2BJhOKe2&rqlang=cn",
                    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
                    "Accept-Language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7",
                    "Sec-Fetch-Mode": "navigate",
                    Connection: "Keep-Alive",
                },
            };
        };
        try {
            const response = await context.http.get("https://www.baidu.com/s", requestConfig(query));
            const dom = new jsdom_1.JSDOM(String(response)).window.document;
            const main = dom.querySelector("#content_left");
            if (main === null) {
                return [];
            }
            const searchResult = [];
            const tobeRemoved = main.querySelectorAll("script,noscript,style,meta,button,input,img,svg,canvas,header,footer,video,audio,embed");
            tobeRemoved.forEach((item) => item.remove());
            for (let item of main.children) {
                const p = item.querySelector(".content-right_8Zs40");
                searchResult.push(p?.textContent ?? "");
            }
            return searchResult
                .filter((item) => item.trim() !== "")
                .map((item) => item.trim())
                .slice(0, topk);
        }
        catch (error) {
            this._logger.error(error);
            this._logger.error("Error: Baidu Search Failed");
            return [];
        }
    }
    _isValidString(str) {
        if (!str || str.length === 0)
            return false; // null or undefined
        if (str === " ")
            return true; // whitespace
        return str.trim().length > 0;
    }
    async bingSearch(query, topk, context) {
        try {
            const resfilter = "Computation,Webpages";
            const url = `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}&count=${topk}&responseFilter=${resfilter}`;
            const res = await context.http.get(url, {
                headers: {
                    "Ocp-Apim-Subscription-Key": this._azureKey,
                    "Ocp-Apim-Subscription-Region": this._azureRegion,
                },
            }); // is json
            const webpages = res.webPages;
            const computations = res.computation;
            if (!webpages && !computations)
                return [];
            const allres = [];
            if (computations) {
                const res2 = computations.map((v) => `${v.expression}=${v.value}`);
                allres.push(...res2);
            }
            if (webpages) {
                const value = webpages.value;
                const res1 = value ? value.map((v) => v.snippet) : [];
                allres.push(...res1);
            }
            return allres;
        }
        catch (_) {
            this._logger.error("Error: Bing Search Failed");
            return [];
        }
    }
    async search(query, topk, context) {
        if (!this._isValidString(query))
            return [];
        if (this.mode == "Google")
            return await this.googleSearch(query, topk, context);
        if (this.mode == "Bing")
            return await this.bingSearch(query, topk, context);
        if (this.mode == "Baidu")
            return await this.baiduSearch(query, topk, context);
        // None?
        return [];
    }
}
exports.Search = Search;
