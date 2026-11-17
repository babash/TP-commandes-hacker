// ============================================================
//  Opération MIRAGE — contrôleur du terminal intégré (navigateur)
//  Relie le shell, le TP et l'affichage. Aucun appel réseau.
//  Licence : MIT. Auteur : Babash - NSI Tani Malandi.
// ============================================================

import { Shell, COMMANDS } from './shell.js';
import { Mirage, esc } from './mirage.js';
import { explain } from './erreurs.js';

const KEY = 'mirage.tp.v2';
const out = document.getElementById('sortie');
const input = document.getElementById('saisie');
const promptEl = document.getElementById('invite');
const srNote = document.getElementById('sr-note');

let tp, hist = [], histPos = 0, draft = '';

// ---------- Persistance ----------
function load() {
  try { const s = localStorage.getItem(KEY); return s ? JSON.parse(s) : null; }
  catch (e) { return null; }
}
function save(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
}

// ---------- Affichage ----------
function append(html, cls) {
  const div = document.createElement('div');
  div.className = 'ligne' + (cls ? ' ' + cls : '');
  div.innerHTML = html;
  out.appendChild(div);
  out.scrollTop = out.scrollHeight;
  return div;
}
function clearScreen() { out.innerHTML = ''; }

function textBlock(t, cls) {
  const body = esc(t.replace(/\n$/, '')).replace(/\n/g, '<br>');
  append(cls === 'erreur' ? '<span class="r">' + body + '</span>' : body, cls);
}
// Le flux de sortie, dans l'ordre réel : stdout (fd 1), stderr (fd 2),
// sorties du TP (html), effacement (clear) et pager (less, more, man).
function render(res) {
  if (res.expanded) append(esc(res.expanded), 'echo');   // !! affiche la commande développée
  let buf = '', kind = null;
  const flush = () => { if (buf !== '') textBlock(buf, kind === 2 ? 'erreur' : ''); buf = ''; kind = null; };
  for (const c of res.stream || []) {
    if (c.clear) { flush(); clearScreen(); continue; }
    if (c.html !== undefined) { flush(); append(c.html.replace(/\n/g, '<br>'), 'tp'); continue; }
    if (c.pager !== undefined) { flush(); openPager(c.pager, c.name); continue; }
    if (kind !== null && kind !== c.fd) flush();
    kind = c.fd; buf += c.text;
  }
  flush();
}

// ---------- Pager (less, more, man) ----------
const pagerEl = document.getElementById('pager');
const pagerText = document.getElementById('pager-texte');
const pagerTitre = document.getElementById('pager-titre');
function openPager(text, name) {
  pagerTitre.textContent = name || '';
  pagerText.textContent = text;
  pagerEl.hidden = false;
  pagerText.scrollTop = 0;
  pagerText.focus();
}
function closePager() { pagerEl.hidden = true; input.focus(); }
function pageBy(dir) { pagerText.scrollTop += dir * (pagerText.clientHeight - 24); }
if (pagerEl) {
  pagerText.addEventListener('keydown', (e) => {
    const k = e.key;
    if (k === 'q' || k === 'Q' || k === 'Escape') { e.preventDefault(); closePager(); }
    else if (k === ' ' || k === 'PageDown' || k === 'f') { e.preventDefault(); pageBy(1); }
    else if (k === 'b' || k === 'PageUp') { e.preventDefault(); pageBy(-1); }
    else if (k === 'j' || k === 'Enter') { e.preventDefault(); pagerText.scrollTop += 20; }
    else if (k === 'k') { e.preventDefault(); pagerText.scrollTop -= 20; }
  });
  document.getElementById('pager-suivant').addEventListener('click', () => { pageBy(1); pagerText.focus(); });
  document.getElementById('pager-precedent').addEventListener('click', () => { pageBy(-1); pagerText.focus(); });
  document.getElementById('pager-quitter').addEventListener('click', closePager);
}

// Largeur du terminal en caractères (pour les colonnes de ls)
function measureColumns() {
  const probe = document.createElement('span');
  probe.textContent = 'M'.repeat(20);
  probe.style.visibility = 'hidden';
  out.appendChild(probe);
  const cw = probe.getBoundingClientRect().width / 20;
  probe.remove();
  const style = getComputedStyle(out);
  const inner = out.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  return Math.max(20, Math.floor(inner / (cw || 8)));
}
function updateColumns() { if (tp) tp.shell.columns = measureColumns(); }
window.addEventListener('resize', updateColumns);

// ---------- Invite (prompt) ----------
function refreshPrompt() {
  // Si une mission attend une réponse, l'invite devient « > ».
  if (tp.awaiting) { promptEl.textContent = '>'; promptEl.dataset.answer = '1'; }
  else { promptEl.textContent = tp.shell.prompt(); delete promptEl.dataset.answer; }
}

