import fse from 'fs-extra'

export class MemoryDict {
    private textMemDict: Map<string, string[]> = new Map()
    private summaryMemDict: Map<string, string[]> = new Map()
    private topicMemDict: Map<string, string[]> = new Map()
    private textMemLen: number
    private summaryMemLen: number
    private topicMemLen: number
    constructor(textMemLen: number, summaryMemLen: number, topicMemLen: number) {
        this.textMemLen = textMemLen
        this.summaryMemLen = summaryMemLen
        this.topicMemLen = topicMemLen
    }
    updateLengths(textMemLen: number, summaryMemLen: number, topicMemLen: number) {
        this.textMemLen = textMemLen
        this.summaryMemLen = summaryMemLen
        this.topicMemLen = topicMemLen
    }
    createMemory(key: string) {
        let created = false
        if (!this.textMemDict.has(key)) {
            this.textMemDict.set(key, [])
            created = true
        }
        if (!this.summaryMemDict.has(key)) {
            this.summaryMemDict.set(key, [])
        }
        if (!this.topicMemDict.has(key)) {
            this.topicMemDict.set(key, [])
        }
        return created
    }
    getTextMemory(key: string) {
        return this.textMemDict.get(key)
    }
    getSummaryMemory(key: string) {
        return this.summaryMemDict.get(key)
    }
    getTopicMemory(key: string) {
        return this.topicMemDict.get(key)
    }
    updateTextMemory(key: string, value: string) {
        const tMemory = this.textMemDict.get(key)
        while (tMemory.length >= this.textMemLen) {
            tMemory.shift()
        }
        tMemory.push(value)
    }
    updateSummaryMemory(key: string, value: string) {
        const sMemory = this.summaryMemDict.get(key)
        while (sMemory.length >= this.summaryMemLen) {
            sMemory.shift()
        }
        sMemory.push(value)
    }
    updateTopicMemory(key: string, value: string) {
        const tMemory = this.topicMemDict.get(key)
        while (tMemory.length >= this.topicMemLen) {
            tMemory.shift()
        }
        tMemory.push(value)
    }
    saveMemory() {
        const dir = './openaimemory'
        if (!fse.existsSync(dir)) {
            fse.mkdirSync(dir)
        }
        let j = JSON.stringify(Object.fromEntries(this.textMemDict))
        fse.writeJSONSync(`${dir}/textMemDict.json`, j)
        j = JSON.stringify(Object.fromEntries(this.summaryMemDict))
        fse.writeJSONSync(`${dir}/summaryMemDict.json`, j)
        j = JSON.stringify(Object.fromEntries(this.topicMemDict))
        fse.writeJSONSync(`${dir}/topicMemDict.json`, j)
    }
    loadMemory() {
        const dir = './openaimemory'
        let o = null
        if (fse.existsSync(`${dir}/textMemDict.json`)) {
            o = JSON.parse(fse.readJSONSync(`${dir}/textMemDict.json`))
            this.textMemDict = new Map(Object.entries(o))
        }
        if (fse.existsSync(`${dir}/summaryMemDict.json`)) {
            o = JSON.parse(fse.readJSONSync(`${dir}/summaryMemDict.json`))
            this.summaryMemDict = new Map(Object.entries(o))
        }
        if (fse.existsSync(`${dir}/topicMemDict.json`)) {
            o = JSON.parse(fse.readJSONSync(`${dir}/topicMemDict.json`))
            this.topicMemDict = new Map(Object.entries(o))
        }
    }
}