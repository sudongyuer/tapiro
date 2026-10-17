"""Pick the UI cases a change can affect, from each case's DEPS path prefixes."""
import re

SHARED = [
    'src/ui/',
    'src/lib/',
    'src/app/_layout.tsx',
    'src/app/index.tsx',
    'modules/',
    'plugins/',
    'assets/',
    'app.json',
    'package.json',
    'bun.lock',
    'tsconfig.json',
    'verification/ui/driver.py',
    'verification/ui/run.py',
    'verification/ui/affected.py',
    'verification/ui/breaker.py',
    'verification/ui/build.sh',
]
SMOKE = ['app_launches', 'sign_in_fixture', 'shell_tabs', 'home_one_card']
DEFAULT_LOCALE = 'zh-Hans'


def parse_deps(source):
    match = re.search(r"^DEPS = \[([^\]]*)\]", source, re.M)
    return re.findall(r"'([^']+)'", match.group(1)) if match else None


def matches(path, prefix):
    return path == prefix or path.startswith(prefix)


def select(cases, changed, shared=SHARED):
    changed = sorted(set(changed))
    shared_hits = [path for path in changed if any(matches(path, prefix) for prefix in shared)]
    picked = {}
    for case, deps in cases.items():
        reasons = []
        if shared_hits:
            more = f' (+{len(shared_hits) - 3} more)' if len(shared_hits) > 3 else ''
            reasons.append(f"shared: {', '.join(shared_hits[:3])}{more}")
        if deps is None:
            reasons.append('declares no DEPS')
        own = f'verification/ui/cases/{case}.py'
        if own in changed:
            reasons.append(f'own file: {own}')
        for prefix in deps or []:
            hits = [path for path in changed if matches(path, prefix)]
            if hits:
                reasons.append(f'{prefix}: {hits[0]}' + (f' (+{len(hits) - 1} more)' if len(hits) > 1 else ''))
        if reasons:
            picked[case] = reasons
    return picked


def run_locales(declared, with_declared):
    if with_declared:
        return declared
    return [DEFAULT_LOCALE] if DEFAULT_LOCALE in declared else declared[:1]
