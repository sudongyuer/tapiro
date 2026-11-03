"""Readers for the verify build's timed records (`src/lib/verifyRecord.ts`): `{run, entries: [{label, at}]}` in a defaults
key, where `at` is milliseconds since the app launched and `run` is the `-uiVerifyLiveRun` id of that launch. The
preferences file can lag by seconds and still hold the previous launch, so a reader returns None until the record carries
this run's id."""
import json
import uuid

from choose import defaults


def new_run():
    return uuid.uuid4().hex[:12]


def entries(ui, key, run):
    text = defaults(ui, key)
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
