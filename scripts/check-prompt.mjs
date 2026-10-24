#!/usr/bin/env node
// Consistency checks for the bootstrap prompt (docs/old/prompt.md).
//
// The prompt is the one artefact in this system with no other safety net: it is git-ignored,
// excluded from check-docs.mjs's SOURCE_DOCS, and placeholder-heavy enough that the ordinary
// reference checks would false-positive on it. Every prompt defect found by hand so far would
// have been caught by one of the checks below.
//
//   node scripts/check-prompt.mjs                 (A) internal consistency only
//   node scripts/check-prompt.mjs --reference     (A) + (B) agreement with THIS repo
//
// (B) only means anything in the reference implementation. In a fresh project the prompt
// describes files that do not exist yet, so (B) would fail by design.

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROMPT = 'docs/old/prompt.md';
const REFERENCE = process.argv.includes('--reference');

const errors = [];
const warnings = [];
const fail = (line, msg) => errors.push(`${PROMPT}:${line}  ${msg}`);
const warn = (line, msg) => warnings.push(`${PROMPT}:${line}  ${msg}`);

if (!existsSync(join(ROOT, PROMPT))) {
  console.log(`check-prompt: ${PROMPT} is not present — nothing to check.`);
  process.exit(0);
}
const raw = readFileSync(join(ROOT, PROMPT), 'utf8');
const lines = raw.split(/\r?\n/);
const lineOf = (needle) => lines.findIndex((l) => l.includes(needle)) + 1;

// =============================================================== (A) internal

// --- A1: numbered subsections are sequential, no duplicates, no gaps
const subsections = [];
lines.forEach((text, i) => {
  const m = /^### (\d+)\.(\d+)\s/.exec(text);
  if (m) subsections.push({ phase: Number(m[1]), n: Number(m[2]), line: i + 1, text: text.trim() });
});
const byPhase = new Map();
for (const s of subsections) {
  if (!byPhase.has(s.phase)) byPhase.set(s.phase, []);
  byPhase.get(s.phase).push(s);
}
for (const [phase, list] of byPhase) {
  const seen = new Map();
  for (const s of list) {
    if (seen.has(s.n)) fail(s.line, `duplicate heading §${phase}.${s.n} (also at line ${seen.get(s.n)})`);
    seen.set(s.n, s.line);
  }
  const nums = [...seen.keys()].sort((a, b) => a - b);
  nums.forEach((n, idx) => {
    if (idx > 0 && n !== nums[idx - 1] + 1) {
      fail(seen.get(n), `§${phase}.${n} skips §${phase}.${nums[idx - 1] + 1} — numbering has a gap`);
    }
  });
}

// --- A2: the preamble file list and the Phase 1 sections must agree
const fenceStart = lines.findIndex((l) => /^>\s*```$/.test(l));
let listed = new Set();
if (fenceStart === -1) {
  errors.push(`${PROMPT}  the preamble has no fenced "what it creates" file list`);
} else {
  for (let i = fenceStart + 1; i < lines.length; i++) {
    if (/^>\s*```$/.test(lines[i])) break;
    for (const tok of lines[i].replace(/^>\s*/, '').trim().split(/\s+/)) {
      if (tok) listed.add(tok);
    }
  }
}

// paths a Phase 1 section says to create, taken from its heading
const created = new Map();
for (const s of subsections) {
  if (s.phase !== 1) continue;
  for (const m of s.text.matchAll(/`([^`]+)`/g)) {
    const p = m[1];
    if (!p.includes('/') && !p.endsWith('.md')) continue; // e.g. ".gitkeep" prose
    created.set(p, s);
  }
}
for (const [p, s] of created) {
  if (p === '.gitignore') continue; // modified, not created — the preamble says so
  const hit = [...listed].some((l) => l === p || (p.includes('*') && l.startsWith(p.split('*')[0])));
  if (!hit) fail(s.line, `§${s.phase}.${s.n} creates \`${p}\` but the preamble file list omits it`);
}
for (const p of listed) {
  if (p.endsWith('/.gitkeep')) continue; // created by the .gitkeep section, which names no path
  const hit = [...created.keys()].some((c) => c === p || (c.includes('*') && p.startsWith(c.split('*')[0])));
  if (!hit) fail(fenceStart + 1, `the preamble lists \`${p}\` but no Phase 1 section creates it`);
}

// --- A3: every placeholder token used must be explained somewhere
const PLACEHOLDERS = [
  { token: 'RNN', defined: /`RNN`\s+means|What `RNN` means/ },
  { token: 'D-0NN', defined: /D-0NN — <one-line question>/ },
  { token: 'YYYY-MM', defined: /done\/YYYY-MM/ },
];
for (const { token, defined } of PLACEHOLDERS) {
  const used = new RegExp(`\\b${token.replace(/-/g, '-')}\\b`).test(raw);
  if (used && !defined.test(raw)) {
    fail(lineOf(token), `placeholder \`${token}\` is used but never explained`);
  }
}

