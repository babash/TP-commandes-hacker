// Test de la page dans un vrai navigateur (Playwright + Chromium).
// Lancer depuis la racine du dépôt : node terminal/tests/page.mjs
// (Playwright doit être installé ; sinon PLAYWRIGHT=/chemin/vers/playwright)
import http from 'node:http';
import fsn from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch (e) { pw = require(process.env.PLAYWRIGHT || '/opt/npm-tools/node_modules/playwright'); }
const { chromium } = pw;

// Petit serveur statique sur la racine du dépôt
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.md': 'text/markdown' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, p);
  if (!f.startsWith(root) || !fsn.existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' });
  res.end(fsn.readFileSync(f));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;
const base = origin + '/terminal/';

const problems = [];
let checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) problems.push(msg); };

async function type(page, line) {
  await page.fill('#saisie', line);
  await page.press('#saisie', 'Enter');
}
async function fresh(page) {
  await page.goto(base, { waitUntil: 'load' });
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await page.reload({ waitUntil: 'load' });
}
// Le texte tel que l'élève le voit : aucune balise ne doit y apparaître.
async function visibleTagsCheck(page, what) {
  const txt = await page.innerText('#sortie');
  const m = /<\/?(span|div|br|b|i|strong|em)\b[^>]*>|&lt;|&gt;|&amp;/.exec(txt);
  ok(!m, `${what} : texte rendu sans balise ni entité (trouvé « ${m && m[0]} »)`);
}

const browser = await chromium.launch();

// ---------- 1. Rendu : 3 largeurs × 2 thèmes ----------
for (const scheme of ['dark', 'light']) {
  for (const w of [320, 768, 1440]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 760 }, colorScheme: scheme });
    const page = await ctx.newPage();
    const errs = [], ext = [];
    page.on('pageerror', e => errs.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('request', r => { if (!r.url().startsWith(origin)) ext.push(r.url()); });
    await fresh(page);
    await type(page, 'MISSION');
    ok(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)), `${scheme} ${w}px : pas de défilement horizontal`);
    ok(!errs.length, `${scheme} ${w}px : erreurs JS ${errs.join(' | ')}`);
    ok(!ext.length, `${scheme} ${w}px : requêtes externes ${ext.join(' | ')}`);
    await visibleTagsCheck(page, `MISSION ${scheme} ${w}px`);
    // ligne d'aide du clavier : visible, liée, contrastée (≥ 4,5:1)
    const aide = await page.evaluate(() => {
      const el = document.getElementById('aide-clavier');
      if (!el) return { ratio: 0, visible: false, described: false, text: '' };
      const lum = (c) => { const v = c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map(x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
      let bgEl = el, bg;
      while (bgEl) { bg = getComputedStyle(bgEl).backgroundColor; if (!/rgba\(0, 0, 0, 0\)|transparent/.test(bg)) break; bgEl = bgEl.parentElement; }
      const a = lum(getComputedStyle(el).color), b = lum(bg);
      const r = el.getBoundingClientRect();
      return { ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05), visible: r.height > 0 && r.width > 0,
        described: document.getElementById('saisie').getAttribute('aria-describedby') === 'aide-clavier', text: el.textContent };
    });
    ok(aide.visible && /Échap puis Tab/.test(aide.text), `${scheme} ${w}px : ligne d'aide visible`);
    ok(aide.described, `${scheme} ${w}px : aria-describedby sur la ligne de commande`);
    ok(aide.ratio >= 4.5, `${scheme} ${w}px : contraste de la ligne d'aide ${aide.ratio.toFixed(2)} < 4,5`);
    await ctx.close();
  }
}

