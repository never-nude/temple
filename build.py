#!/usr/bin/env python3
"""Build the static website using only Python's standard library."""
from pathlib import Path
root = Path(__file__).resolve().parent
shell = (root / 'source/page.html').read_text()
fragment = (root / 'source/second-temple.fragment.html').read_text()
assert shell.count('<!--MODEL-->') == 1
(root / 'index.html').write_text(shell.replace('<!--MODEL-->', fragment))
print('Built index.html')
