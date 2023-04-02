export interface IDict<T> {
    [key: string]: T
}

export interface Metadata {
    text: string
    speaker: string
    timestamp: number
    keywords: string[]
}

export interface Timing {
    start: number
    openai: number
    wolfram: number
    pinecone: number
    search: number
    cache: number
}

export interface Balance {
    total_used: number;
    total_granted: number;
    total_available: number;
}
