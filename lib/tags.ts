export function parseTags(input: string): string[] {
  return input
    .split(',')
    .map(t => t.trim())
    .filter(Boolean)
    .map(t => t.toLowerCase());
}

export function uniqueTags(all: string[][]): string[] {
  const set = new Set<string>();
  all.forEach(arr => arr?.forEach(t => set.add(t)));
  return Array.from(set).sort();
}
