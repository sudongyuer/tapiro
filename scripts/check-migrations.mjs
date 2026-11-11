#!/usr/bin/env node
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function duplicateVersions(names) {
  const byVersion = new Map();
  for (const name of names.filter((n) => n.endsWith('.sql'))) {
    const version = name.split('_')[0];
    byVersion.set(version, [...(byVersion.get(version) ?? []), name]);
  }
  return [...byVersion.values()].filter((group) => group.length > 1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const groups = duplicateVersions(readdirSync('supabase/migrations'));
  for (const group of groups) {
    console.error(
      `Duplicate migration version: ${group.join(', ')}. Rename yours to the next free version.`,
    );
  }
  process.exit(groups.length > 0 ? 1 : 0);
}
