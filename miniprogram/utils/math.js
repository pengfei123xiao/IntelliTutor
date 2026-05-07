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
      });
    } else {
      appendText(segments, source.slice(delimiter.index, closeIndex + delimiter.close.length));
    }

    cursor = closeIndex + delimiter.close.length;
  }

  return normalizeSegments(segments);
}

module.exports = {
  tokenizeMath,
};
