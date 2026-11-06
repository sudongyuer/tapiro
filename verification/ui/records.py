import re
import subprocess
from pathlib import Path

from driver import BUNDLE_ID

# Keys the app writes in verify mode so a case can read what it did. The app resets each one when its service
# starts, but NSUserDefaults reaches the plist seconds later, so a case reading early saw the previous launch's
# calls (chat-calls-stale, 2026-11-06). The runner deletes them before each launch.
RECORD_KEYS = (
    'uiVerifyApplicantLoads',
    'uiVerifyBountyLiveLoads',
    'uiVerifyBountySeen',
    'uiVerifyBountyStatusCalls',
    'uiVerifyChatCalls',
    'uiVerifyCoinsCalls',
    'uiVerifyDetailLoads',
    'uiVerifyHomeSeen',
    'uiVerifyLiveSteps',
    'uiVerifyNoticeAsks',
    'uiVerifyNotSelectedSeen',
    'uiVerifyPublishedArgs',
    'uiVerifyPushCalls',
    'uiVerifyRepCalls',
    'uiVerifyRideDetailCalls',
    'uiVerifyRidePublishedArgs',
    'uiVerifyScheduledNotices',
    'uiVerifySelectAttempts',
    'uiVerifySelectedArgs',
    'uiVerifySettledCollected',
)

KEY_CONSTANT = re.compile(r"const (\w+) = '(uiVerify\w+)'")
RECORDER_LITERAL = re.compile(r"verifyRecorder\('(uiVerify\w+)'\)")


def app_record_keys(src):
    found = set()
    for path in Path(src).rglob('*.ts*'):
        text = path.read_text()
        for name, key in KEY_CONSTANT.findall(text):
            written = 'Settings.set(' in text and f'[{name}]:' in text
            if written or f'verifyRecorder({name})' in text:
                found.add(key)
        found.update(RECORDER_LITERAL.findall(text))
    return found


def reset_commands(udid, plist):
    # The app's domain is its container plist: `defaults delete app.tapiro` from simctl spawn finds no such domain.
    return [['xcrun', 'simctl', 'spawn', udid, 'defaults', 'delete', str(plist), key] for key in RECORD_KEYS]


def reset_records(udid):
    container = subprocess.run(['xcrun', 'simctl', 'get_app_container', udid, BUNDLE_ID, 'data'],
                               capture_output=True, text=True, timeout=20)
    if container.returncode != 0:
        return
    plist = Path(container.stdout.strip()) / 'Library' / 'Preferences' / f'{BUNDLE_ID}.plist'
    if not plist.exists():
        return
    running = [subprocess.Popen(command, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
               for command in reset_commands(udid, plist)]
    for process in running:
        try:
            process.wait(timeout=30)
        except subprocess.TimeoutExpired:
            process.kill()
