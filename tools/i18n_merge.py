#!/usr/bin/env python3
"""Merge a JSON {key: english} from stdin into public/data/i18n/en.json (keys must exist in fr.json)."""
import json, os, sys
ROOT=os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','public/data/i18n'))
fr=json.load(open(ROOT+'/fr.json',encoding='utf-8')); ep=ROOT+'/en.json'
en=json.load(open(ep,encoding='utf-8')) if os.path.exists(ep) else {}
new=json.load(sys.stdin); bad=[k for k in new if k not in fr]
for k in bad: print('unknown key',k,file=sys.stderr)
en.update({k:v for k,v in new.items() if k in fr})
json.dump(dict(sorted(en.items())),open(ep,'w',encoding='utf-8'),ensure_ascii=False,indent=0)
print(len(new)-len(bad),'merged;',len(en),'total')
