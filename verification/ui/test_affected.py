import subprocess
import unittest
from pathlib import Path

from affected import SMOKE, parse_deps, run_locales, select

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
CASES = {
    'payee_list': ['src/features/payee/', 'src/app/(tabs)/me/'],
    'home_calm': ['src/features/home/'],
    'design_tokens': ['src/debug/'],
}


class Select(unittest.TestCase):
    def test_docs_and_scripts_affect_nothing(self):
        self.assertEqual(select(CASES, ['docs/story-map.md', 'scripts/check-story-map.mjs']), {})

    def test_a_feature_change_picks_the_cases_that_depend_on_it(self):
        picked = select(CASES, ['src/features/payee/classifyQr.ts'])
        self.assertEqual(list(picked), ['payee_list'])
        self.assertIn('src/features/payee/: src/features/payee/classifyQr.ts', picked['payee_list'])

    def test_a_route_prefix_matches_files_below_it(self):
        self.assertEqual(list(select(CASES, ['src/app/(tabs)/me/payee.tsx'])), ['payee_list'])

    def test_a_prefix_does_not_match_a_sibling_folder(self):
        self.assertEqual(select(CASES, ['src/features/payee-extra/x.ts']), {})

    def test_shared_code_picks_every_case(self):
        picked = select(CASES, ['src/lib/money.ts'])
        self.assertEqual(list(picked), list(CASES))
        self.assertTrue(all(r[0].startswith('shared: src/lib/money.ts') for r in picked.values()))

    def test_the_runner_and_lockfile_are_shared(self):
        for path in ('verification/ui/run.py', 'verification/ui/driver.py', 'bun.lock', 'package.json', 'app.json'):
            self.assertEqual(list(select(CASES, [path])), list(CASES), path)

    def test_a_changed_case_file_picks_that_case(self):
        picked = select(CASES, ['verification/ui/cases/home_calm.py'])
        self.assertEqual(picked, {'home_calm': ['own file: verification/ui/cases/home_calm.py']})

    def test_a_case_without_deps_always_runs(self):
        picked = select({'legacy': None, **CASES}, ['docs/x.md'])
        self.assertEqual(picked, {'legacy': ['declares no DEPS']})

    def test_long_shared_lists_are_shortened(self):
        changed = [f'src/ui/{n}.tsx' for n in 'abcde']
        reason = select({'home_calm': []}, changed)['home_calm'][0]
        self.assertEqual(reason, 'shared: src/ui/a.tsx, src/ui/b.tsx, src/ui/c.tsx (+2 more)')


class Locales(unittest.TestCase):
    def test_affected_runs_zh_hans_only_unless_locales_are_asked(self):
        self.assertEqual(run_locales(['zh-Hans', 'ms'], False), ['zh-Hans'])
        self.assertEqual(run_locales(['zh-Hans', 'ms'], True), ['zh-Hans', 'ms'])

    def test_a_case_without_zh_hans_keeps_its_first_locale(self):
        self.assertEqual(run_locales(['ms'], False), ['ms'])


class Declarations(unittest.TestCase):
    def test_parse_reads_single_and_multi_line_lists(self):
        self.assertEqual(parse_deps("DEPS = ['a/', 'b.tsx']\n"), ['a/', 'b.tsx'])
        self.assertEqual(parse_deps("x = 1\nDEPS = [\n    'a/',\n    'b/',\n]\n"), ['a/', 'b/'])
        self.assertIsNone(parse_deps("ARGS = ['x']\n"))

    def test_every_case_declares_deps_that_exist(self):
        tracked = subprocess.run(['git', '-C', str(ROOT), 'ls-files'], capture_output=True, text=True,
                                 check=True).stdout.splitlines()
        for case in sorted((HERE / 'cases').glob('*.py')):
            deps = parse_deps(case.read_text())
            self.assertTrue(deps, f'{case.name} declares no DEPS')
            for prefix in deps:
                exists = (ROOT / prefix).exists() or any(path.startswith(prefix) for path in tracked)
                self.assertTrue(exists, f'{case.name}: DEPS entry {prefix} matches no file')

    def test_smoke_cases_exist(self):
        for case in SMOKE:
            self.assertTrue((HERE / 'cases' / f'{case}.py').exists(), case)


if __name__ == '__main__':
    unittest.main()
