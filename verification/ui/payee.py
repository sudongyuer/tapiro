from driver import by_id, reach_home

ADD = {'zh-Hans': '添加收款方式', 'ms': 'Tambah Kaedah'}
SAVE = {'zh-Hans': '保存', 'ms': 'Simpan'}
DEFAULT = {'zh-Hans': '默认', 'ms': 'Lalai'}
PHONE = {'zh-Hans': 'DuitNow 手机号', 'ms': 'Nombor Telefon DuitNow'}
ALIPAY = {'zh-Hans': '支付宝收钱码', 'ms': 'Kod Terima Alipay'}
WECHAT = {'zh-Hans': '微信收款码', 'ms': 'Kod Terima WeChat'}
TNG = {'zh-Hans': 'TNG 收款码', 'ms': 'Kod QR TNG'}
BANK = {'zh-Hans': '银行账户', 'ms': 'Akaun Bank'}
CASH = {'zh-Hans': '现金当面付', 'ms': 'Tunai Bersemuka'}
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
    ui.tap_label(ADD[ui.locale])
    return ui.labelled(ALIPAY[ui.locale])


def add_from_menu(ui, labels):
    open_menu(ui)
    ui.tap_label(labels[ui.locale])


def row_labels(items):
    return [i.get('AXLabel') or '' for i in items if (i.get('AXUniqueId') or '').startswith('payee-row-')]


SEEN_WALLET = {'zh-Hans': '发布者会看到：{}', 'ms': 'Pembayar akan nampak: {}'}
SEEN_NAMED = {'zh-Hans': '发布者会看到：{} · {}', 'ms': 'Pembayar akan nampak: {} · {}'}
WALLET_NAME = {
    'alipay': {'zh-Hans': '支付宝', 'ms': 'Alipay'},
    'wechat': {'zh-Hans': '微信', 'ms': 'WeChat'},
}
NAME_ERROR = {
    'zh-Hans': '请填{}里显示的名字',
    'ms': 'Masukkan nama yang dipaparkan oleh {}.',
}
WALLET_PAYEE = 'TANMEILING'


def fill_wallet_name(ui, wallet, name=WALLET_PAYEE):
    short = WALLET_NAME[wallet][ui.locale]
    ui.tap_label(SAVE[ui.locale])
    expected = NAME_ERROR[ui.locale].format(short)
    ui.wait_label('payee-qr-error-name', lambda label: expected in label, 'missing wallet name error not shown')
    ui.capture('name-required')
    ui.tap('payee-name-input')
    ui.type(name)
    ui.wait(lambda items: (by_id(items, 'payee-name-input') or {}).get('AXValue') == name, 'wallet name not typed')
    seen = SEEN_NAMED[ui.locale].format(name, short)
    ui.wait_label('payee-qr-seen', lambda label: label == seen, f'confirm line is not {seen!r}')
    return seen


def save_wallet_qr(ui, entry, wallet, step, prefix=''):
    before = row_labels(ui.read())
    add_from_menu(ui, entry)
    ui.element('payee-qr-sheet')
    ui.wait_label('payee-qr-steps', lambda label: step[ui.locale] in label, f'{entry[ui.locale]} save steps missing')
    ui.capture('01-pick')
    ui.tap('payee-qr-pick')
    seen = SEEN_WALLET[ui.locale].format(entry[ui.locale])
    items = ui.wait_label('payee-qr-seen', lambda label: label == seen, f'confirm line is not {seen!r}')
    items = ui.read()
    assert by_id(items, 'payee-qr-mismatch') is None, 'a matching wallet code showed the wallet-switch line'
    fill_wallet_name(ui, wallet)
    ui.capture(f'{prefix}02-confirm')
    ui.tap_label(SAVE[ui.locale])
    ui.gone('payee-qr-confirm')
    items = ui.wait(lambda items: len(row_labels(items)) == len(before) + 1 and items, f'{entry[ui.locale]} row did not appear')
    added = [row for row in row_labels(items) if row not in before]
    assert len(added) == 1 and entry[ui.locale] in added[0] and WALLET_PAYEE in added[0], f'new row is not {entry[ui.locale]} with the name: {added}'
    ui.capture(f'{prefix}03-saved')
    return added[0]
