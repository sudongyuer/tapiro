import unittest

from a11y import problems


def node(kind, ident=None, label=None, width=100, height=50, children=(), role='group', x=0, y=0):
    return {'type': kind, 'AXUniqueId': ident, 'AXLabel': label, 'role_description': role,
            'frame': {'x': x, 'y': y, 'width': width, 'height': height}, 'children': list(children)}


def screen(*children):
    return [node('Application', label='Tapiro', width=402, height=874, children=children)]


class Problems(unittest.TestCase):
    def test_labelled_button_at_44_passes(self):
        self.assertEqual(problems(screen(node('Button', 'pay-copy', '复制', 44, 44))), [])

    def test_unlabelled_button_fails(self):
        found = problems(screen(node('Button', 'pay-copy', None)))
        self.assertEqual(len(found), 1)
        self.assertIn('no VoiceOver label', found[0])

    def test_field_value_is_not_a_label(self):
        field = node('TextField', 'bounty-post-title', None)
        field['AXValue'] = 'Parcel'
        self.assertIn('no VoiceOver label', problems(screen(field))[0])

    def test_symbol_name_label_fails(self):
        self.assertIn('identifier', problems(screen(node('Button', 'close', 'xmark.circle')))[0])

    def test_small_target_fails(self):
        found = problems(screen(node('Button', 'ask-tapir-close', '关闭', 42, 42)))
        self.assertEqual(len(found), 1)
        self.assertIn('under 44 pt', found[0])

    def test_sub_point_rounding_passes(self):
        self.assertEqual(problems(screen(node('Button', 'row', '行', 370, 43.67))), [])

    def test_children_of_an_element_are_not_checked(self):
        menu = node('PopUpButton', 'bounty-post-currency', '币种', 60, 44, [node('Button', None, None, 51, 44)])
        self.assertEqual(problems(screen(menu)), [])

    def test_nav_bar_and_keyboard_are_system_chrome(self):
        bar = node('Group', None, None, 402, 54, [node('Button', None, '更多', 36, 36)], role='Nav bar')
        keys = node('Group', 'UIKeyboardLayoutStar Preview', None, 402, 226, [node('Button', 'shift', 'shift', 51, 54)])
        self.assertEqual(problems(screen(bar, keys)), [])

    def test_system_sized_switch_needs_only_a_label(self):
        self.assertEqual(problems(screen(node('CheckBox', 'tapir-cloud', '让小貘用云端', 51, 31))), [])

    def test_field_size_is_left_to_its_row(self):
        self.assertEqual(problems(screen(node('TextField', 'bounty-post-reward', '赏金', 279, 43))), [])

    def test_unidentified_system_controls_skip_the_size_check(self):
        self.assertEqual(problems(screen(node('Button', None, '日期和时间选择器', 253, 36))), [])

    def test_floating_sheet_scale_is_undone(self):
        button = node('Button', 'ask-tapir-close', '关闭', 42.25, 42.25, x=330, y=480)
        sheet = node('Group', 'ask-tapir-sheet', None, 386, 406.2, [button], x=8, y=459.8)
        self.assertEqual(problems(screen(sheet)), [])

    def test_small_target_in_a_full_width_sheet_fails(self):
        button = node('Button', 'ask-tapir-close', '关闭', 42.25, 42.25, x=330, y=480)
        sheet = node('Group', 'ask-tapir-sheet', None, 402, 812, [button], x=0, y=62)
        self.assertEqual(len(problems(screen(sheet))), 1)

    def test_allow_skips_a_named_identifier(self):
        self.assertEqual(problems(screen(node('Button', 'welcome-terms-link', '用户协议', 65, 18)),
                                  allow=['welcome-terms-link']), [])


if __name__ == '__main__':
    unittest.main()
