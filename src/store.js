// freetracker store: JSON file persistence + queries.
import fs from "node:fs";
import path from "node:path";

export const STORE_VERSION = 1;
export const DEFAULT_STORE_FILE = ".freetracker.json";

export function defaultStoreFile(cwd = process.cwd()) {
  return path.join(cwd, DEFAULT_STORE_FILE);
}

export function emptyStore() {
  return { version: STORE_VERSION, entries: [] };
}

export function loadStore(file = defaultStoreFile()) {
  let text;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch (err) {
    if (err && err.code === "ENOENT") return emptyStore();
    throw err;
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    const e = new Error("freetracker: store file " + file + " is not valid JSON");
    e.code = "EBADSTORE";
    throw e;
  }
  if (!data || typeof data !== "object" || !Array.isArray(data.entries)) {
    const e = new Error("freetracker: store file " + file + " has an invalid shape (expected {version, entries})");
    e.code = "EBADSTORE";
    throw e;
  }
  return data;
}

export function saveStore(file, store) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(store, null, 2) + "\n");
}

export function addEntry(store, entry) {
  store.entries.push(Object.assign({}, entry, { createdAt: new Date().toISOString() }));
  return store;
}

export function listEntries(store, opts = {}) {
  const project = opts.project;
  const from = opts.from;
  const to = opts.to;
  return store.entries.filter((e) =>
    (!project || e.project === project) &&
    (!from || e.date >= from) &&
    (!to || e.date <= to)
  );
}

function roundHours(minutes) {
  return Math.round((minutes / 60) * 100) / 100;
}

export function summarize(entries) {
  const byProject = {};
  let totalMinutes = 0;
  for (const e of entries) {
    totalMinutes += e.minutes;
    const p = byProject[e.project] || (byProject[e.project] = { entries: 0, minutes: 0 });
    p.entries += 1;
    p.minutes += e.minutes;
  }
  const out = {};
  for (const [name, v] of Object.entries(byProject)) {
    out[name] = { entries: v.entries, minutes: v.minutes, hours: roundHours(v.minutes) };
  }
  return { entries: entries.length, minutes: totalMinutes, hours: roundHours(totalMinutes), byProject: out };
}
