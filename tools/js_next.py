import json,sys,os
q=json.load(open('/tmp/jsq.json'))
d=json.load(open('public/data/i18n/en-js.json')) if os.path.exists('public/data/i18n/en-js.json') else {}
skip=json.load(open('/tmp/jsskip.json')) if os.path.exists('/tmp/jsskip.json') else []
todo=[k for k in q if k not in d and k not in skip]
n=int(sys.argv[1]) if len(sys.argv)>1 else 120
for k in todo[:n]: print(json.dumps(k,ensure_ascii=False))
print(len(todo),'remaining',file=sys.stderr)
