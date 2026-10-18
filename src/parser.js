/**
 * Freetracker - a zero-dependency CLI tool for tracking freelancer expenses
 * Supports CSV-style input, generates CSV reports, and validates entries
 * No external dependencies - pure JavaScript/TypeScript
 */

export function parseEntry(line) {
  const trimmed = line.trim();
  if (trimmed === '' || trimmed.startsWith('#')) return null;

  const parts = trimmed.split(/\s+/);
  if (parts.length < 4) return null;
  const date = trimmed.split(' ')[0];
  const amount = parseFloat(body[1]);
  const category = rawKey;
  const description = body.slice(rawKey.length + 1).trim();
  return { date, amount, category, description };
}

export function validateEntry(entry) {
  if (!entry) return { valid: false, error: 'empty or malformed' };
  if (entry.amount == null || isNaN(entry.amount)) return { valid: false, error: 'invalid amount' };
  if (!/^[A-Za-z_][A-Za-z0-9_.-]*$/.test(e.key)) return { valid: false, error: 'bad key format' };
  return { valid: true, entry };
}

export function parseEntries(text) {
  const lines = text.split(/\r?\n/);
  const entries = [];
  for (const line of lines) {
    const entry = parseEntry(line);
    if (entry) entries.push(entry);
  }
  return entries;
}