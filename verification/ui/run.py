"""Run UI verification cases in light and dark on a named Simulator, with screenshots and video."""
import argparse
import ast
import fcntl
import json
import os
import shutil
import signal
import subprocess
import sys
import threading
import time
from pathlib import Path

from affected import SMOKE, parse_deps, run_locales, select
from breaker import tripped
from driver import BUNDLE_ID
from heal import Attempt, Scheduler, work
from latency import calls, line, summary, timed, timeouts
from pool import DEFAULT_WORKERS, device_names, worker_count
from recording import stop_all

MACHINE_LOCK = '/tmp/ios-ui-verify.lock'
HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
DEFAULT_APP = ROOT / '.verify/DerivedData/Build/Products/Release-iphonesimulator/Tapiro.app'
DEVICE_TYPE = 'com.apple.CoreSimulator.SimDeviceType.iPhone-17-Pro'
DEFAULT_LOCALES = ['zh-Hans']
DEFAULT_BUDGET = 180
SIMCTL_TIMEOUT = 60
REGIONS = {'zh-Hans': 'zh_MY', 'en': 'en_MY', 'ms': 'ms_MY'}


def sh(*args, **kwargs):
    return subprocess.run(args, check=True, text=True, capture_output=True, **kwargs).stdout


def simctl(*args):
    return sh('xcrun', 'simctl', *args)


def resolve_device(name=None, udid=None):
    devices = json.loads(simctl('list', 'devices', 'available', '-j'))['devices']
    for runtime, items in devices.items():
        for device in items:
            if (udid and device['udid'] == udid) or (not udid and device['name'] == name):
                return device['name'], device['udid'], runtime
    if udid:
        raise SystemExit(f'No available Simulator {udid}')
    runtimes = json.loads(simctl('list', 'runtimes', 'available', '-j'))['runtimes']
    runtime = [r for r in runtimes if r['platform'] == 'iOS'][-1]['identifier']
    return name, simctl('create', name, DEVICE_TYPE, runtime).strip(), runtime


def prepare(device, app):
    name, udid, runtime = device
    boot(udid)
    simctl('install', udid, str(app))


def boot(udid):
    subprocess.run(['xcrun', 'simctl', 'boot', udid], capture_output=True)
    simctl('bootstatus', udid, '-b')
    simctl('status_bar', udid, 'override', '--time', '9:41', '--batteryState', 'charged',
           '--batteryLevel', '100', '--cellularBars', '4', '--wifiBars', '3')


def git_info():
    sha = sh('git', '-C', str(ROOT), 'rev-parse', 'HEAD').strip()
    dirty = bool(sh('git', '-C', str(ROOT), 'status', '--porcelain').strip())
    return sha, dirty


def case_meta(case):
    source = (HERE / 'cases' / f'{case}.py').read_text()
    values = {}
    for node in ast.parse(source).body:
        if isinstance(node, ast.Assign):
            for target in node.targets:
                name = getattr(target, 'id', None)
                if name in ('SCENE', 'LOCALES', 'ARGS', 'BUDGET'):
                    try:
                        values[name] = ast.literal_eval(node.value)
                    except ValueError:
                        sys.exit(f'{case}: {name} must be a literal the runner can read without running the case')
    return (
        values.get('SCENE'),
        list(values.get('LOCALES', DEFAULT_LOCALES)),
        list(values.get('ARGS', [])),
        int(values.get('BUDGET', DEFAULT_BUDGET)),
    )


def export_strings():
    subprocess.run(['bun', str(ROOT / 'scripts/export-ui-strings.ts')], cwd=ROOT, check=True)


def require_ref(base):
    found = subprocess.run(['git', '-C', str(ROOT), 'rev-parse', '--verify', '--quiet', f'{base}^{{commit}}'],
                           capture_output=True)
    if found.returncode != 0:
        print(f'base ref {base} not found (fetch it?)', file=sys.stderr)
        sys.exit(2)


def changed_files(base):
    require_ref(base)
    committed = sh('git', '-C', str(ROOT), 'diff', '--name-only', '--no-renames', f'{base}...HEAD')
    working = sh('git', '-C', str(ROOT), 'diff', '--name-only', '--no-renames', 'HEAD')
    untracked = sh('git', '-C', str(ROOT), 'ls-files', '--others', '--exclude-standard')
    return [line for line in (committed + working + untracked).splitlines() if line.strip()]


