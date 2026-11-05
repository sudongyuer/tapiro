import { existsSync, mkdirSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const DEV = join(ROOT, '.dev');
const DERIVED = join(DEV, 'DerivedData');
const APP = join(DERIVED, 'Build/Products/Debug-iphonesimulator/Tapiro.app');
const BUNDLE_ID = 'app.tapiro';
const METRO = 'http://127.0.0.1:8081/status';
const VIEWER = '/Applications/Xcode.app/Contents/Applications/DeviceHub.app';
const STAMP = join(ROOT, 'ios/.verify-prebuild-stamp');
const NATIVE_INPUTS = [
  'app.json',
  'package.json',
  'bun.lock',
  'plugins',
  'src/lib/i18n/native',
  'modules/tapiro-kit',
];
const LOCATIONS = ['3.0733,101.6067', '3.0738,101.6075'];
const HOMEBREW_PATH = `/opt/homebrew/bin:${process.env.PATH}`;

type Device = {
  udid: string;
  name: string;
  state: string;
  runtime: number[];
  plainRuntime: boolean;
};

const skipBuild = process.argv.includes('--skip-build');
const headless = process.argv.includes('--headless');

function run(
  cmd: string[],
  options: { env?: Record<string, string | undefined>; log?: string } = {},
) {
  const out = options.log ? openSync(options.log, 'w') : 'inherit';
  const result = Bun.spawnSync(cmd, {
    cwd: ROOT,
    env: { ...process.env, PATH: HOMEBREW_PATH, ...options.env },
    stdout: out,
    stderr: out,
  });
  return result.exitCode === 0;
}

function capture(cmd: string[]) {
  const result = Bun.spawnSync(cmd, { cwd: ROOT, env: { ...process.env, PATH: HOMEBREW_PATH } });
  return { ok: result.exitCode === 0, text: result.stdout.toString() };
}

function fail(message: string): never {
  console.error(`dev:two: ${message}`);
  process.exit(1);
}

function simulators(): Device[] {
  const { ok, text } = capture(['xcrun', 'simctl', 'list', 'devices', 'available', '-j']);
  if (!ok) fail('`xcrun simctl list` failed');
  const byRuntime: Record<string, { udid: string; name: string; state: string }[]> =
    JSON.parse(text).devices;
  return Object.entries(byRuntime).flatMap(([runtime, devices]) => {
    const id = runtime.split('.').pop() ?? '';
    const version = (/^iOS-(\d+)-(\d+)/.exec(id) ?? []).slice(1).map(Number);
    return devices.map((device) => ({
      ...device,
      runtime: version,
      plainRuntime: /^iOS-\d+-\d+$/.test(id),
    }));
  });
}

function pickTwo(all: Device[]): Device[] {
  const requested: string[] = (process.env.TAPIRO_DEV_SIMS ?? '')
    .split(',')
    .map((udid: string) => udid.trim())
    .filter(Boolean);
  const candidates = all.filter(
    (device) => device.name.startsWith('iPhone') && !device.name.startsWith('Tapiro Verify'),
  );
  if (requested.length) {
    const chosen = requested.map((udid: string) =>
      candidates.find((device) => device.udid === udid),
    );
    if (chosen.length !== 2 || chosen.some((device: Device | undefined) => !device)) {
      fail(
        'TAPIRO_DEV_SIMS must name two available iPhone Simulators that are not Tapiro Verify devices',
      );
    }
    return chosen as Device[];
  }
  const ranked = [...candidates].sort(
    (a, b) =>
      Number(b.state === 'Booted') - Number(a.state === 'Booted') ||
      Number(b.plainRuntime) - Number(a.plainRuntime) ||
      (b.runtime[0] ?? 0) - (a.runtime[0] ?? 0) ||
      (b.runtime[1] ?? 0) - (a.runtime[1] ?? 0),
  );
  if (ranked.length < 2) {
    fail(
      'fewer than two iPhone Simulators exist outside the Tapiro Verify set; create two in Xcode first',
    );
  }
  return ranked.slice(0, 2);
}

function prebuildIfNeeded() {
  const expoMajor = `expo-${JSON.parse(readFileSync(join(ROOT, 'node_modules/expo/package.json'), 'utf8')).version.split('.')[0]}`;
  const sdkChanged = !existsSync(STAMP) || readFileSync(STAMP, 'utf8').trim() !== expoMajor;
  const stale =
    sdkChanged ||
    !existsSync(join(ROOT, 'ios/Tapiro.xcworkspace')) ||
    capture([
      'find',
      ...NATIVE_INPUTS,
      '-newer',
      STAMP,
      '-not',
      '-name',
      '*.ts',
      '-not',
      '-name',
      '*.tsx',
      '-print',
      '-quit',
    ]).text.trim() !== '';
  if (stale) {
    const args = [
      'bunx',
      'expo',
      'prebuild',
      ...(sdkChanged ? ['--clean'] : []),
      '--platform',
      'ios',
    ];
    console.log(`dev:two: running ${args.slice(1).join(' ')}`);
    if (!run(args, { env: { CI: '1' } })) fail('expo prebuild failed');
    writeFileSync(STAMP, `${expoMajor}\n`);
  }
  const node = capture(['sh', '-c', 'command -v node']).text.trim();
  writeFileSync(join(ROOT, 'ios/.xcode.env.local'), `export NODE_BINARY=${node}\n`);
}

function build(device: Device) {
  const log = join(DEV, 'build.log');
  console.log(`dev:two: building the Debug app (log: ${log})`);
  const ok = run(
    [
      'xcodebuild',
      '-workspace',
      'ios/Tapiro.xcworkspace',
      '-scheme',
      'Tapiro',
      '-configuration',
      'Debug',
      '-sdk',
      'iphonesimulator',
      '-destination',
      `platform=iOS Simulator,id=${device.udid}`,
      '-derivedDataPath',
      DERIVED,
      'build',
    ],
    { log },
  );
  if (!ok) {
    const errors = capture(['grep', '-E', 'error:|BUILD FAILED', log])
      .text.split('\n')
      .slice(0, 40)
      .join('\n');
    console.error(errors);
    fail(`xcodebuild failed; full log: ${log}`);
  }
}

async function metroRunning() {
  try {
    const response = await fetch(METRO, { signal: AbortSignal.timeout(1500) });
    return (await response.text()).includes('packager-status:running');
  } catch {
    return false;
  }
}

function localSupabaseEnv() {
  const { ok, text } = capture(['supabase', 'status', '-o', 'env']);
  const value = (key: string) => new RegExp(`^${key}="([^"]+)"`, 'm').exec(text)?.[1];
  const url = value('API_URL');
  const anonKey = value('ANON_KEY');
  if (!ok || !url || !anonKey)
    fail('local Supabase is not running; start it with `bun run db:start`');
  return { EXPO_PUBLIC_SUPABASE_URL: url, EXPO_PUBLIC_SUPABASE_ANON_KEY: anonKey };
}

async function ensureMetro() {
  if (await metroRunning()) {
    console.log('dev:two: reusing the Metro server already on port 8081');
    return;
  }
  const log = join(DEV, 'metro.log');
  console.log(`dev:two: starting Metro against the local Supabase stack (log: ${log})`);
  const metro = Bun.spawn(['bunx', 'expo', 'start', '--port', '8081'], {
    cwd: ROOT,
    env: { ...process.env, PATH: HOMEBREW_PATH, ...localSupabaseEnv() },
    stdin: 'ignore',
    stdout: openSync(log, 'w'),
    stderr: openSync(log, 'a'),
  });
  metro.unref();
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (await metroRunning()) return;
    await Bun.sleep(1000);
  }
  fail(`Metro did not start within two minutes; see ${log}`);
}

