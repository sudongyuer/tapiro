"""Readers for the verify build's timed records (`src/lib/verifyRecord.ts`): `{run, startedAt, entries: [{label, at}]}` in
a defaults key, where `at` is milliseconds since `startedAt` (the app's epoch milliseconds when the recorder module
loaded; the Simulator shares the Mac's clock, so `host_time` turns an `at` into `time.time()` seconds) and `run` is the
`-uiVerifyLiveRun` id of that launch. The
preferences file can lag by seconds and still hold the previous launch, so a reader returns None until the record carries
this run's id."""
import json
import uuid

from choose import defaults


def new_run():
    return uuid.uuid4().hex[:12]


def record(ui, key, run):
    text = defaults(ui, key)
    try:
        value = json.loads(text) if text else None
    except ValueError:
        return None
    if not isinstance(value, dict) or value.get('run') != run:
        return None
    return value


def entries(ui, key, run):
    value = record(ui, key, run)
    return None if value is None else value.get('entries', [])


def host_time(ui, key, run, at):
    value = record(ui, key, run)
    assert value and 'startedAt' in value, f'{key} holds no startedAt for run {run}'
    return (value['startedAt'] + at) / 1000


def step_at(ui, run, label, timeout=40):
    found = ui.wait(lambda items: next((e['at'] for e in entries(ui, 'uiVerifyLiveSteps', run) or []
                                        if e['label'] == label), None) is not None or None,
                    f'the emitter never delivered {label}', timeout=timeout)
    assert found
    return next(e['at'] for e in entries(ui, 'uiVerifyLiveSteps', run) if e['label'] == label)


def starts(ui, key, run, since=0, until=float('inf')):
    return [e['at'] for e in entries(ui, key, run) or [] if e['label'] == 'load' and since <= e['at'] < until]
