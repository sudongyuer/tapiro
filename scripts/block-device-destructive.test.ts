import { describe, expect, test } from 'bun:test';
import { join } from 'node:path';

const HOOK = join(import.meta.dir, 'block-device-destructive.ts');

const run = (command: string) => {
  const r = Bun.spawnSync(['bun', HOOK], {
    stdin: Buffer.from(JSON.stringify({ tool_name: 'Bash', tool_input: { command } })),
  });
  return { code: r.exitCode, err: r.stderr.toString() };
};

const BLOCKED = [
  'xcrun devicectl device uninstall app --device 00008110-0004455614F8801E app.tapiro',
  'xcrun devicectl device reboot --device 00008110-0004455614F8801E',
  'xcrun devicectl device erase --device X',
  'xcrun devicectl manage unpair --device X',
  '/usr/bin/xcrun devicectl --verbose device uninstall app --device X app.tapiro',
  'DEVELOPER_DIR=/x xcrun devicectl device reboot -d X',
  'cd /tmp && xcrun devicectl device uninstall app -d X app.tapiro',
  "bash -c 'xcrun devicectl device reboot -d X'",
  'eval xcrun devicectl device uninstall app -d X y',
  'xcrun devicectl device app uninstall --device X app.tapiro',
  'devicectl device uninstall app -d X app.tapiro',
  'xcrun --sdk iphoneos devicectl device uninstall app -d X a',
  'xcrun -sdk iphoneos devicectl device reboot -d X',
  'xcrun -r devicectl device reboot -d X',
  'sudo -u me xcrun devicectl device reboot -d X',
  'timeout 30 xcrun devicectl device reboot -d X',
  'nice -n 5 xcrun devicectl device erase -d X',
  'idevicepair unpair',
  'cfgutil remove-app app.tapiro',
  'ideviceinstaller -U app.tapiro',
  'ideviceinstaller --uninstall app.tapiro',
  'idevicediagnostics restart',
];

const ALLOWED = [
  'xcrun devicectl device install app --device X build/Tapiro.app',
  'xcrun devicectl list devices',
  'xcrun devicectl device info apps --device X',
  'xcrun devicectl device process launch --device X app.tapiro',
  'xcrun simctl uninstall booted app.tapiro',
  'xcrun simctl shutdown all',
  'echo "xcrun devicectl device reboot"',
  'git commit -m "devicectl device reboot is blocked"',
  'ideviceinstaller -l',
  'xcrun devicectl device info files --device X --domain-identifier reboot',
  'xcrun devicectl device info apps -d X | grep uninstall',
];

describe('block-device-destructive', () => {
  for (const command of BLOCKED) {
    test(`blocks ${command}`, () => {
      const { code, err } = run(command);
      expect(code).toBe(2);
      expect(err).toContain('Blocked');
    });
  }
  for (const command of ALLOWED) {
    test(`allows ${command}`, () => {
      expect(run(command).code).toBe(0);
    });
  }
});
