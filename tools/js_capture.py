"""Crawl a page in French and record every rendered text (numbers normalised to #).
usage: python3 tools/js_capture.py <page> [rounds]  -> merges into /tmp/captured.json"""
import sys,re,json,random,os
from playwright.sync_api import sync_playwright
NUM=re.compile(r'\d{1,3}(?:[   ]\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?')
def norm(s): return NUM.sub('#',re.sub(r'\s+',' ',s.strip()))
JS="""()=>{const out=[];const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;
while(n=w.nextNode()){const p=n.parentNode;if(['SCRIPT','STYLE','TEXTAREA'].includes(p.nodeName))continue;const t=n.nodeValue.trim();if(t)out.push(t)}
document.querySelectorAll('[title],[placeholder],[aria-label],[alt]').forEach(e=>['title','placeholder','aria-label','alt'].forEach(a=>{if(e.getAttribute(a))out.push(e.getAttribute(a))}));
document.querySelectorAll('input[type=button],input[type=submit]').forEach(e=>out.push(e.value));return out}"""
CLICK="""()=>{const c=[...document.querySelectorAll('button,.pill,summary,[role=tab],select,label,[data-m],[data-k],.chip,.seg button')].filter(e=>e.offsetParent&&!e.disabled&&!/(Supprimer|Delete|Envoyer|Copier|PDF|WhatsApp|Exporter|Retour)/i.test(e.textContent||''));return c.length}"""
page=sys.argv[1]; rounds=int(sys.argv[2]) if len(sys.argv)>2 else 150
seen=json.load(open('/tmp/captured.json')) if os.path.exists('/tmp/captured.json') else {}
random.seed(7)
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':1280,'height':900},locale='fr-FR'); pg=ctx.new_page();pg.route('**/three.min.js',lambda r:r.fulfill(path='/tmp/thr/node_modules/three/build/three.min.js',content_type='application/javascript'))
    pg.on('dialog',lambda d:d.dismiss())
    pg.goto(f'http://localhost:8770/pages/{page}.html?lang=fr'); pg.wait_for_timeout(1500)
    def grab():
        for t in pg.evaluate(JS): seen.setdefault(norm(t),t)
    grab()
    for i in range(rounds):
        try:
            els=pg.query_selector_all('button,.pill,summary,[role=tab],select,[data-m],[data-k],.chip')
            els=[e for e in els if e.is_visible()]
            if not els: break
            e=random.choice(els)
            tag=e.evaluate('e=>e.tagName')
            txt=(e.inner_text() or '')[:40]
            if re.search(r'Supprimer|Envoyer|PDF|WhatsApp|Exporter|Retour|Ouvrir le',txt): continue
            if tag=='SELECT':
                opts=e.evaluate('e=>[...e.options].map(o=>o.value)'); e.select_option(random.choice(opts))
            else: e.click(timeout=800)
            pg.wait_for_timeout(120); grab()
            if pg.url.split('?')[0].split('/')[-1]!=page+'.html': pg.goto(f'http://localhost:8770/pages/{page}.html?lang=fr'); pg.wait_for_timeout(600)
        except Exception as ex: pass
    b.close()
json.dump(seen,open('/tmp/captured.json','w'),ensure_ascii=False)
print(page,len(seen))
