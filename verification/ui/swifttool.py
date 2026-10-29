import fcntl
import subprocess
from pathlib import Path

HERE = Path(__file__).resolve().parent
CACHE = HERE.parents[1] / '.verify'


def compiled(name):
    source, binary = HERE / f'{name}.swift', CACHE / name
    CACHE.mkdir(parents=True, exist_ok=True)
    with open(CACHE / f'{name}.lock', 'w') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        if not binary.exists() or binary.stat().st_mtime < source.stat().st_mtime:
            proc = subprocess.run(['swiftc', '-O', str(source), '-o', str(binary)], capture_output=True, text=True,
                                  timeout=300)
            if proc.returncode != 0:
                raise RuntimeError(f'swiftc {source.name} failed ({proc.returncode}):\n{proc.stderr}')
    return binary


def run(name, *args, timeout=120):
    proc = subprocess.run([str(compiled(name)), *map(str, args)], capture_output=True, timeout=timeout)
    if proc.returncode != 0:
        raise RuntimeError(f'{name} {" ".join(map(str, args))} failed ({proc.returncode}):\n{proc.stderr.decode()}')
    return proc.stdout
