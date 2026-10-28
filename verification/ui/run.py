"""Run UI verification cases in light and dark on a named Simulator, with screenshots and video."""
import argparse
import ast
import fcntl
import re
import json
import os
import signal
import subprocess
import sys
import time
from pathlib import Path

from affected import SMOKE, parse_deps, run_locales, select
from breaker import tripped
from driver import BUNDLE_ID

MACHINE_LOCK = '/tmp/ios-ui-verify.lock'
HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
DEFAULT_APP = ROOT / '.verify/DerivedData/Build/Products/Release-iphonesimulator/Tapiro.app'
DEVICE_NAME = 'Tapiro Verify'
DEVICE_TYPE = 'com.apple.CoreSimulator.SimDeviceType.iPhone-17-Pro'
DEFAULT_LOCALES = ['zh-Hans']
DEFAULT_BUDGET = 180
REGIONS = {'zh-Hans': 'zh_MY', 'en': 'en_MY', 'ms': 'ms_MY'}


def sh(*args, **kwargs):
    return subprocess.run(args, check=True, text=True, capture_output=True, **kwargs).stdout


def simctl(*args):
    return sh('xcrun', 'simctl', *args)


def resolve_device(udid):
    devices = json.loads(simctl('list', 'devices', 'available', '-j'))['devices']
    for runtime, items in devices.items():
        for device in items:
            if (udid and device['udid'] == udid) or (not udid and device['name'] == DEVICE_NAME):
                return device['udid'], runtime
    if udid:
        raise SystemExit(f'No available Simulator {udid}')
    runtimes = json.loads(simctl('list', 'runtimes', 'available', '-j'))['runtimes']
    runtime = [r for r in runtimes if r['platform'] == 'iOS'][-1]['identifier']
    return simctl('create', DEVICE_NAME, DEVICE_TYPE, runtime).strip(), runtime


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


def run_case(case, scene, extra, budget, locale, appearance, udid, out):
    started = time.monotonic()
    out.mkdir(parents=True, exist_ok=True)
    for stale in out.glob('*'):
        stale.unlink()
    simctl('ui', udid, 'appearance', appearance)
    subprocess.run(['xcrun', 'simctl', 'terminate', udid, BUNDLE_ID], capture_output=True)
    video = out / 'run.mp4'
    recorder = subprocess.Popen(
        ['xcrun', 'simctl', 'io', udid, 'recordVideo', '--codec=hevc', '--force', str(video)],
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True,
    )
    time.sleep(1.5)  # recorder needs its first frame before the launch is visible
    simctl('launch', udid, BUNDLE_ID,
           '-AppleLanguages', f'({locale})', '-AppleLocale', REGIONS[locale],
           *(['-uiVerifyScene', scene] if scene else []), *extra)
    status, message = 'pass', ''
    try:
        proc = subprocess.run(
            [sys.executable, str(HERE / 'cases' / f'{case}.py'), udid, str(out), appearance, locale],
            capture_output=True, text=True, timeout=budget,
            env={**os.environ, 'TAPIRO_VERIFY_ARGS': ' '.join(extra)},
        )
        (out / 'log.txt').write_text(proc.stdout + proc.stderr)
        lines = (proc.stdout if proc.returncode == 0 else proc.stderr or proc.stdout).strip().splitlines()
        message = lines[-1] if lines else ''
        if proc.returncode != 0:
            status = 'fail'
    except subprocess.TimeoutExpired as error:
        status, message = 'fail', f'command timed out after {budget} s'
        partial = ''.join(p.decode() if isinstance(p, bytes) else p or '' for p in (error.stdout, error.stderr))
        (out / 'log.txt').write_text(f'{partial}\n--- CPU sample at timeout (top, second sample, %cpu) ---\n{render_cpu_sample()}\n')
        calls = sorted(float(m) for m in re.findall(r'^\s*([\d.]+)s axe ', partial, re.M))
        if calls:
            message += f'; {len(calls)} axe calls, median {calls[len(calls) // 2]:.1f} s'
    if status == 'fail':
        try:
            subprocess.run(['xcrun', 'simctl', 'io', udid, 'screenshot', str(out / 'failure.png')],
                           capture_output=True, timeout=60)
        except subprocess.TimeoutExpired:
            message += '; failure screenshot timed out after 60 s'
    recorder.send_signal(signal.SIGINT)
    try:
        recorder.wait(timeout=30)
    except subprocess.TimeoutExpired:
        recorder.kill()
        status, message = 'fail', f'{message}; recorder did not stop'.strip('; ')
    if not video.exists() or video.stat().st_size == 0:
        status, message = 'fail', f'{message}; video missing'.strip('; ')
    if status == 'pass' and not list(out.glob('*.png')):
        status, message = 'fail', 'no screenshots captured'
    return status, message, round(time.monotonic() - started, 1)


def print_timings(timings, total):
    print(f"\n{'seconds':>8}  {'status':6} {'locale':7} {'look':5} case")
    for duration, status, locale, appearance, case in timings:
        print(f'{duration:8.1f}  {status:6} {locale:7} {appearance:5} {case}')
    print(f'{total:8.1f}  total ({len(timings)} runs, {int(total // 60)} min {int(total % 60)} s)')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--app', default=str(DEFAULT_APP))
    parser.add_argument('--udid')
    parser.add_argument('--output', default=str(ROOT / '.verify/ui'))
    parser.add_argument('--appearance', choices=['light', 'dark', 'both'], default='both')
    parser.add_argument('--locale')
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
        raise SystemExit('Another verify:ui run is driving the Simulator; wait for it to finish.')
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
    udid, runtime = resolve_device(args.udid)
    boot(udid)
    simctl('install', udid, str(app))
    sha, dirty = git_info()
    xcode = sh('xcodebuild', '-version').splitlines()[0]

    failures = 0
    timings = []
    results = []
    stopped = None
    run_started = time.monotonic()
    runs = [(case, *case_meta(case)) for case in cases]
    runs = [(case, scene, run_locales(locales, args.locales or not (tiered or args.cases)), extra, budget)
            for case, scene, locales, extra, budget in runs]
    for appearance in appearances:
        for case, scene, locales, extra, budget in runs:
            for locale in [l for l in locales if args.locale in (None, l)]:
                out = Path(args.output) / locale / appearance / case
                status, message, duration = run_case(case, scene, extra, budget, locale, appearance, udid, out)
                failures += status != 'pass'
                timings.append((duration, status, locale, appearance, case))
                (out / 'result.json').write_text(json.dumps({
                    'case': case, 'locale': locale, 'appearance': appearance, 'args': extra,
                    'status': status, 'message': message,
                    'duration_s': duration, 'commit': sha, 'dirty': dirty, 'xcode': xcode,
                    'device': {'name': DEVICE_NAME, 'udid': udid, 'runtime': runtime},
                    'app': str(app),
                }, indent=2))
                print(f'{status.upper():4} {locale:7} {appearance:5} {case}: {message}')
                results.append({'status': status, 'message': message})
                stopped = tripped(results)
                if stopped:
                    break
            if stopped:
                break
        if stopped:
            break

    print_timings(timings, time.monotonic() - run_started)
    if stopped:
        print(f'stopped: 3 consecutive {stopped} timeouts — environment or screen problem')
        print(render_cpu_sample())
        failures += 1
    print(f'Artifacts: {args.output}')
    sys.exit(1 if failures else 0)


if __name__ == '__main__':
    main()
