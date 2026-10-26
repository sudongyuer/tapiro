from driver import by_id, reach_home

ADD = 'payee.add'
SAVE = 'payee.save'
DEFAULT = 'payee.default'
PHONE = 'payee.types.duitnow_id'
ALIPAY = 'payee.types.alipay'
WECHAT = 'payee.types.wechat'
TNG = 'payee.types.tng'
BANK = 'payee.types.bank_account'
CASH = 'payee.types.cash'
MENU_ORDER = [ALIPAY, WECHAT, TNG, PHONE, BANK, CASH]


def open_payee(ui, on_me=None):
    reach_home(ui)
    ui.tap('tab-me')
    ui.element('me-payee')
    if on_me:
        on_me()
    ui.tap('me-payee')
    ui.element('payee-screen')


def open_menu(ui):
    ui.tap_label(ui.t(ADD))
    return ui.labelled(ui.t(ALIPAY))


def add_from_menu(ui, entry):
    open_menu(ui)
    ui.tap_label(ui.t(entry))


def row_labels(items):
    return [i.get('AXLabel') or '' for i in items if (i.get('AXUniqueId') or '').startswith('payee-row-')]


WALLET_PAYEE = 'TANMEILING'


def fill_wallet_name(ui, wallet, name=WALLET_PAYEE):
    short = ui.t(f'payee.qr.wallet.{wallet}')
    ui.tap_label(ui.t(SAVE))
    expected = ui.t('payee.qr.nameError.empty', wallet=short)
    ui.wait_label('payee-qr-error-name', lambda label: expected in label, 'missing wallet name error not shown')
    ui.capture('name-required')
    ui.tap('payee-name-input')
    ui.type(name)
    ui.wait(lambda items: (by_id(items, 'payee-name-input') or {}).get('AXValue') == name, 'wallet name not typed')
    seen = ui.t('payee.qr.seen', name=name, bank=short)
    ui.wait_label('payee-qr-seen', lambda label: label == seen, f'confirm line is not {seen!r}')
    return seen


def save_wallet_qr(ui, entry, wallet, prefix=''):
    before = row_labels(ui.read())
    first_step = ui.t(f'payee.qr.steps.{wallet}').splitlines()[0]
    add_from_menu(ui, entry)
    ui.element('payee-qr-sheet')
    ui.wait_label('payee-qr-steps', lambda label: first_step in label, f'{ui.t(entry)} save steps missing')
    ui.capture('01-pick')
    ui.tap('payee-qr-pick')
    seen = ui.t('payee.qr.seenWallet', method=ui.t(entry))
    items = ui.wait_label('payee-qr-seen', lambda label: label == seen, f'confirm line is not {seen!r}')
    items = ui.read()
    assert by_id(items, 'payee-qr-mismatch') is None, 'a matching wallet code showed the wallet-switch line'
    fill_wallet_name(ui, wallet)
    ui.capture(f'{prefix}02-confirm')
    ui.tap_label(ui.t(SAVE))
    ui.gone('payee-qr-confirm')
    items = ui.wait(lambda items: len(row_labels(items)) == len(before) + 1 and items, f'{ui.t(entry)} row did not appear')
    added = [row for row in row_labels(items) if row not in before]
    assert len(added) == 1 and ui.t(entry) in added[0] and WALLET_PAYEE in added[0], f'new row is not {ui.t(entry)} with the name: {added}'
    ui.capture(f'{prefix}03-saved')
    return added[0]
