function isEscaped(source, index) {
  let slashCount = 0;
  for (let i = index - 1; i >= 0 && source[i] === "\\"; i -= 1) {
    slashCount += 1;
  }
  return slashCount % 2 === 1;
}

function findNextDelimiter(source, start) {
  for (let i = start; i < source.length; i += 1) {
    const current = source[i];
    const next = source[i + 1];

    if (current === "$" && !isEscaped(source, i)) {
      if (next === "$") {
        return { open: "$$", close: "$$", display: true, index: i };
      }
      return { open: "$", close: "$", display: false, index: i };
    }

    if (current === "\\" && next === "(") {
      return { open: "\\(", close: "\\)", display: false, index: i };
    }

    if (current === "\\" && next === "[") {
      return { open: "\\[", close: "\\]", display: true, index: i };
    }
  }

  return null;
}

function findClosingDelimiter(source, start, close) {
  for (let i = start; i < source.length; i += 1) {
    if (close[0] === "$") {
      if (source.startsWith(close, i) && !isEscaped(source, i)) return i;
      continue;
    }

    if (source.startsWith(close, i)) return i;
  }

  return -1;
}

function appendText(segments, text) {
  if (!text) return;
  const previous = segments[segments.length - 1];
  if (previous && previous.type === "text") {
    previous.text += text;
    return;
  }
  segments.push({ type: "text", text });
}

function normalizeSegments(segments) {
  return segments.map((segment, index) => ({
    ...segment,
    id: `${segment.type}-${index}`,
  }));
}

const COMMAND_MAP = {
  "\\alpha": "α",
  "\\beta": "β",
  "\\gamma": "γ",
  "\\delta": "δ",
  "\\Delta": "Δ",
  "\\theta": "θ",
  "\\lambda": "λ",
  "\\mu": "μ",
  "\\pi": "π",
  "\\sigma": "σ",
  "\\omega": "ω",
  "\\infty": "∞",
  "\\times": "×",
  "\\cdot": "·",
  "\\div": "÷",
  "\\le": "≤",
  "\\leq": "≤",
  "\\ge": "≥",
  "\\geq": "≥",
  "\\neq": "≠",
  "\\approx": "≈",
  "\\pm": "±",
  "\\to": "→",
  "\\rightarrow": "→",
  "\\leftarrow": "←",
};

const SUPERSCRIPT_MAP = {
  0: "⁰",
  1: "¹",
  2: "²",
  3: "³",
  4: "⁴",
  5: "⁵",
  6: "⁶",
  7: "⁷",
  8: "⁸",
  9: "⁹",
  "+": "⁺",
  "-": "⁻",
  "=": "⁼",
  n: "ⁿ",
  i: "ⁱ",
};

const SUBSCRIPT_MAP = {
  0: "₀",
  1: "₁",
  2: "₂",
  3: "₃",
  4: "₄",
  5: "₅",
  6: "₆",
  7: "₇",
  8: "₈",
  9: "₉",
  "+": "₊",
  "-": "₋",
  "=": "₌",
  a: "ₐ",
  e: "ₑ",
  h: "ₕ",
  i: "ᵢ",
  j: "ⱼ",
  k: "ₖ",
  l: "ₗ",
  m: "ₘ",
  n: "ₙ",
  o: "ₒ",
  p: "ₚ",
  r: "ᵣ",
  s: "ₛ",
  t: "ₜ",
  u: "ᵤ",
  v: "ᵥ",
  x: "ₓ",
};

function readGroup(source, index) {
  if (source[index] !== "{") return null;

  let depth = 0;
  for (let i = index; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    if (source[i] === "}") depth -= 1;
    if (depth === 0) {
      return {
        body: source.slice(index + 1, i),
        end: i + 1,
      };
    }
  }

  return null;
}

