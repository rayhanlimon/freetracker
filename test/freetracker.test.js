import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { isValidDate, parseLine, parseLog, validateEntry } from '../src/parser.js';
import { loadStore, saveStore, addEntry, listEntries, summarize, emptyStore } from '../src/store.js';

const CLI = path.resolve('/home/shadow/git/freetracker/bin/freetracker.js');

function runCli(args, cwd) {
  return execFileSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8' });
}

test('isValidDate accepts real dates and rejects garbage', () => {
  assert.equal(isValidDate('2026-10-30'), true);
  assert.equal(isValidDate('2026-02-29'), false); // 2026 not a leap year
  assert.equal(isValidDate('2024-02-29'), true);
  assert.equal(isValidDate('2026-13-01'), false);
  assert.equal(isValidDate('nope'), false);
  assert.equal(isValidDate(null), false);
});

test('parseLine handles valid entries and notes', () => {
  assert.deepEqual(parseLine('2026-10-30 90 website-redesign client review'), {
    date: '2026-10-30', minutes: 90, project: 'website-redesign', note: 'client review'
  });
  assert.deepEqual(parseLine('2026-11-01 30 api-integration'), {
    date: '2026-11-01', minutes: 30, project: 'api-integration', note: ''
  });
});

test('parseLine rejects malformed lines', () => {
  for (const l of ['', '# comment', '2026-10-30', '2026-10-30 90', '2026-10-30 abc proj', '2026-10-30 0 proj', '2026-10-30 -5 proj', '2026-10-30 90 bad/project', 'not-a-date 90 proj']) {
    assert.equal(parseLine(l), null, 'should reject: ' + l);
  }
});

test('parseLog splits valid/invalid and skips blanks and comments', () => {
  const text = '# header\n\n2026-10-30 90 p1 note here\n2026-10-31 60 p2\nbad line\n';
  const { entries, errors } = parseLog(text);
  assert.equal(entries.length, 2);
  assert.equal(errors.length, 1);
  assert.equal(errors[0].line, 5);
});

test('parseLog handles CRLF', () => {
  const { entries } = parseLog('2026-10-30 90 p1\r\n2026-10-31 60 p2\r\n');
  assert.equal(entries.length, 2);
});

test('validateEntry reports all errors', () => {
  const r = validateEntry({ date: 'nope', minutes: 0, project: '', note: 5 });
  assert.equal(r.valid, false);
  assert.ok(r.errors.some(e => e.includes('date')));
  assert.ok(r.errors.some(e => e.includes('minutes')));
  assert.ok(r.errors.some(e => e.includes('project')));
  assert.ok(r.errors.some(e => e.includes('note')));
});

test('validateEntry accepts a good entry', () => {
  assert.deepEqual(validateEntry({ date: '2026-10-30', minutes: 90, project: 'p1', note: 'x' }), { valid: true, errors: [] });
});

test('store: load missing returns empty, save/load roundtrip', () => {
  const d = mkdtempSync(path.join(tmpdir(), 'ft-'));
  const f = path.join(d, 'store.json');
  const s = loadStore(f);
  assert.deepEqual(s, { version: 1, entries: [] });
  addEntry(s, { date: '2026-10-30', minutes: 90, project: 'p1', note: '' });
  saveStore(f, s);
  const s2 = loadStore(f);
  assert.equal(s2.entries.length, 1);
  assert.equal(s2.entries[0].project, 'p1');
  assert.ok(s2.entries[0].createdAt);
  rmSync(d, { recursive: true, force: true });
});

test('store: corrupt file throws EBADSTORE', () => {
  const d = mkdtempSync(path.join(tmpdir(), 'ft-'));
  const f = path.join(d, 'store.json');
  writeFileSync(f, '{not json');
  assert.throws(() => loadStore(f), (e) => e.code === 'EBADSTORE');
  rmSync(d, { recursive: true, force: true });
});

test('store: bad shape throws EBADSTORE', () => {
  const d = mkdtempSync(path.join(tmpdir(), 'ft-'));
  const f = path.join(d, 'store.json');
  writeFileSync(f, JSON.stringify({ foo: 1 }));
  assert.throws(() => loadStore(f), (e) => e.code === 'EBADSTORE');
  rmSync(d, { recursive: true, force: true });
});

test('listEntries filters by project and date range', () => {
  const s = emptyStore();
  addEntry(s, { date: '2026-10-29', minutes: 60, project: 'a', note: '' });
  addEntry(s, { date: '2026-10-30', minutes: 90, project: 'b', note: '' });
  addEntry(s, { date: '2026-10-31', minutes: 30, project: 'a', note: '' });
  assert.equal(listEntries(s, { project: 'a' }).length, 2);
  assert.equal(listEntries(s, { from: '2026-10-30', to: '2026-10-31' }).length, 2);
  assert.equal(listEntries(s, { project: 'a', from: '2026-10-30' }).length, 1);
});

