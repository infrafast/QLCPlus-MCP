import { type Logger } from "pino";
import { Config } from "./config.js";
export declare function initLogger(config: Config): Logger;
export declare function getLogger(): Logger;
export declare function getRecentLogLines(): string[];
export declare function subscribeLogLines(callback: (line: string) => void): () => void;
//# sourceMappingURL=logger.d.ts.map