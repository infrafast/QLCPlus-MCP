import { WidgetConfig, WidgetMapping } from "../types.js";
export declare function parseQxwFile(qxwPath: string): Promise<{
    widgets: WidgetMapping[];
    errors: string[];
}>;
export declare function generateWidgetsJson(qxwPath: string, outputPath: string): Promise<WidgetConfig>;
//# sourceMappingURL=qxwParser.d.ts.map