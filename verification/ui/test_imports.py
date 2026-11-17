import ast
import importlib.util
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def local_modules(root):
    return {path.stem: path for path in root.glob('*.py')}


def module_names(tree):
    names = set()

    def bind(target):
        if isinstance(target, ast.Name):
            names.add(target.id)
        elif isinstance(target, (ast.Tuple, ast.List)):
            for element in target.elts:
                bind(element)
        elif isinstance(target, ast.Starred):
            bind(target.value)

    def visit(statements):
        for node in statements:
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                names.add(node.name)
            elif isinstance(node, ast.Assign):
                for target in node.targets:
                    bind(target)
            elif isinstance(node, (ast.AnnAssign, ast.AugAssign)):
                bind(node.target)
            elif isinstance(node, (ast.Import, ast.ImportFrom)):
                for alias in node.names:
                    names.add(alias.asname or alias.name.split('.')[0])
            elif isinstance(node, (ast.For, ast.AsyncFor)):
                bind(node.target)
            elif isinstance(node, (ast.With, ast.AsyncWith)):
                for item in node.items:
                    if item.optional_vars is not None:
                        bind(item.optional_vars)
            elif isinstance(node, ast.Try):
                for handler in node.handlers:
                    if handler.name:
                        names.add(handler.name)
            for field in ('body', 'orelse', 'finalbody'):
                if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                    visit(getattr(node, field, []))
            for handler in getattr(node, 'handlers', []):
                visit(handler.body)

    visit(tree.body)
    for node in ast.walk(tree):
        if isinstance(node, ast.Global):
            names.update(node.names)
        elif isinstance(node, ast.NamedExpr):
            bind(node.target)
    return names


def broken_imports(paths, modules, root=ROOT):
    exported = {}

    def names_of(module):
        if module not in exported:
            exported[module] = module_names(ast.parse(modules[module].read_text()))
        return exported[module]

    def resolves(module):
        top = module.split('.')[0]
        return top in modules or importlib.util.find_spec(top) is not None

    problems = []
    for path in paths:
        tree = ast.parse(path.read_text(), filename=str(path))
        where = path.relative_to(root)
        aliases = {}
        for node in ast.walk(tree):
            imported = [alias.name for alias in node.names] if isinstance(node, ast.Import) else []
            if isinstance(node, ast.ImportFrom) and node.level == 0:
                imported = [node.module]
            for module in imported:
                if not resolves(module):
                    problems.append(f'{where}:{node.lineno}: no module {module}')
            if isinstance(node, ast.ImportFrom) and node.level == 0 and node.module in modules:
                for alias in node.names:
                    if alias.name != '*' and alias.name not in names_of(node.module):
                        problems.append(f'{where}:{node.lineno}: {node.module} has no {alias.name}')
            elif isinstance(node, ast.Import):
                for alias in node.names:
                    if alias.name in modules:
                        aliases[alias.asname or alias.name] = alias.name
        for node in ast.walk(tree):
            if (
                isinstance(node, ast.Attribute)
                and isinstance(node.ctx, ast.Load)
                and isinstance(node.value, ast.Name)
                and node.value.id in aliases
            ):
                module = aliases[node.value.id]
                if node.attr not in names_of(module):
                    problems.append(f'{where}:{node.lineno}: {module} has no {node.attr}')
    return problems


class LocalImports(unittest.TestCase):
    maxDiff = None

    def test_every_case_and_helper_imports_names_that_exist(self):
        modules = local_modules(ROOT)
        paths = sorted([*modules.values(), *ROOT.glob('cases/*.py')])
        self.assertEqual(broken_imports(paths, modules), [])

    def test_reports_a_missing_name_from_both_import_forms(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'cases').mkdir()
            (root / 'helper.py').write_text('import os\nLIMIT = 1\n\n\ndef kept():\n    pass\n')
            case = root / 'cases' / 'case.py'
            case.write_text(
                'import json\nimport helper\nfrom helper import kept, gone\nfrom json import nothing\n'
                'helper.LIMIT\nhelper.os\nhelper.vanished\nhelper.patched = 1\nfrom removed_helper import tap\n'
            )
            self.assertEqual(
                broken_imports([case], local_modules(root), root),
                [
                    'cases/case.py:3: helper has no gone',
                    'cases/case.py:9: no module removed_helper',
                    'cases/case.py:7: helper has no vanished',
                ],
            )


if __name__ == '__main__':
    unittest.main()