test('summarize groups by project and totals', () => {
  const s = emptyStore();
  addEntry(s, { date: '2026-10-30', minutes: 90, project: 'a', note: '' });
  addEntry(s, { date: '2026-10-30', minutes: 30, project: 'a', note: '' });
  addEntry(s, { date: '2026-10-31', minutes: 120, project: 'b', note: '' });
  const sum = summarize(s.entries);
  assert.equal(sum.entries, 3);
  assert.equal(sum.minutes, 240);
  assert.equal(sum.hours, 4);
  assert.equal(sum.byProject.a.entries, 2);
  assert.equal(sum.byProject.a.minutes, 120);
  assert.equal(sum.byProject.a.hours, 2);
  assert.equal(sum.byProject.b.minutes, 120);
});

test('CLI: init creates store', () => {
  const d = mkdtempSync(path.join(tmpdir(), 'ft-'));
  runCli(['init'], d);
  const s = JSON.parse(readFileSync(path.join(d, '.freetracker.json'), 'utf8'));
  assert.deepEqual(s, { version: 1, entries: [] });
  rmSync(d, { recursive: true, force: true });
});

test('CLI: add + list + report flow', () => {
  const d = mkdtempSync(path.join(tmpdir(), 'ft-'));
  runCli(['init'], d);
  runCli(['add', '2026-10-30 90 website-redesign client review'], d);
  runCli(['add', '2026-10-30 45 website-redesign'], d);
  runCli(['add', '2026-10-31 120 api-integration'], d);
  const list = runCli(['list'], d);
  assert.match(list, /website-redesign/);
  assert.equal(list.trim().split('\n').length, 3);
  const filtered = runCli(['list', '--project', 'website-redesign'], d);
  assert.equal(filtered.trim().split('\n').length, 2);
  const report = runCli(['report'], d);
  assert.match(report, /Entries: 3  Total: 255m/);
  assert.match(report, /website-redesign/);
  const json = runCli(['report', '--json'], d);
  const parsed = JSON.parse(json);
  assert.equal(parsed.entries, 3);
  assert.equal(parsed.minutes, 255);
  rmSync(d, { recursive: true, force: true });
});

test('CLI: import bulk loads valid lines and reports invalid', () => {
  const d = mkdtempSync(path.join(tmpdir(), 'ft-'));
  runCli(['init'], d);
  const log = path.join(d, 'more.log');
  writeFileSync(log, '# c\n2026-11-01 30 website-redesign deploy\nbad line here\n');
  let out = '';
  let code = 0;
  try { out = runCli(['import', log], d); }
  catch (e) { out = e.stdout; code = e.status; }
  assert.match(out, /imported 1 entries/);
  assert.equal(code, 1);
  const list = runCli(['list'], d);
  assert.match(list, /deploy/);
  rmSync(d, { recursive: true, force: true });
});

test('CLI: invalid add exits 2', () => {
  const d = mkdtempSync(path.join(tmpdir(), 'ft-'));
  runCli(['init'], d);
  let code = 0;
  try { runCli(['add', 'not-a-date xyz'], d); }
  catch (e) { code = e.status; }
  assert.equal(code, 2);
  rmSync(d, { recursive: true, force: true });
});

test('CLI: unknown command exits 2', () => {
  const d = mkdtempSync(path.join(tmpdir(), 'ft-'));
  let code = 0;
  try { runCli(['frobnicate'], d); }
  catch (e) { code = e.status; }
  assert.equal(code, 2);
  rmSync(d, { recursive: true, force: true });
});

test('CLI: --version and --help', () => {
  const d = mkdtempSync(path.join(tmpdir(), 'ft-'));
  const v = runCli(['--version'], d);
  assert.match(v, /^0\.1\.1$/m);
  const h = runCli(['--help'], d);
  assert.match(h, /track freelance billable time/);
  rmSync(d, { recursive: true, force: true });
});

test('CLI: report date range filter', () => {
  const d = mkdtempSync(path.join(tmpdir(), 'ft-'));
  runCli(['init'], d);
  runCli(['add', '2026-10-30 90 a'], d);
  runCli(['add', '2026-10-31 120 b'], d);
  const r = runCli(['report', '--from', '2026-10-31', '--to', '2026-10-31'], d);
  assert.match(r, /Entries: 1  Total: 120m/);
  rmSync(d, { recursive: true, force: true });
});

test('CLI: custom store path via --store', () => {
  const d = mkdtempSync(path.join(tmpdir(), 'ft-'));
  const custom = path.join(d, 'custom.json');
  runCli(['init', '--store', custom], d);
  runCli(['add', '2026-10-30 60 p', '--store', custom], d);
  const list = runCli(['list', '--store', custom], d);
  assert.match(list, /60m/);
  assert.equal(existsSync(path.join(d, '.freetracker.json')), false);
  rmSync(d, { recursive: true, force: true });
});