#!/usr/bin/env node
// Design-system checker. Plain Node >= 22, no dependencies.
//
//   node scripts/check.mjs                       # use design-system.config.json
//   node scripts/check.mjs --config path.json    # explicit config
//   node scripts/check.mjs src/Button.tsx ...    # scan only these files
//
// 1. Drift: every token row in CHEATSHEET.md must match the tokens CSS and/or
//    TS file (light and dark values), and neither file may declare tokens the
//    cheatsheet does not document.
// 2. Scan: source files matched by `scan` globs (or given as arguments) must
//    not contain raw colors, raw font sizes or hardcoded font families.
//
// Exit codes: 0 clean, 1 findings, 2 usage/config error.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SKILL_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const CONFIG_NAME = 'design-system.config.json';

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

function lineOf(text, index) {
  let line = 1;
  for (let i = 0; i < index && i < text.length; i++) if (text[i] === '\n') line++;
  return line;
}

/** Normalize a token value so CSS, TS and Markdown spellings compare equal. */
export function normalizeValue(raw) {
  let v = String(raw).trim().toLowerCase();
  v = v.replace(/^['"]|['"]$/g, '');
  v = v.replace(/\s+/g, ' ').replace(/\s*,\s*/g, ',').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')');
  const unit = v.match(/^(-?\d*\.?\d+)(px|ms)?$/);
  if (unit) return String(Number(unit[1]));
  return v;
}

/* ------------------------------------------------------------------ */
/* Parsers                                                             */
/* ------------------------------------------------------------------ */

const VAR_CELL = /^`(--[\w-]+)`$/;
const VALUE_CELL = /^`([^`]+)`$/;

/**
 * Token rows are Markdown table rows containing a cell that is exactly
 * `--name`. The next cells that are exactly one backtick span are its values:
 * the first is the light/default value, the second (optional) is dark.
 * A name without value cells is presence-only.
 * Returns Map<name, { line, light?, dark? }> plus conflicts.
 */
export function parseCheatsheet(md) {
  const tokens = new Map();
  const conflicts = [];
  let inFence = false;
  md.split('\n').forEach((rawLine, i) => {
    const line = rawLine.trim();
    if (line.startsWith('```')) {
      inFence = !inFence;
      return;
    }
    if (inFence || !line.startsWith('|')) return;
    const cells = line.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
    let current = null;
    const flush = () => {
      if (!current) return;
      const prev = tokens.get(current.name);
      if (!prev) {
        tokens.set(current.name, current);
      } else {
        for (const key of ['light', 'dark']) {
          if (current[key] === undefined) continue;
          if (prev[key] === undefined) {
            prev[key] = current[key];
            prev.line = current.line;
          } else if (normalizeValue(prev[key]) !== normalizeValue(current[key])) {
            conflicts.push({
              line: current.line,
              message: `${current.name} (${key}) is \`${current[key]}\` here but \`${prev[key]}\` on line ${prev.line}`,
            });
          }
        }
      }
      current = null;
    };
    for (const cell of cells) {
      const varMatch = cell.match(VAR_CELL);
      if (varMatch) {
        flush();
        current = { name: varMatch[1], line: i + 1, values: 0 };
        continue;
      }
      if (!current) continue;
      const valueMatch = cell.match(VALUE_CELL);
      if (valueMatch && current.values < 2) {
        current[current.values === 0 ? 'light' : 'dark'] = valueMatch[1];
        current.values++;
      }
    }
    flush();
  });
  for (const t of tokens.values()) delete t.values;
  return { tokens, conflicts };
}

function scopeOf(stack) {
  const joined = stack.join(' ').toLowerCase();
  if (joined.includes('dark')) return 'dark';
  if (stack.some((s) => s.trim().startsWith('@media') || s.trim().startsWith('@supports'))) {
    return 'other';
  }
  return 'default';
}

/**
 * Collect custom-property declarations. Blocks whose selector chain mentions
 * "dark" form the dark scope; other @media/@supports blocks are ignored (e.g.
 * reduced-motion overrides); everything else is the default scope.
 * Returns { default: Map, dark: Map, conflicts } with Map<name, {value,line}>.
 */
