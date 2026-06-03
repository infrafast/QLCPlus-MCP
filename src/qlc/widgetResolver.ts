import fs from "fs/promises";
import path from "path";
import { getLogger } from "./logger.js";
import { WidgetConfig, WidgetMapping } from "./types.js";
import { z } from "zod";

let widgetCache: Map<string, WidgetMapping> = new Map();
let oscPathCache: Map<string, WidgetMapping> = new Map();
let isLoaded = false;

export async function loadWidgetConfig(filePath: string): Promise<WidgetConfig> {
  const logger = getLogger();

  try {
    const content = await fs.readFile(filePath, "utf-8");
    const config = JSON.parse(content) as WidgetConfig;

    // Clear and rebuild cache
    widgetCache.clear();
    oscPathCache.clear();

    if (config.widgets && Array.isArray(config.widgets)) {
      for (const widget of config.widgets) {
        widgetCache.set(widget.name.toLowerCase(), widget);
        oscPathCache.set(widget.path, widget);
      }
    }

    isLoaded = true;
    logger.info(`Loaded ${config.widgets?.length || 0} widget mappings from ${filePath}`);

    return config;
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    logger.warn(`Could not load widget config from ${filePath}: ${err}`);

    return { widgets: [], generated: false };
  }
}

export function getWidgetByName(name: string): WidgetMapping | null {
  return widgetCache.get(name.toLowerCase()) || null;
}

export function getWidgetByPath(oscPath: string): WidgetMapping | null {
  return oscPathCache.get(oscPath) || null;
}

export function listWidgets(): WidgetMapping[] {
  return Array.from(widgetCache.values());
}

export function findClosestMatches(query: string, limit: number = 5): WidgetMapping[] {
  const logger = getLogger();
  const queryLower = query.toLowerCase();
  const allWidgets = listWidgets();

  // Simple similarity scoring (Levenshtein-like for demo)
  const scored = allWidgets
    .map((widget) => {
      const name = widget.name.toLowerCase();
      let score = 0;

      // Exact match
      if (name === queryLower) score = 1000;
      // Starts with
      else if (name.startsWith(queryLower)) score = 500;
      // Contains
      else if (name.includes(queryLower)) score = 250;
      // Substring match on any word
      else {
        const words = name.split(/[_\-\s]/);
        const queryWords = queryLower.split(/[_\-\s]/);

        for (const qw of queryWords) {
          if (words.some((w) => w.includes(qw))) {
            score += 100;
          }
        }
      }

      return { widget, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  logger.debug(`Found ${scored.length} close matches for "${query}"`);

  return scored.map((item) => item.widget);
}

export function resolveWidgetOrPath(
  widgetName?: string,
  oscPath?: string
): { resolved: boolean; path: string; widget?: WidgetMapping } {
  const logger = getLogger();

  // Prefer logical name
  if (widgetName) {
    const widget = getWidgetByName(widgetName);
    if (widget) {
      logger.debug(`Resolved widget "${widgetName}" to ${widget.path}`);
      return { resolved: true, path: widget.path, widget };
    }

    logger.warn(`Widget "${widgetName}" not found in mappings`);
  }

  // Fall back to direct path
  if (oscPath) {
    const widget = getWidgetByPath(oscPath);
    logger.debug(`Using direct OSC path: ${oscPath}`);
    return { resolved: true, path: oscPath, widget };
  }

  return { resolved: false, path: "" };
}

export async function saveWidgetConfig(
  filePath: string,
  config: WidgetConfig
): Promise<void> {
  const logger = getLogger();

  try {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    const content = JSON.stringify(config, null, 2);
    await fs.writeFile(filePath, content, "utf-8");

    logger.info(`Saved widget config to ${filePath}`);
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to save widget config: ${err}`);
    throw error;
  }
}

export function isWidgetsLoaded(): boolean {
  return isLoaded;
}
