const FORCE_OPTIONS = ['force', 'force-with-lease', 'force-if-includes', 'mirror'];
const PUSH_VALUE_OPTIONS = new Set(['--push-option', '--receive-pack', '--exec', '--repo']);
const GIT_VALUE_OPTIONS = new Set([
  '-C',
  '-c',
  '--git-dir',
  '--work-tree',
  '--namespace',
  '--config-env',
  '--super-prefix',
]);
const WRAPPERS = new Set([
  'command',
  'builtin',
  'exec',
  'nohup',
  'time',
  'then',
  'do',
  'else',
  'if',
  'while',
  'until',
  '!',
  '{',
]);
const SHELLS = new Set(['bash', 'sh', 'zsh', 'dash']);
const VALUE_FLAGS: Record<string, Set<string>> = {
  env: new Set(['-u', '-C', '-S', '--unset', '--chdir', '--split-string']),
  xargs: new Set(['-I', '-n', '-L', '-P', '-d', '-E', '-s', '-a']),
  sudo: new Set(['-u', '-g', '-h', '-C', '-p', '-U', '-r', '-t', '-D']),
  timeout: new Set(['-s', '-k', '--signal', '--kill-after']),
  nice: new Set(['-n']),
  caffeinate: new Set(['-t', '-w']),
};
const LEADING_OPERANDS: Record<string, number> = { timeout: 1 };
const SEPARATORS = new Set([';', '&', '|', '\n', '(', ')', '`']);

export function splitCommands(src: string): string[][] {
  const commands: string[][] = [];
  let words: string[] = [];
  let word = '';
  let inWord = false;
  let dropNext = false;
  let heredocs: { delim: string; strip: boolean }[] = [];

  const endWord = () => {
    if (!inWord) return;
    if (dropNext) dropNext = false;
    else words.push(word);
    word = '';
    inWord = false;
  };
  const endCommand = () => {
    endWord();
    if (words.length) commands.push(words);
    words = [];
  };

  const skipHeredocBodies = (from: number) => {
    let pos = from;
    for (const { delim, strip } of heredocs) {
      while (pos < src.length) {
        const newline = src.indexOf('\n', pos);
        const end = newline === -1 ? src.length : newline;
        const line = src.slice(pos, end);
        pos = end + 1;
        if ((strip ? line.replace(/^\t+/, '') : line) === delim) break;
      }
    }
    heredocs = [];
    return pos - 1;
  };

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === '\n' && heredocs.length) {
      endCommand();
      i = skipHeredocBodies(i + 1);
    } else if (src.startsWith('<<', i) && src[i + 2] !== '<') {
      endWord();
      i += 2;
      const strip = src[i] === '-';
      if (strip) i++;
      while (src[i] === ' ' || src[i] === '\t') i++;
      let delim = '';
      for (; i < src.length && !/[\s;&|()<>]/.test(src[i]); i++) {
        if (!`'"\\`.includes(src[i])) delim += src[i];
      }
      i--;
      if (delim) heredocs.push({ delim, strip });
    } else if (ch === "'") {
      const close = src.indexOf("'", i + 1);
      const end = close === -1 ? src.length : close;
      word += src.slice(i + 1, end);
      inWord = true;
      i = end;
    } else if (ch === '"') {
      inWord = true;
      for (i++; i < src.length && src[i] !== '"'; i++) {
        if (src[i] === '\\' && '"\\$`'.includes(src[i + 1] ?? '')) i++;
        word += src[i];
      }
    } else if (ch === '\\') {
      if (src[i + 1] !== '\n') {
        word += src[i + 1] ?? '';
        inWord = true;
      }
      i++;
    } else if (ch === '#' && !inWord) {
      while (i + 1 < src.length && src[i + 1] !== '\n') i++;
    } else if (ch === '$' && src[i + 1] === '(') {
      endCommand();
      i++;
    } else if (ch === '>' || ch === '<') {
      endWord();
      while (i + 1 < src.length && '<>&|'.includes(src[i + 1])) i++;
      dropNext = true;
    } else if (SEPARATORS.has(ch)) {
      endCommand();
    } else if (/\s/.test(ch)) {
      endWord();
    } else {
      word += ch;
      inWord = true;
    }
  }
  endCommand();
  return commands;
}

