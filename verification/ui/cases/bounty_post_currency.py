"""The 赏金 section's currency pull-down (64A, 67A, 154A, 160A): the form opens in RM (zh_MY region); with the title
guessed as 代取 the footer suggests 「RM 5–8」 and the amount buttons read RM 5 / 6 / 8 / 10; the menu lists
「RM 马来西亚令吉」 and 「¥ 人民币」 (screenshot of the open menu). A typed 600 shows the RM range error; choosing ¥ keeps
600 and rechecks it, so the error goes; in ¥ the footer drops the suggestion and the buttons read ¥10 / 20 / 30 / 50,
¥801 shows the ¥ range error, and ¥50 reaches the confirm sheet as ¥50, publishes with reward_currency CNY, and the
next form opens in ¥ again (the last choice)."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import (  # noqa: E402
    CNY_RANGE_TEXT, CONFIRM_TITLE, REWARD_RANGE_TEXT, assert_error, assert_preview, assert_title, erase, fill_fixed,
    TITLE_SHOWN, next_step, open_post, publish_and_close, published_args, reach_confirm, typed, value,
)
from driver import UI, assert_touch_target, by_id  # noqa: E402

DEPS = [
    'src/features/bounty/post/',
    'src/app/bounty-post/',
    'src/app/(tabs)/bounty/',
    'verification/ui/bounty.py',
]
LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyBountyDraft', 'none', '-uiVerifyPostCost', 'free']
BUDGET = 240

ui = UI(*sys.argv[1:])


def item(code, symbol):
    return ui.t('bounty.post.form.currencyItem', symbol=symbol, name=ui.t(f'bounty.post.form.currencyName.{code}'))


def assert_currency(code, symbol):
    expected = item(code, symbol)
    ui.wait(lambda items: (by_id(items, 'bounty-post-currency') or {}).get('AXValue') == expected,
            f'the currency pull-down does not read {expected!r}')


def assert_footer(suggested):
    pay = ui.t('bounty.post.form.rewardFooter')
    expected = f"{ui.t('bounty.post.form.rewardSuggest', range=suggested)}\n{pay}" if suggested else pay
    ui.wait_label('bounty-post-reward-footer', lambda label: label.replace('\n', ' ') == expected.replace('\n', ' '),
                  f'the reward footer does not read {expected!r}')


def assert_amounts(amounts):
    for amount in amounts:
        ui.element(f'bounty-post-amount-{amount}')


open_post(ui)
assert_currency('MYR', 'RM')
assert_footer(None)
assert_amounts([5, 10, 15, 20])
assert_touch_target(ui.element('bounty-post-currency'), 'currency pull-down')
ui.capture('01-form-rm')

fill_fixed(ui, reward='600')
assert_footer('RM\u00a05–8')
assert_amounts([5, 6, 8, 10])
next_step(ui)
assert_error(ui, 'bounty.post.error.rewardRange', **REWARD_RANGE_TEXT)

ui.tap('bounty-post-currency')
ui.labelled(item('CNY', '¥'))
ui.labelled(item('MYR', 'RM'))
ui.capture('02-currency-menu')
ui.tap_label(item('CNY', '¥'))
assert_currency('CNY', '¥')
assert_footer(None)
assert_amounts([10, 20, 30, 50])
ui.gone('bounty-post-error')
assert value(ui, 'bounty-post-reward') == '600', 'the typed amount changed with the currency'
ui.capture('03-form-cny')

erase(ui, 'bounty-post-reward')
typed(ui, 'bounty-post-reward', '801')
next_step(ui)
assert_error(ui, 'bounty.post.error.rewardRange', **CNY_RANGE_TEXT)
ui.capture('04-cny-limit')

erase(ui, 'bounty-post-reward')
typed(ui, 'bounty-post-reward', '50')
reach_confirm(ui)
assert_preview(ui, TITLE_SHOWN, '50', symbol='¥')
ui.capture('05-confirm-cny')
publish_and_close(ui)
args = published_args(ui)
assert (args.get('reward_minor'), args.get('reward_currency')) == (5000, 'CNY'), f'published {args!r}'

open_post(ui)
assert_currency('CNY', '¥')
assert_footer(None)
assert_title(ui, 'bounty.post.title')
ui.capture('06-next-form-cny')
print(f'PASS: RM by default, the pull-down switches to ¥, ¥1–800 is enforced, ¥50 publishes as CNY and ¥ is kept '
      f'({CONFIRM_TITLE} reached)')
