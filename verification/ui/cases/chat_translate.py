"""141 A: long-press a message from the other side → 翻译. The first time the consent page comes first, saying the message
you translate is sent, with 「先不用」 (not 「我自己填」); 同意 sends only that message and the app language, a line shows
while 小貘 translates, then the translation joins the bubble under the original. The menu then offers 隐藏翻译; hiding and
translating again shows the kept translation with no second call (a translated message is not charged twice). Your own
message offers no 翻译."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from ask import ai_calls, assert_calls  # noqa: E402
from chat import bubbles, labels, open_thread  # noqa: E402
from driver import UI, by_id  # noqa: E402

DEPS = ['src/features/chat/thread/', 'src/features/ask/', 'src/lib/translation.ts', 'src/app/(tabs)/messages/',
        'src/app/ask-consent.tsx', 'src/lib/i18n/locales/chat/', 'verification/ui/chat.py', 'verification/ui/ask.py']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyChat', '1',
        '-uiVerifyAiConsent', 'none', '-uiVerifyAiDelayMs', '2500']
BUDGET = 240
TITLE = '双威 → KLIA2'
ARIF = 'chat-bubble-fixture-chat-ride-m2'
WAITING = 'chat-translating-fixture-chat-ride-m2'
MINE = 'chat-bubble-fixture-chat-ride-c3'
SAID = 'OK, saya sampai 10 minit lagi'
TRANSLATED = {'zh-Hans': '好，我再过 10 分钟到', 'en': 'OK, I’ll be there in 10 minutes'}


def menu(ui, identifier):
    ui.press(identifier, 1.2)
    return ui.labelled(ui.t('chat.thread.copy'))


def y_of(items, label):
    return next(i for i in items if i.get('AXLabel') == label)['frame']['y']


ui = UI(*sys.argv[1:])
open_thread(ui, 'fixture-chat-ride', TITLE)
ui.wait(lambda items: len(bubbles(items)) == 3, 'the ride thread never showed its messages')
ui.at_rest()
before = by_id(ui.read(), ARIF)
plain = before['AXLabel']
translate, hide = ui.t('chat.thread.translate'), ui.t('chat.thread.hideTranslation')

menu(ui, ARIF)
items = ui.read()
assert translate in labels(items) and hide not in labels(items), labels(items)
copy, report = ui.t('chat.thread.copy'), ui.t('chat.thread.report')
assert y_of(items, copy) < y_of(items, translate) < y_of(items, report), '翻译 is not between 复制 and 举报'
ui.capture('01-menu')
ui.tap_label(translate)

ui.element('ask-consent-screen', timeout=30)
items = ui.read()
assert ui.t('ask.consent.sends') in (by_id(items, 'ask-consent-sends').get('AXLabel') or '')
assert by_id(items, 'ask-consent-decline').get('AXLabel') == ui.t('ask.consent.declineFromMe')
assert ai_calls(ui, 'translate', 1, timeout=1) == [], 'the message left before 同意'
ui.at_rest()
ui.capture('02-consent')
ui.tap('ask-consent-agree')
ui.gone('ask-consent-screen', timeout=30)

waiting = ui.element(WAITING, timeout=20)
assert waiting.get('AXLabel') == ui.t('chat.translate.waiting'), waiting.get('AXLabel')
assert waiting['frame']['y'] >= before['frame']['y'] + before['frame']['height'] - 1, 'the line is not under the bubble'
ui.capture('03-translating')

expected = TRANSLATED.get(ui.locale, f'[{ui.locale}] {SAID}')
joined = ui.t('chat.thread.a11yTranslated', label=plain, translation=expected)
ui.wait_label(ARIF, lambda label: label == joined, 'the translation never joined the bubble')
ui.gone(WAITING, timeout=20)
after = by_id(ui.read(), ARIF)
assert after['frame']['height'] > before['frame']['height'] + 15, f'the bubble did not grow: {before} {after}'
assert abs(after['frame']['x'] - before['frame']['x']) < 1, 'the bubble moved sideways'
assert assert_calls(ui, 'translate', 1) == [{'text': SAID, 'image': False, 'to': ui.locale}]
assert len(ai_calls(ui, 'record', 1)) == 1
ui.at_rest()
ui.capture('04-translated')

menu(ui, ARIF)
assert hide in labels(ui.read()) and translate not in labels(ui.read()), labels(ui.read())
ui.tap_label(hide)
ui.wait_label(ARIF, lambda label: label == plain, 'hiding left the translation')
ui.at_rest()
menu(ui, ARIF)
ui.tap_label(translate)
ui.wait_label(ARIF, lambda label: label == joined, 'the kept translation did not come back')
assert by_id(ui.read(), WAITING) is None, 'a kept translation went out again'
assert_calls(ui, 'translate', 1)
ui.at_rest()

menu(ui, MINE)
assert translate not in labels(ui.read()), 'your own message offers 翻译'
ui.capture('05-own-menu')
ui.tap_label(ui.t('chat.thread.copy'))
ui.wait(lambda items: ui.t('chat.thread.copy') not in labels(items), 'the menu stayed open')
print('PASS: consent first, one call with the message and language, translation in the bubble, hide and show again '
      'without a second call, no 翻译 on your own message')