export function parseCssTokens(css) {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  const result = { default: new Map(), dark: new Map(), other: new Map(), conflicts: [] };
  const stack = [];
  let segmentStart = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '{') {
      stack.push(text.slice(segmentStart, i).trim());
      segmentStart = i + 1;
    } else if (ch === '}') {
      handleDecl(text.slice(segmentStart, i), segmentStart);
      stack.pop();
      segmentStart = i + 1;
    } else if (ch === ';') {
      handleDecl(text.slice(segmentStart, i), segmentStart);
      segmentStart = i + 1;
    }
  }
  function handleDecl(chunk, offset) {
    const m = chunk.match(/^(\s*)(--[\w-]+)\s*:\s*([\s\S]*)$/);
    if (!m) return;
    const scope = result[scopeOf(stack)];
    const name = m[2];
    const value = m[3].trim();
    const line = lineOf(text, offset + m[1].length);
    const prev = scope.get(name);
    if (!prev) scope.set(name, { value, line });
    else if (scopeOf(stack) !== 'other' && normalizeValue(prev.value) !== normalizeValue(value)) {
      result.conflicts.push({
        line,
        message: `${name} is \`${value}\` here but \`${prev.value}\` on line ${prev.line} in the same theme`,
      });
    }
  }
  delete result.other;
  return result;
}

function objectBody(ts, exportName) {
  const decl = new RegExp(`export\\s+const\\s+${exportName}\\b[^=]*=\\s*\\{`);
  const m = decl.exec(ts);
  if (!m) return null;
  const start = m.index + m[0].length;
  let depth = 1;
  for (let i = start; i < ts.length; i++) {
    if (ts[i] === '{') depth++;
    else if (ts[i] === '}' && --depth === 0) return { body: ts.slice(start, i), offset: start };
  }
  return null;
}

/**
 * Read `export const vars = {...}` and `export const darkVars = {...}` whose
 * keys are quoted custom-property names and values are string/number literals.
 */
