import { Context, Logger } from 'koishi'
import { JSDOM } from 'jsdom'
import { IDict } from './types'
import { writeFileSync } from 'fs-extra'
import { Config } from './config'

export class Search {
    public mode: string
    private _logger: Logger
    private _islog: boolean
    private _azureKey: string
    private _azureRegion: string
    constructor() { }
    public async init(config: Config, context: Context, parentName: string = '@tomlbz/openai') : Promise<void> {
        this._logger = new Logger(parentName + '/search')
        this._islog = config.isLog
        this._azureKey = config.azureSearchKey
        this._azureRegion = config.azureSearchRegion
        this.mode = this._azureKey ? 'bing' : await this.testSearch(context) ? 'google' : 'none' //'baidu'
    }
    private async testSearch(context: Context) : Promise<boolean> {
        const url = 'https://www.google.com/search?q=Who+is+Tom'
        const res = await context.http.get(url) //fetch(url)
        const text = String(res)
        return text.includes('Google Search') //res.ok
    }
    private _reduceElement(elem: Element, islenfilter: boolean = false) : void { // reduces nesting of single child elements
        let child = elem
        let whilecount = 0
        while (child.children.length > 0) {
            if (child.children.length > 1) {
                if (!islenfilter) break // do not reduce if there are multiple children
                const clone = child.cloneNode(true) as Element // clones element
                for (let i = clone.children.length - 1; i >= 0; i--) clone.children[i].remove() // remove all children
                child.appendChild(clone) // append the clone to children
                let maxlen = 0
                let index = 0
                for (let i = 0; i < child.children.length; i++) {
                    if (child.children[i].textContent.length > maxlen) {
                        maxlen = child.children[i].textContent.length
                        index = i // next child is the one with the longest text
                    }
                }
                child = child.children[index]
            } else child = child.children[0] // if there is only one child, reduce it
            whilecount++
            if (whilecount > 100) {
                this._logger.error('Error: infinite loop in _reduceElement()')
                break
            }
        }
        if (child !== elem) elem.parentElement.replaceChild(child, elem)
    }
    private _getCommonClassName(elements: Iterable<Element>) : string {
        const classnames = {}
        for (const e of elements) {
            const classname = e.className
            if (classname) {
                if (classnames[classname]) classnames[classname]++
                else classnames[classname] = 1
            }
        }
        if (!classnames) return ''
        const keys = Object.keys(classnames)
        if (!keys || keys.length === 0) return ''
        return keys.reduce((a, b) => classnames[a] > classnames[b] ? a : b)
    }
    private _keepCommonClass(elem: Element) : void { // removes all elements that do not have the most common classname
        if (!elem.children.length || elem.children.length === 0) return
        const common = this._getCommonClassName(elem.children)
        for (let i = elem.children.length - 1; i >= 0; i--) {
            const e = elem.children[i]
            if (e.className !== common) e.remove()
        }
    }
    private _reduceGoogleItems(main: Element) : void {
        for (let i = main.children.length - 1; i >= 0; i--) {
            const e = main.children[i]
            if (e.children.length === 2) { // if the first child has a h3 element
                const h3element = e.children[0].querySelector('h3')
                if (h3element) { // h3 element must exist for valid google search result
                    e.children[0].replaceWith(h3element) // replace the first child with the h3 element
                    this._reduceElement(e.children[0])
                    this._reduceElement(e.children[1], true)
                    continue;
                }
            }
            e.remove()
        }
    }
    private _checkClassName(elem: Element, classnames: string[]) : boolean {
        for (const classname of classnames) if (elem.className.includes(classname) || classname.includes(elem.className)) return true
        return false
    }
    private _checkClassNames(elem: Element, titlename: string, contentname: string) : boolean {
        if (elem.children.length !== 2) return false
        const names = [titlename, contentname]
        return this._checkClassName(elem.children[0], names) && this._checkClassName(elem.children[1], names)
    }
    private _keepClassNames(elem: Element, titlename: string, contentname: string) : void {
        if (elem.children.length === 0) return // c-container has no children
        let whilecount = 0
        while (!this._checkClassNames(elem, titlename, contentname)) {
            let all_classnames = ''
            for (const e of elem.children) {
                if (e.className) all_classnames += e.className + ' '
            }
            if (this._islog) this._logger.info(`${whilecount}: all classnames: ${all_classnames}`)
            for (let i = elem.children.length - 1; i >= 0; i--) { // last
                const e = elem.children[i] // e: current element (has-tts)
                if (this._checkClassName(e, [titlename, contentname])) continue // e has correct name
                if (e.children && e.children.length > 0) { // e has children, move them to parent
                    for (let j = e.children.length - 1; j >= 0; j--) e.parentElement.append(e.children[j])
                }
                e.remove() // remove e from parent after appending all children    
            }
            whilecount++
            if (whilecount > 100) {
                this._logger.error('Error: infinite loop in _keepClassNames()')
                break
            }
        }
    }
    private _parseResults(elem: Element) : IDict<string[]> {
        const col1 = []
        const col2 = []
        for (const e of elem.children) {
            if (e.children.length === 2) {
                col1.push(e.children[0])
                col2.push(e.children[1])
            }
        }
        const classname1 = this._getCommonClassName(col1)
        const classname2 = this._getCommonClassName(col2)
        const results : IDict<string[]> = {'title': [], 'description': []}
        for (let i = 0; i < col1.length; i++) {
            const e1 = col1[i]
            const e2 = col2[i]
            if (e1.className === classname1 && e2.className === classname2) {
                results.title.push(e1.textContent)
                results.description.push(e2.textContent)
            }
        }
        return results
    }
    private async googleSearch(query: string, topk: number, context: Context) : Promise<string[]> {
        const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`
        const resp = await context.http.get<Response>(url)
        const restext = String(resp) //await resp.text()
        const htmldom = new JSDOM(restext).window.document
        const main = htmldom.querySelector('#main')
        if (!main) {
            if (this._islog) this._logger.info('Google search failed, maybe blocked by Google')
            return []
        }
        const tobeRemoved = main.querySelectorAll('script,noscript,style,meta,button,input,img,svg,canvas,header,footer,video,audio,embed')
        tobeRemoved.forEach(e => e.remove())
        for (const e of main.children) this._reduceElement(e)
        this._keepCommonClass(main)
        this._reduceGoogleItems(main)
        const classnames = '.'.concat(main.children[0].className.replace(/ /g, '.'))
        if (this._islog) this._logger.info(classnames)
        if (!classnames.length || classnames.length == 0) return []
        const dictres = this._parseResults(main)
        const res = dictres['description'].slice(0, topk)
        return res.length ? res : []
    }
    private async baiduSearch(query: string, topk: number, context: Context) : Promise<string[]> {
        const url = `https://www.baidu.com/s?wd=${encodeURIComponent(query)}&cl=3`
        const res = await context.http.get<Response>(url)
        const restext = await res.text()
        const htmldom = new JSDOM(restext).window.document
        const main = htmldom.querySelector('#content_left')
        if (!main) {
            if (this._islog) this._logger.info('Baidu search failed, maybe too many requests')
            return []
        }
        const tobeRemoved = main.querySelectorAll('script,noscript,style,meta,button,input,img,svg,canvas,header,footer,video,audio,embed')
        tobeRemoved.forEach(e => e.remove())
        for (const e of main.children) this._reduceElement(e)
        writeFileSync('cache/baidu.html', main.outerHTML)
        for (const e of main.children) this._keepClassNames(e, 'c-title', 'c-gap-top-small')
        writeFileSync('cache/baidu-class.html', main.outerHTML)
        return []
    }
    private _isValidString(str: string) : boolean {
        if (!str || str.length === 0) return false // null or undefined
        if (str === ' ') return true // whitespace
        return str.trim().length > 0
    }
    private async bingSearch(query: string, topk: number, context: Context) : Promise<string[]> {
        if (!this._isValidString(query)) return []
        const resfilter = 'Computation,Webpages'
        const url = `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}&count=${topk}&responseFilter=${resfilter}`
        const res = await context.http.get<any>(url, {
            headers: {
                'Ocp-Apim-Subscription-Key': this._azureKey,
                'Ocp-Apim-Subscription-Region': this._azureRegion
            }
        }) // is json
        const webpages = res.webPages
        const computations = res.computation
        if (!webpages && !computations) return []
        const allres = []
        if (webpages) {
            const value = webpages.value
            const res1 = value ? value.map(v => v.snippet) : []
            allres.push(...res1)
        }
        if (computations) {
            const res2 = computations.map(v => `${v.expression}=${v.value}`)
            allres.push(...res2)
        }
        return allres
    }
    public async search(query: string, topk: number, context: Context) : Promise<string[]> {
        if (this._islog) this._logger.info(`Knowledge Mode: ${this.mode}`)
        if (this.mode == 'google') return await this.googleSearch(query, topk, context)
        if (this.mode == 'bing') return await this.bingSearch(query, topk, context)
        //if (this.mode == 'baidu') return await this.baiduSearch(query, topk)
        return []
    }
}