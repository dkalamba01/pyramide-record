#!/usr/bin/env python3
"""Tag every visible French string in public/**/*.html with data-i18n keys, WITHOUT
re-serialising the HTML (edits are spliced into the original text, so diffs stay small).
Rebuilds public/data/i18n/fr.json.

  python3 tools/i18n_tag.py tag     tag new/untagged strings (idempotent) + rebuild fr.json
  python3 tools/i18n_tag.py check   report strings lacking an English translation or with broken markup
"""
import glob, hashlib, html, json, os, re, sys
from html.parser import HTMLParser

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public'))
DICT = os.path.join(ROOT, 'data', 'i18n')
VOID = {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}
INLINE = {'a','strong','b','em','i','span','br','small','u','mark','sup','sub','abbr','wbr','time','s'}
SKIP = {'script','style','noscript','svg','textarea','pre','iframe','template','canvas','code','head_dummy'}
ATTRS = ['alt','title','placeholder','aria-label']
META = {('name','description'),('property','og:title'),('property','og:description'),('name','twitter:title'),('name','twitter:description')}
LETTER = re.compile('[A-Za-zÀ-ÿ]')

def norm(s): return re.sub(r'\s+', ' ', s).strip()
def key(s): return hashlib.sha1(s.encode('utf-8')).hexdigest()[:8]

class Node:
    def __init__(s, name, attrs, so, se): s.name=name; s.attrs=dict(attrs); s.so=so; s.se=se; s.es=None; s.ee=None; s.kids=[]; s.parent=None

class Builder(HTMLParser):
    def __init__(s, src):
        super().__init__(convert_charrefs=False); s.src=src
        s.lines=[0]
        for m in re.finditer('\n', src): s.lines.append(m.end())
        s.root=Node('#root',[],0,0); s.root.es=0; s.root.ee=len(src); s.stack=[s.root]; s.marks=[]
    def off(s): l,c=s.getpos(); return s.lines[l-1]+c
    def handle_starttag(s, tag, attrs):
        so=s.off(); raw=s.get_starttag_text(); n=Node(tag,attrs,so,so+len(raw)); n.parent=s.stack[-1]; s.stack[-1].kids.append(n)
        if tag in VOID: n.es=n.ee=n.se
        else: s.stack.append(n)
        if tag in ('script','style'): s.set_cdata_mode(tag)
    def handle_startendtag(s, tag, attrs):
        so=s.off(); raw=s.get_starttag_text(); n=Node(tag,attrs,so,so+len(raw)); n.parent=s.stack[-1]; n.es=n.ee=n.se; s.stack[-1].kids.append(n)
    def handle_endtag(s, tag):
        so=s.off()
        for i in range(len(s.stack)-1,0,-1):
            if s.stack[i].name==tag:
                n=s.stack[i]; n.es=so; n.ee=s.src.find('>',so)+1
                for m in s.stack[i+1:]: m.es=m.ee=so
                del s.stack[i:]; return
    def _blk(s, endtok):
        so=s.off(); e=s.src.find(endtok,so)+len(endtok); n=Node('#comment',[],so,e); n.es=n.ee=e; n.parent=s.stack[-1]; s.stack[-1].kids.append(n)
    def handle_comment(s,d): s._blk('-->')
    def handle_decl(s,d): s._blk('>')
    def handle_pi(s,d): s._blk('>')
    def unknown_decl(s,d): s._blk('>')

def text_segments(n, src):
    """yield (start,end) of text between child tags of n"""
    pos = n.se; out=[]
    for k in n.kids:
        out.append((pos,k.so)); pos = k.ee
    out.append((pos, n.es)); return out

def inline_only(n): return all(k.name in INLINE and 'id' not in k.attrs and inline_only(k) for k in n.kids if k.name != '#comment')
def skipped(n): return n.name in SKIP or n.name.startswith('#') or n.attrs.get('translate')=='no' or n.attrs.get('data-i18n')=='no'
def has_text(n, src): return any(LETTER.search(src[a:b]) for a,b in text_segments(n, src))