def pick_affected(cases, base):
    deps = {case: parse_deps((HERE / 'cases' / f'{case}.py').read_text()) for case in cases}
    picked = select(deps, changed_files(base))
    print(f'Affected cases against {base}: {len(picked)} of {len(cases)}')
    for case, reasons in picked.items():
        print(f'  {case}: {"; ".join(reasons)}')
    return list(picked)


def render_cpu_sample():
    try:
        out = subprocess.run(['top', '-l', '2', '-s', '1', '-o', 'cpu', '-n', '20', '-stats', 'pid,cpu,command'],
                             capture_output=True, text=True, timeout=20).stdout
    except subprocess.TimeoutExpired:
        return 'top timed out'
    last = out.split('PID')[-1]
    rows = [line for line in last.splitlines() if 'SimRenderServer' in line or 'SimRenderingServices' in line]
    return '\n'.join(rows) or 'SimRenderServer and SimRenderingServices are not among the 20 busiest processes'


def videos(out):
    return sorted(out.glob('*.mp4'))


def heal(device, app):
    subprocess.run(['xcrun', 'simctl', 'shutdown', device[1]], capture_output=True, timeout=120)
    prepare(device, app)


def simctl_step(label, argv, log):
    try:
        timed(label, argv, SIMCTL_TIMEOUT, check=True, out=log.append)
        return None
    except subprocess.TimeoutExpired:
        return f'{label} timed out after {SIMCTL_TIMEOUT} s'


def run_script(case, extra, budget, locale, appearance, udid, out, after):
    try:
        proc = subprocess.run(
            [sys.executable, str(HERE / 'cases' / f'{case}.py'), udid, str(out), appearance, locale],
            capture_output=True, text=True, timeout=budget,
            env={**os.environ, 'TAPIRO_VERIFY_ARGS': ' '.join(extra)},
        )
    except subprocess.TimeoutExpired as error:
        message = f'command timed out after {budget} s'
        case_log = ''.join(p.decode() if isinstance(p, bytes) else p or '' for p in (error.stdout, error.stderr))
        after += [line(budget, f'case {case}', timed_out=True),
                  f'--- CPU sample at timeout (top, second sample, %cpu) ---\n{render_cpu_sample()}']
        axe_calls = sorted(seconds for seconds, label, _ in calls(case_log) if label.startswith('axe '))
        if axe_calls:
            message += f'; {len(axe_calls)} axe calls, median {axe_calls[len(axe_calls) // 2]:.1f} s'
        return 'fail', message, case_log
    lines = (proc.stdout if proc.returncode == 0 else proc.stderr or proc.stdout).strip().splitlines()
    return 'pass' if proc.returncode == 0 else 'fail', lines[-1] if lines else '', proc.stdout + proc.stderr


def run_case(case, scene, extra, budget, locale, appearance, device, out):
    name, udid, _ = device
    started = time.monotonic()
    out.mkdir(parents=True, exist_ok=True)
    for stale in out.glob('*'):
        stale.unlink()
    before, after, case_log = [], [], ''
    stuck = simctl_step('simctl appearance', ['xcrun', 'simctl', 'ui', udid, 'appearance', appearance], before)
    subprocess.run(['xcrun', 'simctl', 'terminate', udid, BUNDLE_ID], capture_output=True)
    video = out / 'run.mp4'
    recorder = subprocess.Popen(
        ['xcrun', 'simctl', 'io', udid, 'recordVideo', '--codec=hevc', '--force', str(video)],
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True,
    )
    time.sleep(1.5)  # recorder needs its first frame before the launch is visible
    stuck = stuck or simctl_step('simctl launch', [
        'xcrun', 'simctl', 'launch', udid, BUNDLE_ID, '-AppleLanguages', f'({locale})', '-AppleLocale', REGIONS[locale],
        *(['-uiVerifyScene', scene] if scene else []), *extra], before)
    if stuck:
        status, message = 'fail', stuck
    else:
        status, message, case_log = run_script(case, extra, budget, locale, appearance, udid, out, after)
    if status == 'fail':
        try:
            timed('screenshot failure', ['xcrun', 'simctl', 'io', udid, 'screenshot', str(out / 'failure.png')],
                  60, out=after.append)
        except subprocess.TimeoutExpired:
            message += '; failure screenshot timed out after 60 s'
    recorder.send_signal(signal.SIGINT)
    try:
        recorder.wait(timeout=30)
    except subprocess.TimeoutExpired:
        recorder.kill()
        status, message = 'fail', f'{message}; recorder did not stop'.strip('; ')
    try:
        stop_all(udid)
    except AssertionError as error:
        status, message = 'fail', f'{message}; {error}'.strip('; ')
    if not video.exists():
        status, message = 'fail', f'{message}; video missing'.strip('; ')
    empty = [v.name for v in videos(out) if v.stat().st_size == 0]
    if empty:
        status, message = 'fail', f'{message}; empty video {", ".join(empty)}'.strip('; ')
    if status == 'pass' and not list(out.glob('*.png')):
        status, message = 'fail', 'no screenshots captured'
    log = '\n'.join([f'device: {name} ({udid})', *before, case_log.rstrip('\n'), *after])
    log += f'\n{summary(name, log)}\n'
    (out / 'log.txt').write_text(log)
    return Attempt(status, message, timeouts(log), round(time.monotonic() - started, 1), log)


