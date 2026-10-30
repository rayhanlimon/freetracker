#!/usr/bin/env node
// freetracker CLI - zero-dependency freelance time tracker.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseLine, parseLog, validateEntry } from "../src/parser.js";
import {
  defaultStoreFile, emptyStore, loadStore, saveStore, addEntry, listEntries, summarize
} from "../src/store.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const VERSION = "0.1.1";

function fail(msg, code = 2) {
  process.stderr.write("freetracker: " + msg + "\n");
  process.exit(code);
}

function printHelp() {
  console.log("freetracker " + VERSION + " - track freelance billable time");
  console.log("");
  console.log("Usage:");
  console.log("  freetracker init                    create an empty time log");
  console.log("  freetracker add <log-line>          append a time entry");
  console.log("  freetracker import <file>           bulk-import log lines from a text file");
  console.log("  freetracker list                    list entries (JSON lines)");
  console.log("  freetracker report                  totals by project");
  console.log("  freetracker report --json           machine-readable totals");
  console.log("");
  console.log("Log line format:  <YYYY-MM-DD> <minutes> <project> [note...]");
  console.log("Examples:");
  console.log("  freetracker add '2026-10-30 90 website-redesign client review'");
  console.log("  freetracker list --project website-redesign");
  console.log("  freetracker report --from 2026-10-01 --to 2026-10-31");
  console.log("");
  console.log("Options (list/report):");
  console.log("  --project <name>   filter by project");
  console.log("  --from <YYYY-MM-DD>  include dates >= from");
  console.log("  --to <YYYY-MM-DD>    include dates <= to");
  console.log("  --store <path>     use a different store file (default: ./.freetracker.json)");
  console.log("  --help, -h         show this help");
  console.log("  --version, -v      print version");
}

function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

function parseArgs(argv) {
  const opts = { positional: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--project") opts.project = argv[++i];
    else if (a === "--from") opts.from = argv[++i];
    else if (a === "--to") opts.to = argv[++i];
    else if (a === "--store") opts.store = argv[++i];
    else if (a === "--help" || a === "-h") opts.help = true;
    else if (a === "--version" || a === "-v") opts.version = true;
    else if (a === "--json") opts.json = true;
    else if (a.startsWith("--")) fail("unknown option " + a);
    else opts.positional.push(a);
  }
  return opts;
}

function storePath(opts) {
  return opts.store ? path.resolve(opts.store) : defaultStoreFile(process.cwd());
}

function cmdInit(opts) {
  const file = storePath(opts);
  if (fs.existsSync(file)) fail("store already exists at " + file + " (remove it or use --store elsewhere)");
  saveStore(file, emptyStore());
  console.log("created empty time log: " + file);
  return 0;
}

function entryFromLogLine(line, dateOverride) {
  const entry = parseLine(line);
  if (!entry) return null;
  if (dateOverride) entry.date = dateOverride;
  return entry;
}

function cmdAdd(args, opts) {
  if (!args.length) fail("usage: freetracker add '<YYYY-MM-DD> <minutes> <project> [note...]>'");
  const line = args.join(" ");
  const entry = entryFromLogLine(line);
  if (!entry) fail("invalid log line: " + JSON.stringify(line) + " - expected '<YYYY-MM-DD> <minutes> <project> [note...]'");
  const file = storePath(opts);
  const store = loadStore(file);
  addEntry(store, entry);
  saveStore(file, store);
  if (opts.json) console.log(JSON.stringify(entry));
  else console.log("added: " + entry.date + " " + entry.minutes + "m " + entry.project + (entry.note ? " - " + entry.note : ""));
  return 0;
}

function cmdImport(positional, opts) {
  const fileArg = positional[0];
  if (!fileArg) fail("usage: freetracker import <logfile>");
  const text = fs.readFileSync(path.resolve(fileArg), "utf8");
  const { entries, errors } = parseLog(text);
  const file = storePath(opts);
  const store = loadStore(file);
  for (const e of entries) addEntry(store, e);
  saveStore(file, store);
  console.log("imported " + entries.length + " entries");
  if (errors.length) {
    process.stderr.write("skipped " + errors.length + " invalid lines:\n");
    for (const err of errors) process.stderr.write("  line " + err.line + ": " + err.text + "\n");
  }
  return errors.length ? 1 : 0;
}

function formatEntry(e) {
  return e.date + "\t" + e.minutes + "m\t" + e.project + (e.note ? "\t" + e.note : "");
}

function cmdList(opts) {
  const store = loadStore(storePath(opts));
  const entries = listEntries(store, opts);
  if (opts.json) {
    for (const e of entries) console.log(JSON.stringify(e));
  } else {
    if (!entries.length) { console.log("(no entries match)"); return 0; }
    for (const e of entries) console.log(formatEntry(e));
  }
  return 0;
}

function cmdReport(opts) {
  const store = loadStore(storePath(opts));
  const entries = listEntries(store, opts);
  const sum = summarize(entries);
  if (opts.json) {
    console.log(JSON.stringify(sum, null, 2));
    return 0;
  }
  console.log("Entries: " + sum.entries + "  Total: " + sum.minutes + "m (" + sum.hours + "h)");
  const names = Object.keys(sum.byProject).sort();
  if (!names.length) { console.log("(no entries match)"); return 0; }
  for (const name of names) {
    const p = sum.byProject[name];
    console.log("  " + name.padEnd(24) + String(p.entries).padStart(4) + " entries  " + String(p.minutes).padStart(6) + "m  " + p.hours + "h");
  }
  return 0;
}

const argv = process.argv.slice(2);
const cmd = argv[0];

if (!cmd || cmd === "--help" || cmd === "-h") { printHelp(); process.exit(0); }
if (cmd === "--version" || cmd === "-v") { console.log(VERSION); process.exit(0); }

const opts = parseArgs(argv.slice(1));
if (opts.help) { printHelp(); process.exit(0); }
if (opts.version) { console.log(VERSION); process.exit(0); }

let code = 0;
switch (cmd) {
  case "init": code = cmdInit(opts); break;
  case "add": code = cmdAdd(opts.positional, opts); break;
  case "import": code = cmdImport(opts.positional, opts); break;
  case "list": code = cmdList(opts); break;
  case "report": code = cmdReport(opts); break;
  default:
    process.stderr.write("freetracker: unknown command " + JSON.stringify(cmd) + "\n");
    printHelp();
    code = 2;
}
process.exit(code);
