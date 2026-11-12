import sys,json,os
p='public/data/i18n/en-js.json'
d=json.load(open(p)) if os.path.exists(p) else {}
new=json.load(sys.stdin)
for k,v in new.items():
    if k.count('#')!=v.count('#'): print('PLACEHOLDER MISMATCH',k,'|',v,file=sys.stderr)
    d[k]=v
json.dump(d,open(p,'w'),ensure_ascii=False,indent=0,sort_keys=True)
print(len(new),'merged;',len(d),'total')
