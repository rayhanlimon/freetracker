# freetracker

A zero-dependency command-line tool for freelance developers and consultants to
log billable time against projects and produce per-project totals. Everything is
stored in a single human-readable JSON file (`.freetracker.json`) so it can be
version-controlled, diffed, and scripted against.

## Features

- Log a time entry in one command: `freetracker add '2026-10-30 90 website-redesign client review'`
- Bulk-import from a plain text log
- Filter listings by project and date range
- Per-project totals with hours
- Machine-readable JSON output for scripting
- Zero runtime dependencies; works on Node.js >= 18

## Install

```sh
npm install -g freetracker
```

Or run directly from a clone:

```sh
git clone https://github.com/rayhanlimon/freetracker.git
cd freetracker
node bin/freetracker.js --help
```

## Usage

Initialize a time log in the current directory:

```sh
freetracker init
```

Add an entry (`<YYYY-MM-DD> <minutes> <project> [note...]`):

```sh
freetracker add '2026-10-30 90 website-redesign client review'
freetracker add '2026-10-30 45 website-redesign'
freetracker add '2026-10-31 120 api-integration'
```

List entries (tab-separated):

```sh
freetracker list
freetracker list --project website-redesign
freetracker list --from 2026-10-30 --to 2026-10-31
```

Totals:

```sh
freetracker report
freetracker report --project website-redesign
freetracker report --from 2026-10-01 --to 2026-10-31 --json
```

Bulk import from a text file (lines starting with `#` are comments):

```sh
freetracker import times.log
```

Use a different store file:

```sh
freetracker init --store ~/work/client-a.json
freetracker add '2026-10-30 60 p' --store ~/work/client-a.json
```

## Store format

`.freetracker.json`:

```json
{
  "version": 1,
  "entries": [
    { "date": "2026-10-30", "minutes": 90, "project": "website-redesign", "note": "client review", "createdAt": "2026-10-30T12:00:00.000Z" }
  ]
}
```

## Development

```sh
npm test
```

## License

MIT
