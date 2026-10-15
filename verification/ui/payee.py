from driver import reach_home

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
    ui.element('sign-in-apple')
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
