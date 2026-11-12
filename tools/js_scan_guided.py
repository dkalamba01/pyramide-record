"""Guided English-mode scan of the configurator. Prints French-looking text nodes (numbers normalised)."""
import re,sys,time
T0=time.time()
from playwright.sync_api import sync_playwright
FRW=re.compile(r"[àâçéèêëîïôûùüÿœÀÉÈ«»]|\b(le|la|les|des|du|et|pour|vous|votre|une|avec|sans|pas|est|sur|par|ce|cette|mon|nos|notre|choisir|ajouter|prix|salle|scène|aucun|non|oui|ou|dans|plus|moins|ajoutez|choisissez|touchez|devis)\b",re.I)
NUM=re.compile(r'\d{1,3}(?:[   ]\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?')
JS=open('tools/js_capture.py').read().split('JS="""')[1].split('"""')[0]
seen=set()
with sync_playwright() as p:
    b=p.chromium.launch();ctx=b.new_context(viewport={'width':1280,'height':900},locale='en-US');ctx.add_init_script("Object.defineProperty(navigator,'languages',{get:()=>['en-US']})")
    pg=ctx.new_page();pg.on('dialog',lambda d:d.dismiss())
    pg.route(lambda u:not u.startswith('http://localhost') and 'three.min.js' not in u,lambda r:r.abort());pg.route('**/three.min.js',lambda r:r.fulfill(path='/tmp/thr/node_modules/three/build/three.min.js',content_type='application/javascript'))
    def grab(tag=''):
        for t in pg.evaluate(JS):
            k=NUM.sub('#',re.sub(r'\s+',' ',t.strip()))
            if FRW.search(k) and k not in seen: seen.add(k);print(k,flush=True)
    def click_text(rx,n=1):
        if time.time()-T0>230: return 0
        els=[e for e in pg.query_selector_all('button,.pill,summary,a,[role=tab],label') if e.is_visible() and re.search(rx,(e.inner_text() or '').strip())]
        for e in els[:n]:
            try:e.click(timeout=300);pg.wait_for_timeout(250)
            except Exception:pass
        return len(els)
    for scen in range(int(sys.argv[1]) if len(sys.argv)>1 else 4):
        pg.goto('http://localhost:8770/pages/configurateur.html?lang=en');pg.wait_for_timeout(1800);grab()
        # choose different event/venue via selects
        sels=pg.query_selector_all('select')
        for s in sels:
            try:
                if s.is_visible():
                    opts=s.evaluate('e=>[...e.options].map(o=>o.value)');s.select_option(opts[(scen*2+1)%len(opts)]);pg.wait_for_timeout(200)
            except Exception:pass
        grab()
        for step in ['2 · Equipment','Fill by category','3 · Sound','Maximum coverage','Ideal installation','Fill the room','Clarity','Listening quality','4 · Plan','5 · Quote','Rental']:
            click_text(re.escape(step),2);pg.wait_for_timeout(300);grab()
        # open quote
        click_text('See and request my quote',1);pg.wait_for_timeout(500);grab()
        for rx in ['Skip','Continue','Copy','Close']:
            click_text(rx,1);pg.wait_for_timeout(200);grab()
    b.close()
print(len(seen),'french-looking strings',file=sys.stderr)