// ---------- 2. Les écrans de chaque mission, rendus dans la page ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 800 } });
  const page = await ctx.newPage();
  await fresh(page);
  await type(page, 'MISSION');
  await type(page, 'STATUT');
  for (let n = 1; n <= 15; n++) {
    for (let k = 0; k < 3; k++) {          // les trois niveaux d'indice
      await type(page, 'Q' + n);
      if ((await page.textContent('#invite')) === '>') await type(page, 'x');
    }
  }
  await visibleTagsCheck(page, 'MISSION, STATUT et les écrans des 15 missions (3 niveaux d\'indice)');

  // ---------- 3. Les 15 missions jouées jusqu'au bout ----------
  await fresh(page);
  const T = '~/infiltration_mirage/serveur';
  const steps = [
    'pwd', 'Q1', `ls ${T}/`, 'Q2', 'acces.txt', `cd ${T}/`, 'Q3',
    'cat ~/infiltration_mirage/message_secret.txt', 'Q4', 'M1r4g3_2024',
    `touch ${T}/agent.log`, 'Q5', `mkdir ${T}/exfiltration`, `cp ${T}/confidentiel/rapport.txt ${T}/exfiltration/`, 'Q6',
    `mv ${T}/exfiltration/rapport.txt ${T}/exfiltration/rapport_cache.txt`, 'Q7', `mkdir ${T}/archive`, 'Q8',
    `chmod 600 ${T}/exfiltration/rapport_cache.txt`, 'Q9', `chmod u+x ${T}/effacer_traces.sh`, 'Q10',
  ];
  for (const s of steps) await type(page, s);
  await type(page, 'clear');
  await type(page, 'ps');
  const pid = /(\d+) pts\/0 +00:00:00 espion_mirage\.s/.exec(await page.innerText('#sortie'))[1];
  for (const s of ['Q11', pid, 'kill ' + pid, 'Q11', 'ls --help', 'Q12', '-a', `ls -la ${T}/`, 'Q13', '.fichier_cache',
    `cat ${T}/logs/access.log | grep Transfert`, 'Q14', '2', 'history | grep Q', 'Q15', 'Q1', 'MISSION', 'STATUT']) await type(page, s);
  const fin = await page.innerText('#sortie');
  ok(/15\/15/.test(fin) && /OPÉRATION TERMINÉE\. Félicitations, agent·e\./.test(fin), 'les 15 missions sont accomplies dans la page');
  await visibleTagsCheck(page, 'parcours complet, MISSION et STATUT final');
  const gras = await page.evaluate(() => [...document.querySelectorAll('#sortie span.g.b')].some(s => /OPÉRATION TERMINÉE/.test(s.textContent)));
  ok(gras, 'STATUT final : le message est mis en forme (vert, gras), pas affiché en balises');

  // ---------- 4. Aucune injection de HTML par une commande ou une réponse ----------
  await fresh(page);
  await page.evaluate(() => { window.__pwn = 0; });
  for (const s of [
    'echo \'<img src=x onerror="window.__pwn=1">\'',
    'touch "<b>gras</b>"', 'ls',
    'mkdir "<i>dossier</i>"', 'cd "<i>dossier</i>"', 'Q3',
    'cd ~', 'Q2', '<b>acces.txt</b>',
    'cat "<script>window.__pwn=2</script>"',
  ]) await type(page, s);
  const inj = await page.evaluate(() => ({
    pwn: window.__pwn,
    tags: document.querySelectorAll('#sortie img, #sortie b, #sortie i, #sortie script').length,
    txt: document.getElementById('sortie').innerText,
  }));
  ok(inj.pwn === 0, 'injection : aucun script exécuté');
  ok(inj.tags === 0, 'injection : aucun élément HTML créé par une commande, un nom de fichier ou une réponse');
  ok(inj.txt.includes('<img src=x onerror="window.__pwn=1">') && inj.txt.includes('<b>gras</b>'), 'injection : le texte de l\'élève est affiché tel quel');
  await ctx.close();
}

// ---------- 5. Le clavier : pas de piège (WCAG 2.1.2) ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 800 } });
  const page = await ctx.newPage();
  await fresh(page);
  const active = () => page.evaluate(() => { const a = document.activeElement; return { id: a.id, text: (a.textContent || '').trim(), tag: a.tagName }; });
  await page.focus('#saisie');
  await page.fill('#saisie', 'ls ~/infiltration_mirage/ser');
  await page.keyboard.press('Tab');
  ok((await active()).id === 'saisie', 'Tab seul : le focus reste dans le terminal');
  ok(/serveur\/$/.test(await page.inputValue('#saisie')), 'Tab seul : complétion');
  await page.fill('#saisie', '');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Tab');
  const apres = await active();
  ok(apres.id !== 'saisie', 'Échap puis Tab : le focus sort du terminal');
  await page.focus('#saisie');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Shift+Tab');
  ok((await active()).id !== 'saisie', 'Échap puis Maj+Tab : le focus sort vers l\'élément précédent');
  await page.focus('#saisie');
  await page.keyboard.press('Escape');
  await page.keyboard.press('a');
  await page.keyboard.press('Tab');
  ok((await active()).id === 'saisie', 'Échap, une autre touche, puis Tab : Tab a retrouvé son rôle de complétion');
  // atteindre le pied de page au clavier
  await page.focus('#saisie');
  await page.fill('#saisie', '');
  await page.keyboard.press('Escape');
  let found = false;
  for (let i = 0; i < 40 && !found; i++) {
    await page.keyboard.press('Tab');
    const a = await active();
    if (a.text === 'Code source sur GitHub') found = true;
  }
  ok(found, 'le lien « Code source sur GitHub » du pied est atteint au clavier');
  // et revenir en arrière jusqu'aux boutons du haut
  let back = false;
  await page.focus('#saisie');
  await page.keyboard.press('Escape');
  for (let i = 0; i < 20 && !back; i++) {
    await page.keyboard.press('Shift+Tab');
    const a = await active();
    if (/Recommencer/.test(a.text)) back = true;
  }
  ok(back, 'le bouton « Recommencer » est atteint au clavier (Échap puis Maj+Tab, puis Maj+Tab)');
  // le lien vers les écarts est sur la page
  ok(await page.locator('a[href$="terminal/ECARTS.md"]').count() === 1, 'lien vers ECARTS.md depuis la page');
  ok(await page.locator('a[href="../fiche_eleve_mirage.html"]').count() === 1, 'lien vers la fiche élève (chemin relatif juste)');
  await ctx.close();
}

await browser.close();
server.close();
console.log(`\n  Page (Playwright) : ${checks - problems.length}/${checks} vérifications réussies\n`);
if (problems.length) { console.log(problems.map(p => '  ✗ ' + p).join('\n') + '\n'); process.exit(1); }
