"""A failed accessory write: 雨伞 stays worn, the failure line shows and nothing is resent until the user taps again;
the second tap changes it and the line goes."""
import sys
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, by_id  # noqa: E402
from profile import label, open_profile, rep_calls, scroll_to  # noqa: E402

DEPS = ['src/features/reputation/', 'src/features/home/HomeScreen.tsx', 'src/ui/MascotStage.tsx', 'src/ui/Mascot.tsx', 'src/ui/MascotWear.tsx', 'src/lib/i18n/locales/reputation/', 'src/app/(tabs)/bounty/', 'verification/ui/mascot.py', 'verification/ui/recording.py', 'verification/ui/profile.py']
SCENE = 'profile'
BUDGET = 200
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyProfilePerson',
        '00000000-0000-4000-8000-000000000001', '-uiVerifyProfileTab', 'me', '-uiVerifyMascot', 'rest',
        '-uiVerifyRepFail', 'accessory']

ui = UI(*sys.argv[1:])
worn = lambda key: ui.t('reputation.profile.accessoryWornA11y', name=ui.t(f'reputation.accessory.{key}'))  # noqa: E731
open_profile(ui)
scroll_to(ui, 'profile-accessory-scarf')
ui.tap('profile-accessory-backpack')
failed = ui.element('profile-accessory-failed', timeout=15)
assert failed.get('AXLabel') == ui.t('reputation.profile.accessoryFailed'), failed
assert label(ui, 'profile-accessory-umbrella') == worn('umbrella'), 'a failed write changed what is worn'
time.sleep(2)
assert len(rep_calls(ui, 'setAccessory', 2, timeout=0)) == 1, 'the write was resent on its own'
ui.at_rest()
ui.capture('01-failed')
ui.tap('profile-accessory-backpack')
ui.wait_label('profile-accessory-backpack', lambda text: text == worn('backpack'), '书包 never became worn')
ui.gone('profile-accessory-failed')
assert by_id(ui.read(), 'profile-accessory-failed') is None
print('PASS: a failed write keeps what is worn and only a tap sends it again')