function replaceCommandWithGroups(source, command, groupCount, formatter) {
  let output = "";
  let cursor = 0;

  while (cursor < source.length) {
    const index = source.indexOf(command, cursor);
    if (index < 0) {
      output += source.slice(cursor);
      break;
    }

    const groups = [];
    let groupCursor = index + command.length;
    while (source[groupCursor] === " ") groupCursor += 1;

    let valid = true;
    for (let i = 0; i < groupCount; i += 1) {
      const group = readGroup(source, groupCursor);
      if (!group) {
        valid = false;
        break;
      }
      groups.push(group.body);
      groupCursor = group.end;
      while (source[groupCursor] === " ") groupCursor += 1;
    }

    output += source.slice(cursor, index);
    if (valid) {
      output += formatter(...groups.map(renderLatexText));
      cursor = groupCursor;
    } else {
      output += command;
      cursor = index + command.length;
    }
  }

  return output;
}

function replaceScripts(source, marker, map, fallbackWrapper) {
  let output = "";
  let cursor = 0;

  while (cursor < source.length) {
    const index = source.indexOf(marker, cursor);
    if (index < 0) {
      output += source.slice(cursor);
      break;
    }

    output += source.slice(cursor, index);

    const nextIndex = index + marker.length;
    let raw = "";
    let end = nextIndex;
    if (source[nextIndex] === "{") {
      const group = readGroup(source, nextIndex);
      if (group) {
        raw = renderLatexText(group.body);
        end = group.end;
      }
    } else {
      raw = source[nextIndex] || "";
      end = nextIndex + 1;
    }

    const converted = raw
      .split("")
      .map((char) => map[char] || "")
      .join("");
    output += converted || fallbackWrapper(raw);
    cursor = end;
  }

  return output;
}

function renderLatexText(content) {
  if (!content) return "";

  let output = String(content)
    .replace(/\\left|\\right/g, "")
    .replace(/\\,/g, " ")
    .replace(/~/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  output = replaceCommandWithGroups(output, "\\frac", 2, (top, bottom) => `${top} / ${bottom}`);
  output = replaceCommandWithGroups(output, "\\sqrt", 1, (body) => `√(${body})`);
  output = replaceCommandWithGroups(output, "\\text", 1, (body) => body);
  output = replaceCommandWithGroups(output, "\\mathrm", 1, (body) => body);

  output = replaceScripts(output, "^", SUPERSCRIPT_MAP, (raw) => `^(${raw})`);
  output = replaceScripts(output, "_", SUBSCRIPT_MAP, (raw) => `_(${raw})`);

  const commands = Object.entries(COMMAND_MAP).sort((left, right) => right[0].length - left[0].length);
  for (const [command, symbol] of commands) {
    output = output.split(command).join(symbol);
  }

  return output
    .replace(/\\([a-zA-Z]+)/g, "$1")
    .replace(/[{}]/g, "")
    .replace(/\s*([=+\-×÷·<>≤≥≈≠])\s*/g, " $1 ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeMath(content) {
  if (!content) return [];

  const source = String(content);
  const segments = [];
  let cursor = 0;

  while (cursor < source.length) {
    const delimiter = findNextDelimiter(source, cursor);
    if (!delimiter) {
      appendText(segments, source.slice(cursor));
      break;
    }

    const formulaStart = delimiter.index + delimiter.open.length;
    const closeIndex = findClosingDelimiter(source, formulaStart, delimiter.close);
    if (closeIndex < 0) {
      appendText(segments, source.slice(cursor));
      break;
    }

    appendText(segments, source.slice(cursor, delimiter.index));

    const text = source.slice(formulaStart, closeIndex).trim();
    if (text) {
      segments.push({
        type: "math",
        display: delimiter.display,
        text,
        renderedText: renderLatexText(text),
      });
    } else {
      appendText(segments, source.slice(delimiter.index, closeIndex + delimiter.close.length));
    }

    cursor = closeIndex + delimiter.close.length;
  }

  return normalizeSegments(segments);
}

module.exports = {
  renderLatexText,
  tokenizeMath,
};
