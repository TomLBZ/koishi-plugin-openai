export declare class MemoryDict {
    private textMemDict;
    private summaryMemDict;
    private topicMemDict;
    private textMemLen;
    private summaryMemLen;
    private topicMemLen;
    constructor(textMemLen: number, summaryMemLen: number, topicMemLen: number);
    updateLengths(textMemLen: number, summaryMemLen: number, topicMemLen: number): void;
    createMemory(key: string): boolean;
    getTextMemory(key: string): string[];
    getSummaryMemory(key: string): string[];
    getTopicMemory(key: string): string[];
    updateTextMemory(key: string, value: string): void;
    updateSummaryMemory(key: string, value: string): void;
    updateTopicMemory(key: string, value: string): void;
    saveMemory(): void;
    loadMemory(): void;
}
