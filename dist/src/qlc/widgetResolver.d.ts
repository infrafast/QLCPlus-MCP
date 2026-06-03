import { WidgetConfig, WidgetMapping } from "../types.js";
export declare function loadWidgetConfig(filePath: string): Promise<WidgetConfig>;
export declare function getWidgetByName(name: string): WidgetMapping | null;
export declare function getWidgetByPath(oscPath: string): WidgetMapping | undefined;
export declare function listWidgets(): WidgetMapping[];
export declare function findClosestMatches(query: string, limit?: number): WidgetMapping[];
export declare function resolveWidgetOrPath(widgetName?: string, oscPath?: string): {
    resolved: boolean;
    path: string;
    widget?: WidgetMapping;
};
export declare function saveWidgetConfig(filePath: string, config: WidgetConfig): Promise<void>;
export declare function isWidgetsLoaded(): boolean;
//# sourceMappingURL=widgetResolver.d.ts.map