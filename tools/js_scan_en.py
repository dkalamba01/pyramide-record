"""Open a page in English, interact, list text still in French. usage: js_scan_en.py page rounds"""
import sys,re,json,random,time
T0=time.time()
from playwright.sync_api import sync_playwright
FRW=re.compile(r"[àâçéèêëîïôûùüÿœÀÉÈ«»]|\b(le|la|les|des|du|et|pour|vous|votre|une|avec|sans|pas|est|sur|par|ce|cette|mon|nos|notre|choisir|ajouter|prix|salle|scène|aucun|non|oui|ou|dans|plus|moins|ajoutez|choisissez|touchez|total|devis)\b",re.I)
JS=open('tools/js_capture.py').read().split('JS="""')[1].split('"""')[0]
page=sys.argv[1];rounds=int(sys.argv[2]) if len(sys.argv)>2 else 120
bad={}
random.seed(int(sys.argv[3]) if len(sys.argv)>3 else 3)
with sync_playwright() as p:
    b=p.chromium.launch();ctx=b.new_context(viewport={'width':1280,'height':900},locale='en-US');ctx.add_init_script("Object.defineProperty(navigator,'languages',{get:()=>['en-US']})")
    pg=ctx.new_page();pg.route(lambda u:not u.startswith('http://localhost') and 'three.min.js' not in u,lambda r:r.abort());pg.route('**/three.min.js',lambda r:r.fulfill(path='/tmp/thr/node_modules/three/build/three.min.js',content_type='application/javascript'));pg.on('dialog',lambda d:d.dismiss())
    pg.goto(f'http://localhost:8770/pages/{page}.html?lang=en');pg.wait_for_timeout(1800)
    def grab():
        for t in pg.evaluate(JS):
            k=re.sub(r'\s+',' ',t.strip())
            if FRW.search(t) and k not in bad: bad[k]=1;print(k,flush=True)
    grab()
    for i in range(rounds):
        if time.time()-T0>int(sys.argv[4] if len(sys.argv)>4 else 150):break
        try:
            els=[e for e in pg.query_selector_all('button,.pill,summary,[role=tab],select,[data-m],[data-k],.chip,[data-act]') if e.is_visible()]
            if not els:break
            e=random.choice(els);txt=(e.inner_text() or '')[:40]
            if re.search(r'Delete|Send|PDF|WhatsApp|Export|Back|Open the|Supprimer|Envoyer',txt):continue
            if e.evaluate('e=>e.tagName')=='SELECT': e.select_option(random.choice(e.evaluate('e=>[...e.options].map(o=>o.value)')))
            else:e.click(timeout=400)
            pg.wait_for_timeout(100);grab()
            if not pg.url.split('?')[0].endswith(page+'.html'):pg.goto(f'http://localhost:8770/pages/{page}.html?lang=en');pg.wait_for_timeout(500)
        except Exception:pass
    b.close()
print(len(bad),'french-looking strings',file=sys.stderr)