// ---------- Exécution d'une ligne ----------
function execute(line) {
  // Écho de la ligne tapée, avec l'invite du moment.
  append('<span class="invite-echo">' + esc(promptEl.textContent) + '</span> ' + esc(line), 'echo');

  const t = line.trim();

  // Commandes de l'aide intégrée (ne passent pas par le shell).
  if (!tp.awaiting && (t === '?' || t === 'explique' || t === 'pourquoi')) {
    if (t !== '') { tp.shell.history.push(t); }
    append('<span class="c">' + esc(explain(tp.shell.lastError)) + '</span>', 'aide');
    tp.persist(); refreshPrompt(); return;
  }
  if (!tp.awaiting && (t === 'aide' || t === 'help')) {
    tp.shell.history.push(t);
    append(AIDE, 'aide'); tp.persist(); refreshPrompt(); return;
  }
  if (!tp.awaiting && (t === 'recommencer')) { tp.shell.history.push(t); recommencer(); return; }

  const res = tp.shell.run(line);
  render(res);
  // Annonce pour le lecteur d'écran (zone de sortie).
  if (srNote) srNote.textContent = 'Sortie mise à jour.';
  refreshPrompt();
}

// ---------- Intro (comme le lancement du script) ----------
function intro() {
  clearScreen();
  append(BANNER, 'banner');
  append('<span class="c b">[ TRANSMISSION CHIFFREE RECUE ]</span>', 'tp');
  append('Agent·e, tu as penetre le serveur <span class="r b">MIRAGE</span>. ' +
         '15 missions t\'attendent, dans l\'ordre que tu veux.', 'tp');
  append('<span class="y">Rappel legal :</span> simulation fictive et 100% locale. ' +
         'Art. 323-1 Code Penal : acces non autorise = delit.', 'tp');
  append('<span class="dim">──────────────────────────────────────────────</span>', 'tp');
  append('<span class="b">Trois commandes :</span>', 'tp');
  append('<span class="g">MISSION</span>   affiche les 15 missions et leur etat.', 'tp');
  append('<span class="g">Q1 … Q15</span>  verifie une mission (badge + score, ou un indice).', 'tp');
  append('<span class="g">STATUT</span>    donne le score.', 'tp');
  append('<span class="dim">Besoin d\'aide ? Tape <span class="y">aide</span>. ' +
         'Une erreur en anglais ? Tape <span class="y">?</span> pour la traduire.</span>', 'tp');
  append('<span class="g b">TP pret !</span>  Tape <span class="c">MISSION</span> pour commencer.', 'tp');
}

// ---------- Recommencer ----------
function recommencer() {
  try { localStorage.removeItem(KEY); } catch (e) {}
  tp = new Mirage(Shell, { save });
  updateColumns();
  hist = []; histPos = 0;
  intro();
  refreshPrompt();
  input.focus();
}

// ---------- Complétion par Tab ----------
function complete() {
  const val = input.value;
  const toks = val.split(/\s+/);
  const last = toks[toks.length - 1];
  let candidates = [];
  if (toks.length <= 1) {
    const cmds = [...new Set(Object.keys(COMMANDS).concat(Object.keys(tp.shell.functions), Object.keys(tp.shell.aliases), ['aide', 'recommencer']))].sort();
    candidates = cmds.filter(c => c.startsWith(last));
  } else {
    // complétion de chemin
    const sh = tp.shell;
    let dirPart = last.lastIndexOf('/') >= 0 ? last.slice(0, last.lastIndexOf('/') + 1) : '';
    let basePart = last.slice(dirPart.length);
    const realDir = dirPart.replace(/^~(?=\/|$)/, sh.env.HOME || sh.home);
    const absDir = sh.fs.resolve(realDir || '.', sh.cwd);
    const node = sh.fs.node(absDir);
    if (node && node.type === 'dir') {
      candidates = Object.keys(node.children)
        .filter(n => n.startsWith(basePart))
        .map(n => dirPart + n + (node.children[n].type === 'dir' ? '/' : ''));
    }
    if (candidates.length) { toks[toks.length - 1] = ''; }
  }
  if (candidates.length === 1) {
    toks[toks.length - 1] = candidates[0];
    input.value = toks.join(' ');
  } else if (candidates.length > 1) {
    // préfixe commun
    let pre = candidates[0];
    for (const c of candidates) { while (!c.startsWith(pre)) pre = pre.slice(0, -1); }
    if (pre && pre.length > last.length) { toks[toks.length - 1] = pre; input.value = toks.join(' '); }
    append('<span class="dim">' + candidates.map(esc).join('   ') + '</span>', 'completion');
  }
}

