#!/usr/bin/env node

console.log("freetracker 0.1.0 - freelance expense tracker");
console.log("Usage:");
console.log("  freetracker init [project]");
console.log("  freetracker add [file]");
console.log("  freetracker list [--json]");
console.log("  freetracker report [--format csv]");

if (process.argv[1] === "--help" || process.argv[1] === "-h") {
  process.exit(0);
}

if (process.argv[1] === "--version" || process.argv[1] === "-v") {
  console.log("0.1.0");
  process.exit(0);
}

const [cmd, file] = process.argv.slice(2);
if (cmd === "init") {
  const envPath = "./.env.example";
  const fs = require("fs");
  if (!fs.existsSync(envPath)) {
    fs.writeFileSync(envPath, "# Freelance expense tracker - example .env.example\nDATABASE_URL=CHANGEME\nPORT=CHANGEME\n");
    console.log("Created .env.example");
  } else {
    console.log(".env.example already exists (use --force to overwrite)");
  }
} else if (cmd === "add") {
  console.log(`Adding expenses from ${file || "./expenses.csv"}`);
  console.log("Feature coming soon: expense parsing");
} else if (cmd === "list") {
  console.log("Listing expenses...");
  console.log("Feature coming soon: expense listing");
} else if (cmd === "report") {
  console.log("Generating report...");
  console.log("Feature coming soon: expense reporting");
} else {
  console.log("Unknown command. Use --help for usage.");
  process.exit(1);
}