// --- A4: appendix cross-references resolve
const appendices = new Set();
lines.forEach((l) => {
  const m = /^# Appendix ([A-Z]) —/.exec(l);
  if (m) appendices.add(m[1]);
});
// Inline code spans are stripped first: `Appendix X` is a generic placeholder in prose about
// the format, not a reference to an appendix named X.
const withoutCode = (s) => s.replace(/`[^`]*`/g, '');

lines.forEach((text, i) => {
  for (const m of withoutCode(text).matchAll(/\*\*Appendix ([A-Z])\*\*|Appendix ([A-Z])\b/g)) {
    const letter = m[1] ?? m[2];
    if (!appendices.has(letter)) fail(i + 1, `references Appendix ${letter}, which does not exist`);
  }
});

// --- A5: "Appendix A §N" references resolve inside Appendix A's fenced seed
const aStart = raw.indexOf('# Appendix A');
const aEnd = raw.indexOf('# Appendix B');
const seed = aStart >= 0 && aEnd > aStart ? raw.slice(aStart, aEnd) : '';
// The trailing dot is optional: "## 4. Tasks" and "### 4.1 Opening a task file" are both headings.
const SECTION_HEADING = /^#{2,4}\s+(\d+(?:\.\d+)*)\.?\s/gm;
const sectionNumbers = (text) => new Set([...text.matchAll(SECTION_HEADING)].map((m) => m[1]));

const seedSections = sectionNumbers(seed);
lines.forEach((text, i) => {
  for (const m of withoutCode(text).matchAll(/Appendix A §(\d+(?:\.\d+)?)/g)) {
    if (!seedSections.has(m[1])) fail(i + 1, `references Appendix A §${m[1]}, which the seed does not define`);
  }
});

// --- A6: phases are sequential and the preamble's phase count matches
const phases = [...raw.matchAll(/^## Phase (\d+) —/gm)].map((m) => Number(m[1]));
phases.forEach((p, i) => {
  if (i > 0 && p !== phases[i - 1] + 1) errors.push(`${PROMPT}  Phase ${p} follows Phase ${phases[i - 1]}`);
});
if (phases.length && phases[0] !== 1) errors.push(`${PROMPT}  phases start at ${phases[0]}, not 1`);

// --- A7: the stated file count matches the list
const countWords = { sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20 };
const cm = /What it creates\*\*\s*\((\w+) files/.exec(raw);
if (cm) {
  const stated = countWords[cm[1].toLowerCase()];
  if (!stated) warn(lineOf('What it creates'), `cannot parse the file count "${cm[1]}"`);
  else if (stated !== listed.size) {
    fail(lineOf('What it creates'), `preamble says ${cm[1]} (${stated}) files but the list holds ${listed.size}`);
  }
}

// ============================================================== (B) reference

if (REFERENCE) {
  for (const p of listed) {
    // A `.gitkeep` is a transient scaffold file: the rule in §1.12 is to delete it once the
    // folder holds something real, so the folder existing is what proves it was created.
    if (p.endsWith('/.gitkeep')) {
      const dir = p.slice(0, -'/.gitkeep'.length);
      if (!existsSync(join(ROOT, p)) && !existsSync(join(ROOT, dir))) {
        fail(fenceStart + 1, `[reference] the prompt mandates \`${p}\` but ${dir}/ does not exist here`);
      }
      continue;
    }
    const candidates = p.includes('*')
      ? ['docs/Tech.md', 'docs/Tech-Backend.md', 'docs/Tech-Frontend.md']
      : [p];
    const ok = candidates.every((c) => existsSync(join(ROOT, c)));
    if (!ok) fail(fenceStart + 1, `[reference] the prompt mandates \`${p}\`, which is missing from this repo`);
  }

  const live = readFileSync(join(ROOT, 'AGENTS.md'), 'utf8');
  const liveSections = sectionNumbers(live);
  for (const s of seedSections) {
    if (!liveSections.has(s)) fail(aStart, `[reference] Appendix A defines §${s} but AGENTS.md does not`);
  }
  for (const s of liveSections) {
    if (!seedSections.has(s)) warn(aStart, `[reference] AGENTS.md has §${s} but Appendix A's seed does not`);
  }

  const INVARIANTS = {
    'precedence table': /Product behaviour[^|]*\|\s*`docs\/PRD\.md`/,
    'stop-on-conflict': /you do not choose/i,
    'task file is never a rule source': /task file is a plan, never a source of truth/i,
    'decision log is the why': /log of \*why\*, not \*what\*/,
    'docs/old ban': /Never Read, Grep or Glob it/,
    'the Loaded: echo': /Loaded: PRD §4\.8/,
    'grep section navigation': /grep -n "\^## "/,
    'task-file grep recipe': /grep -n "\^#### "/,
    'leftover work is a box': /is a box, not a nested subtask/,
    'archival gate': /rchival gate/,
    'Refactor needs no new test': /No new test/,
    'no DB sub-tag': /no `DB` sub-tag/,
    'four mandatory subtask lines': /Not in scope:[\s\S]*Docs to update:[\s\S]*Verify:/,
    'never commit until told': /Never commit until the user says so/,
    'no self-attribution': /Never add self-attribution/,
    'never reset --hard': /reset --hard/,
    'one definition per value': /[Oo]ne definition per value/,
    'section size cap': /150 lines/,
    'layout verified not remembered': /verified at/,
    'mechanical check + hook': /core\.hooksPath \.githooks/,
  };
  for (const [label, re] of Object.entries(INVARIANTS)) {
    const inPrompt = re.test(raw);
    const inAgents = re.test(live);
    if (!inPrompt) fail(1, `[reference] invariant missing from the prompt: ${label}`);
    if (!inAgents) fail(1, `[reference] invariant missing from AGENTS.md: ${label}`);
  }
}

// ================================================================== report

const plural = (n, s) => `${n} ${s}${n === 1 ? '' : 's'}`;
if (warnings.length) {
  console.log(`\n${plural(warnings.length, 'warning')}:`);
  for (const w of warnings) console.log(`  ~ ${w}`);
}
if (errors.length) {
  console.log(`\n${plural(errors.length, 'error')}:`);
  for (const e of errors) console.log(`  x ${e}`);
  console.log('\ncheck-prompt: FAILED\n');
  process.exit(1);
}
console.log(
  `\ncheck-prompt: OK (${subsections.length} numbered sections, ${listed.size} mandated files, ` +
    `${appendices.size} appendices, ${REFERENCE ? 'internal + reference' : 'internal only'})\n`,
);
