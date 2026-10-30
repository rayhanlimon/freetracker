// freetracker parser: plain-text log lines -> time entries.
// Log line format: <YYYY-MM-DD> <minutes> <project> [note words...]

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PROJECT_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export function isValidDate(date) {
  if (typeof date !== "string" || !DATE_RE.test(date)) return false;
  const d = new Date(date + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === date;
}

export function parseLine(line) {
  if (typeof line !== "string") return null;
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  const parts = trimmed.split(/\s+/);
  if (parts.length < 3) return null;
  const [date, minutesRaw, project, ...noteParts] = parts;
  const minutes = Number(minutesRaw);
  if (!isValidDate(date)) return null;
  if (!Number.isInteger(minutes) || minutes <= 0) return null;
  if (!PROJECT_RE.test(project)) return null;
  return { date, minutes, project, note: noteParts.join(" ") };
}

export function parseLog(text) {
  const entries = [];
  const errors = [];
  const lines = String(text).split(/\r?\n/);
  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (!line || line.startsWith("#")) return;
    const entry = parseLine(line);
    if (entry) entries.push(entry);
    else errors.push({ line: i + 1, text: raw, reason: "invalid entry format" });
  });
  return { entries, errors };
}

export function validateEntry(entry) {
  const errors = [];
  if (!entry || typeof entry !== "object") return { valid: false, errors: ["entry must be an object"] };
  if (!isValidDate(entry.date)) errors.push("date must be a valid YYYY-MM-DD");
  if (!Number.isInteger(entry.minutes) || entry.minutes <= 0) errors.push("minutes must be a positive integer");
  if (typeof entry.project !== "string" || !PROJECT_RE.test(entry.project)) errors.push("project must be a non-empty token (letters, digits, ., _, -)");
  if (entry.note !== undefined && typeof entry.note !== "string") errors.push("note must be a string");
  return { valid: errors.length === 0, errors };
}
