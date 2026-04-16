export function parseScoresTimestamp(filename: string): Date {
  const match = filename.match(/scores-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})/);
  if (!match) return new Date(0);
  return new Date(`${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}`);
}
