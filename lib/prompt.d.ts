import { MemoryDict } from './memory';
import { Config } from './config';
export declare function getBasePrompts(uid: string, username: string, botname: string, botIdentity: string, memory: MemoryDict): string[];
export declare function getReply(bprompts: string[], username: string, input: string, config: Config, isdebug: boolean): Promise<string>;
export declare function getSummary(bprompts: string[], username: string, config: Config, isdebug: boolean): Promise<string>;
export declare function getTopic(bprompts: string[], username: string, summary: string, config: Config, isdebug: boolean): Promise<string>;
