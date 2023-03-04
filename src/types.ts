export interface IDict<T> {
    [key: string]: T;
}

export interface Metadata {
    text: string;
    speaker: string;
    timestamp: number;
    keywords: string[];
}