function boot(device: Device, location: string) {
  if (device.state !== 'Booted') run(['xcrun', 'simctl', 'boot', device.udid]);
  if (
    !run(['xcrun', 'simctl', 'bootstatus', device.udid, '-b'], {
      log: join(DEV, `boot-${device.udid}.log`),
    })
  ) {
    fail(`${device.name} (${device.udid}) did not finish booting`);
  }
  run(['xcrun', 'simctl', 'location', device.udid, 'set', location]);
}

function installAndLaunch(device: Device) {
  if (!run(['xcrun', 'simctl', 'install', device.udid, APP]))
    fail(`install failed on ${device.name}`);
  run(['xcrun', 'simctl', 'terminate', device.udid, BUNDLE_ID], { log: '/dev/null' });
  if (!run(['xcrun', 'simctl', 'launch', device.udid, BUNDLE_ID]))
    fail(`launch failed on ${device.name}`);
}

mkdirSync(DEV, { recursive: true });
const devices = pickTwo(simulators());
console.log(
  `dev:two: using ${devices.map((device) => `${device.name} (${device.udid})`).join(' and ')}`,
);

if (skipBuild && existsSync(APP)) {
  console.log('dev:two: --skip-build, reusing the last Debug app');
} else {
  prebuildIfNeeded();
  build(devices[0]);
}

devices.forEach((device, index) => boot(device, LOCATIONS[index]));
if (!headless && existsSync(VIEWER)) run(['open', '-a', VIEWER]);
await ensureMetro();
devices.forEach(installAndLaunch);
console.log(
  'dev:two: both Simulators are running Tapiro; sign in as 小林 on one and 阿明 on the other',
);
