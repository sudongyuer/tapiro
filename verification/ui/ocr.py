import json
import re
import subprocess
from pathlib import Path

HERE = Path(__file__).resolve().parent
SOURCE = HERE / 'ocr.swift'
BINARY = HERE.parents[1] / '.verify' / 'ocr'


def _binary():
    if not BINARY.exists() or BINARY.stat().st_mtime < SOURCE.stat().st_mtime:
        BINARY.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run(['swiftc', '-O', str(SOURCE), '-o', str(BINARY)], check=True, capture_output=True, timeout=180)
    return BINARY


def lines(shot):
    out = subprocess.run([str(_binary()), str(shot.path)], check=True, capture_output=True, timeout=60).stdout
    return [{'text': line['text'], 'x': line['x'] / shot.scale, 'y': line['y'] / shot.scale,
             'width': line['width'] / shot.scale, 'height': line['height'] / shot.scale}
            for line in json.loads(out)]


def inside(box, f, slack=1):
    return (box['x'] >= f['x'] - slack and box['y'] >= f['y'] - slack
            and box['x'] + box['width'] <= f['x'] + f['width'] + slack
            and box['y'] + box['height'] <= f['y'] + f['height'] + slack)


def find(shot, pattern, within):
    regex = re.compile(pattern)
    return [line for line in lines(shot) if regex.search(line['text']) and inside(line, within)]