const basename = (word: string) => word.slice(word.lastIndexOf('/') + 1);

export function stripPrefix(words: string[]): string[] {
  let i = 0;
  while (i < words.length) {
    const w = words[i];
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(w) || WRAPPERS.has(w)) i++;
    else if (basename(w) in VALUE_FLAGS) {
      const valueFlags = VALUE_FLAGS[basename(w)];
      const operands = LEADING_OPERANDS[basename(w)] ?? 0;
      i++;
      while (i < words.length && (words[i].startsWith('-') || words[i].includes('='))) {
        i += valueFlags.has(words[i]) ? 2 : 1;
      }
      i += operands;
    } else break;
  }
  return words.slice(i);
}

function isForceLong(name: string) {
  return name.length > 0 && FORCE_OPTIONS.some((option) => option.startsWith(name));
}

function pushForce(args: string[]): string | null {
  let positionalOnly = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (positionalOnly || !arg.startsWith('-') || arg === '-') {
      if (arg.startsWith('+')) return arg;
      continue;
    }
    if (arg === '--') {
      positionalOnly = true;
    } else if (arg.startsWith('--')) {
      const name = arg.slice(2).split('=')[0];
      if (isForceLong(name)) return arg;
      if (PUSH_VALUE_OPTIONS.has(`--${name}`) && !arg.includes('=')) i++;
    } else {
      for (let j = 1; j < arg.length; j++) {
        if (arg[j] === 'f') return arg;
        if (arg[j] === 'o') {
          if (j === arg.length - 1) i++;
          break;
        }
      }
    }
  }
  return null;
}

function gitForce(args: string[]): string | null {
  let i = 0;
  while (i < args.length && args[i].startsWith('-')) {
    const arg = args[i];
    if (GIT_VALUE_OPTIONS.has(arg)) {
      if (arg === '-c' && /^remote\..+\.push=\+/.test(args[i + 1] ?? ''))
        return `-c ${args[i + 1]}`;
      i += 2;
    } else i++;
  }
  return args[i] === 'push' ? pushForce(args.slice(i + 1)) : null;
}

export function findForcePush(command: string, depth = 0): string | null {
  if (depth > 4 || !command.replace(/["'\\]/g, '').includes('push')) return null;
  for (const raw of splitCommands(command)) {
    const words = stripPrefix(raw);
    if (!words.length) continue;
    const program = basename(words[0]);
    if (program === 'git') {
      const found = gitForce(words.slice(1));
      if (found) return found;
    } else if (SHELLS.has(program)) {
      const flag = words.findIndex((w, k) => k > 0 && /^-[a-z]*c[a-z]*$/.test(w));
      const script = flag === -1 ? undefined : words[flag + 1];
      const found = script ? findForcePush(script, depth + 1) : null;
      if (found) return found;
    } else if (program === 'eval') {
      const found = findForcePush(words.slice(1).join(' '), depth + 1);
      if (found) return found;
    }
  }
  return null;
}

if (import.meta.main) {
  const input = await Bun.stdin.text();
  let command = '';
  try {
    command = JSON.parse(input)?.tool_input?.command ?? '';
  } catch {
    process.exit(0);
  }
  const found = findForcePush(command);
  if (found) {
    console.error(
      `Blocked: \`${found}\` force-pushes. Tapiro asks the owner before any force-push (AGENTS.md). ` +
        'Stop, tell the owner which branch and why, and let them run it; otherwise push new commits without force.',
    );
    process.exit(2);
  }
}
