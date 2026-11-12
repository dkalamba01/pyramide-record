import re,sys,json,glob
# find French-looking string literals in inline <script> blocks and .js/.json
FR=re.compile(r"[àâçéèêëîïôûùüÿœ]|\b(le|la|les|des|de|du|et|pour|vous|votre|ou|un|une|avec|sans|pas|est|sur|en|à)\b",re.I)
def lits(js):
    for m in re.finditer(r"'((?:[^'\\\n]|\\.)*)'|\"((?:[^\"\\\n]|\\.)*)\"|`((?:[^`\\]|\\.)*)`",js):
        s=m.group(1) if m.group(1) is not None else (m.group(2) if m.group(2) is not None else m.group(3))
        yield m.start(),s
f=sys.argv[1]
t=open(f,encoding='utf8').read()
n=0
for sm in re.finditer(r"<script(?![^>]*src=)(?![^>]*ld\+json)[^>]*>(.*?)</script>",t,re.S):
    body=sm.group(1)
    for pos,s in lits(body):
        if len(s)>=3 and re.search(r"[a-zA-Zà-ü]{3}",s) and FR.search(s) and ' ' in s.strip() or re.search(r"[àâçéèêëîïôûù]",s):
            n+=1
            if '-v' in sys.argv: print(repr(s[:140]))
print(f,n,file=sys.stderr)
