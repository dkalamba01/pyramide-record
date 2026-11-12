#!/usr/bin/env python3
"""Print untranslated strings for given pages (or all) as JSON: {key: fr}. Usage: i18n_export.py [file-substring ...] [--max N]"""
import glob, json, os, re, sys
ROOT=os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','public'))
fr=json.load(open(os.path.join(ROOT,'data/i18n/fr.json'),encoding='utf-8'))
ep=os.path.join(ROOT,'data/i18n/en.json'); en=json.load(open(ep,encoding='utf-8')) if os.path.exists(ep) else {}
args=sys.argv[1:]; mx=10**9
if '--max' in args: i=args.index('--max'); mx=int(args[i+1]); del args[i:i+2]
keys=[]
for f in sorted(glob.glob(os.path.join(ROOT,'**','*.html'),recursive=True)):
    rel=os.path.relpath(f,ROOT)
    if args and not any(a==rel or a in rel for a in args): continue
    s=open(f,encoding='utf-8').read()
    for k in re.findall(r'data-i18n="([0-9a-f]{8})"',s)+[x for g in re.findall(r'data-i18n-attr="([^"]*)"',s) for x in [p.split(':')[1] for p in g.split(',')]]:
        if k not in en and k not in keys: keys.append(k)
out={k:fr[k] for k in keys[:mx]}
print(json.dumps(out,ensure_ascii=False,indent=0)); print(f'# {len(out)} of {len(keys)} untranslated here; total missing {len([k for k in fr if k not in en])}',file=sys.stderr)
