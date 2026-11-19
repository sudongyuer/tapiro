import ast
import re
import unittest
from pathlib import Path

CASES = Path(__file__).resolve().parent / 'cases'
TIME = re.compile(r'\d{1,2}:\d{2}')
TIME_REGEX = re.compile(r'\\d(?:\{1,2\}|\{2\}|\+)\[?:')
EXEMPT = {
    ('ride_create_form.py', r'\d{2}:\d{2}'): 'asserts the quick time is not in 24-hour form',
}


def docstrings(tree):
    found = set()
    for node in ast.walk(tree):
        if isinstance(node, (ast.Module, ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)) and node.body:
            first = node.body[0]
            if isinstance(first, ast.Expr) and isinstance(first.value, ast.Constant):
                found.add(id(first.value))
    return found


def hard_coded_clocks(name, source):
    tree = ast.parse(source)
    skip = docstrings(tree)
    found = []
    for node in ast.walk(tree):
        if not isinstance(node, ast.Constant) or not isinstance(node.value, str) or id(node) in skip:
            continue
        if TIME.fullmatch(node.value) or TIME_REGEX.search(node.value):
            found.append((name, node.value, node.lineno))
    return found


class ClockGuardTest(unittest.TestCase):
    def test_cases_read_device_formatted_times_through_hourcycle(self):
        found = [hit for path in sorted(CASES.glob('*.py')) for hit in hard_coded_clocks(path.name, path.read_text())]
        offending = [f'cases/{name}:{line}: {value!r}' for name, value, line in found if (name, value) not in EXEMPT]
        self.assertEqual(offending, [], 'a case hard-codes a clock; a 12-hour run (--hour-cycle 12) writes it '
                                        'differently. Use hourcycle.clock() or clock_at(hour, minute)')
        unused = set(EXEMPT) - {(name, value) for name, value, _ in found}
        self.assertEqual(unused, set(), 'an exemption no longer matches; remove it')

    def test_flags_a_literal_time_and_a_24_hour_pattern(self):
        flight = "assert ui.t('ride.ticket.flight', time='09:10') in text\n"
        status = "CLOCK = r'\\d{1,2}[:.]\\d{2}'\nre.search(r'\\d{1,2}:\\d{2}', completed)\n"
        self.assertEqual([value for _, value, _ in hard_coded_clocks('a.py', flight)], ['09:10'])
        self.assertEqual(len(hard_coded_clocks('b.py', status)), 2)

    def test_leaves_docstrings_fixture_copy_and_formats_alone(self):
        source = ('"""Opens at 09:10."""\n'
                  "line = 'Aiman在路上 · 20:00 到'\n"
                  "print(f'{at:%H:%M}')\n"
                  "pattern = clock_at(9, 10)\n")
        self.assertEqual(hard_coded_clocks('c.py', source), [])


if __name__ == '__main__':
    unittest.main()
