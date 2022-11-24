export declare class MemQ {
    private shortMemory;
    private longMemory;
    private shortMemoryLength;
    private longMemoryLength;
    constructor(shortMemoryLength: number, longMemoryLength: number);
    updateLength(shortMemoryLength: number, longMemoryLength: number): void;
    getShortMemory(): string[];
    getLongMemory(): string[];
    pushShortMemory(text: string): void;
    pushLongMemory(text: string): void;
    saveMemory(): void;
    loadMemory(): void;
    clearMemory(shortMemTexts?: Array<string>, longMemTexts?: Array<string>): void;
    initMemory(shortMemTexts?: Array<string>, longMemTexts?: Array<string>): void;
}
