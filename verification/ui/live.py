"""Readers for the verify build's timed records (`src/lib/verifyRecord.ts`): `{run, entries: [{label, at}]}` in a defaults
key, where `at` is milliseconds since the app launched and `run` is the `-uiVerifyLiveRun` id of that launch. The
preferences file can lag by seconds and still hold the previous launch, so a reader returns None until the record carries
this run's id. Values are read through the Simulator's cfprefsd (`simctl spawn … defaults read <plist>`), not from the
file, which cfprefsd writes back lazily."""
import json
import subprocess
import uuid
from pathlib import Path

from driver import BUNDLE_ID


def new_run():
    return uuid.uuid4().hex[:12]


def read_default(ui, key):
    container = subprocess.run(['xcrun', 'simctl', 'get_app_container', ui.udid, BUNDLE_ID, 'data'],
                               capture_output=True, text=True, check=True, timeout=20).stdout.strip()
    plist = Path(container) / 'Library' / 'Preferences' / f'{BUNDLE_ID}.plist'
    proc = subprocess.run(['xcrun', 'simctl', 'spawn', ui.udid, 'defaults', 'read', str(plist), key],
                          capture_output=True, text=True, timeout=20)
    return proc.stdout.strip() if proc.returncode == 0 else ''


def entries(ui, key, run):
    text = read_default(ui, key)
    try:
        value = json.loads(text) if text else None
    except ValueError:
        return None
    if not isinstance(value, dict) or value.get('run') != run:
        return None
    return value.get('entries', [])


def step_at(ui, run, label, timeout=40):
    found = ui.wait(lambda items: next((e['at'] for e in entries(ui, 'uiVerifyLiveSteps', run) or []
                                        if e['label'] == label), None) is not None or None,
                    f'the emitter never delivered {label}', timeout=timeout)
    assert found
    return next(e['at'] for e in entries(ui, 'uiVerifyLiveSteps', run) if e['label'] == label)


def starts(ui, key, run, since=0, until=float('inf')):
    return [e['at'] for e in entries(ui, key, run) or [] if e['label'] == 'load' and since <= e['at'] < until]
