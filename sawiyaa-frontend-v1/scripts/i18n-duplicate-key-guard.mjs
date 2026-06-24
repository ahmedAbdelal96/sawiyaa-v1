import fs from "node:fs";
import path from "node:path";

function createParserState(text) {
  return {
    text,
    index: 0,
  };
}

function peek(state) {
  return state.text[state.index];
}

function advance(state) {
  return state.text[state.index++];
}

function skipWhitespace(state) {
  while (state.index < state.text.length && /\s/.test(state.text[state.index])) {
    state.index += 1;
  }
}

function parseString(state) {
  if (advance(state) !== '"') {
    throw new Error("Expected string");
  }

  let value = "";
  while (state.index < state.text.length) {
    const ch = advance(state);
    if (ch === '"') {
      return value;
    }
    if (ch === "\\") {
      if (state.index >= state.text.length) {
        throw new Error("Unterminated escape sequence");
      }
      const escaped = advance(state);
      switch (escaped) {
        case '"':
        case "\\":
        case "/":
          value += escaped;
          break;
        case "b":
          value += "\b";
          break;
        case "f":
          value += "\f";
          break;
        case "n":
          value += "\n";
          break;
        case "r":
          value += "\r";
          break;
        case "t":
          value += "\t";
          break;
        case "u": {
          const hex = state.text.slice(state.index, state.index + 4);
          if (!/^[0-9a-fA-F]{4}$/.test(hex)) {
            throw new Error("Invalid unicode escape");
          }
          value += String.fromCharCode(Number.parseInt(hex, 16));
          state.index += 4;
          break;
        }
        default:
          throw new Error(`Invalid escape sequence: \\${escaped}`);
      }
      continue;
    }
    value += ch;
  }

  throw new Error("Unterminated string");
}

function parseLiteral(state) {
  while (state.index < state.text.length) {
    const ch = state.text[state.index];
    if (ch === "," || ch === "}" || ch === "]" || /\s/.test(ch)) {
      return;
    }
    state.index += 1;
  }
}

function parseValue(state, pathParts, duplicates, filePath) {
  skipWhitespace(state);
  const ch = peek(state);
  if (ch === "{") {
    parseObject(state, pathParts, duplicates, filePath);
    return;
  }
  if (ch === "[") {
    parseArray(state, pathParts, duplicates, filePath);
    return;
  }
  if (ch === '"') {
    parseString(state);
    return;
  }
  if (ch === undefined) {
    throw new Error("Unexpected end of JSON");
  }
  parseLiteral(state);
}

function parseObject(state, pathParts, duplicates, filePath) {
  if (advance(state) !== "{") {
    throw new Error("Expected object");
  }

  skipWhitespace(state);
  const seen = new Map();

  if (peek(state) === "}") {
    advance(state);
    return;
  }

  while (state.index < state.text.length) {
    skipWhitespace(state);
    const key = parseString(state);
    const currentPath = [...pathParts, key];
    if (seen.has(key)) {
      duplicates.push({
        filePath,
        path: currentPath.join("."),
        firstIndex: seen.get(key),
        duplicateIndex: state.index,
      });
    } else {
      seen.set(key, state.index);
    }

    skipWhitespace(state);
    if (advance(state) !== ":") {
      throw new Error(`Expected colon after key "${key}"`);
    }

    parseValue(state, currentPath, duplicates, filePath);
    skipWhitespace(state);

    const next = peek(state);
    if (next === ",") {
      advance(state);
      continue;
    }
    if (next === "}") {
      advance(state);
      return;
    }
    throw new Error(`Expected comma or closing brace after key "${key}"`);
  }

  throw new Error("Unterminated object");
}

function parseArray(state, pathParts, duplicates, filePath) {
  if (advance(state) !== "[") {
    throw new Error("Expected array");
  }

  skipWhitespace(state);
  if (peek(state) === "]") {
    advance(state);
    return;
  }

  let index = 0;
  while (state.index < state.text.length) {
    parseValue(state, [...pathParts, String(index)], duplicates, filePath);
    index += 1;
    skipWhitespace(state);
    const next = peek(state);
    if (next === ",") {
      advance(state);
      continue;
    }
    if (next === "]") {
      advance(state);
      return;
    }
    throw new Error("Expected comma or closing bracket in array");
  }

  throw new Error("Unterminated array");
}

export function findDuplicateKeysInJsonText(filePath, text) {
  const duplicates = [];
  const state = createParserState(text);
  skipWhitespace(state);
  parseValue(state, [], duplicates, filePath);
  skipWhitespace(state);

  if (state.index !== state.text.length) {
    throw new Error("Unexpected trailing content");
  }

  return duplicates;
}

export function collectMessageJsonFiles(messagesRoot) {
  const files = [];
  for (const locale of ["ar", "en"]) {
    const localeDir = path.join(messagesRoot, locale);
    if (!fs.existsSync(localeDir)) continue;
    for (const entry of fs.readdirSync(localeDir)) {
      if (entry.endsWith(".json")) {
        files.push(path.join(localeDir, entry));
      }
    }
  }
  return files.sort();
}

export function validateNoDuplicateKeys(messagesRoot) {
  const files = collectMessageJsonFiles(messagesRoot);
  const errors = [];

  for (const filePath of files) {
    const text = fs.readFileSync(filePath, "utf8");
    const duplicates = findDuplicateKeysInJsonText(filePath, text);
    for (const duplicate of duplicates) {
      errors.push(
        `[duplicate-key] ${path.relative(messagesRoot, duplicate.filePath)} -> ${duplicate.path}`,
      );
    }
  }

  return errors;
}
