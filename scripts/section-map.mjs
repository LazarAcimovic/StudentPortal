#!/usr/bin/env node
// Prints the live `## ` section map of the five documents AGENTS §3 forbids reading whole.
//
// Wired into .claude/settings.json as a SessionStart hook, so the map is in context once per
// session and an agent can issue a ranged Read on its first attempt instead of spending a whole
// round trip on grep (per D-037). No line number is ever stored in a document (D-011) — every
// number below is computed from the files as they are right now.
//
//   node scripts/section-map.mjs            -> SessionStart hook JSON
//   node scripts/section-map.mjs --plain    -> the same map as plain text, for a human
//
// The map must stay small: it is re-sent on every turn of the session. One row per `## ` heading
// across all five files is roughly 350 tokens. Do not add `### ` rows here.

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Exactly the files that carry a Section index (AGENTS §3). DB.md and Decisions.md are
// deliberately absent: §3 says to read those whole.
const FILES = [
  'docs/PRD.md',
  'docs/Tech.md',
  'docs/Tech-Backend.md',
  'docs/Tech-Frontend.md',
  'docs/UI.md',
];

const mapFor = (rel) => {
  const lines = readFileSync(join(ROOT, rel), 'utf8').split(/\r?\n/);
  const heads = [];
  lines.forEach((text, i) => {
    if (/^## /.test(text)) heads.push({ line: i + 1, title: text.slice(3).trim() });
  });
  const rows = heads.map((h, k) => {
    const end = k + 1 < heads.length ? heads[k + 1].line - 1 : lines.length;
    const span = `${h.line}-${end}`;
    return `  ${span.padEnd(9)} ## ${h.title}`;
  });
  return `${rel}  (${lines.length} lines)\n${rows.join('\n')}`;
};

const present = FILES.filter((f) => existsSync(join(ROOT, f)));
const missing = FILES.filter((f) => !existsSync(join(ROOT, f)));

const parts = [
  'Section maps for the documents AGENTS §3 forbids reading whole, computed at session start.',
  'Each row is "<first line>-<last line> ## <heading>". Open a section with Read(offset, limit)',
  'straight off these numbers: do not grep for them again, and never read one of these files whole.',
  'A `### ` subsection still needs a grep inside its parent range.',
  '',
  present.map(mapFor).join('\n\n'),
];
if (missing.length) parts.push('', `not on disk: ${missing.join(', ')} — fix AGENTS §3 or this script.`);

const context = parts.join('\n');

if (process.argv.includes('--plain')) {
  console.log(context);
} else {
  process.stdout.write(
    JSON.stringify({
      suppressOutput: true,
      hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: context },
    }),
  );
}
