const TAG_PATTERN = /#(\S+)/g;

export function extractTags(text: string): string[] {
  const tags = new Set<string>();
  for (const match of text.matchAll(TAG_PATTERN)) {
    tags.add(match[1]!);
  }
  return [...tags];
}
