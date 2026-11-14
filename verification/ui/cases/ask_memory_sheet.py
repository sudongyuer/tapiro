"""133 and 281 in the 问小貘 sheet. A draft that used a 小貘记得 entry names it under the card with 改, which opens that
entry's editor over the sheet. An answer that offers to remember something shows 「要小貘记住吗？」 with the pair;
记住 saves it once and the card turns into the saved line; nothing is saved without the tap."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from ask import assert_calls, open_sheet, turn, type_and_send  # noqa: E402
from driver import UI, assert_appearance, by_id, reach_home  # noqa: E402

DEPS = ['src/features/ask/', 'src/features/shell/AskTapirSheet.tsx', 'src/app/ask.tsx', 'src/app/ask-memory-entry.tsx',
        'src/lib/i18n/locales/ask/', 'verification/ui/ask.py']
LOCALES = ['zh-Hans', 'ms']
BUDGET = 300
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyAiConsent', 'given',
        '-uiVerifyAiMemory', 'some', '-uiVerifyAiDelayMs', '800', '-uiVerifyAiReplies', 'draftMemory,answerOffer']

ui = UI(*sys.argv[1:])
reach_home(ui)
open_sheet(ui)
type_and_send(ui)
turn(ui, 1)
used = ui.t('ask.memory.used', label='宿舍', content='Sunway Geo')
ui.wait_label('ask-turn-1-used-0', lambda label: label == used, f'the draft does not say {used}')
assert by_id(ui.read(), 'ask-offer-1') is None, 'a draft with no offer shows an offer card'
ui.at_rest()
shot = ui.capture('01-used')
sheet = by_id(ui.read(), 'ask-tapir-sheet')['frame']
assert_appearance(shot, ui.appearance, sheet['x'] + 4, sheet['y'] + sheet['height'] - 8, 'the sheet background')

ui.tap('ask-turn-1-used-0-edit')
ui.element('memory-entry-sheet', timeout=30)
ui.wait(lambda items: ((by_id(items, 'memory-entry-label') or {}).get('AXValue') or '') == '宿舍',
        '改 did not open the 宿舍 entry')
ui.capture('02-edit')
ui.tap_label(ui.t('ask.memory.entry.close'))
ui.gone('memory-entry-sheet')

type_and_send(ui)
ui.element('ask-offer-3', timeout=30)
pair = ui.t('ask.memory.offer.pair', label='图书馆', content='Sunway University 图书馆')
ui.wait_label('ask-offer-3-pair', lambda label: label == pair, f'the offer does not read {pair}')
assert_calls(ui, 'memorySave', 0, wait=1)
ui.at_rest()
ui.capture('03-offer')
ui.tap('ask-offer-3-save')
ui.element('ask-offer-3-saved', timeout=30)
saved = assert_calls(ui, 'memorySave', 1)
assert saved == [{'id': None, 'kind': 'place', 'label': '图书馆', 'content': 'Sunway University 图书馆'}], saved
ui.at_rest()
ui.capture('04-saved')
print('PASS: a draft names the entry it used with 改; an offer saves only on 记住, once')
