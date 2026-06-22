import { z } from "zod";
export declare const nullToUndefined: (value: unknown) => {} | undefined;
export declare const optionalString: () => z.ZodPreprocess<z.ZodOptional<z.ZodString>>;
export declare const optionalNumber: () => z.ZodPreprocess<z.ZodOptional<z.ZodNumber>>;
export declare const optionalBoolean: () => z.ZodPreprocess<z.ZodOptional<z.ZodBoolean>>;
export declare const optionalInt: (schema?: z.ZodNumber) => z.ZodPreprocess<z.ZodOptional<z.ZodNumber>>;
export declare const OscValueSchema: z.ZodUnion<readonly [z.ZodNumber, z.ZodString, z.ZodBoolean]>;
export type OscValue = z.infer<typeof OscValueSchema>;
export declare const OscMessageSchema: z.ZodObject<{
    path: z.ZodString;
    args: z.ZodArray<z.ZodUnion<readonly [z.ZodNumber, z.ZodString, z.ZodBoolean]>>;
}, z.core.$strip>;
export type OscMessage = z.infer<typeof OscMessageSchema>;
export declare const OscSendOptionsSchema: z.ZodObject<{
    dryRun: z.ZodPreprocess<z.ZodOptional<z.ZodBoolean>>;
    timeout: z.ZodPreprocess<z.ZodOptional<z.ZodNumber>>;
}, z.core.$strip>;
export type OscSendOptions = z.infer<typeof OscSendOptionsSchema>;
export declare const DmxValueSchema: z.ZodUnion<readonly [z.ZodNumber, z.ZodNumber]>;
export declare const DmxChannelSchema: z.ZodObject<{
    universe: z.ZodNumber;
    channel: z.ZodNumber;
    value: z.ZodNumber;
}, z.core.$strip>;
export type DmxChannel = z.infer<typeof DmxChannelSchema>;
export declare const RgbColorSchema: z.ZodObject<{
    r: z.ZodNumber;
    g: z.ZodNumber;
    b: z.ZodNumber;
}, z.core.$strip>;
export type RgbColor = z.infer<typeof RgbColorSchema>;
export declare const WidgetTypeSchema: z.ZodEnum<{
    unknown: "unknown";
    button: "button";
    slider: "slider";
    speed: "speed";
    cuelist: "cuelist";
    chaser: "chaser";
    frame: "frame";
    label: "label";
}>;
export type WidgetType = z.infer<typeof WidgetTypeSchema>;
export declare const WidgetMappingSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    path: z.ZodString;
    type: z.ZodEnum<{
        unknown: "unknown";
        button: "button";
        slider: "slider";
        speed: "speed";
        cuelist: "cuelist";
        chaser: "chaser";
        frame: "frame";
        label: "label";
    }>;
    description: z.ZodPreprocess<z.ZodOptional<z.ZodString>>;
    minValue: z.ZodPreprocess<z.ZodOptional<z.ZodNumber>>;
    maxValue: z.ZodPreprocess<z.ZodOptional<z.ZodNumber>>;
}, z.core.$strip>;
export type WidgetMapping = z.infer<typeof WidgetMappingSchema>;
export declare const WidgetConfigSchema: z.ZodObject<{
    widgets: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        path: z.ZodString;
        type: z.ZodEnum<{
            unknown: "unknown";
            button: "button";
            slider: "slider";
            speed: "speed";
            cuelist: "cuelist";
            chaser: "chaser";
            frame: "frame";
            label: "label";
        }>;
        description: z.ZodPreprocess<z.ZodOptional<z.ZodString>>;
        minValue: z.ZodPreprocess<z.ZodOptional<z.ZodNumber>>;
        maxValue: z.ZodPreprocess<z.ZodOptional<z.ZodNumber>>;
    }, z.core.$strip>>;
    generated: z.ZodPreprocess<z.ZodOptional<z.ZodBoolean>>;
    generatedAt: z.ZodPreprocess<z.ZodOptional<z.ZodString>>;
}, z.core.$strip>;
export type WidgetConfig = z.infer<typeof WidgetConfigSchema>;
export declare const SendOscInputSchema: z.ZodObject<{
    path: z.ZodString;
    args: z.ZodArray<z.ZodUnion<readonly [z.ZodNumber, z.ZodString, z.ZodBoolean]>>;
    dryRun: z.ZodPreprocess<z.ZodOptional<z.ZodBoolean>>;
    speaker: z.ZodPreprocess<z.ZodOptional<z.ZodString>>;
}, z.core.$strip>;
export type SendOscInput = z.infer<typeof SendOscInputSchema>;
export declare const ButtonPressInputSchema: z.ZodObject<{
    widgetName: z.ZodPreprocess<z.ZodOptional<z.ZodString>>;
    oscPath: z.ZodPreprocess<z.ZodOptional<z.ZodString>>;
    speaker: z.ZodPreprocess<z.ZodOptional<z.ZodString>>;
}, z.core.$strip>;
export type ButtonPressInput = z.infer<typeof ButtonPressInputSchema>;
export declare const CueListInputSchema: z.ZodObject<{
    widgetName: z.ZodPreprocess<z.ZodOptional<z.ZodString>>;
    oscPath: z.ZodPreprocess<z.ZodOptional<z.ZodString>>;
    speaker: z.ZodPreprocess<z.ZodOptional<z.ZodString>>;
}, z.core.$strip>;
export type CueListInput = z.infer<typeof CueListInputSchema>;
export declare const SetMasterInputSchema: z.ZodObject<{
    value: z.ZodNumber;
}, z.core.$strip>;
export type SetMasterInput = z.infer<typeof SetMasterInputSchema>;
//# sourceMappingURL=types.d.ts.map