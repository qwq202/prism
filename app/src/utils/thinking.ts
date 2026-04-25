export function stripThinkTags(content: string): string {
  return content.replace(/<\s*\/?\s*think\s*>/gi, "").trim();
}

export type ParsedThinkContent = {
  thinkContent: string;
  restContent: string;
  isComplete: boolean;
};

export function parseThinkContent(content: string): ParsedThinkContent | null {
  const tagPattern = /<\s*(\/?)\s*think\s*>/gi;
  const thinkParts: string[] = [];
  const restParts: string[] = [];
  let depth = 0;
  let segmentStart = 0;
  let lastRestStart = 0;
  let sawOpeningTag = false;
  let match: RegExpExecArray | null = null;

  while ((match = tagPattern.exec(content)) !== null) {
    const isClosingTag = Boolean(match[1]);

    if (depth === 0) {
      if (isClosingTag) {
        continue;
      }

      sawOpeningTag = true;
      restParts.push(content.substring(lastRestStart, match.index));
      depth = 1;
      segmentStart = tagPattern.lastIndex;
      lastRestStart = tagPattern.lastIndex;
      continue;
    }

    if (isClosingTag) {
      depth -= 1;
      if (depth === 0) {
        thinkParts.push(content.substring(segmentStart, match.index));
        lastRestStart = tagPattern.lastIndex;
      }
      continue;
    }

    depth += 1;
  }

  if (!sawOpeningTag) {
    return null;
  }

  const isComplete = depth === 0;
  if (isComplete) {
    restParts.push(content.substring(lastRestStart));
  } else {
    thinkParts.push(content.substring(segmentStart));
  }

  return {
    thinkContent: stripThinkTags(thinkParts.join("\n\n")),
    restContent: restParts.join("").trim(),
    isComplete,
  };
}
