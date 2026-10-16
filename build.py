#!/usr/bin/env python3
"""Bundle the static Temple website with only Python's standard library."""
from pathlib import Path
import json
import re
root = Path(__file__).resolve().parent
source = root / 'source'
shell = (source / 'page.html').read_text()
fragment = (source / 'second-temple.fragment.html').read_text()
def inline(match):
    path = source / match.group(1)
    return '<script>\n' + path.read_text().replace('</script', '<\\/script') + '\n</script>'
fragment = re.sub(r'<!--INLINE:([a-z0-9-]+\.js)-->', inline, fragment)
evidence = json.dumps(json.loads((source/'temple-evidence.json').read_text()), ensure_ascii=False).replace('</', '<\\/')
fragment = fragment.replace('<!--EVIDENCE-->', '<script type="application/json" id="temple-evidence">'+evidence+'</script>')
assert shell.count('<!--MODEL-->') == 1
(root / 'index.html').write_text(shell.replace('<!--MODEL-->', fragment))
print('Built index.html')
