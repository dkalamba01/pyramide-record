"""Run the configurator quote flow in English with the translator's miss logger on; dump untranslated strings.
usage: js_misses.py page [scenarios]"""
import re,sys,json,time
from playwright.sync_api import sync_playwright
page=sys.argv[1] if len(sys.argv)>1 else 'configurateur';N=int(sys.argv[2]) if len(sys.argv)>2 else 3
T0=time.time();miss={}
with sync_playwright() as p:
    b=p.chromium.launch();ctx=b.new_context(viewport={'width':1280,'height':900},locale='en-US',accept_downloads=True)
    ctx.add_init_script("Object.defineProperty(navigator,'languages',{get:()=>['en-US']});window.__trDebug=1")
    pg=ctx.new_page();pg.on('dialog',lambda d:d.dismiss());pg.on('popup',lambda w:w.close())
    pg.route(lambda u:not u.startswith('http://localhost') and 'three.min.js' not in u,lambda r:r.abort());pg.route('**/three.min.js',lambda r:r.fulfill(path='/tmp/thr/node_modules/three/build/three.min.js',content_type='application/javascript'))
    def grab():
        try:
            for k in (pg.evaluate('Object.keys(window.__trMiss||{})') or []):miss[k]=1
        except Exception:pass
    def click(rx,n=1):
        if time.time()-T0>150:return
        els=[e for e in pg.query_selector_all('button,.pill,summary,a,[role=tab],label,.cta') if e.is_visible() and re.search(rx,(e.inner_text() or '').strip(),re.I)]
        for e in els[:n]:
            try:e.click(timeout=400);pg.wait_for_timeout(300)
            except Exception:pass
        grab()
    for sc in range(N):
        if time.time()-T0>150:break
        pg.goto(f'http://localhost:8770/pages/{page}.html?lang=en');pg.wait_for_timeout(1800)
        for s in pg.query_selector_all('select'):
            try:
                if s.is_visible():
                    o=s.evaluate('e=>[...e.options].map(o=>o.value)');s.select_option(o[(sc*2+1)%len(o)]);pg.wait_for_timeout(150)
            except Exception:pass
        grab()
        for st in ['2 · Equipment','Fill by category','3 · Sound','Maximum coverage','Ideal installation','Fill the room','Clarity','Listening quality','4 · Plan','5 · Quote','Rental','Sale']:
            click(re.escape(st),2)
        click('See and request my quote');
        for rx in ['PDF','Create|Créer','Preview|Aperçu','Copy','Skip','Continue','Close']:
            click(rx,2)
        grab()
    b.close()
json.dump(sorted(miss),open('/tmp/misses.json','w'),ensure_ascii=False,indent=0)
print(len(miss))