export function parseTsTokens(ts) {
  const result = { default: new Map(), dark: new Map(), conflicts: [] };
  const entry = /['"](--[\w-]+)['"]\s*:\s*(?:'([^']*)'|"([^"]*)"|(-?\d+(?:\.\d+)?))/g;
  for (const [exportName, scope] of [['vars', 'default'], ['darkVars', 'dark']]) {
    const found = objectBody(ts, exportName);
    if (!found) continue;
    for (const m of found.body.matchAll(entry)) {
      const value = m[2] ?? m[3] ?? m[4];
      result[scope].set(m[1], { value, line: lineOf(ts, found.offset + m.index) });
    }
  }
  return result;
}

/* ------------------------------------------------------------------ */
/* Drift                                                               */
/* ------------------------------------------------------------------ */

/**
 * Compare cheatsheet tokens against one parsed token file.
 * Returns findings: { file, line, rule: 'drift', message }.
 */
export function compareTokens(sheet, parsed, { cheatsheetFile, tokenFile }) {
  const findings = [];
  const add = (file, line, message) => findings.push({ file, line, rule: 'drift', message });

  for (const c of parsed.conflicts) add(tokenFile, c.line, c.message);

  for (const [name, row] of sheet.tokens) {
    const light = parsed.default.get(name);
    const dark = parsed.dark.get(name);
    if (!light) {
      add(cheatsheetFile, row.line, `${name} is documented but not declared in ${tokenFile}`);
      continue;
    }
    if (row.light !== undefined && normalizeValue(row.light) !== normalizeValue(light.value)) {
      add(
        cheatsheetFile,
        row.line,
        `${name}: cheatsheet \`${row.light}\` vs ${tokenFile}:${light.line} \`${light.value}\``,
      );
    }
    if (row.dark !== undefined) {
      if (!dark) {
        add(cheatsheetFile, row.line, `${name} documents a dark value but ${tokenFile} has no dark override`);
      } else if (normalizeValue(row.dark) !== normalizeValue(dark.value)) {
        add(
          cheatsheetFile,
          row.line,
          `${name} (dark): cheatsheet \`${row.dark}\` vs ${tokenFile}:${dark.line} \`${dark.value}\``,
        );
      }
    } else if (dark && row.light !== undefined) {
      add(tokenFile, dark.line, `${name} has a dark override that the cheatsheet does not document`);
    }
  }

  for (const scope of ['default', 'dark']) {
    for (const [name, decl] of parsed[scope]) {
      if (!sheet.tokens.has(name)) {
        add(tokenFile, decl.line, `${name} is declared but not documented in ${cheatsheetFile}`);
      }
    }
  }
  return findings;
}

/* ------------------------------------------------------------------ */
/* Scan                                                                */
/* ------------------------------------------------------------------ */

const HEX = /(?<![\w&#])#(?:[\da-f]{8}|[\da-f]{6}|[\da-f]{3,4})(?![\w-])/gi;
const FUNC_COLOR = /\b(?:rgba?|hsla?)\(\s*[\d.]/gi;

export const BUILTIN_RULES = [
  {
    id: 'raw-color',
    message: 'raw color literal; use a color token',
    find(line, ctx) {
      const out = [];
      for (const m of line.matchAll(HEX)) {
        const before = line.slice(Math.max(0, m.index - 8), m.index);
        if (/(?:href|src|to)=["']?$/i.test(before)) continue;
        if (ctx.allowHex.has(m[0].toLowerCase())) continue;
        out.push({ col: m.index + 1, match: m[0] });
      }
      for (const m of line.matchAll(FUNC_COLOR)) out.push({ col: m.index + 1, match: m[0] });
      return out;
    },
  },
  {
    id: 'raw-font-size',
    message: 'raw font size; use a type-role token',
    patterns: [
      /\bfont-size\s*:\s*-?\d*\.?\d+(?:px|rem|pt)\b/gi,
      /\bfont\s*:[^;"'{}]*?\d+(?:px|rem|pt)\b/gi,
      /\btext-\[\d*\.?\d+(?:px|rem|pt)?\]/g,
      /\bfontSize\s*(?::|=)\s*\{?\s*['"]?\d/g,
    ],
  },
  {
    id: 'raw-font-family',
    message: 'hardcoded font family; use a font-role token',
    patterns: [
      /\bfont-family\s*:\s*(?!\s*(?:var\(|inherit\b|initial\b|unset\b))[^;"}]+/gi,
      /\bfontFamily\s*:\s*['"]/g,
    ],
  },
];

function compileForbid(forbid = []) {
  return forbid.map((f, i) => ({
    id: f.id ?? `forbid-${i + 1}`,
    message: f.message ?? `matches forbidden pattern ${f.pattern}`,
    patterns: [new RegExp(f.pattern, (f.flags ?? '').includes('g') ? f.flags : `${f.flags ?? ''}g`)],
  }));
}

/** Scan one file's text. A line containing `ds-allow` is skipped. */
export function scanText(text, file, options = {}) {
  const ctx = { allowHex: new Set((options.allowHex ?? []).map((h) => h.toLowerCase())) };
  const rules = [...BUILTIN_RULES, ...compileForbid(options.forbid)];
  const findings = [];
  text.split('\n').forEach((line, i) => {
    if (line.includes('ds-allow')) return;
    for (const rule of rules) {
      const hits = rule.find
        ? rule.find(line, ctx)
        : rule.patterns.flatMap((re) =>
            [...line.matchAll(re)].map((m) => ({ col: m.index + 1, match: m[0] })),
          );
      for (const hit of hits) {
        findings.push({
          file,
          line: i + 1,
          col: hit.col,
          rule: rule.id,
          message: `${rule.message} (\`${hit.match.trim()}\`)`,
        });
      }
    }
  });
  return findings;
}

/* ------------------------------------------------------------------ */
/* Globs                                                               */
/* ------------------------------------------------------------------ */

const GLOB_CHARS = /[*?{]/;

export function globToRegExp(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const ch = glob[i];
    if (ch === '*') {
      if (glob[i + 1] === '*') {
        i++;
        if (glob[i + 1] === '/') {
          i++;
          re += '(?:.*/)?';
        } else re += '.*';
      } else re += '[^/]*';
    } else if (ch === '?') re += '[^/]';
    else if (ch === '{') {
      const end = glob.indexOf('}', i);
      const alts = glob.slice(i + 1, end).split(',').map((a) => a.replace(/[.+^$()|[\]\\]/g, '\\$&'));
      re += `(?:${alts.join('|')})`;
      i = end;
    } else re += ch.replace(/[.+^$()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`);
}

const toPosix = (p) => p.split(sep).join('/');

function walk(dir, out) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === '.git') continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (e.isFile()) out.push(full);
  }
}

/** Expand globs relative to baseDir. Plain paths may name files or directories. */
export function expandGlobs(patterns, baseDir, ignore = []) {
  const ignoreRes = ignore.map(globToRegExp);
  const files = new Set();
  for (const pattern of patterns) {
    const abs = isAbsolute(pattern) ? pattern : join(baseDir, pattern);
    if (!GLOB_CHARS.test(pattern)) {
      if (!existsSync(abs)) continue;
      if (statSync(abs).isDirectory()) {
        const found = [];
        walk(abs, found);
        found.forEach((f) => files.add(f));
      } else files.add(abs);
      continue;
    }
    const posix = toPosix(pattern);
    const segments = posix.split('/');
    const firstGlob = segments.findIndex((s) => GLOB_CHARS.test(s));
    const root = join(isAbsolute(pattern) ? '/' : baseDir, ...segments.slice(0, firstGlob));
    const re = globToRegExp(segments.slice(firstGlob).join('/'));
    const found = [];
    walk(root, found);
    for (const f of found) if (re.test(toPosix(relative(root, f)))) files.add(f);
  }
  return [...files]
    .filter((f) => !ignoreRes.some((re) => re.test(toPosix(relative(baseDir, f)))))
    .sort();
}

/* ------------------------------------------------------------------ */
/* Config + CLI                                                        */
/* ------------------------------------------------------------------ */

export function parseArgs(argv) {
  const args = { files: [], scan: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      if (i + 1 >= argv.length) throw new Error(`${a} needs a value`);
      return argv[++i];
    };
    if (a === '--config') args.config = next();
    else if (a === '--cheatsheet') args.cheatsheet = next();
    else if (a === '--tokens-css') args.tokensCss = next();
    else if (a === '--tokens-ts') args.tokensTs = next();
    else if (a === '--scan') args.scan.push(next());
    else if (a === '--no-drift') args.noDrift = true;
    else if (a === '--no-scan') args.noScan = true;
    else if (a === '-h' || a === '--help') args.help = true;
    else if (a.startsWith('-')) throw new Error(`unknown option ${a}`);
    else args.files.push(a);
  }
  return args;
}

/**
 * Resolve the effective configuration. Lookup order: --config, then
 * design-system.config.json in cwd, then next to this skill. Without any
 * config the skill checks itself (example tokens + templates).
 * Config paths are relative to the config file; CLI paths to cwd.
 */
export function loadConfig(args, cwd) {
  let configPath = args.config ? resolve(cwd, args.config) : null;
  if (configPath && !existsSync(configPath)) throw new Error(`config not found: ${configPath}`);
  if (!configPath) {
    configPath = [join(cwd, CONFIG_NAME), join(SKILL_DIR, CONFIG_NAME)].find((p) => existsSync(p)) ?? null;
  }
  let raw;
  let baseDir;
  if (configPath) {
    try {
      raw = JSON.parse(readFileSync(configPath, 'utf8'));
    } catch (err) {
      throw new Error(`cannot parse ${configPath}: ${err.message}`);
    }
    baseDir = dirname(configPath);
  } else {
    raw = {
      tokensCss: 'tokens/tokens.example.css',
      tokensTs: 'tokens/tokens.example.ts',
      scan: ['templates/**/*.html'],
    };
    baseDir = SKILL_DIR;
  }
  const fromConfig = (p) => (p ? resolve(baseDir, p) : null);
  const fromCli = (p) => resolve(cwd, p);
  return {
    source: configPath ?? '(built-in defaults: skill self-check)',
    baseDir,
    cwd,
    cheatsheet: args.cheatsheet ? fromCli(args.cheatsheet) : fromConfig(raw.cheatsheet) ?? join(SKILL_DIR, 'CHEATSHEET.md'),
    tokensCss: args.tokensCss ? fromCli(args.tokensCss) : fromConfig(raw.tokensCss),
    tokensTs: args.tokensTs ? fromCli(args.tokensTs) : fromConfig(raw.tokensTs),
    scan: args.scan.length ? args.scan : raw.scan ?? [],
    scanBase: args.scan.length ? cwd : baseDir,
    files: args.files.map(fromCli),
    ignore: raw.ignore ?? [],
    allowHex: raw.allowHex ?? [],
    forbid: raw.forbid ?? [],
    noDrift: Boolean(args.noDrift),
    noScan: Boolean(args.noScan),
  };
}

const USAGE = `usage: node check.mjs [--config file] [--cheatsheet file] [--tokens-css file]
                      [--tokens-ts file] [--scan glob]... [--no-drift] [--no-scan] [file...]`;

/** Run all checks. Returns { code, lines } instead of exiting, for tests. */
export function run(argv, cwd = process.cwd()) {
  const lines = [];
  let cfg;
  try {
    const args = parseArgs(argv);
    if (args.help) return { code: 0, lines: [USAGE] };
    cfg = loadConfig(args, cwd);
  } catch (err) {
    return { code: 2, lines: [`error: ${err.message}`, USAGE] };
  }
  const show = (p) => toPosix(relative(cwd, p) || p);
  const findings = [];
  let tokenCount = 0;

  if (!cfg.noDrift) {
    if (!existsSync(cfg.cheatsheet)) return { code: 2, lines: [`error: cheatsheet not found: ${cfg.cheatsheet}`] };
    const sheet = parseCheatsheet(readFileSync(cfg.cheatsheet, 'utf8'));
    tokenCount = sheet.tokens.size;
    for (const c of sheet.conflicts) {
      findings.push({ file: show(cfg.cheatsheet), line: c.line, rule: 'drift', message: c.message });
    }
    const targets = [
      [cfg.tokensCss, parseCssTokens],
      [cfg.tokensTs, parseTsTokens],
    ].filter(([p]) => p);
    if (targets.length === 0) lines.push('note: no tokensCss/tokensTs configured; drift check skipped');
    for (const [path, parse] of targets) {
      if (!existsSync(path)) return { code: 2, lines: [`error: token file not found: ${path}`] };
      findings.push(
        ...compareTokens(sheet, parse(readFileSync(path, 'utf8')), {
          cheatsheetFile: show(cfg.cheatsheet),
          tokenFile: show(path),
        }),
      );
    }
  }

  let scanned = 0;
  if (!cfg.noScan) {
    const exempt = new Set([cfg.tokensCss, cfg.tokensTs, cfg.cheatsheet].filter(Boolean));
    const files = cfg.files.length ? cfg.files : expandGlobs(cfg.scan, cfg.scanBase, cfg.ignore);
    for (const file of files) {
      if (exempt.has(file)) continue;
      if (!existsSync(file)) return { code: 2, lines: [`error: file not found: ${file}`] };
      scanned++;
      findings.push(...scanText(readFileSync(file, 'utf8'), show(file), cfg));
    }
  }

  for (const f of findings) {
    const loc = `${f.file}:${f.line}${f.col ? `:${f.col}` : ''}`;
    lines.push(`${loc}  ${f.rule}  ${f.message}`);
  }
  if (findings.length) {
    lines.push(`\n${findings.length} finding(s). config: ${cfg.source}`);
    return { code: 1, lines };
  }
  lines.push(`OK: ${tokenCount} documented tokens in sync; ${scanned} file(s) scanned clean. config: ${cfg.source}`);
  return { code: 0, lines };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const { code, lines } = run(process.argv.slice(2));
  (code === 0 ? console.log : console.error)(lines.join('\n'));
  process.exit(code);
}
