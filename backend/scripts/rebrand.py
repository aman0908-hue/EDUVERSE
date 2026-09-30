#!/usr/bin/env python3
"""EduVerse -> AmanTech Learning rebrand.

- "Welcome to EduVerse"  -> "Welcome to AmanTech Learning"
- "EduVerse Study Guide" -> "AT Learning Guide"   (compound, cleaner)
- "EduVerse"             -> "AT Learning"
Technical identifiers chhod diye jaate hain: package.json, .vercel, backups, dist.
"""
import os

SKIP_DIRS = {'node_modules', 'dist', 'backups', '.git', '.vercel', 'build', '.vite'}
SKIP_FILES = {'package.json', 'package-lock.json', 'project.json'}
EXTS = {'.js', '.jsx', '.ts', '.tsx', '.html', '.css', '.md', '.json', '.mjs'}

changed = []
for root, dirs, files in os.walk('.'):
    dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
    for f in files:
        if f in SKIP_FILES or os.path.splitext(f)[1] not in EXTS:
            continue
        p = os.path.join(root, f)
        try:
            s = open(p, encoding='utf-8').read()
        except Exception:
            continue
        if 'EduVerse' not in s and 'eduverse-study-guide' not in s:
            continue
        o = s
        # 1) Welcome headline
        s = s.replace('Welcome to <span className="highlight">EduVerse</span>',
                      'Welcome to <span className="highlight">AmanTech Learning</span>')
        # 2) compound phrase
        s = s.replace('EduVerse Study Guide', 'AT Learning Guide')
        # 3) internal model id
        s = s.replace('eduverse-study-guide', 'at-learning-guide')
        # 4) everything else
        s = s.replace('EduVerse', 'AT Learning')
        if s != o:
            open(p, 'w', encoding='utf-8').write(s)
            changed.append(p)

print("CHANGED FILES:", len(changed))
for c in sorted(changed):
    print("  ", c)