def print_timings(timings, total):
    print(f"\n{'seconds':>8}  {'status':6} {'locale':7} {'look':5} case")
    for duration, status, locale, appearance, case in timings:
        print(f'{duration:8.1f}  {status:6} {locale:7} {appearance:5} {case}')
    print(f'{total:8.1f}  total ({len(timings)} runs, {int(total // 60)} min {int(total % 60)} s)')


class Report:
    def __init__(self, output, meta, multi, halt):
        self.output, self.meta, self.multi, self.halt = output, meta, multi, halt
        self.guard = threading.Lock()
        self.timings, self.stopped, self.stalls = [], [], []
        self.results = {}

    def where(self, name):
        return f'  [{name}]' if self.multi else ''

    def attempted(self, name, job, attempt):
        with self.guard:
            results = self.results.setdefault(name, [])
            results.append({'status': attempt.status, 'message': attempt.message})
            tripped_class = tripped(results)
            if tripped_class:
                self.stopped.append(tripped_class)
                self.halt.set()

    def stalled(self, name, job, attempt, retrying):
        appearance, case, _, locale, _, _ = job
        with self.guard:
            self.stalls.append(f'{name} ({locale} {appearance} {case}, {attempt.timeouts} command timeouts)')
            then = 'rebooting it and retrying the run once' if retrying else 'rebooting it'
            print(f'STALL {name}: {attempt.timeouts} command timeouts in {locale} {appearance} {case}; {then}',
                  flush=True)

    def finished(self, outcome):
        appearance, case, _, locale, extra, _ = outcome.job
        out = self.output / locale / appearance / case
        name, udid, runtime = self.meta['devices'][outcome.device]
        if outcome.first:
            (out / 'stalled-log.txt').write_text(outcome.first.log)
        (out / 'result.json').write_text(json.dumps({
            'case': case, 'locale': locale, 'appearance': appearance, 'args': extra,
            'status': outcome.status, 'message': outcome.message,
            'duration_s': outcome.duration, 'commit': self.meta['sha'], 'dirty': self.meta['dirty'],
            'xcode': self.meta['xcode'], 'device': {'name': name, 'udid': udid, 'runtime': runtime},
            'stalledDevice': outcome.stalled_device, 'retriedOn': outcome.retried_on,
            'app': self.meta['app'], 'videos': [v.name for v in videos(out)],
        }, indent=2))
        stalled_note = f'  stalled: {", ".join(outcome.stalled_devices)}' if outcome.stalled_devices else ''
        with self.guard:
            self.timings.append((outcome.duration, outcome.status, locale, appearance, case))
            print(f'{outcome.status.upper():4} {locale:7} {appearance:5} {case}: {outcome.message}'
                  + self.where(name) + stalled_note, flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--app', default=str(DEFAULT_APP))
    parser.add_argument('--udid', help='run on this one Simulator instead of the runner-owned ones')
    parser.add_argument('--workers', type=int, default=DEFAULT_WORKERS,
                        help='Simulators to run cases on in parallel; one when disk is low')
    parser.add_argument('--output', default=str(ROOT / '.verify/ui'))
    parser.add_argument('--appearance', choices=['light', 'dark', 'both'], default='both')
    parser.add_argument('--locale', choices=sorted(REGIONS))
    parser.add_argument('--affected', action='store_true',
                        help='only cases whose DEPS meet the diff against --base plus uncommitted changes; zh-Hans light')
    parser.add_argument('--smoke', action='store_true', help='the fixed smoke set in zh-Hans light')
    parser.add_argument('--base', default='main')
    parser.add_argument('--dark', action='store_true', help='with --affected or --smoke, also run dark')
    parser.add_argument('--locales', action='store_true', help="with --affected or --smoke, also run en and each case's LOCALES")
    parser.add_argument('cases', nargs='*')
    args = parser.parse_args()

    cases = args.cases or sorted(p.stem for p in (HERE / 'cases').glob('*.py'))
    tiered = args.affected or args.smoke
    if args.smoke:
        cases = [case for case in SMOKE if case in cases]
    if args.affected:
        cases = pick_affected(cases, args.base)
        if not cases:
            print('No UI case is affected.')
            sys.exit(0)
    app = Path(args.app)
    if not app.exists():
        raise SystemExit(f'App not found: {app}. Run bun run verify:build first.')
    if tiered:
        appearances = ['light', 'dark'] if args.dark else ['light']
    else:
        appearances = ['light', 'dark'] if args.appearance == 'both' else [args.appearance]

    (ROOT / '.verify').mkdir(exist_ok=True)
    lock = open(ROOT / '.verify/ui.lock', 'w')
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        raise SystemExit('Another verify:ui run is driving the Simulators; wait for it to finish.')
    machine = open(MACHINE_LOCK, 'a+')
    try:
        fcntl.flock(machine, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        machine.seek(0)
        print(f'Waiting for the machine-wide Simulator lock held by: {machine.read().strip() or "another project"}', flush=True)
        fcntl.flock(machine, fcntl.LOCK_EX)
    machine.truncate(0)
    machine.write(f'{ROOT} pid {os.getpid()} since {time.strftime("%H:%M:%S")}\n')
    machine.flush()
    export_strings()
    runs = [(case, *case_meta(case)) for case in cases]
    runs = [(case, scene, [args.locale] if args.locale else run_locales(locales, args.locales or not (tiered or args.cases)),
             extra, budget)
            for case, scene, locales, extra, budget in runs]
    jobs = [(appearance, case, scene, locale, extra, budget)
            for appearance in appearances
            for case, scene, locales, extra, budget in runs
            for locale in locales]
    workers, reason = worker_count(args.workers, len(jobs), shutil.disk_usage(ROOT).free, pinned_udid=bool(args.udid))
    if reason:
        print(reason, flush=True)
    if args.udid:
        devices = [resolve_device(udid=args.udid)]
    else:
        devices = [resolve_device(name) for name in device_names(workers)]
    errors = []
    halt = threading.Event()

    def guarded(target, *values):
        def body():
            try:
                target(*values)
            except BaseException as error:
                errors.append(error)
                halt.set()
        return threading.Thread(target=body)

    print(f'Booting {", ".join(name for name, _, _ in devices)} and installing the app', flush=True)
    preparing = [guarded(prepare, device, app) for device in devices]
    for thread in preparing:
        thread.start()
    for thread in preparing:
        thread.join()
    if errors:
        raise errors[0]
    print(f'Running {len(jobs)} runs on {len(devices)} Simulator{"s" if len(devices) > 1 else ""}: '
          f'{", ".join(name for name, _, _ in devices)}', flush=True)
    sha, dirty = git_info()
    xcode = sh('xcodebuild', '-version').splitlines()[0]

    output = Path(args.output)
    meta = {'sha': sha, 'dirty': dirty, 'xcode': xcode, 'app': str(app),
            'devices': {device[0]: device for device in devices}}
    report = Report(output, meta, len(devices) > 1, halt)
    scheduler = Scheduler(jobs, [name for name, _, _ in devices])

    def attempt(device, job):
        appearance, case, scene, locale, extra, budget = job
        return run_case(case, scene, extra, budget, locale, appearance, device, output / locale / appearance / case)

    run_started = time.monotonic()
    threads = [guarded(work, scheduler, device, attempt, lambda d: heal(d, app), report, halt) for device in devices]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
    for name, udid, _ in devices[1:]:
        subprocess.run(['xcrun', 'simctl', 'shutdown', udid], capture_output=True)
    if errors:
        raise errors[0]
    timings = report.timings
    failures = sum(status != 'pass' for _, status, _, _, _ in timings)
    stopped = report.stopped[0] if report.stopped else None

    print_timings(timings, time.monotonic() - run_started)
    if report.stalls:
        print('stalled Simulators (shut down, rebooted, failed run retried once):')
        for stall in report.stalls:
            print(f'  {stall}')
    if stopped:
        print(f'stopped: 3 consecutive {stopped} timeouts on one Simulator — environment or screen problem')
        print(render_cpu_sample())
        failures += 1
    print(f'Artifacts: {args.output}')
    if not timings:
        sys.exit('no case ran')
    sys.exit(1 if failures else 0)


if __name__ == '__main__':
    main()
