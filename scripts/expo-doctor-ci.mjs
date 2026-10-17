import { spawnSync } from 'node:child_process';

const VERSION_CHECK = 'Check that packages match versions required by installed Expo SDK';

export function verdict(status, output) {
  if (status === 0) return { ok: true, warn: false };
  const failed = [...output.matchAll(/^✖ (.+)$/gm)].map((m) => m[1].trim());
  const onlyVersions = failed.length > 0 && failed.every((name) => name === VERSION_CHECK);
  return { ok: onlyVersions, warn: onlyVersions };
}

if (import.meta.main ?? process.argv[1]?.endsWith('expo-doctor-ci.mjs')) {
  const run = spawnSync('bunx', ['expo-doctor'], { encoding: 'utf8' });
  const output = `${run.stdout ?? ''}${run.stderr ?? ''}`;
  process.stdout.write(output);
  const { ok, warn } = verdict(run.status ?? 1, output);
  if (warn) {
    console.log(
      '::warning title=Expo patch versions::Expo released newer patch versions; the weekly dependency job opens an upgrade PR.',
    );
  }
  process.exit(ok ? 0 : 1);
}
