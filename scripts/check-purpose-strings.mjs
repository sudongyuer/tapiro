#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// App Store processing rejects a build (ITMS-90683) when a linked framework can reach a protected API and the
// purpose string is missing, even if the app never calls it (the system photo picker needs none at runtime).
export const PURPOSE_KEYS_BY_FRAMEWORK = {
  Photos: ['NSPhotoLibraryUsageDescription', 'NSPhotoLibraryAddUsageDescription'],
  PhotosUI: ['NSPhotoLibraryUsageDescription'],
  CoreLocation: ['NSLocationWhenInUseUsageDescription'],
  Speech: ['NSSpeechRecognitionUsageDescription'],
  AVFoundation: ['NSCameraUsageDescription', 'NSMicrophoneUsageDescription'],
  AVFAudio: ['NSMicrophoneUsageDescription'],
  Contacts: ['NSContactsUsageDescription'],
  EventKit: ['NSCalendarsUsageDescription'],
  CoreBluetooth: ['NSBluetoothAlwaysUsageDescription'],
};

const isPurposeKey = (key) => /^NS\w+UsageDescription$/.test(key);
const filled = (value) => typeof value === 'string' && value.trim() !== '';

export function purposeStringProblems({ frameworks, infoPlist, localized }) {
  const required = new Set(frameworks.flatMap((name) => PURPOSE_KEYS_BY_FRAMEWORK[name] ?? []));
  for (const key of Object.keys(infoPlist)) if (isPurposeKey(key)) required.add(key);
  const problems = [];
  for (const key of [...required].sort()) {
    if (!filled(infoPlist[key])) problems.push(`Info.plist: ${key} is missing or empty`);
    for (const [locale, strings] of Object.entries(localized)) {
      if (!filled(strings[key])) problems.push(`${locale}.lproj: ${key} is missing or empty`);
    }
  }
  return problems;
}

function readPlist(path) {
  return JSON.parse(
    execFileSync('plutil', ['-convert', 'json', '-o', '-', path], { encoding: 'utf8' }),
  );
}

function linkedFrameworks(binary) {
  const out = execFileSync('otool', ['-L', binary], { encoding: 'utf8' });
  return [...out.matchAll(/\/System\/Library\/Frameworks\/(\w+)\.framework\//g)].map((m) => m[1]);
}

export function inspectApp(app) {
  const name = basename(app, '.app');
  const binaries = [join(app, name)];
  const frameworksDir = join(app, 'Frameworks');
  for (const entry of readdirSync(frameworksDir, { withFileTypes: true }).filter((e) =>
    e.name.endsWith('.framework'),
  )) {
    binaries.push(join(frameworksDir, entry.name, basename(entry.name, '.framework')));
  }
  const localized = {};
  for (const entry of readdirSync(app).filter((e) => e.endsWith('.lproj') && e !== 'Base.lproj')) {
    try {
      localized[basename(entry, '.lproj')] = readPlist(join(app, entry, 'InfoPlist.strings'));
    } catch {
      localized[basename(entry, '.lproj')] = {};
    }
  }
  return {
    frameworks: [...new Set(binaries.flatMap(linkedFrameworks))],
    infoPlist: readPlist(join(app, 'Info.plist')),
    localized,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const app = process.argv[2];
  if (!app) {
    console.error('usage: node scripts/check-purpose-strings.mjs <path/to/App.app>');
    process.exit(2);
  }
  const problems = purposeStringProblems(inspectApp(app));
  if (problems.length > 0) {
    console.error(`Purpose strings Apple will reject:\n  ${problems.join('\n  ')}`);
    process.exit(1);
  }
  console.log('purpose strings: ok');
}
