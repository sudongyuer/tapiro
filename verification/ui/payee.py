from driver import reach_home

ADD = {'zh-Hans': '添加收款方式', 'ms': 'Tambah Kaedah'}
SAVE = {'zh-Hans': '保存', 'ms': 'Simpan'}
DEFAULT = {'zh-Hans': '默认', 'ms': 'Lalai'}
PHONE = {'zh-Hans': 'DuitNow 手机号', 'ms': 'Nombor Telefon DuitNow'}
QR = {'zh-Hans': '收款码（从相册选）', 'ms': 'Kod QR (dari Foto)'}


def open_payee(ui, on_me=None):
    ui.element('sign-in-apple')
    reach_home(ui)
    ui.tap('tab-me')
    ui.element('me-payee')
    if on_me:
        on_me()
    ui.tap('me-payee')
    ui.element('payee-screen')


def add_from_menu(ui, labels):
    ui.tap_label(ADD[ui.locale])
    ui.tap_label(labels[ui.locale])


def row_labels(items):
    return [i.get('AXLabel') or '' for i in items if (i.get('AXUniqueId') or '').startswith('payee-row-')]
