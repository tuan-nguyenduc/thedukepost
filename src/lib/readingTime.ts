const WORDS_PER_MINUTE = 200;

export function calculateReadingTime(text: string): number {
  const wordCount = text.trim().split(/\s+/).length;
  return Math.ceil(wordCount / WORDS_PER_MINUTE);
}

export function formatReadingTime(minutes: number): string {
  if (minutes < 1) return 'Less than 1 min';
  if (minutes === 1) return '1 min read';
  return `${minutes} min read`;
}
