import { splitCommands, stripPrefix } from './block-force-push';

const SHELLS = new Set(['bash', 'sh', 'zsh', 'dash']);
const DEVICECTL: [string, string, string?][] = [
  ['device', 'uninstall'],
  ['device', 'reboot'],
  ['device', 'erase'],
  ['device', 'app', 'uninstall'],
  ['manage', 'unpair'],
];
const XCRUN_VALUE_OPTIONS = new Set(['-sdk', '--sdk', '--toolchain', '-toolchain']);
const IDEVICE = new Map([
  ['ideviceinstaller', new Set(['-U', '--uninstall', 'uninstall'])],
  ['idevicediagnostics', new Set(['restart', 'shutdown', 'sleep'])],
  ['idevicepair', new Set(['unpair'])],
  ['cfgutil', new Set(['erase', 'restart', 'shut-down', 'remove-app', 'unpair'])],
]);

const basename = (word: string) => word.slice(word.lastIndexOf('/') + 1);
const operands = (words: string[]) => words.filter((w) => !w.startsWith('-'));

function devicectl(args: string[]): string | null {
  const words = operands(args);
  const hit = DEVICECTL.find((verbs) => verbs.every((verb, k) => words[k] === verb));
  return hit ? `devicectl ${hit.join(' ')}` : null;
}

function xcrunTool(args: string[]): string[] {
  let i = 0;
  while (i < args.length && args[i].startsWith('-')) i += XCRUN_VALUE_OPTIONS.has(args[i]) ? 2 : 1;
  return args.slice(i);
}

export function findDeviceDestructive(command: string, depth = 0): string | null {
  if (depth > 4) return null;
  for (const raw of splitCommands(command)) {
    const words = stripPrefix(raw);
    if (!words.length) continue;
    const program = basename(words[0]);
    let found: string | null = null;
    const tool = program === 'xcrun' ? xcrunTool(words.slice(1)) : [];
    if (basename(tool[0] ?? '') === 'devicectl') found = devicectl(tool.slice(1));
    else if (program === 'devicectl') found = devicectl(words.slice(1));
    else if (IDEVICE.has(program)) {
      const hit = words.slice(1).find((w) => IDEVICE.get(program)!.has(w));
      found = hit ? `${program} ${hit}` : null;
    } else if (SHELLS.has(program)) {
      const flag = words.findIndex((w, k) => k > 0 && /^-[a-z]*c[a-z]*$/.test(w));
      const script = flag === -1 ? undefined : words[flag + 1];
      found = script ? findDeviceDestructive(script, depth + 1) : null;
    } else if (program === 'eval')
      found = findDeviceDestructive(words.slice(1).join(' '), depth + 1);
    if (found) return found;
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
  const found = findDeviceDestructive(command);
  if (found) {
    console.error(
      `Blocked: \`${found}\` removes an app from, restarts or unpairs a physical iPhone. Tapiro asks the owner before ` +
        'any of these (AGENTS.md); a rebooted phone needs the passcode before the Mac can reach it. Stop and tell the ' +
        'owner what you need and why.',
    );
    process.exit(2);
  }
}