def process(path, strings):
    src = open(path, encoding='utf-8', newline='').read()
    b = Builder(src); b.feed(src); b.close()
    edits = []  # (offset, insert_text, delete_len)
    def attr_edit(n, extra):
        if extra: edits.append((n.so+1+len(n.name), extra, 0))
    def attrs_of(n):
        a = {}
        out = []
        spec = [x for x in ATTRS if isinstance(n.attrs.get(x), str) and LETTER.search(n.attrs[x])]
        if n.name=='input' and n.attrs.get('type') in ('submit','button') and LETTER.search(n.attrs.get('value') or ''): spec.append('value')
        if n.name=='meta' and any((k,n.attrs.get(k)) in META for k in ('name','property')) and LETTER.search(n.attrs.get('content') or ''): spec.append('content')
        if 'data-i18n-attr' in n.attrs:
            for part in n.attrs['data-i18n-attr'].split(','):
                an,k = part.split(':',1)
                if n.attrs.get(an) is not None: strings[k] = norm(n.attrs[an])
            return ''
        for an in spec:
            t = norm(n.attrs[an]); k = key(t); strings[k] = t; out.append(f'{an}:{k}')
        return f' data-i18n-attr="{",".join(out)}"' if out else ''
    def inner(n): return norm(src[n.se:n.es])
    def walk(n):
        for c in n.kids:
            if skipped(c): continue
            ex = attrs_of(c)
            if 'data-i18n' in c.attrs:
                strings[c.attrs['data-i18n']] = inner(c); attr_edit(c, ex)
                for d in desc(c): attr_edit(d, attrs_of(d))
            elif has_text(c, src) and inline_only(c):
                t = inner(c); k = key(t); strings[k] = t
                attr_edit(c, f' data-i18n="{k}"' + ex)
                for d in desc(c): attr_edit(d, attrs_of(d))
            else:
                attr_edit(c, ex)
                if has_text(c, src):
                    for a,bb in text_segments(c, src):
                        seg = src[a:bb]
                        if LETTER.search(seg) and c.name not in ('html','head'):
                            core = norm(seg); lead = seg[:len(seg)-len(seg.lstrip())]; trail = seg[len(seg.rstrip()):]
                            k = key(core); strings[k] = core
                            edits.append((a, f'{lead}<span data-i18n="{k}">{seg.strip()}</span>{trail}', len(seg)))
                walk(c)
    def desc(n):
        for k in n.kids:
            if k.name.startswith('#'): continue
            yield k; yield from desc(k)
    walk(b.root)
    if edits:
        out = src
        for off, ins, dl in sorted(edits, key=lambda e: -e[0]): out = out[:off] + ins + out[off+dl:]
        open(path, 'w', encoding='utf-8', newline='').write(out)

def tags_of(s): return sorted(re.findall(r'<[^>]+>', s))

def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else 'tag'
    os.makedirs(DICT, exist_ok=True)
    files = sorted(glob.glob(os.path.join(ROOT, '**', '*.html'), recursive=True))
    if mode == 'tag':
        strings = {}
        for f in files:
            process(f, strings)
        # attribute strings are stored unescaped; unit strings keep raw entities
        json.dump(dict(sorted(strings.items())), open(os.path.join(DICT,'fr.json'),'w',encoding='utf-8'), ensure_ascii=False, indent=0)
        print(f'{len(files)} pages, {len(strings)} strings')
    else:
        fr = json.load(open(os.path.join(DICT,'fr.json'),encoding='utf-8'))
        ep = os.path.join(DICT,'en.json'); en = json.load(open(ep,encoding='utf-8')) if os.path.exists(ep) else {}
        missing=[k for k in fr if k not in en]; bad=[k for k in fr if k in en and tags_of(fr[k])!=tags_of(en[k])]; extra=[k for k in en if k not in fr]
        print(f'strings {len(fr)} | translated {len(fr)-len(missing)} | missing {len(missing)} | broken markup {len(bad)} | orphan {len(extra)}')
        for k in bad[:20]: print('BAD',k,fr[k][:80],'=>',en[k][:80])

if __name__=='__main__': main()