// ---------- Clavier ----------
input.addEventListener('keydown', (e) => {
  if (e.ctrlKey && (e.key === 'c' || e.key === 'C') && input.selectionStart === input.selectionEnd) {
    e.preventDefault();
    append('<span class="invite-echo">' + esc(promptEl.textContent) + '</span> ' + esc(input.value) + '^C', 'echo');
    input.value = ''; if (tp.awaiting) { tp.awaiting = null; refreshPrompt(); }
    return;
  }
  if (e.ctrlKey && (e.key === 'l' || e.key === 'L')) { e.preventDefault(); clearScreen(); return; }
  if (e.key === 'Enter') {
    e.preventDefault();
    const line = input.value;
    input.value = '';
    if (line.trim() !== '') { hist.push(line); }
    histPos = hist.length; draft = '';
    execute(line);
  } else if (e.key === 'Tab') {
    e.preventDefault();
    complete();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (histPos === hist.length) draft = input.value;
    if (histPos > 0) { histPos--; input.value = hist[histPos]; moveCaretEnd(); }
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (histPos < hist.length) { histPos++; input.value = histPos === hist.length ? draft : hist[histPos]; moveCaretEnd(); }
  }
});
function moveCaretEnd() { requestAnimationFrame(() => { input.selectionStart = input.selectionEnd = input.value.length; }); }

// ---------- Clavier virtuel (téléphone) ----------
document.querySelectorAll('[data-insert]').forEach(btn => {
  btn.addEventListener('click', () => {
    input.focus();
    const s = input.selectionStart, e = input.selectionEnd, v = input.value;
    const txt = btn.dataset.insert;
    input.value = v.slice(0, s) + txt + v.slice(e);
    const pos = s + txt.length;
    input.selectionStart = input.selectionEnd = pos;
  });
});
document.querySelectorAll('[data-key]').forEach(btn => {
  btn.addEventListener('click', () => {
    input.focus();
    const k = btn.dataset.key;
    input.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
  });
});

// Boutons de la barre
document.getElementById('btn-recommencer').addEventListener('click', () => {
  if (confirm('Recommencer le TP depuis le début ? La progression sera effacée.')) recommencer();
});
document.getElementById('btn-expliquer').addEventListener('click', () => {
  input.focus();
  append('<span class="invite-echo">' + esc(promptEl.textContent) + '</span> ?', 'echo');
  append('<span class="c">' + esc(explain(tp.shell.lastError)) + '</span>', 'aide');
});
const btnTheme = document.getElementById('btn-theme');
if (btnTheme) btnTheme.addEventListener('click', () => {
  const r = document.documentElement;
  const cur = r.getAttribute('data-theme');
  const next = cur === 'dark' ? 'light' : (cur === 'light' ? 'dark' : (matchMedia('(prefers-color-scheme: dark)').matches ? 'light' : 'dark'));
  r.setAttribute('data-theme', next);
  try { localStorage.setItem('mirage.theme', next); } catch (e) {}
});

// Cliquer n'importe où dans le terminal ramène le focus à la saisie.
out.addEventListener('click', () => { if (!window.getSelection().toString()) input.focus(); });

// ---------- Textes ----------
const BANNER =
  '<span class="banner-art" aria-hidden="true">' +
  '  ___  ____  ____  ____   __  ____  __  ____  __ _\n' +
  ' / _ \\(  _ \\( ___)(  _ \\ / _\\(_  _)(  )(  _ \\(  ( \\\n' +
  '( (_) )) __/ ) _)  )   //    \\ )(   )(  )   //    /\n' +
  ' \\___/(__)  (____)(_)\\_)\\_/\\_/(__) (__)(____)(\\___)' +
  '</span>\n<span class="y">~~~ Operation MIRAGE ~~~</span>';

const AIDE =
  '<span class="b c">Aide — Opération MIRAGE</span>\n' +
  '<span class="dim">Le terminal est déjà prêt : l\'arborescence du TP est en place.</span>\n\n' +
  '<span class="b">Commandes du TP</span>\n' +
  '  MISSION       liste les 15 missions et leur état\n' +
  '  Q1 … Q15      vérifie une mission (badge + score, ou un indice gradué)\n' +
  '  STATUT        score rapide\n' +
  '  recommencer   repart de zéro (efface la progression)\n\n' +
  '<span class="b">Commandes Linux disponibles</span>\n' +
  '  pwd cd ls cat touch mkdir cp mv rm rmdir chmod stat\n' +
  '  grep find head tail wc echo  ps kill history clear\n' +
  '  redirections > et >>   tube |   complétion par Tab\n\n' +
  '<span class="b">Lire une erreur</span>\n' +
  '  L\'erreur s\'affiche en anglais (comme un vrai terminal).\n' +
  '  Tape <span class="y">?</span> pour la faire traduire et expliquer en français.\n\n' +
  '<span class="b">Aide d\'une commande</span>\n' +
  '  <span class="y">ls --help</span>  ou  <span class="y">man ls</span>  (en français)';

// ---------- Démarrage ----------
(function start() {
  // thème mémorisé
  try { const th = localStorage.getItem('mirage.theme'); if (th) document.documentElement.setAttribute('data-theme', th); } catch (e) {}
  const state = load();
  tp = new Mirage(Shell, { state, save });
  if (state) {
    // Reprise : on réaffiche l'intro puis le score, sans refaire l'arborescence.
    intro();
    append('<span class="c">[INFO] Progression restauree — ' + tp.total() + '/15 missions.</span>', 'tp');
  } else {
    intro();
  }
  updateColumns();
  refreshPrompt();
  input.focus();
})();
