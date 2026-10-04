"""Run UI verification cases in light and dark on a named Simulator, with screenshots and video."""
import argparse
import re
import json
import signal
import subprocess
import sys
import time
from pathlib import Path

from driver import BUNDLE_ID

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
DEFAULT_APP = ROOT / '.verify/DerivedData/Build/Products/Release-iphonesimulator/Tapiro.app'
DEVICE_NAME = 'Tapiro Verify'
DEVICE_TYPE = 'com.apple.CoreSimulator.SimDeviceType.iPhone-17-Pro'
DEFAULT_LOCALES = ['zh-Hans']
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
    scene = re.search(r"^SCENE = '([^']+)'", source, re.M)
    locales = re.search(r"^LOCALES = \[([^\]]*)\]", source, re.M)
    return (
        scene.group(1) if scene else None,
        re.findall(r"'([^']+)'", locales.group(1)) if locales else DEFAULT_LOCALES,
    )


def run_case(case, scene, locale, appearance, udid, out):
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
           *(['-uiVerifyScene', scene] if scene else []))
    started = time.monotonic()
    status, message = 'pass', ''
    try:
        proc = subprocess.run(
            [sys.executable, str(HERE / 'cases' / f'{case}.py'), udid, str(out), appearance],
            capture_output=True, text=True, timeout=180,
        )
        message = (proc.stdout + proc.stderr).strip().splitlines()[-1] if (proc.stdout + proc.stderr).strip() else ''
        if proc.returncode != 0:
            status = 'fail'
            (out / 'log.txt').write_text(proc.stdout + proc.stderr)
    except subprocess.TimeoutExpired:
        status, message = 'fail', 'timeout after 180 s'
    if status == 'fail':
        subprocess.run(['xcrun', 'simctl', 'io', udid, 'screenshot', str(out / 'failure.png')], capture_output=True)
    recorder.send_signal(signal.SIGINT)
    recorder.wait(timeout=30)
    if not video.exists() or video.stat().st_size == 0:
        status, message = 'fail', f'{message}; video missing'.strip('; ')
    if status == 'pass' and not list(out.glob('*.png')):
        status, message = 'fail', 'no screenshots captured'
    return status, message, round(time.monotonic() - started, 1)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--app', default=str(DEFAULT_APP))
    parser.add_argument('--udid')
    parser.add_argument('--output', default=str(ROOT / '.verify/ui'))
    parser.add_argument('--appearance', choices=['light', 'dark', 'both'], default='both')
    parser.add_argument('cases', nargs='*')
    args = parser.parse_args()

    app = Path(args.app)
    if not app.exists():
        raise SystemExit(f'App not found: {app}. Run bun run verify:build first.')
    cases = args.cases or sorted(p.stem for p in (HERE / 'cases').glob('*.py'))
    appearances = ['light', 'dark'] if args.appearance == 'both' else [args.appearance]

    udid, runtime = resolve_device(args.udid)
    boot(udid)
    simctl('install', udid, str(app))
    sha, dirty = git_info()
    xcode = sh('xcodebuild', '-version').splitlines()[0]

    failures = 0
    runs = [(case, *case_meta(case)) for case in cases]
    for appearance in appearances:
        for case, scene, locales in runs:
            for locale in locales:
                out = Path(args.output) / locale / appearance / case
                status, message, duration = run_case(case, scene, locale, appearance, udid, out)
                failures += status != 'pass'
                (out / 'result.json').write_text(json.dumps({
                    'case': case, 'locale': locale, 'appearance': appearance,
                    'status': status, 'message': message,
                    'duration_s': duration, 'commit': sha, 'dirty': dirty, 'xcode': xcode,
                    'device': {'name': DEVICE_NAME, 'udid': udid, 'runtime': runtime},
                    'app': str(app),
                }, indent=2))
                print(f'{status.upper():4} {locale:7} {appearance:5} {case}: {message}')

    print(f'Artifacts: {args.output}')
    sys.exit(1 if failures else 0)


if __name__ == '__main__':
    main()
