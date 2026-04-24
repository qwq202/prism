import fs from "fs";
import path from "path";

export type JsonValue =
  | string
  | number
  | boolean
  | undefined
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type JsonObject = Record<string, JsonValue>;

export function readJSON<T = JsonValue>(...paths: string[]): T {
  return JSON.parse(fs.readFileSync(path.resolve(...paths)).toString()) as T;
}

export function writeJSON(data: JsonValue, ...paths: string[]): void {
  fs.writeFileSync(path.resolve(...paths), JSON.stringify(data, null, 2));
}

export function getMigration(
  mother: JsonObject,
  data: JsonObject | undefined,
  prefix: string,
): string[] {
  return Object.keys(mother)
    .map((key): string[] => {
      const template = mother[key],
        translation = data !== undefined && key in data ? data[key] : undefined;
      const val = [prefix.length === 0 ? key : `${prefix}.${key}`];

      switch (typeof template) {
        case "string":
          if (typeof translation !== "string") return val;
          else if (template.startsWith("!!")) return val;
          break;
        case "object":
          if (template && !Array.isArray(template)) {
            return getMigration(
              template,
              translation && typeof translation === "object" && !Array.isArray(translation)
                ? translation
                : undefined,
              val[0],
            );
          }
          return typeof translation === typeof template ? [] : val;
        default:
          return typeof translation === typeof template ? [] : val;
      }

      return [];
    })
    .flat()
    .filter((key) => key !== undefined && key.length > 0);
}

export function getFields(data: JsonValue): number {
  switch (typeof data) {
    case "string":
      return 1;
    case "object":
      if (data === null) return 1;
      if (Array.isArray(data)) return data.length;
      return Object.keys(data).reduce(
        (acc, key) => acc + getFields(data[key]),
        0,
      );
    default:
      return 1;
  }
}

export function getTranslation(data: JsonObject, path: string): JsonValue | undefined {
  const keys = path.split(".");
  let current: JsonValue | undefined = data;
  for (const key of keys) {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return undefined;
    }
    if (current[key] === undefined) return undefined;
    current = current[key];
  }
  return current;
}

export function setTranslation(
  data: JsonObject,
  path: string,
  value: JsonValue,
): void {
  const keys = path.split(".");
  let current: JsonObject = data;
  for (let i = 0; i < keys.length - 1; i++) {
    if (current[keys[i]] === undefined) current[keys[i]] = {};
    const next = current[keys[i]];
    if (!next || typeof next !== "object" || Array.isArray(next)) {
      current[keys[i]] = {};
    }
    current = current[keys[i]] as JsonObject;
  }
  current[keys[keys.length - 1]] = value;
}
