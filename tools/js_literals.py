"""Extract display-text segments from string literals of inline scripts.
usage: python3 tools/js_literals.py page... -> /tmp/lits.json {normalized_fr: [pages]}; ${..} templates -> /tmp/tpls.json"""
import re,sys,json
NUM=re.compile(r'\d{1,3}(?:[\u00a0\u202f ]\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?')
def norm(s): return NUM.sub('#',re.sub(r'\s+',' ',s.strip()))
FR=re.compile(r"[àâçéèêëîïôûùüÿœÀÉÈ«»]|\b(le|la|les|des|du|et|pour|vous|votre|ou|un|une|avec|sans|pas|est|sur|en|à|par|ce|cette|mon|ma|mes|nos|notre|choisir|ajouter|prix|total|salle|son|scène)\b",re.I)
TECH=re.compile(r'^[#\W\d_a-z]*$')  # no uppercase/accents words
def unesc(s): return re.sub(r"\\(['\"`\\/])",r"\1",s).replace('\\n','\n')
def literals(js):
    i=0;n=len(js)
    while i<n:
        c=js[i]
        if c in '\'"':
            j=i+1;buf=[]
            while j<n and js[j]!=c and js[j]!='\n':
                if js[j]=='\\': buf.append(js[j:j+2]);j+=2
                else: buf.append(js[j]);j+=1
            yield ''.join(buf),False; i=j+1
        elif c=='`':
            j=i+1;buf=[];d=0
            while j<n:
                if js[j]=='\\': buf.append(js[j:j+2]);j+=2;continue
                if js[j]=='$' and js[j+1:j+2]=='{': d+=1;buf.append('${');j+=2;continue
                if js[j]=='}' and d: d-=1;buf.append('}');j+=1;continue
                if js[j]=='`' and not d: break
                buf.append(js[j]);j+=1
            yield ''.join(buf),True; i=j+1
        elif c=='/' and js[i+1:i+2]=='/':
            while i<n and js[i]!='\n': i+=1
        elif c=='/' and js[i+1:i+2]=='*':
            i=js.index('*/',i)+2
        else: i+=1
lits={};tpls={}
for page in sys.argv[1:]:
    t=open(f'public/pages/{page}.html',encoding='utf8').read()
    for sm in re.finditer(r"<script(?![^>]*src=)(?![^>]*ld\+json)[^>]*>(.*?)</script>",t,re.S):
        for s,isT in literals(sm.group(1)):
            s=unesc(s)
            if isT and '${' in s:
                if FR.search(re.sub(r'\$\{.*?\}','',s)): tpls.setdefault(s,[]).append(page)
                continue
            for seg in re.split(r'<[^>]*>',s):
                seg=seg.strip()
                if len(seg)<2 or not re.search(r'[A-Za-zÀ-ÿ]{2}',seg): continue
                if re.search(r'[{};=]|=>|\bfunction\b|\.\w+\(',seg): continue
                if re.fullmatch(r'[a-z][A-Za-z0-9_\-]*',seg) or re.search(r'https?:|^#?[0-9a-fA-F]{3,8}$|^[a-z\-]+:|px|\.js|\.png|\.jpg|=\s*\d|\bfunction\b',seg): continue
                if re.search(r'[A-Za-zÀ-ÿ]{3}',seg): lits.setdefault(norm(seg),[]).append(page)
json.dump(lits,open('/tmp/lits.json','w'),ensure_ascii=False)
json.dump(tpls,open('/tmp/tpls.json','w'),ensure_ascii=False)
print(len(lits),len(tpls))
