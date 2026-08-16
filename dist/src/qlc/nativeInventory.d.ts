export type NativeWidgetKind = "button" | "slider";
export interface NativeWidget {
    id: number;
    caption: string;
    normalizedCaption: string;
    kind: NativeWidgetKind;
    actionType?: string;
    low?: number;
    high?: number;
    functionId?: number;
    sliderMode?: string;
    widgetStyle?: string;
    parentFrameKind?: "frame" | "soloframe";
    parentFrameId?: number;
    framePath: string[];
}
export interface NativeInventory {
    buttons: Map<string, NativeWidget>;
    sliders: Map<string, NativeWidget>;
    widgets: NativeWidget[];
}
export declare function normalizeNativeCaption(value: string): string;
export declare function parseNativeProjectInventory(xml: Buffer, maximumSize?: number): Promise<NativeInventory>;
//# sourceMappingURL=nativeInventory.d.ts.map