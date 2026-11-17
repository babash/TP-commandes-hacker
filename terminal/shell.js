// ============================================================
//  Opération MIRAGE — shell et système de fichiers virtuels
//  Voie (A) : un petit shell écrit pour le TP, 100 % local.
//  Licence du code : MIT (Babash - NSI Tani Malandi).
//
//  Ce module ne dépend d'aucun site : il tourne dans le navigateur
//  (chargé par terminal/index.html) et sous Node (tests).
//  Comportements et messages calqués sur bash 5.2 et GNU coreutils 9,
//  comparés automatiquement à un vrai shell (terminal/tests/diff.mjs).
//  Les écarts connus sont listés dans terminal/ECARTS.md.
// ============================================================

'use strict';

const CH = String.fromCharCode;

// ---------- Système de fichiers ----------
// Un nœud : { type:'dir'|'file', name, mode, content, children, mtime, dev?, bin? }
function dir(name, mode = 0o755, t) {
  return { type: 'dir', name, mode, children: {}, mtime: t || Date.now() };
}
function file(name, content = '', mode = 0o644, t) {
  return { type: 'file', name, content, mode, mtime: t || Date.now() };
}

function utf8len(s) {
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 0x80) n += 1;
    else if (c < 0x800) n += 2;
    else if (c >= 0xd800 && c <= 0xdbff) { n += 4; i++; }
    else n += 3;
  }
  return n;
}

class FS {
  constructor() { this.root = dir('/'); }
  // Chemin absolu normalisé (le ~ est déjà développé par le shell).
  resolve(path, cwd) {
    if (path === undefined || path === '') path = '.';
    const start = path.startsWith('/') ? [] : cwd.split('/').filter(Boolean);
    const out = start.slice();
    for (const p of path.split('/').filter(Boolean)) {
      if (p === '.') continue;
      else if (p === '..') out.pop();
      else out.push(p);
    }
    return '/' + out.join('/');
  }
  node(abs) {
    if (abs === '/') return this.root;
    let cur = this.root;
    for (const p of abs.split('/').filter(Boolean)) {
      if (cur.type !== 'dir' || !Object.prototype.hasOwnProperty.call(cur.children, p)) return null;
      cur = cur.children[p];
    }
    return cur;
  }
  parent(abs) {
    const parts = abs.split('/').filter(Boolean);
    const name = parts.pop();
    const pabs = '/' + parts.join('/');
    return { parent: this.node(pabs), name, pabs };
  }
  size(n) { return n.type === 'dir' ? 4096 : (n.dev ? 0 : utf8len(n.content)); }
  blocksK(n) { if (n.type === 'dir') return 4; if (n.dev) return 0; return Math.ceil(this.size(n) / 4096) * 4; }
  dump() { return JSON.stringify(this.root); }
  load(json) { this.root = JSON.parse(json); }
}

// ---------- L'arborescence du TP (script v11.1) ----------
const RAPPORT = `RAPPORT CONFIDENTIEL -- Operation Mirage
Classification : SECRET DEFENSE  |  Date : 2024-01-15
---
Coordonnees : 48.8566 N, 2.3522 E
Cle : MIRAGE-2024-ALPHA  |  Transfert : 03:00 UTC
Ce fichier ne doit pas quitter le perimetre securise.
`;
const ACCESSLOG = `2024-01-15 08:23:11 - Connexion root         depuis 192.168.1.1  [OK]
2024-01-15 09:11:42 - Connexion inconnue     depuis 10.0.0.42    [REFUSE]
2024-01-15 09:45:00 - Lecture config.sys     depuis 192.168.1.1  [OK]
2024-01-15 10:00:01 - Transfert rapport.txt  vers   10.0.0.99    [OK]
2024-01-15 10:00:03 - Transfert cles.txt     vers   10.0.0.99    [OK]
2024-01-15 10:00:05 - Deconnexion root                           [OK]
2024-01-15 11:30:17 - Connexion admin        depuis 192.168.1.1  [OK]
2024-01-15 14:12:55 - Lecture access.log     depuis 10.0.0.42    [REFUSE]
`;
const FICHIER_CACHE = `[ECHO] Bien joue. Les fichiers en point sont caches par defaut.
Le rapport confidentiel se trouve dans confidentiel/
`;
const MESSAGE_SECRET = `[ECHO] Operation MIRAGE | Priorite HAUTE
Serveur actif depuis 72h.
Des transferts suspects figurent dans serveur/logs/access.log
Un processus de surveillance tourne en arriere-plan.
Mot de passe secours : M1r4g3_2024
`;
const EFFACER = `#!/bin/sh
echo "Nettoyage en cours... Traces effacees."
`;
const ESPION = `#!/bin/sh
# espion_mirage - surveillance fictive NSI
[ "$1" = "--essai" ] && exit 0
while true; do sleep 30; done
`;

// Les commandes « externes » (présentes dans /usr/bin, comme sur Debian).
const EXTERNALS = ['bash', 'cat', 'chmod', 'clear', 'cp', 'cut', 'date', 'df', 'du', 'echo', 'false',
  'file', 'find', 'grep', 'head', 'kill', 'less', 'ls', 'man', 'mkdir', 'more', 'mv', 'ps', 'pwd',
  'rm', 'rmdir', 'sh', 'sort', 'stat', 'tail', 'touch', 'tr', 'tree', 'true', 'uniq', 'wc', 'which', 'whoami'];
// Les commandes internes du shell (builtins de bash).
const BUILTINS = ['.', 'alias', 'cd', 'echo', 'exit', 'export', 'false', 'history', 'kill', 'pwd',
  'source', 'true', 'type', 'unalias', 'unset'];

function buildMirageFS(t = Date.now()) {
  const fs = new FS();
  const r = fs.root;
  r.mtime = t;
  for (const d of ['bin', 'dev', 'etc', 'home', 'root', 'tmp', 'usr', 'var']) r.children[d] = dir(d, 0o755, t);
  r.children.tmp.mode = 0o777;
  r.children.usr.children.bin = dir('bin', 0o755, t);
  r.children.var.children.log = dir('log', 0o755, t);
  for (const c of EXTERNALS) {
    const f = file(c, '', 0o755, t); f.bin = true;
    r.children.usr.children.bin.children[c] = f;
    const g = file(c, '', 0o755, t); g.bin = true;
    r.children.bin.children[c] = g;
  }
  const nul = file('null', '', 0o666, t); nul.dev = 'null';
  r.children.dev.children.null = nul;
  r.children.etc.children.hostname = file('hostname', 'mirage\n', 0o644, t);
  r.children.tmp.children['espion_mirage.sh'] = file('espion_mirage.sh', ESPION, 0o755, t);
  r.children.root.mode = 0o700;

  const home = r.children.root;
  const tp = dir('infiltration_mirage', 0o755, t);
  home.children.infiltration_mirage = tp;
  tp.children['message_secret.txt'] = file('message_secret.txt', MESSAGE_SECRET, 0o644, t);
  const srv = dir('serveur', 0o755, t);
  tp.children.serveur = srv;
  srv.children['acces.txt'] = file('acces.txt', 'ACCES REFUSE.\n', 0o644, t);
  srv.children.confidentiel = dir('confidentiel', 0o755, t);
  srv.children.confidentiel.children['rapport.txt'] = file('rapport.txt', RAPPORT, 0o644, t);
  srv.children.public = dir('public', 0o755, t);
  srv.children.public.children['index.html'] = file('index.html', 'Index public MIRAGE.\n', 0o644, t);
  srv.children.logs = dir('logs', 0o755, t);
  srv.children.logs.children['access.log'] = file('access.log', ACCESSLOG, 0o644, t);
  srv.children['effacer_traces.sh'] = file('effacer_traces.sh', EFFACER, 0o644, t);
  srv.children['.fichier_cache'] = file('.fichier_cache', FICHIER_CACHE, 0o644, t);
  return fs;
}

// ---------- Affichage des droits ----------
function modeString(node) {
  const t = node.type === 'dir' ? 'd' : (node.dev ? 'c' : '-');
  const m = node.mode;
  const bit = (shift, ch) => (m & (1 << shift)) ? ch : '-';
  return t + bit(8, 'r') + bit(7, 'w') + bit(6, 'x') + bit(5, 'r') + bit(4, 'w') + bit(3, 'x') +
    bit(2, 'r') + bit(1, 'w') + bit(0, 'x');
}
function octal(node) { return (node.mode & 0o777).toString(8); }

// ---------- Utilitaires ----------
const MOIS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const JOURS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MOIS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const JOURS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const p2 = n => String(n).padStart(2, '0');
function codepointCmp(a, b) { return a < b ? -1 : a > b ? 1 : 0; }
function lines(s) { const l = s.split('\n'); if (l[l.length - 1] === '') l.pop(); return l; }
function human(bytes) {
  const u = ['', 'K', 'M', 'G', 'T'];
  if (bytes < 1024) return String(bytes);
  let v = bytes, k = 0;
  while (v >= 1024 && k < u.length - 1) { v /= 1024; k++; }
  if (v < 10) { const r = Math.ceil(v * 10) / 10; return (r >= 10 ? String(Math.ceil(v)) : r.toFixed(1)) + u[k]; }
  return String(Math.ceil(v)) + u[k];
}
function tzName(d) {
  try {
    const z = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const map = { 'Indian/Mayotte': 'EAT', 'Africa/Nairobi': 'EAT', 'Indian/Comoro': 'EAT', 'Indian/Antananarivo': 'EAT',
      'Africa/Addis_Ababa': 'EAT', 'Africa/Dar_es_Salaam': 'EAT', 'UTC': 'UTC', 'Etc/UTC': 'UTC', 'Indian/Reunion': '+04' };
    if (map[z]) return map[z];
    if (z === 'Europe/Paris') return d.getTimezoneOffset() === -120 ? 'CEST' : 'CET';
  } catch (e) {}
  const off = -d.getTimezoneOffset();
  if (off === 0) return 'UTC';
  return (off > 0 ? '+' : '-') + p2(Math.floor(Math.abs(off) / 60)) + (Math.abs(off) % 60 ? p2(Math.abs(off) % 60) : '');
}
function tzOffset(d) {
  const off = -d.getTimezoneOffset();
  return (off >= 0 ? '+' : '-') + p2(Math.floor(Math.abs(off) / 60)) + p2(Math.abs(off) % 60);
}
function strftime(fmt, d) {
  return fmt.replace(/%([a-zA-Z%])/g, (m, c) => {
    switch (c) {
      case 'Y': return String(d.getFullYear());
      case 'y': return p2(d.getFullYear() % 100);
      case 'm': return p2(d.getMonth() + 1);
      case 'd': return p2(d.getDate());
      case 'e': return String(d.getDate()).padStart(2, ' ');
      case 'H': return p2(d.getHours());
      case 'M': return p2(d.getMinutes());
      case 'S': return p2(d.getSeconds());
      case 'a': return JOURS[d.getDay()];
      case 'A': return JOURS_LONG[d.getDay()];
      case 'b': case 'h': return MOIS[d.getMonth()];
      case 'B': return MOIS_LONG[d.getMonth()];
      case 'j': { const s = new Date(d.getFullYear(), 0, 1); return String(Math.floor((d - s) / 864e5) + 1).padStart(3, '0'); }
      case 's': return String(Math.floor(d.getTime() / 1000));
      case 'F': return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
      case 'T': return `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;
      case 'D': return `${p2(d.getMonth() + 1)}/${p2(d.getDate())}/${p2(d.getFullYear() % 100)}`;
      case 'R': return `${p2(d.getHours())}:${p2(d.getMinutes())}`;
      case 'Z': return tzName(d);
      case 'z': return tzOffset(d);
      case 'u': return String(d.getDay() || 7);
      case 'w': return String(d.getDay());
      case 'n': return '\n';
      case 't': return '\t';
      case '%': return '%';
    }
    return m;
  });
}

// Message pour une option qu'une commande connue a sur un vrai Linux,
// mais que ce terminal d'entraînement ne connaît pas.
// quote() de gnulib : ‘…’ en locale UTF-8 (mkdir, chmod, find…)
const LQ = CH(0x2018), RQ = CH(0x2019);
const gq = (x) => LQ + x + RQ;

function optInconnue(cmd, opt) {
  return `${cmd} : l'option ${opt} n'est pas connue de ce terminal d'entraînement. ` +
    `Tape « ${cmd} --help » pour voir celles qu'il connaît.\n`;
}

// Analyse d'options façon getopt (options et opérandes mêlés, -abc, -n5, --long=val).
// spec : { flags:'al', arg:'n', long:{all:'a'}, longArg:{lines:'n'}, ignore:['color'], digits:true, code:2 }
function getopts(cmd, args, spec, io) {
  const opts = {}, operands = [];
  const long = spec.long || {}, longArg = spec.longArg || {}, ignore = spec.ignore || [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--') { operands.push(...args.slice(i + 1)); break; }
    if (a.startsWith('--') && a.length > 2) {
      const eq = a.indexOf('=');
      const name = eq >= 0 ? a.slice(2, eq) : a.slice(2);
      if (ignore.includes(name)) continue;
      if (Object.prototype.hasOwnProperty.call(long, name) && eq < 0) { opts[long[name]] = true; continue; }
      if (Object.prototype.hasOwnProperty.call(longArg, name)) {
        let v = eq >= 0 ? a.slice(eq + 1) : args[++i];
        if (v === undefined) { io.err(`${cmd}: option '--${name}' requires an argument\nTry '${cmd} --help' for more information.\n`); return null; }
        opts[longArg[name]] = v; continue;
      }
      io.err(optInconnue(cmd, '--' + name)); return null;
    }
    if (a.startsWith('-') && a.length > 1) {
      if (spec.digits && /^-\d+$/.test(a)) { opts.num = a.slice(1); continue; }
      for (let j = 1; j < a.length; j++) {
        const c = a[j];
        if ((spec.arg || '').includes(c)) {
          let v = a.slice(j + 1);
          if (v === '') v = args[++i];
          if (v === undefined) { io.err(`${cmd}: option requires an argument -- '${c}'\nTry '${cmd} --help' for more information.\n`); return null; }
          opts[c] = v; if (spec.multi && spec.multi.includes(c)) { (opts['@' + c] = opts['@' + c] || []).push(v); }
          break;
        }
        if ((spec.flags || '').includes(c)) { opts[c] = true; continue; }
        io.err(optInconnue(cmd, '-' + c)); return null;
      }
      continue;
    }
    operands.push(a);
  }
  return { opts, operands };
}

// ============================================================
//  L'analyse de la ligne de commande
// ============================================================
// Un mot = liste d'éléments { c, q } (caractère, protégé ou non)
// ou { v: nom, q } (variable à développer).

class ShellError {
  constructor(msg, code = 2) { this.msg = msg; this.code = code; }
}
const NONSUPPORTE = (quoi) => new ShellError(
  `bash : ${quoi} : ce terminal d'entraînement ne le connaît pas (un vrai bash, oui).\n`, 2);

function lex(line) {
  const toks = [];
  let word = null;
  const push = () => { if (word) { toks.push({ w: word }); word = null; } };
  const newWord = () => { if (!word) { word = []; word.hasQuote = false; } return word; };
  const add = (it) => { newWord().push(it); };
  const n = line.length;
  let i = 0;
  const readVar = (q) => {
    // i est sur « $ »
    const nx = line[i + 1];
    if (nx === '{') {
      const j = line.indexOf('}', i + 2);
      if (j < 0) throw new ShellError("bash: unexpected EOF while looking for matching `}'\n");
      const name = line.slice(i + 2, j);
      if (!/^([A-Za-z_][A-Za-z0-9_]*|[?$#0-9])$/.test(name)) throw NONSUPPORTE('${' + name + '}');
      add({ v: name, q }); i = j + 1; return;
    }
    if (nx === '(') throw NONSUPPORTE('$( … ) (substitution de commande)');
    if (nx !== undefined && /[?$#0-9]/.test(nx)) { add({ v: nx, q }); i += 2; return; }
    const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(line.slice(i + 1));
    if (m) { add({ v: m[0], q }); i += 1 + m[0].length; return; }
    add({ c: '$', q }); i++;
  };
  while (i < n) {
    const c = line[i];
    if (c === ' ' || c === '\t') { push(); i++; continue; }
    if (c === '#' && !word) break;
    if (c === "'") {
      const j = line.indexOf("'", i + 1);
      if (j < 0) throw new ShellError("bash: unexpected EOF while looking for matching `''\n");
      newWord().hasQuote = true;
      for (const ch of line.slice(i + 1, j)) add({ c: ch, q: true });
      i = j + 1; continue;
    }
    if (c === '"') {
      newWord().hasQuote = true;
      i++;
      let closed = false;
      while (i < n) {
        const d = line[i];
        if (d === '"') { closed = true; i++; break; }
        if (d === '\\' && i + 1 < n && '$`"\\'.includes(line[i + 1])) { add({ c: line[i + 1], q: true }); i += 2; continue; }
        if (d === '$') { readVar(true); continue; }
        if (d === '`') throw NONSUPPORTE('` … ` (substitution de commande)');
        add({ c: d, q: true }); i++;
      }
      if (!closed) throw new ShellError('bash: unexpected EOF while looking for matching `"\'\n');
      continue;
    }
    if (c === '\\') {
      if (i + 1 < n) { newWord().hasQuote = true; add({ c: line[i + 1], q: true }); }
      i += 2; continue;
    }
    if (c === '$') { readVar(false); continue; }
    if (c === '`') throw NONSUPPORTE('` … ` (substitution de commande)');
    if (c === '(' || c === ')') throw NONSUPPORTE('les parenthèses ( … ) (sous-shell)');
    if (c === '|') { push(); if (line[i + 1] === '|') { toks.push({ op: '||' }); i += 2; } else { toks.push({ op: '|' }); i++; } continue; }
    if (c === ';') { push(); toks.push({ op: ';' }); i++; continue; }
    if (c === '&') {
      push();
      if (line[i + 1] === '&') { toks.push({ op: '&&' }); i += 2; continue; }
      if (line[i + 1] === '>') { toks.push({ r: '&>' }); i += 2; continue; }
      toks.push({ op: '&' }); i++; continue;
    }
    if (c === '>' || c === '<') {
      // 2> 2>> 1> : le chiffre collé devant fait partie de la redirection
      let fd = null;
      if (word && word.length === 1 && !word[0].q && /^[12]$/.test(word[0].c || '')) { fd = word[0].c; word = null; }
      push();
      if (c === '<') {
        if (line[i + 1] === '<') throw NONSUPPORTE('<< (document en ligne)');
        toks.push({ r: '<' }); i++; continue;
      }
      let r = '>';
      i++;
      if (line[i] === '>') { r = '>>'; i++; }
      else if (line[i] === '&' && /[12]/.test(line[i + 1] || '')) {
        toks.push({ r: (fd === '2' ? '2' : '') + '>&' + line[i + 1] }); i += 2; continue;
      }
      toks.push({ r: (fd === '2' ? '2' : '') + r });
      continue;
    }
    add({ c, q: false }); i++;
  }
  push();
  return toks;
}

function plainText(items) {
  // le texte d'un mot sans guillemets ni variable, ou null
  let s = '';
  for (const it of items) { if (it.v !== undefined || it.q) return null; s += it.c; }
  return s;
}

function parse(toks) {
  // liste de { pipeline:[cmd], op } ; cmd = { words:[items], redirs:[{r, target}] }
  const list = [];
  let pipeline = [];
  let cmd = { words: [], redirs: [] };
  let expectCmd = true;
  const tokStr = (t) => t.op || t.r;
  for (let k = 0; k < toks.length; k++) {
    const t = toks[k];
    if (t.w) { cmd.words.push(t.w); expectCmd = false; continue; }
    if (t.r) {
      if (t.r === '2>&1' || t.r === '>&2' || t.r === '>&1' || t.r === '2>&2') { cmd.redirs.push({ r: t.r }); expectCmd = false; continue; }
      const nx = toks[k + 1];
      if (!nx || !nx.w) throw new ShellError(`bash: syntax error near unexpected token \`${nx ? tokStr(nx) : 'newline'}'\n`);
      cmd.redirs.push({ r: t.r, target: nx.w }); k++; expectCmd = false; continue;
    }
    // opérateur
    if (cmd.words.length === 0 && cmd.redirs.length === 0) {
      if (t.op === ';' && pipeline.length === 0 && list.length === 0 && k === toks.length - 1) {
        throw new ShellError("bash: syntax error near unexpected token `;'\n");
      }
      throw new ShellError(`bash: syntax error near unexpected token \`${t.op}'\n`);
    }
    if (t.op === '&') throw NONSUPPORTE('& (lancer en arrière-plan)');
    pipeline.push(cmd);
    cmd = { words: [], redirs: [] };
    if (t.op === '|') { expectCmd = true; continue; }
    list.push({ pipeline, op: t.op });
    pipeline = [];
    expectCmd = t.op !== ';';
  }
  if (cmd.words.length || cmd.redirs.length) pipeline.push(cmd);
  else if (pipeline.length || (expectCmd && list.length && list[list.length - 1].op !== ';')) {
    throw new ShellError('bash: syntax error: unexpected end of file\n');
  }
  if (pipeline.length) list.push({ pipeline, op: null });
  return list;
}

// ---------- Développement des accolades {a,b} et {1..3} ----------
function braceExpand(items) {
  for (let a = 0; a < items.length; a++) {
    if (items[a].q || items[a].c !== '{') continue;
    let depth = 0, b = -1;
    const commas = [];
    for (let k = a; k < items.length; k++) {
      const it = items[k];
      if (it.q || it.v !== undefined) continue;
      if (it.c === '{') depth++;
      else if (it.c === '}') { depth--; if (depth === 0) { b = k; break; } }
      else if (it.c === ',' && depth === 1) commas.push(k);
    }
    if (b < 0) return [items];
    const pre = items.slice(0, a), post = items.slice(b + 1);
    if (commas.length) {
      const parts = [];
      let s = a + 1;
      for (const cm of commas) { parts.push(items.slice(s, cm)); s = cm + 1; }
      parts.push(items.slice(s, b));
      const out = [];
      for (const p of parts) out.push(...braceExpand(pre.concat(p, post)));
      return out;
    }
    const inner = plainText(items.slice(a + 1, b));
    const m = inner !== null && /^(-?\d+|[A-Za-z])\.\.(-?\d+|[A-Za-z])$/.exec(inner);
    if (m) {
      const vals = [];
      if (/^-?\d+$/.test(m[1]) && /^-?\d+$/.test(m[2])) {
        const x = +m[1], y = +m[2], st = x <= y ? 1 : -1;
        for (let v = x; st > 0 ? v <= y : v >= y; v += st) vals.push(String(v));
      } else if (!/\d/.test(m[1] + m[2])) {
        const x = m[1].charCodeAt(0), y = m[2].charCodeAt(0), st = x <= y ? 1 : -1;
        for (let v = x; st > 0 ? v <= y : v >= y; v += st) vals.push(CH(v));
      } else continue;
      const out = [];
      for (const v of vals) out.push(...braceExpand(pre.concat([...v].map(c => ({ c, q: true })), post)));
      return out;
    }
  }
  return [items];
}

// ---------- Jokers (globbing) ----------
function escRe(s) { return s.replace(/[\\^$.*+?()[\]{}|\/]/g, '\\$&'); }
const POSIX_CLASSES = {
  alpha: 'a-zA-Z' + CH(0xc0) + '-' + CH(0xd6) + CH(0xd8) + '-' + CH(0xf6) + CH(0xf8) + '-' + CH(0x24f),
  digit: '0-9', alnum: 'a-zA-Z0-9' + CH(0xc0) + '-' + CH(0xd6) + CH(0xd8) + '-' + CH(0xf6) + CH(0xf8) + '-' + CH(0x24f),
  upper: 'A-Z', lower: 'a-z', space: ' \\t\\n\\r\\f\\v', blank: ' \\t',
  punct: '!-\\/:-@\\[-`{-~', xdigit: '0-9A-Fa-f', cntrl: '\\x00-\\x1f\\x7f',
  print: '\\x20-\\x7e', graph: '\\x21-\\x7e',
};
function classEsc(c) { return /[\\\]\[^-]/.test(c) ? '\\' + c : c; }

// Lit une expression entre crochets dans un tableau d'éléments { c, q }.
// Renvoie { src, end } ou null si elle n'est pas fermée.
function bracketFromItems(items, start, negChars) {
  let j = start + 1;
  let neg = false;
  if (j < items.length && !items[j].q && negChars.includes(items[j].c)) { neg = true; j++; }
  let src = '';
  let first = true;
  while (j < items.length) {
    const it = items[j];
    if (!it.q && it.c === ']' && !first) return { src: '[' + (neg ? '^' : '') + src + ']', end: j };
    first = false;
    if (!it.q && it.c === '[' && items[j + 1] && items[j + 1].c === ':') {
      let k = j + 2, name = '';
      while (k < items.length && !(items[k].c === ':' && items[k + 1] && items[k + 1].c === ']')) { name += items[k].c; k++; }
      if (k < items.length && POSIX_CLASSES[name]) { src += POSIX_CLASSES[name]; j = k + 2; continue; }
    }
    if (items[j + 1] && !items[j + 1].q && items[j + 1].c === '-' && items[j + 2] && !(items[j + 2].c === ']' && !items[j + 2].q)) {
      const lo = it.c, hi = items[j + 2].c;
      if (lo <= hi) src += classEsc(lo) + '-' + classEsc(hi);
      j += 3; continue;
    }
    src += classEsc(it.c);
    j++;
  }
  return null;
}

function hasGlob(items) {
  return items.some(it => !it.q && (it.c === '*' || it.c === '?' || it.c === '['));
}
function compRegex(items) {
  let s = '^';
  for (let k = 0; k < items.length; k++) {
    const it = items[k];
    if (it.q) { s += escRe(it.c); continue; }
    if (it.c === '*') s += '.*';
    else if (it.c === '?') s += '.';
    else if (it.c === '[') {
      const b = bracketFromItems(items, k, '!^');
      if (b) { s += b.src; k = b.end; } else s += '\\[';
    } else s += escRe(it.c);
  }
  return new RegExp(s + '$');
}
function joinPath(a, b) { return a === '/' ? '/' + b : a + '/' + b; }

function globExpand(items, sh) {
  const comps = [[]];
  for (const it of items) { if (it.c === '/') comps.push([]); else comps[comps.length - 1].push(it); }
  const absolute = items.length > 0 && items[0].c === '/';
  if (absolute) comps.shift();
  let trailing = false;
  if (comps.length > 1 && comps[comps.length - 1].length === 0) { trailing = true; comps.pop(); }
  let paths = [{ abs: absolute ? '/' : sh.cwd, parts: [] }];
  for (const comp of comps) {
    if (comp.length === 0) continue;
    const next = [];
    if (hasGlob(comp)) {
      const re = compRegex(comp);
      const dotOk = comp[0].c === '.';
      for (const p of paths) {
        const node = sh.fs.node(p.abs);
        if (!node || node.type !== 'dir') continue;
        for (const name of Object.keys(node.children).sort(codepointCmp)) {
          if (name.startsWith('.') && !dotOk) continue;
          if (re.test(name)) next.push({ abs: joinPath(p.abs, name), parts: p.parts.concat(name) });
        }
      }
    } else {
      const lit = comp.map(it => it.c).join('');
      for (const p of paths) next.push({ abs: sh.fs.resolve(lit, p.abs), parts: p.parts.concat(lit) });
    }
    paths = next;
  }
  const res = [];
  for (const p of paths) {
    const node = sh.fs.node(p.abs);
    if (!node) continue;
    if (trailing && node.type !== 'dir') continue;
    res.push((absolute ? '/' : '') + p.parts.join('/') + (trailing ? '/' : ''));
  }
  return res.length ? res.sort(codepointCmp) : null;
}

// ============================================================
//  Les commandes
// ============================================================
const COMMANDS = {};
const HELP = {};

// Commandes réelles absentes de ce terminal : réponse honnête, pas « not found ».
const ABSENTES = ['nano', 'vi', 'vim', 'emacs', 'ssh', 'scp', 'sudo', 'su', 'apt', 'apt-get', 'apk', 'ping',
  'curl', 'wget', 'python', 'python3', 'gcc', 'make', 'ln', 'sleep', 'top', 'htop', 'nohup', 'bg', 'fg',
  'jobs', 'chown', 'chgrp', 'passwd', 'useradd', 'tar', 'zip', 'unzip', 'gzip', 'git', 'awk', 'sed', 'diff',
  'cmp', 'xargs', 'tee', 'printf', 'seq', 'basename', 'dirname', 'realpath', 'readlink', 'id', 'groups',
  'uname', 'hostname', 'free', 'uptime', 'watch', 'killall', 'pkill', 'pgrep', 'mount', 'ifconfig', 'ip',
  'netstat', 'ss', 'read', 'set', 'test', '[', 'eval', 'exec', 'declare', 'local', 'shopt', 'umask'];

function readInput(io, cmd) {
  if (io.stdin !== null) return io.stdin;
  io.err(`${cmd} : sans nom de fichier, ${cmd} lit le clavier jusqu'à Ctrl+D. Ce terminal d'entraînement ` +
    `ne sait pas attendre une saisie : donne un fichier (${cmd} fichier) ou utilise un tube (… | ${cmd}).\n`);
  return null;
}
// Lit le contenu des opérandes (ou l'entrée standard) ; « - » = entrée standard.
function readSources(sh, io, cmd, operands, errFmt) {
  const out = [];
  let ok = true;
  if (operands.length === 0) operands = ['-'];
  for (const op of operands) {
    if (op === '-') {
      const s = readInput(io, cmd);
      if (s === null) { ok = false; continue; }
      out.push({ name: '-', content: s, regular: false });
      continue;
    }
    const node = sh.fs.node(sh.fs.resolve(op, sh.cwd));
    if (!node) { io.err((errFmt || `${cmd}: %s: No such file or directory\n`).replace('%s', op)); ok = false; continue; }
    if (node.type === 'dir') { io.err(`${cmd}: ${op}: Is a directory\n`); ok = false; continue; }
    out.push({ name: op, content: node.content || '', regular: !node.dev, bin: node.bin });
  }
  return { sources: out, ok };
}

// ---------- pwd, cd, echo ----------
COMMANDS.pwd = (args, io, sh) => {
  const g = getopts('pwd', args, { flags: 'LP' }, io); if (!g) return 2;
  io.out(sh.cwd + '\n'); return 0;
};
HELP.pwd = `Utilisation : pwd
Affiche le chemin complet du dossier où tu te trouves (print working directory).
`;

COMMANDS.cd = (args, io, sh) => {
  const ops = args.filter(a => a !== '-L' && a !== '-P' && a !== '--');
  if (ops.length > 1) { io.err('bash: cd: too many arguments\n'); return 1; }
  let target = ops[0];
  let print = false;
  if (target === undefined) target = sh.env.HOME;
  if (target === '-') {
    if (!sh.env.OLDPWD) { io.err('bash: cd: OLDPWD not set\n'); return 1; }
    target = sh.env.OLDPWD; print = true;
  }
  const abs = sh.fs.resolve(target, sh.cwd);
  const node = sh.fs.node(abs);
  if (!node) { io.err(`bash: cd: ${target}: No such file or directory\n`); return 1; }
  if (node.type !== 'dir') { io.err(`bash: cd: ${target}: Not a directory\n`); return 1; }
  sh.env.OLDPWD = sh.cwd;
  sh.cwd = abs;
  sh.env.PWD = abs;
  if (print) io.out(abs + '\n');
  return 0;
};
HELP.cd = `Utilisation : cd [DOSSIER]
Change de dossier courant (change directory).
  cd dossier   entrer dans un dossier
  cd ..        remonter d'un niveau
  cd           revenir au dossier personnel (~)
  cd ~         idem
  cd -         revenir au dossier précédent (et l'afficher)
`;

function echoEscapes(s) {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    if (s[i] !== '\\' || i + 1 >= s.length) { out += s[i]; continue; }
    const c = s[++i];
    const map = { n: '\n', t: '\t', '\\': '\\', a: CH(7), b: CH(8), r: '\r', v: CH(11), f: CH(12), e: CH(27) };
    if (c === 'c') return { out, stop: true };
    if (map[c] !== undefined) out += map[c];
    else out += '\\' + c;
  }
  return { out, stop: false };
}
COMMANDS.echo = (args, io) => {
  let nl = true, esc = false, k = 0;
  while (k < args.length && /^-[neE]+$/.test(args[k])) {
    for (const c of args[k].slice(1)) { if (c === 'n') nl = false; if (c === 'e') esc = true; if (c === 'E') esc = false; }
    k++;
  }
  let s = args.slice(k).join(' ');
  if (esc) { const r = echoEscapes(s); s = r.out; if (r.stop) nl = false; }
  io.out(s + (nl ? '\n' : ''));
  return 0;
};
HELP.echo = `Utilisation : echo [-n] [-e] [TEXTE]...
Affiche le texte. Avec > ou >>, l'écrit dans un fichier.
  -n   pas de retour à la ligne final
  -e   interpréter \\n (retour à la ligne) et \\t (tabulation)
Exemples : echo bonjour     echo $HOME     echo "note" >> journal.txt
`;

// ---------- ls ----------
function lsDate(t) {
  const d = new Date(t);
  const six = 182 * 864e5;
  if (Math.abs(Date.now() - t) < six) return `${MOIS[d.getMonth()]} ${String(d.getDate()).padStart(2, ' ')} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
  return `${MOIS[d.getMonth()]} ${String(d.getDate()).padStart(2, ' ')}  ${d.getFullYear()}`;
}
function linkCount(n) {
  if (n.type !== 'dir') return 1;
  return 2 + Object.values(n.children).filter(c => c.type === 'dir').length;
}
function columnsLayout(names, width) {
  if (!names.length) return '';
  const n = names.length;
  const len = s => [...s].length;
  let best = null;
  for (let cols = n; cols >= 1; cols--) {
    const rows = Math.ceil(n / cols);
    if ((cols - 1) * rows >= n) continue;
    const ws = [];
    for (let c = 0; c < cols; c++) {
      let m = 0;
      for (let r = 0; r < rows; r++) { const k = c * rows + r; if (k < n) m = Math.max(m, len(names[k])); }
      ws.push(m);
    }
    const total = ws.reduce((a, w) => a + w, 0) + 2 * (cols - 1);
    if (total <= width || cols === 1) { best = { cols, rows, ws }; break; }
  }
  let out = '';
  for (let r = 0; r < best.rows; r++) {
    let line = '';
    for (let c = 0; c < best.cols; c++) {
      const k = c * best.rows + r;
      if (k >= n) continue;
      const isLast = (c === best.cols - 1) || ((c + 1) * best.rows + r >= n);
      line += isLast ? names[k] : names[k] + ' '.repeat(best.ws[c] - len(names[k]) + 2);
    }
    out += line + '\n';
  }
  return out;
}
COMMANDS.ls = (args, io, sh) => {
  const g = getopts('ls', args, {
    flags: 'aAlhR1drtSF',
    long: { all: 'a', 'almost-all': 'A', 'human-readable': 'h', recursive: 'R', directory: 'd', reverse: 'r', classify: 'F' },
    ignore: ['color'], code: 2,
  }, io);
  if (!g) return 2;
  const o = g.opts;
  const ops = g.operands.length ? g.operands : ['.'];
  const fs = sh.fs;
  const sorter = (arr) => {
    arr.sort((x, y) => codepointCmp(x.name, y.name));
    if (o.t) arr.sort((x, y) => (y.node.mtime - x.node.mtime) || codepointCmp(x.name, y.name));
    if (o.S) arr.sort((x, y) => (fs.size(y.node) - fs.size(x.node)) || codepointCmp(x.name, y.name));
    if (o.r) arr.reverse();
    return arr;
  };
  const suffix = (n) => !o.F ? '' : (n.type === 'dir' ? '/' : ((n.mode & 0o111) && !n.dev ? '*' : ''));
  const format = (entries) => {
    if (o.l) {
      const rows = entries.map(e => {
        const n = e.node;
        const size = n.dev ? '1, 3' : (o.h ? human(fs.size(n)) : String(fs.size(n)));
        return { mode: modeString(n), links: String(linkCount(n)), size, date: lsDate(n.mtime), name: e.name + suffix(n) };
      });
      const wl = Math.max(0, ...rows.map(r => r.links.length));
      const ws = Math.max(0, ...rows.map(r => r.size.length));
      return rows.map(r => `${r.mode} ${r.links.padStart(wl)} root root ${r.size.padStart(ws)} ${r.date} ${r.name}\n`).join('');
    }
    const names = entries.map(e => e.name + suffix(e.node));
    if (o['1'] || !io.tty) return names.map(x => x + '\n').join('');
    return columnsLayout(names, sh.columns || 80);
  };
  const files = [], dirs = [];
  let code = 0;
  for (const op of ops) {
    const node = fs.node(fs.resolve(op, sh.cwd));
    if (!node) { io.err(`ls: cannot access '${op}': No such file or directory\n`); code = 2; continue; }
    if (node.type === 'dir' && !o.d) dirs.push({ name: op, node }); else files.push({ name: op, node });
  }
  let first = true;
  if (files.length) { io.out(format(sorter(files))); first = false; }
  const header = ops.length > 1 || o.R;
  const listDir = (name, node) => {
    if (!first) io.out('\n');
    first = false;
    if (header) io.out(name + ':\n');
    let entries = Object.keys(node.children).map(k => ({ name: k, node: node.children[k] }));
    if (!o.a && !o.A) entries = entries.filter(e => !e.name.startsWith('.'));
    sorter(entries);
    if (o.a) {
      const parentNode = fs.node(fs.resolve(name + '/..', sh.cwd)) || node;
      entries = (o.r ? [] : [{ name: '.', node }, { name: '..', node: parentNode }]).concat(entries)
        .concat(o.r ? [{ name: '..', node: parentNode }, { name: '.', node }] : []);
    }
    if (o.l) {
      const tot = entries.reduce((a, e) => a + fs.blocksK(e.node), 0);
      io.out(`total ${o.h ? human(tot * 1024) : tot}\n`);
    }
    io.out(format(entries));
    if (o.R) {
      for (const e of entries) {
        if (e.node.type === 'dir' && e.name !== '.' && e.name !== '..') listDir(joinPath(name, e.name), e.node);
      }
    }
  };
  for (const d of sorter(dirs)) listDir(d.name, d.node);
  return code;
};
HELP.ls = `Utilisation : ls [OPTION]... [FICHIER]...
Liste le contenu d'un dossier (le dossier courant par défaut).

  -a, --all      afficher aussi les fichiers cachés (ceux dont le nom
                 commence par un point .), et . et ..
  -A             comme -a, sans . et ..
  -l             format détaillé : droits, liens, propriétaire, taille, date, nom
  -h             avec -l : tailles lisibles (4.0K, 12M…)
  -R             lister aussi les sous-dossiers, récursivement
  -d             lister le dossier lui-même, pas son contenu
  -1             un nom par ligne
  -t             trier par date (le plus récent d'abord)
  -S             trier par taille (le plus gros d'abord)
  -r             inverser l'ordre de tri
  -F             ajouter / aux dossiers et * aux exécutables
      --help     afficher cette aide

Exemples : ls -la     ls *.txt     ls -lh logs/
`;

// ---------- cat, head, tail, wc ----------
COMMANDS.cat = (args, io, sh) => {
  const g = getopts('cat', args, { flags: 'nbE', long: { number: 'n', 'number-nonblank': 'b', 'show-ends': 'E' } }, io);
  if (!g) return 1;
  const { sources, ok } = readSources(sh, io, 'cat', g.operands);
  let num = 1;
  for (const s of sources) {
    if (s.bin) { io.err(`cat : ${s.name} est un programme (fichier binaire) : ce terminal d'entraînement n'en affiche pas le contenu.\n`); continue; }
    let c = s.content;
    if (g.opts.n || g.opts.b || g.opts.E) {
      const ls = c.split('\n');
      const endsNl = c.endsWith('\n');
      if (endsNl) ls.pop();
      c = ls.map(l => {
        let x = g.opts.E ? l + '$' : l;
        if (g.opts.b ? l !== '' : g.opts.n) x = String(num++).padStart(6) + '\t' + x;
        return x;
      }).join('\n') + (endsNl ? '\n' : '');
    }
    io.out(c);
  }
  return ok ? 0 : 1;
};
HELP.cat = `Utilisation : cat [OPTION]... [FICHIER]...
Affiche le contenu d'un ou plusieurs fichiers texte (les met bout à bout).
Sans fichier, recopie l'entrée standard (utile après un tube |).
  -n   numéroter toutes les lignes
  -b   numéroter les lignes non vides
  -E   afficher $ en fin de ligne
Exemples : cat message.txt     cat *.log | grep -i erreur
`;

function headTail(which) {
  return (args, io, sh) => {
    const g = getopts(which, args, { flags: 'qv', arg: 'nc', longArg: { lines: 'n', bytes: 'c' }, digits: true }, io);
    if (!g) return 1;
    if (g.opts.f !== undefined) { io.err(optInconnue(which, '-f')); return 1; }
    let n = 10, fromStart = false;
    let spec = g.opts.n !== undefined ? g.opts.n : g.opts.num;
    if (spec !== undefined) {
      if (which === 'tail' && String(spec).startsWith('+')) { fromStart = true; spec = String(spec).slice(1); }
      if (!/^\d+$/.test(String(spec))) { io.err(`${which}: invalid number of lines: '${spec}'\n`); return 1; }
      n = parseInt(spec, 10);
    }
    const { sources, ok } = readSources(sh, io, which, g.operands, `${which}: cannot open '%s' for reading: No such file or directory\n`);
    const multi = sources.length > 1 || g.opts.v;
    let first = true;
    for (const s of sources) {
      if (multi && !g.opts.q) { io.out((first ? '' : '\n') + `==> ${s.name === '-' ? 'standard input' : s.name} <==\n`); }
      first = false;
      if (g.opts.c !== undefined) {
        const k = parseInt(g.opts.c, 10);
        io.out(which === 'head' ? s.content.slice(0, k) : s.content.slice(-k));
        continue;
      }
      const ls = lines(s.content);
      const endsNl = s.content.endsWith('\n');
      let sel;
      if (which === 'head') sel = ls.slice(0, n);
      else sel = fromStart ? ls.slice(Math.max(0, n - 1)) : (n === 0 ? [] : ls.slice(-n));
      if (!sel.length) continue;
      const lastIsFileEnd = which === 'tail' || sel.length === ls.length;
      io.out(sel.join('\n') + ((lastIsFileEnd && !endsNl) ? '' : '\n'));
    }
    return ok ? 0 : 1;
  };
}
COMMANDS.head = headTail('head');
COMMANDS.tail = headTail('tail');
HELP.head = `Utilisation : head [OPTION]... [FICHIER]...
Affiche le début d'un fichier (10 premières lignes par défaut).
  -n N, -N   afficher les N premières lignes
  -c N       afficher les N premiers octets
Exemples : head -n 3 access.log     cat access.log | head -2
`;
HELP.tail = `Utilisation : tail [OPTION]... [FICHIER]...
Affiche la fin d'un fichier (10 dernières lignes par défaut).
  -n N, -N   afficher les N dernières lignes
  -n +N      afficher à partir de la ligne N
  -c N       afficher les N derniers octets
(-f, suivre un fichier qui grossit, n'existe pas dans ce terminal d'entraînement.)
`;

COMMANDS.wc = (args, io, sh) => {
  const g = getopts('wc', args, { flags: 'lwcm', long: { lines: 'l', words: 'w', bytes: 'c', chars: 'm' } }, io);
  if (!g) return 1;
  const o = g.opts;
  const any = o.l || o.w || o.c || o.m;
  const cols = [];
  if (o.l || !any) cols.push('l');
  if (o.w || !any) cols.push('w');
  if (o.m) cols.push('m');
  if (o.c || !any) cols.push('c');
  const { sources, ok } = readSources(sh, io, 'wc', g.operands, 'wc: %s: No such file or directory\n');
  const stat = (c) => ({
    l: (c.match(/\n/g) || []).length,
    w: c.split(/[ \t\n\r\f\v]+/).filter(Boolean).length,
    c: utf8len(c), m: [...c].length,
  });
  const rows = sources.map(s => ({ name: s.name === '-' && g.operands.length === 0 ? '' : s.name, st: stat(s.content), regular: s.regular }));
  const tot = { l: 0, w: 0, c: 0, m: 0 };
  for (const r of rows) for (const k of Object.keys(tot)) tot[k] += r.st[k];
  let width;
  if (cols.length === 1 && rows.length === 1) width = 1;
  else {
    const sum = rows.filter(r => r.regular).reduce((a, r) => a + r.st.c, 0);
    width = Math.max(1, String(sum).length);
    if (rows.some(r => !r.regular)) width = Math.max(width, 7);
  }
  const fmt = (st, name) => cols.map(k => String(st[k]).padStart(width)).join(' ') + (name ? ' ' + name : '') + '\n';
  for (const r of rows) io.out(fmt(r.st, r.name));
  if (rows.length > 1) io.out(fmt(tot, 'total'));
  return ok ? 0 : 1;
};
HELP.wc = `Utilisation : wc [OPTION]... [FICHIER]...
Compte les lignes, les mots et les octets (word count).
  -l   lignes seulement
  -w   mots seulement
  -c   octets seulement
  -m   caractères seulement
Exemples : wc -l access.log     cat access.log | grep REFUSE | wc -l
`;

// ---------- mkdir, touch, cp, mv, rm, rmdir ----------
COMMANDS.mkdir = (args, io, sh) => {
  const g = getopts('mkdir', args, { flags: 'pv', long: { parents: 'p', verbose: 'v' } }, io);
  if (!g) return 1;
  if (!g.operands.length) { io.err("mkdir: missing operand\nTry 'mkdir --help' for more information.\n"); return 1; }
  let code = 0;
  for (const t of g.operands) {
    const abs = sh.fs.resolve(t, sh.cwd);
    if (g.opts.p) {
      let cur = sh.fs.root, path = '';
      for (const seg of abs.split('/').filter(Boolean)) {
        path += '/' + seg;
        if (!cur.children[seg]) {
          cur.children[seg] = dir(seg);
          if (g.opts.v) io.out(`mkdir: created directory ${gq(path)}\n`);
        } else if (cur.children[seg].type !== 'dir') { io.err(`mkdir: cannot create directory ${gq(t)}: Not a directory\n`); code = 1; break; }
        cur = cur.children[seg];
      }
      continue;
    }
    const { parent, name } = sh.fs.parent(abs);
    if (!parent) { io.err(`mkdir: cannot create directory ${gq(t)}: No such file or directory\n`); code = 1; continue; }
    if (parent.type !== 'dir') { io.err(`mkdir: cannot create directory ${gq(t)}: Not a directory\n`); code = 1; continue; }
    if (parent.children[name] || abs === '/') { io.err(`mkdir: cannot create directory ${gq(t)}: File exists\n`); code = 1; continue; }
    parent.children[name] = dir(name);
    parent.mtime = Date.now();
    if (g.opts.v) io.out(`mkdir: created directory ${gq(t)}\n`);
  }
  return code;
};
HELP.mkdir = `Utilisation : mkdir [OPTION]... DOSSIER...
Crée un ou plusieurs dossiers (make directory).
  -p   créer aussi les dossiers parents manquants, sans erreur s'ils existent
  -v   dire chaque dossier créé
Exemples : mkdir archive     mkdir -p a/b/c
`;

COMMANDS.touch = (args, io, sh) => {
  const g = getopts('touch', args, { flags: 'c', long: { 'no-create': 'c' } }, io);
  if (!g) return 1;
  if (!g.operands.length) { io.err("touch: missing file operand\nTry 'touch --help' for more information.\n"); return 1; }
  let code = 0;
  for (const t of g.operands) {
    const abs = sh.fs.resolve(t, sh.cwd);
    const ex = sh.fs.node(abs);
    if (ex) { ex.mtime = Date.now(); continue; }
    if (g.opts.c) continue;
    const { parent, name } = sh.fs.parent(abs);
    if (!parent || parent.type !== 'dir' || t.endsWith('/')) {
      io.err(`touch: cannot touch '${t}': ${parent && parent.type !== 'dir' ? 'Not a directory' : 'No such file or directory'}\n`); code = 1; continue;
    }
    parent.children[name] = file(name, '');
    parent.mtime = Date.now();
  }
  return code;
};
HELP.touch = `Utilisation : touch [OPTION]... FICHIER...
Crée un fichier vide s'il n'existe pas ; sinon, met sa date à l'heure actuelle.
  -c   ne pas créer le fichier s'il n'existe pas
Exemple : touch agent.log
`;

function copyNode(n) {
  if (n.type === 'file') { const f = file(n.name, n.content, n.mode); if (n.dev) f.dev = n.dev; if (n.bin) f.bin = n.bin; return f; }
  const d = dir(n.name, n.mode);
  for (const k of Object.keys(n.children)) d.children[k] = copyNode(n.children[k]);
  return d;
}
function isInside(abs, maybeParent) { return abs === maybeParent || abs.startsWith(maybeParent === '/' ? '/' : maybeParent + '/'); }

function cpmv(which) {
  return (args, io, sh) => {
    const g = getopts(which, args, which === 'cp'
      ? { flags: 'rRvfa', long: { recursive: 'r', verbose: 'v', force: 'f', archive: 'a' } }
      : { flags: 'vf', long: { verbose: 'v', force: 'f' } }, io);
    if (!g) return 1;
    const ops = g.operands;
    if (ops.length === 0) { io.err(`${which}: missing file operand\nTry '${which} --help' for more information.\n`); return 1; }
    if (ops.length === 1) { io.err(`${which}: missing destination file operand after '${ops[0]}'\nTry '${which} --help' for more information.\n`); return 1; }
    const recursive = which === 'mv' || g.opts.r || g.opts.R || g.opts.a;
    const dest = ops[ops.length - 1];
    const srcs = ops.slice(0, -1);
    const destAbs = sh.fs.resolve(dest, sh.cwd);
    const destNode = sh.fs.node(destAbs);
    if (srcs.length > 1 && (!destNode || destNode.type !== 'dir')) {
      io.err(`${which}: target '${dest}': ${destNode ? 'Not a directory' : 'No such file or directory'}\n`); return 1;
    }
    let code = 0;
    for (const src of srcs) {
      const sAbs = sh.fs.resolve(src, sh.cwd);
      const sNode = sh.fs.node(sAbs);
      if (!sNode) { io.err(`${which}: cannot stat '${src}': No such file or directory\n`); code = 1; continue; }
      if (sNode.type === 'dir' && !recursive) { io.err(`cp: -r not specified; omitting directory '${src}'\n`); code = 1; continue; }
      let tParent, tName, tAbs;
      if (destNode && destNode.type === 'dir') { tParent = destNode; tName = sNode.name === '/' ? '' : sAbs.split('/').pop(); tAbs = joinPath(destAbs, tName); }
      else {
        const pp = sh.fs.parent(destAbs);
        if (!pp.parent || pp.parent.type !== 'dir' || dest.endsWith('/')) {
          io.err(which === 'cp' ? `cp: cannot create regular file '${dest}': ${dest.endsWith('/') ? 'Not a directory' : 'No such file or directory'}\n`
            : `mv: cannot move '${src}' to '${dest}': No such file or directory\n`);
          code = 1; continue;
        }
        tParent = pp.parent; tName = pp.name; tAbs = destAbs;
      }
      if (tAbs === sAbs) { io.err(`${which}: '${src}' and '${which === 'cp' ? dest : tAbs === destAbs ? dest : dest + '/' + tName}' are the same file\n`); code = 1; continue; }
      if (sNode.type === 'dir' && isInside(tAbs, sAbs)) {
        io.err(which === 'cp' ? `cp: cannot copy a directory, '${src}', into itself, '${dest}${destNode && destNode.type === 'dir' ? '/' + tName : ''}'\n`
          : `mv: cannot move '${src}' to a subdirectory of itself, '${dest}${destNode && destNode.type === 'dir' ? '/' + tName : ''}'\n`);
        code = 1; continue;
      }
      const existing = tParent.children[tName];
      if (existing && existing.type === 'dir' && sNode.type !== 'dir') {
        io.err(`${which}: cannot overwrite directory '${dest}${destNode && destNode.type === 'dir' ? '/' + tName : ''}' with non-directory\n`); code = 1; continue;
      }
      if (existing && existing.type !== 'dir' && sNode.type === 'dir') {
        io.err(`${which}: cannot overwrite non-directory '${dest}${destNode && destNode.type === 'dir' ? '/' + tName : ''}' with directory '${src}'\n`); code = 1; continue;
      }
      if (which === 'cp') {
        if (existing && existing.type === 'file' && sNode.type === 'file') {
          existing.content = sNode.content; existing.mtime = Date.now();
        } else {
          const c = copyNode(sNode); c.name = tName;
          if (!g.opts.a) { c.mtime = Date.now(); }
          tParent.children[tName] = c;
        }
      } else {
        const sp = sh.fs.parent(sAbs);
        delete sp.parent.children[sp.name];
        sNode.name = tName;
        tParent.children[tName] = sNode;
        sp.parent.mtime = Date.now();
      }
      tParent.mtime = Date.now();
      if (g.opts.v) io.out(which === 'cp' ? `'${src}' -> '${destNode && destNode.type === 'dir' ? joinPath(dest, tName) : dest}'\n`
        : `renamed '${src}' -> '${destNode && destNode.type === 'dir' ? joinPath(dest, tName) : dest}'\n`);
    }
    return code;
  };
}
COMMANDS.cp = cpmv('cp');
COMMANDS.mv = cpmv('mv');
HELP.cp = `Utilisation : cp [OPTION]... SOURCE... DESTINATION
Copie des fichiers (copy). Si DESTINATION est un dossier, la copie y garde son nom.
  -r, -R   copier un dossier et tout son contenu
  -v       dire chaque copie
Exemples : cp rapport.txt exfiltration/     cp *.txt archive/     cp -r logs sauvegarde
`;
HELP.mv = `Utilisation : mv [OPTION]... SOURCE... DESTINATION
Déplace ou renomme des fichiers et des dossiers (move).
  -v   dire chaque déplacement
Exemples : mv a.txt b.txt (renommer)     mv a.txt archive/ (déplacer)
`;

COMMANDS.rm = (args, io, sh) => {
  const g = getopts('rm', args, { flags: 'rRfvd', long: { recursive: 'r', force: 'f', verbose: 'v', dir: 'd' } }, io);
  if (!g) return 1;
  const o = g.opts;
  if (!g.operands.length) { if (o.f) return 0; io.err("rm: missing operand\nTry 'rm --help' for more information.\n"); return 1; }
  let code = 0;
  const rec = o.r || o.R;
  for (const t of g.operands) {
    const abs = sh.fs.resolve(t, sh.cwd);
    const base = t.replace(/\/+$/, '').split('/').pop();
    if (base === '.' || base === '..') { io.err(`rm: refusing to remove '.' or '..' directory: skipping '${t}'\n`); code = 1; continue; }
    if (abs === '/') { io.err("rm: it is dangerous to operate recursively on '/'\nrm: use --no-preserve-root to override this failsafe\n"); code = 1; continue; }
    const node = sh.fs.node(abs);
    if (!node) { if (!o.f) { io.err(`rm: cannot remove '${t}': No such file or directory\n`); code = 1; } continue; }
    if (node.type === 'dir' && !rec) {
      if (o.d && Object.keys(node.children).length === 0) { /* rm -d dossier vide */ }
      else { io.err(`rm: cannot remove '${t}': Is a directory\n`); code = 1; continue; }
    }
    if (isInside(sh.cwd, abs) && node.type === 'dir') { /* bash le permet : on supprime quand même */ }
    const { parent, name } = sh.fs.parent(abs);
    delete parent.children[name];
    parent.mtime = Date.now();
    if (o.v) io.out(node.type === 'dir' ? `removed directory '${t}'\n` : `removed '${t}'\n`);
  }
  return code;
};
HELP.rm = `Utilisation : rm [OPTION]... FICHIER...
Supprime des fichiers (remove). ATTENTION : pas de corbeille, c'est définitif.
  -r, -R   supprimer un dossier et tout son contenu
  -f       ne rien demander, ignorer les fichiers absents
  -v       dire chaque suppression
Exemples : rm brouillon.txt     rm *.tmp     rm -r vieux_dossier
`;

COMMANDS.rmdir = (args, io, sh) => {
  const g = getopts('rmdir', args, { flags: 'v', long: { verbose: 'v' } }, io);
  if (!g) return 1;
  if (!g.operands.length) { io.err("rmdir: missing operand\nTry 'rmdir --help' for more information.\n"); return 1; }
  let code = 0;
  for (const t of g.operands) {
    const abs = sh.fs.resolve(t, sh.cwd);
    const node = sh.fs.node(abs);
    if (!node) { io.err(`rmdir: failed to remove '${t}': No such file or directory\n`); code = 1; continue; }
    if (node.type !== 'dir') { io.err(`rmdir: failed to remove '${t}': Not a directory\n`); code = 1; continue; }
    if (Object.keys(node.children).length) { io.err(`rmdir: failed to remove '${t}': Directory not empty\n`); code = 1; continue; }
    const { parent, name } = sh.fs.parent(abs);
    delete parent.children[name];
    if (g.opts.v) io.out(`rmdir: removing directory, '${t}'\n`);
  }
  return code;
};
HELP.rmdir = `Utilisation : rmdir DOSSIER...
Supprime un dossier VIDE. Pour un dossier plein : rm -r.
`;

// ---------- chmod, stat, file ----------
function applySymbolic(mode, spec) {
  const m = /^([ugoa]*)([+\-=])([rwx]*)$/.exec(spec);
  if (!m) return null;
  const whoGiven = m[1] !== '';
  const who = (!whoGiven || m[1].includes('a')) ? 'ugo' : m[1];
  let bits = 0;
  if (m[3].includes('r')) bits |= 4;
  if (m[3].includes('w')) bits |= 2;
  if (m[3].includes('x')) bits |= 1;
  const sh = { u: 6, g: 3, o: 0 };
  let mask = 0;
  for (const w of new Set(who)) mask |= bits << sh[w];
  let clear = 0;
  for (const w of new Set(who)) clear |= 7 << sh[w];
  if (!whoGiven) mask &= ~0o022; // le masque (umask 022) s'applique sans u/g/o/a
  if (m[2] === '+') return mode | mask;
  if (m[2] === '-') return mode & ~mask;
  return (mode & ~(whoGiven ? clear : 0o777)) | mask;
}
COMMANDS.chmod = (args, io, sh) => {
  // chmod accepte des modes qui ressemblent à des options (-x, -w…)
  let rec = false, verbose = false;
  const rest = [];
  for (const a of args) {
    if (a === '-R' || a === '--recursive') rec = true;
    else if (a === '-v' || a === '--verbose') verbose = true;
    else if (/^-[^rwxugoa=+-]/.test(a)) { io.err(optInconnue('chmod', a)); return 1; }
    else rest.push(a);
  }
  if (rest.length === 0) { io.err("chmod: missing operand\nTry 'chmod --help' for more information.\n"); return 1; }
  if (rest.length === 1) { io.err(`chmod: missing operand after ${gq(rest[0])}\nTry 'chmod --help' for more information.\n`); return 1; }
  const spec = rest[0];
  const compute = (mode) => {
    if (/^[0-7]{1,4}$/.test(spec)) return parseInt(spec, 8) & 0o777;
    let m = mode;
    for (const part of spec.split(',')) { m = applySymbolic(m, part); if (m === null) return null; }
    return m;
  };
  if (compute(0o644) === null) { io.err(`chmod: invalid mode: ${gq(spec)}\nTry 'chmod --help' for more information.\n`); return 1; }
  let code = 0;
  const apply = (node, name) => {
    const old = node.mode & 0o777;
    node.mode = compute(old);
    if (verbose) io.out(`mode of '${name}' ${old === node.mode ? 'retained as' : 'changed from'} ${old.toString(8).padStart(4, '0')} (${modeString({ ...node, mode: old }).slice(1)})${old === node.mode ? '' : ` to ${node.mode.toString(8).padStart(4, '0')} (${modeString(node).slice(1)})`}\n`);
    if (rec && node.type === 'dir') for (const k of Object.keys(node.children).sort(codepointCmp)) apply(node.children[k], joinPath(name, k));
  };
  for (const t of rest.slice(1)) {
    const node = sh.fs.node(sh.fs.resolve(t, sh.cwd));
    if (!node) { io.err(`chmod: cannot access '${t}': No such file or directory\n`); code = 1; continue; }
    apply(node, t);
  }
  return code;
};
HELP.chmod = `Utilisation : chmod DROITS FICHIER...
Modifie les droits d'un fichier (change mode).
  Octal : r=4  w=2  x=1, additionnés pour Utilisateur, Groupe, Autres.
          chmod 600 f  →  rw-------  (seul le propriétaire lit et écrit)
          chmod 755 f  →  rwxr-xr-x
  Symbolique : u=utilisateur g=groupe o=autres a=tous ;
               + ajoute, - retire, = fixe ; r lire, w écrire, x exécuter.
          chmod u+x f      chmod go-w f      chmod a=r f
  -R   appliquer aussi au contenu d'un dossier
  -v   dire chaque changement
`;

function fileType(n) {
  if (n.type === 'dir') return 'directory';
  if (n.dev) return n.content === undefined ? 'empty' : 'regular file';
  if (n.content === '') return 'regular empty file';
  return 'regular file';
}
function fakeInode(path) { let h = 2166136261; for (const c of path) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) % 900000 + 100000; }
function statTime(t) {
  const d = new Date(t);
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3, '0')}000000 ${tzOffset(d)}`;
}
COMMANDS.stat = (args, io, sh) => {
  const g = getopts('stat', args, { flags: '', arg: 'c', longArg: { format: 'c' } }, io);
  if (!g) return 1;
  if (!g.operands.length) { io.err("stat: missing operand\nTry 'stat --help' for more information.\n"); return 1; }
  let code = 0;
  for (const t of g.operands) {
    const abs = sh.fs.resolve(t, sh.cwd);
    const n = sh.fs.node(abs);
    if (!n) { io.err(`stat: cannot statx '${t}': No such file or directory\n`); code = 1; continue; }
    const size = sh.fs.size(n);
    const blocks = sh.fs.blocksK(n) * 2;
    const type = n.dev ? 'character special file' : fileType(n);
    if (g.opts.c !== undefined) {
      const s = g.opts.c.replace(/%([aAnsFUGugyYhib%])/g, (m, c) => ({
        a: octal(n), A: modeString(n), n: t, s: String(size), F: type, U: 'root', G: 'root', u: '0', g: '0',
        y: statTime(n.mtime), Y: String(Math.floor(n.mtime / 1000)), h: String(linkCount(n)), i: String(fakeInode(abs)),
        b: String(blocks), '%': '%',
      })[c]);
      io.out(s + '\n');
      continue;
    }
    io.out(`  File: ${t}\n`);
    io.out(`  Size: ${String(size).padEnd(10)}\tBlocks: ${String(blocks).padEnd(10)} IO Block: 4096   ${type}\n`);
    io.out(`Device: 254,0\tInode: ${String(fakeInode(abs)).padEnd(11)} Links: ${linkCount(n)}\n`);
    io.out(`Access: (${(n.mode & 0o777).toString(8).padStart(4, '0')}/${modeString(n)})  Uid: (    0/    root)   Gid: (    0/    root)\n`);
    const ts = statTime(n.mtime);
    io.out(`Access: ${ts}\nModify: ${ts}\nChange: ${ts}\n Birth: ${ts}\n`);
  }
  return code;
};
HELP.stat = `Utilisation : stat [-c FORMAT] FICHIER...
Affiche tout ce que le système sait d'un fichier : taille, droits, dates…
  -c FORMAT   n'afficher que certains champs, par exemple :
              %a droits en octal (600)   %A droits en lettres (-rw-------)
              %s taille   %n nom   %F type   %y date de modification
Exemple : stat -c %a rapport_cache.txt
`;

COMMANDS.file = (args, io, sh) => {
  const g = getopts('file', args, { flags: 'b', long: { brief: 'b' } }, io);
  if (!g) return 1;
  if (!g.operands.length) { io.err('Usage: file [-bcCdEhikLlNnprsSvzZ0] [--apple] [--extension] [--mime-encoding]\n            [--mime-type] [-e <testname>] [-F <separator>]  [-f <namefile>]\n            [-m <magicfiles>] [-P <parameter=value>] [--exclude-quiet]\n            <file> ...\n       file -C [-m <magicfiles>]\n       file [--help]\n'); return 1; }
  const w = Math.max(...g.operands.map(x => x.length)) + 1;
  for (const t of g.operands) {
    const n = sh.fs.node(sh.fs.resolve(t, sh.cwd));
    let ty;
    if (!n) ty = `cannot open \`${t}' (No such file or directory)`;
    else if (n.type === 'dir') ty = 'directory';
    else if (n.dev) ty = 'character special (1/3)';
    else if (n.bin) ty = 'ELF 64-bit LSB pie executable, x86-64, dynamically linked';
    else if (n.content === '') ty = 'empty';
    else {
      const ascii = !/[^\x00-\x7f]/.test(n.content);
      const enc = ascii ? 'ASCII text' : 'Unicode text, UTF-8 text';
      if (/^#!\s*\/bin\/(ba)?sh\b/.test(n.content)) ty = (/^#!\s*\/bin\/bash/.test(n.content) ? 'Bourne-Again shell script, ' : 'POSIX shell script, ') + enc + ' executable';
      else if (/<html|<!doctype html/i.test(n.content)) ty = 'HTML document, ' + enc;
      else ty = enc;
    }
    io.out(g.opts.b ? ty + '\n' : (t + ':').padEnd(w) + ' ' + ty + '\n');
  }
  return 0;
};
HELP.file = `Utilisation : file [-b] FICHIER...
Devine le type d'un fichier d'après son contenu (texte, script, dossier…),
sans se fier à son extension.
  -b   ne pas répéter le nom du fichier
`;

// ---------- grep : expressions régulières de grep → JavaScript ----------
// Traduit une expression de base (BRE, ere=false) ou étendue (ERE, ere=true)
// au sens de GNU grep en une expression JavaScript. Lève une erreur au texte de grep.
function grepToJs(pat, ere, warn) {
  let out = '';
  let depth = 0;
  let atStart = true;  // début d'expression (ou après ( ou |)
  const n = pat.length;
  for (let i = 0; i < n; i++) {
    const c = pat[i];
    const wasStart = atStart;
    atStart = false;
    if (c === '\\') {
      if (i + 1 >= n) throw new Error('Trailing backslash');
      const d = pat[++i];
      if (!ere && d === '(') { out += '('; depth++; atStart = true; continue; }
      if (!ere && d === ')') { if (!depth) throw new Error('Unmatched ) or \\)'); out += ')'; depth--; continue; }
      if (!ere && d === '|') { out += '|'; atStart = true; continue; }
      if (!ere && (d === '+' || d === '?')) { out += wasStart ? escRe(d) : d; continue; }
      if (!ere && d === '{') {
        const j = pat.indexOf('\\}', i + 1);
        if (j < 0) throw new Error('Unmatched \\{');
        const body = pat.slice(i + 1, j);
        if (!/^\d*(,\d*)?$/.test(body) || body === '' || body === ',') throw new Error('Invalid content of \\{\\}');
        out += '{' + (body.startsWith(',') ? '0' + body : body) + '}';
        i = j + 1; continue;
      }
      if (/[1-9]/.test(d)) { out += '\\' + d; continue; }
      if (d === '<') { out += '\\b(?=\\w)'; continue; }
      if (d === '>') { out += '\\b(?<=\\w)'; continue; }
      if ('bBwWsS'.includes(d)) { out += '\\' + d; continue; }
      out += escRe(d);
      continue;
    }
    if (c === '[') {
      const items = [...pat.slice(i)].map(ch => ({ c: ch, q: false }));
      // dans grep, le \ est littéral entre crochets
      const b = bracketFromItems(items, 0, '^');
      if (!b) throw new Error('Unmatched [, [^, [:, [., or [=');
      out += b.src;
      i += b.end;
      continue;
    }
    if (c === '*') {
      if (wasStart) {
        if (ere) { warn('* at start of expression'); continue; }
        out += '\\*'; continue;
      }
      out += '*'; continue;
    }
    if (c === '^') {
      if (ere || wasStart) { out += '^'; atStart = true; continue; }
      out += '\\^'; continue;
    }
    if (c === '$') {
      const atEnd = i === n - 1 || (!ere && (pat.startsWith('\\)', i + 1) || pat.startsWith('\\|', i + 1)));
      if (ere || atEnd) { out += '$'; continue; }
      out += '\\$'; continue;
    }
    if (c === '.') { out += '.'; continue; }
    if (ere) {
      if (c === '(') { out += '('; depth++; atStart = true; continue; }
      if (c === ')') { if (!depth) { out += '\\)'; continue; } out += ')'; depth--; continue; }
      if (c === '|') { out += '|'; atStart = true; continue; }
      if (c === '+' || c === '?') { out += wasStart ? escRe(c) : c; continue; }
      if (c === '{') {
        const m = /^\{(\d*)(,(\d*))?\}/.exec(pat.slice(i));
        if (m && !(m[1] === '' && m[2] === undefined) && !wasStart) {
          out += '{' + (m[1] === '' ? '0' : m[1]) + (m[2] !== undefined ? ',' + m[3] : '') + '}';
          i += m[0].length - 1; continue;
        }
        out += '\\{'; continue;
      }
    }
    out += escRe(c);
  }
  if (depth) throw new Error('Unmatched ( or \\(');
  return out;
}

function walkFiles(sh, abs, shown, cb) {
  const node = sh.fs.node(abs);
  if (!node) return;
  if (node.type !== 'dir') { cb(shown, node); return; }
  for (const k of Object.keys(node.children).sort(codepointCmp)) {
    walkFiles(sh, joinPath(abs, k), shown === '' ? k : (shown.endsWith('/') ? shown + k : shown + '/' + k), cb);
  }
}

COMMANDS.grep = (args, io, sh) => {
  const g = getopts('grep', args, {
    flags: 'EFGivwxclLnhHoqsrRy', arg: 'eABCm', multi: 'e',
    long: { 'extended-regexp': 'E', 'fixed-strings': 'F', 'ignore-case': 'i', 'invert-match': 'v', 'word-regexp': 'w',
      'line-regexp': 'x', count: 'c', 'files-with-matches': 'l', 'files-without-match': 'L', 'line-number': 'n',
      'no-filename': 'h', 'with-filename': 'H', 'only-matching': 'o', quiet: 'q', silent: 'q', 'no-messages': 's',
      recursive: 'r', 'dereference-recursive': 'R' },
    longArg: { regexp: 'e', 'after-context': 'A', 'before-context': 'B', context: 'C', 'max-count': 'm' },
    ignore: ['color', 'colour'],
  }, io);
  if (!g) return 2;
  const o = g.opts;
  let ops = g.operands.slice();
  let patterns;
  if (o['@e']) patterns = o['@e'];
  else {
    if (!ops.length) { io.err("Usage: grep [OPTION]... PATTERNS [FILE]...\nTry 'grep --help' for more information.\n"); return 2; }
    patterns = [ops.shift()];
  }
  patterns = patterns.flatMap(p => p.split('\n'));
  const num = (v, name) => {
    if (v === undefined) return undefined;
    if (!/^\d+$/.test(v)) { io.err(`grep: ${v}: invalid context length argument\n`); return null; }
    return parseInt(v, 10);
  };
  let A = num(o.A !== undefined ? o.A : o.C), B = num(o.B !== undefined ? o.B : o.C);
  if (A === null || B === null) return 2;
  A = A || 0; B = B || 0;
  const maxCount = o.m !== undefined ? parseInt(o.m, 10) : Infinity;
  let re;
  try {
    const srcs = patterns.map(p => {
      if (o.F) return escRe(p);
      return grepToJs(p, !!o.E, (w) => io.err('grep: warning: ' + w + '\n'));
    });
    let src = srcs.length === 1 ? srcs[0] : srcs.map(s => '(?:' + s + ')').join('|');
    if (o.x) src = '^(?:' + src + ')$';
    else if (o.w) src = '(?<![A-Za-z0-9_])(?:' + src + ')(?![A-Za-z0-9_])';
    re = new RegExp(src, (o.i || o.y) ? 'i' : '');
  } catch (e) {
    const msg = /^(Unmatched|Trailing|Invalid)/.test(e.message) ? e.message : 'Invalid regular expression';
    io.err('grep: ' + msg + '\n');
    return 2;
  }
  const recursive = o.r || o.R;
  // Les fichiers à lire
  const files = [];
  let error = false;
  if (!ops.length) {
    if (recursive) { walkFiles(sh, sh.cwd, '', (name, node) => files.push({ name, node })); }
    else files.push({ name: '(standard input)', stdin: true });
  } else {
    for (const op of ops) {
      if (op === '-') { files.push({ name: '(standard input)', stdin: true }); continue; }
      const node = sh.fs.node(sh.fs.resolve(op, sh.cwd));
      if (!node) { if (!o.s) io.err(`grep: ${op}: No such file or directory\n`); error = true; continue; }
      if (node.type === 'dir') {
        if (!recursive) { if (!o.s) io.err(`grep: ${op}: Is a directory\n`); error = true; continue; }
        walkFiles(sh, sh.fs.resolve(op, sh.cwd), op, (name, nd) => files.push({ name, node: nd }));
        continue;
      }
      files.push({ name: op, node });
    }
  }
  const withName = o.H || (!o.h && (files.length > 1 || recursive || ops.length > 1));
  let anyMatch = false;
  let lastPrintedGlobal = false;
  for (const f of files) {
    let content;
    if (f.stdin) { content = readInput(io, 'grep'); if (content === null) { error = true; continue; } }
    else if (f.node.dev) content = '';
    else if (f.node.bin) { continue; }
    else content = f.node.content;
    const ls = lines(content);
    const sel = ls.map(l => re.test(l) !== !!o.v);
    let count = 0;
    const prefix = (idx, sep) => (withName ? f.name + sep : '') + (o.n ? (idx + 1) + sep : '');
    if (o.q) { if (sel.some(Boolean)) { anyMatch = true; break; } continue; }
    if (o.l || o.L) {
      const has = sel.some(Boolean);
      if (has) anyMatch = true;
      if (has === !!o.l) io.out(f.name + '\n');
      continue;
    }
    if (o.c) {
      count = Math.min(sel.filter(Boolean).length, maxCount);
      if (count) anyMatch = true;
      io.out((withName ? f.name + ':' : '') + count + '\n');
      continue;
    }
    let lastPrinted = -1, after = 0;
    for (let k = 0; k < ls.length; k++) {
      if (sel[k] && count < maxCount) {
        count++; anyMatch = true;
        const from = Math.max(lastPrinted + 1, k - B);
        if ((A || B) && lastPrintedGlobal && (lastPrinted === -1 ? true : from > lastPrinted + 1)) io.out('--\n');
        for (let j = from; j < k; j++) io.out(prefix(j, '-') + ls[j] + '\n');
        if (o.o) {
          const gre = new RegExp(re.source, re.flags + 'g');
          let m;
          if (!o.v) while ((m = gre.exec(ls[k])) !== null) {
            if (m[0] === '') { gre.lastIndex++; continue; }
            io.out(prefix(k, ':') + m[0] + '\n');
          }
        } else io.out(prefix(k, ':') + ls[k] + '\n');
        lastPrinted = k; lastPrintedGlobal = true;
        after = A;
      } else if (after > 0 && count <= maxCount) {
        if (!(count >= maxCount && sel[k])) { io.out(prefix(k, '-') + ls[k] + '\n'); lastPrinted = k; }
        after--;
      }
      if (count >= maxCount && after === 0) break;
    }
  }
  if (error && !(o.q && anyMatch)) return 2;
  return anyMatch ? 0 : 1;
};
HELP.grep = `Utilisation : grep [OPTION]... MOTIF [FICHIER]...
Affiche les lignes qui contiennent MOTIF (une expression régulière).
Sans fichier, lit l'entrée standard : commande | grep MOTIF

Expressions régulières (de base) :
  .      n'importe quel caractère        ^      début de ligne
  *      0 fois ou plus ce qui précède   $      fin de ligne
  [abc]  un caractère parmi a, b, c      [^0-9] un caractère qui n'est pas un chiffre
  [a-z]  une lettre minuscule            \\.     un vrai point
Avec -E (étendues), en plus : +  1 fois ou plus   ?  0 ou 1 fois
  a|b  a ou b    ( )  groupe    {2}  2 fois    {1,3}  de 1 à 3 fois
(sans -E, écrire \\+ \\? \\| \\( \\) \\{ \\})

Options :
  -i   ignorer majuscules/minuscules     -v   lignes qui NE contiennent PAS le motif
  -n   numéro de ligne                   -c   compter les lignes trouvées
  -l   seulement les noms de fichiers    -w   mot entier seulement
  -x   ligne entière seulement           -o   seulement la partie trouvée
  -r   chercher dans tout un dossier     -h/-H  cacher/montrer le nom du fichier
  -A N / -B N / -C N   N lignes après / avant / autour
  -E   expressions étendues   -F  texte simple (pas d'expression régulière)
  -e MOTIF  donner un motif (plusieurs possibles)   -q  silencieux   -m N  N lignes au plus
Code de retour : 0 trouvé, 1 rien trouvé, 2 erreur.

Exemples : grep Transfert access.log      grep -c REFUSE access.log
           grep -E "^2024.*(OK|REFUSE)" access.log      grep -rn "MIRAGE" .
`;

// ---------- find ----------
COMMANDS.find = (args, io, sh) => {
  let k = 0;
  const starts = [];
  while (k < args.length && !args[k].startsWith('-')) starts.push(args[k++]);
  if (!starts.length) starts.push('.');
  const tests = [];
  let maxdepth = Infinity, mindepth = 0, lastPred = null;
  for (; k < args.length; k++) {
    const a = args[k];
    const need = () => {
      if (k + 1 >= args.length) { io.err(`find: missing argument to \`${a}'\n`); throw 1; }
      return args[++k];
    };
    try {
      if (a.startsWith('-')) lastPred = a;
      if (a === '-name' || a === '-iname') {
        const pat = need();
        const re = compRegex([...pat].map(c => ({ c, q: false })));
        const rx = a === '-iname' ? new RegExp(re.source, 'i') : re;
        tests.push((n, base) => rx.test(base));
      } else if (a === '-type') {
        const t = need();
        if (t !== 'f' && t !== 'd') { io.err(optInconnue('find', '-type ' + t)); return 1; }
        tests.push(n => (t === 'f' ? n.type === 'file' && !n.dev : n.type === 'dir'));
      } else if (a === '-maxdepth') { maxdepth = parseInt(need(), 10); }
      else if (a === '-mindepth') { mindepth = parseInt(need(), 10); }
      else if (a === '-empty') { tests.push(n => (n.type === 'dir' ? Object.keys(n.children).length === 0 : n.content === '')); }
      else if (a === '-print') { /* par défaut */ }
      else if (!a.startsWith('-')) {
        io.err(`find: paths must precede expression: \`${a}'\nfind: possible unquoted pattern after predicate \`${lastPred}'?\n`);
        return 1;
      } else { io.err(optInconnue('find', a)); return 1; }
    } catch (e) { if (e === 1) return 1; throw e; }
  }
  let code = 0;
  for (const st of starts) {
    const abs = sh.fs.resolve(st, sh.cwd);
    const node = sh.fs.node(abs);
    if (!node) { io.err(`find: ${gq(st)}: No such file or directory\n`); code = 1; continue; }
    const walk = (n, shown, depth) => {
      const base = depth === 0 ? st.replace(/\/+$/, '').split('/').pop() || st : shown.split('/').pop();
      if (depth >= mindepth && tests.every(t => t(n, base))) io.out(shown + '\n');
      if (n.type === 'dir' && depth < maxdepth) {
        for (const c of Object.keys(n.children).sort(codepointCmp)) {
          walk(n.children[c], shown.endsWith('/') ? shown + c : shown + '/' + c, depth + 1);
        }
      }
    };
    walk(node, st, 0);
  }
  return code;
};
HELP.find = `Utilisation : find [DOSSIER...] [CRITÈRES]
Cherche des fichiers et des dossiers, dans tous les sous-dossiers.
  -name MOTIF    nom qui correspond au motif (jokers * ? [ ] : mettre le motif
                 entre guillemets, sinon le shell le développe avant find !)
  -iname MOTIF   idem sans tenir compte des majuscules
  -type f        fichiers seulement      -type d   dossiers seulement
  -maxdepth N    descendre de N niveaux au plus      -empty   vides seulement
Exemples : find . -name "*.txt"     find ~ -type d     find / -name rapport.txt
`;

// ---------- tree ----------
COMMANDS.tree = (args, io, sh) => {
  const g = getopts('tree', args, { flags: 'adf', arg: 'L', ignore: ['noreport'] }, io);
  if (!g) return 1;
  const o = g.opts;
  let L = Infinity;
  if (o.L !== undefined) {
    if (!/^\d+$/.test(o.L) || +o.L < 1) { io.err('tree: Invalid level, must be greater than 0.\n'); return 1; }
    L = +o.L;
  }
  const noreport = args.includes('--noreport');
  const ops = g.operands.length ? g.operands : ['.'];
  let nd = 0, nf = 0;
  for (const op of ops) {
    const abs = sh.fs.resolve(op, sh.cwd);
    const node = sh.fs.node(abs);
    if (!node || node.type !== 'dir') { io.out(`${op}  [error opening dir]\n`); continue; }
    io.out(op + '\n');
    const walk = (n, prefix, depth, path) => {
      let entries = Object.keys(n.children).sort(codepointCmp);
      if (!o.a) entries = entries.filter(e => !e.startsWith('.'));
      if (o.d) entries = entries.filter(e => n.children[e].type === 'dir');
      entries.forEach((e, idx) => {
        const last = idx === entries.length - 1;
        const c = n.children[e];
        const p = path.endsWith('/') ? path + e : path + '/' + e;
        io.out(prefix + (last ? '└── ' : '├── ') + (o.f ? p : e) + '\n');
        if (c.type === 'dir') { nd++; if (depth + 1 < L) walk(c, prefix + (last ? '    ' : '│   '), depth + 1, p); }
        else nf++;
      });
    };
    walk(node, '', 0, op);
  }
  if (!noreport) {
    io.out(`\n${nd} director${nd === 1 ? 'y' : 'ies'}` + (o.d ? '' : `, ${nf} file${nf === 1 ? '' : 's'}`) + '\n');
  }
  return 0;
};
HELP.tree = `Utilisation : tree [OPTION]... [DOSSIER]...
Dessine l'arborescence d'un dossier : ses sous-dossiers et ses fichiers.
  -a     montrer aussi les fichiers cachés
  -d     dossiers seulement
  -L N   descendre de N niveaux au plus
  -f     afficher le chemin complet de chaque élément
Exemples : tree     tree -L 2 ~     tree -a serveur
`;

// ---------- sort, uniq, cut, tr ----------
COMMANDS.sort = (args, io, sh) => {
  const g = getopts('sort', args, { flags: 'rnufb', arg: 'kt', long: { reverse: 'r', 'numeric-sort': 'n', unique: 'u', 'ignore-case': 'f' }, longArg: { key: 'k', 'field-separator': 't' } }, io);
  if (!g) return 2;
  const o = g.opts;
  const { sources, ok } = readSources(sh, io, 'sort', g.operands, 'sort: cannot read: %s: No such file or directory\n');
  if (!ok && !sources.length) return 2;
  let all = [];
  for (const s of sources) all = all.concat(lines(s.content));
  let kField = null;
  if (o.k !== undefined) {
    const m = /^(\d+)(?:,(\d+))?$/.exec(o.k);
    if (!m) { io.err(optInconnue('sort', '-k ' + o.k)); return 2; }
    kField = { from: +m[1], to: m[2] ? +m[2] : null };
  }
  const key = (l) => {
    if (!kField) return l;
    let fields;
    if (o.t !== undefined) fields = l.split(o.t);
    else { fields = []; const re = /\s*\S+/g; let m; while ((m = re.exec(l))) fields.push(m[0]); }
    const sl = fields.slice(kField.from - 1, kField.to ? kField.to : undefined);
    return sl.join(o.t !== undefined ? o.t : '');
  };
  const numv = (s) => { const m = /^\s*(-?\d+(?:\.\d+)?)/.exec(s); return m ? parseFloat(m[1]) : 0; };
  const cmp = (a, b) => {
    let ka = key(a), kb = key(b);
    if (o.b) { ka = ka.replace(/^\s+/, ''); kb = kb.replace(/^\s+/, ''); }
    let r;
    if (o.n) r = numv(ka) - numv(kb);
    else if (o.f) r = codepointCmp(ka.toUpperCase(), kb.toUpperCase());
    else r = codepointCmp(ka, kb);
    if (r === 0 && !o.u) r = codepointCmp(a, b);
    return o.r ? -r : r;
  };
  all.sort(cmp);
  if (o.u) all = all.filter((l, i) => i === 0 || cmp(all[i - 1], l) !== 0);
  io.out(all.map(l => l + '\n').join(''));
  return ok ? 0 : 2;
};
HELP.sort = `Utilisation : sort [OPTION]... [FICHIER]...
Trie les lignes (ordre des caractères : chiffres, majuscules, puis minuscules).
  -r     ordre inverse          -n   tri numérique (10 après 9)
  -u     supprimer les doublons -f   ignorer majuscules/minuscules
  -k N   trier selon le champ N (colonnes séparées par des espaces)
  -t C   séparateur de champs C (avec -k)
Exemples : sort noms.txt     cat access.log | sort -k4     sort -n nombres.txt
`;

COMMANDS.uniq = (args, io, sh) => {
  const g = getopts('uniq', args, { flags: 'cdui', long: { count: 'c', repeated: 'd', unique: 'u', 'ignore-case': 'i' } }, io);
  if (!g) return 1;
  const o = g.opts;
  const { sources, ok } = readSources(sh, io, 'uniq', g.operands.slice(0, 1));
  if (!ok) return 1;
  const ls = lines(sources[0].content);
  const eq = (a, b) => o.i ? a.toLowerCase() === b.toLowerCase() : a === b;
  let k = 0;
  while (k < ls.length) {
    let j = k + 1;
    while (j < ls.length && eq(ls[j], ls[k])) j++;
    const cnt = j - k;
    if ((!o.d || cnt > 1) && (!o.u || cnt === 1)) io.out((o.c ? String(cnt).padStart(7) + ' ' : '') + ls[k] + '\n');
    k = j;
  }
  return 0;
};
HELP.uniq = `Utilisation : uniq [OPTION]... [FICHIER]
Supprime les lignes répétées QUI SE SUIVENT. Pour toutes les supprimer : sort | uniq.
  -c   compter les répétitions     -d   seulement les lignes répétées
  -u   seulement les lignes uniques -i  ignorer majuscules/minuscules
Exemple : cut -d" " -f6 access.log | sort | uniq -c
`;

function parseList(spec) {
  const parts = [];
  for (const p of spec.split(',')) {
    const m = /^(\d*)-(\d*)$/.exec(p);
    if (m) { if (m[1] === '' && m[2] === '') return null; parts.push([m[1] === '' ? 1 : +m[1], m[2] === '' ? Infinity : +m[2]]); }
    else if (/^\d+$/.test(p) && +p > 0) parts.push([+p, +p]);
    else return null;
  }
  return parts;
}
COMMANDS.cut = (args, io, sh) => {
  const g = getopts('cut', args, { flags: 's', arg: 'dfcb', longArg: { delimiter: 'd', fields: 'f', characters: 'c', bytes: 'b' }, long: { 'only-delimited': 's' } }, io);
  if (!g) return 1;
  const o = g.opts;
  const spec = o.f !== undefined ? o.f : (o.c !== undefined ? o.c : o.b);
  if (spec === undefined) { io.err("cut: you must specify a list of bytes, characters, or fields\nTry 'cut --help' for more information.\n"); return 1; }
  const list = parseList(spec);
  if (!list) { io.err(`cut: invalid field value '${spec}'\nTry 'cut --help' for more information.\n`); return 1; }
  const inList = (i) => list.some(([a, b]) => i >= a && i <= b);
  const delim = o.d !== undefined ? o.d : '\t';
  if (o.d !== undefined && [...o.d].length !== 1) { io.err("cut: the delimiter must be a single character\nTry 'cut --help' for more information.\n"); return 1; }
  const { sources, ok } = readSources(sh, io, 'cut', g.operands);
  for (const s of sources) {
    for (const l of lines(s.content)) {
      if (o.f !== undefined) {
        if (!l.includes(delim)) { if (!o.s) io.out(l + '\n'); continue; }
        io.out(l.split(delim).filter((x, i) => inList(i + 1)).join(delim) + '\n');
      } else {
        io.out([...l].filter((x, i) => inList(i + 1)).join('') + '\n');
      }
    }
  }
  return ok ? 0 : 1;
};
HELP.cut = `Utilisation : cut OPTION... [FICHIER]...
Découpe chaque ligne et n'en garde qu'une partie.
  -d C     séparateur de champs C (une tabulation par défaut)
  -f LISTE champs à garder : 2   2,4   2-4   3-
  -c LISTE caractères à garder : 1-10
Exemples : cut -d" " -f1 access.log     cut -c1-10 access.log
`;

function trSet(spec) {
  const out = [];
  for (let i = 0; i < spec.length; i++) {
    const c = spec[i];
    if (c === '[' && spec[i + 1] === ':') {
      const j = spec.indexOf(':]', i + 2);
      if (j > 0) {
        const name = spec.slice(i + 2, j);
        const ranges = { lower: [['a', 'z']], upper: [['A', 'Z']], digit: [['0', '9']], alpha: [['A', 'Z'], ['a', 'z']],
          alnum: [['0', '9'], ['A', 'Z'], ['a', 'z']], space: null, blank: null, punct: null };
        if (name === 'space') { out.push(' ', '\t', '\n', '\r', CH(11), CH(12)); i = j + 1; continue; }
        if (name === 'blank') { out.push(' ', '\t'); i = j + 1; continue; }
        if (name === 'punct') { for (let k = 33; k < 127; k++) if (!/[A-Za-z0-9]/.test(CH(k))) out.push(CH(k)); i = j + 1; continue; }
        if (ranges[name]) { for (const [a, b] of ranges[name]) for (let k = a.charCodeAt(0); k <= b.charCodeAt(0); k++) out.push(CH(k)); i = j + 1; continue; }
        return { error: `tr: invalid character class '${name}'\n` };
      }
    }
    let ch = c;
    if (c === '\\' && i + 1 < spec.length) {
      const d = spec[++i];
      ch = { n: '\n', t: '\t', r: '\r', '\\': '\\' }[d] !== undefined ? { n: '\n', t: '\t', r: '\r', '\\': '\\' }[d] : d;
    }
    if (spec[i + 1] === '-' && i + 2 < spec.length) {
      const hi = spec[i + 2];
      if (hi < ch) return { error: `tr: range-endpoints of '${ch}-${hi}' are in reverse collating sequence order\n` };
      for (let k = ch.charCodeAt(0); k <= hi.charCodeAt(0); k++) out.push(CH(k));
      i += 2; continue;
    }
    out.push(ch);
  }
  return { chars: out };
}
COMMANDS.tr = (args, io, sh) => {
  const g = getopts('tr', args, { flags: 'dsc', long: { delete: 'd', 'squeeze-repeats': 's', complement: 'c' } }, io);
  if (!g) return 1;
  const o = g.opts, ops = g.operands;
  if (!ops.length) { io.err("tr: missing operand\nTry 'tr --help' for more information.\n"); return 1; }
  if (o.d && !o.s && ops.length > 1) { io.err(`tr: extra operand '${ops[1]}'\nOnly one string may be given when deleting without squeezing repeats.\nTry 'tr --help' for more information.\n`); return 1; }
  if (!o.d && !o.s && ops.length < 2) { io.err(`tr: missing operand after '${ops[0]}'\nTwo strings must be given when translating.\nTry 'tr --help' for more information.\n`); return 1; }
  if (ops.length > 2) { io.err(`tr: extra operand '${ops[2]}'\nTry 'tr --help' for more information.\n`); return 1; }
  const s1 = trSet(ops[0]); if (s1.error) { io.err(s1.error); return 1; }
  const s2 = ops[1] !== undefined ? trSet(ops[1]) : { chars: [] }; if (s2.error) { io.err(s2.error); return 1; }
  if (io.stdin === null) { readInput(io, 'tr'); return 1; }
  const set1 = new Set(s1.chars);
  const in1 = (c) => o.c ? !set1.has(c) : set1.has(c);
  let res = '';
  const map = new Map();
  if (!o.d && s2.chars.length) {
    s1.chars.forEach((c, i) => map.set(c, s2.chars[Math.min(i, s2.chars.length - 1)]));
  }
  for (const c of io.stdin) {
    if (o.d && in1(c)) continue;
    let x = c;
    if (!o.d && map.size && in1(c)) x = o.c ? s2.chars[s2.chars.length - 1] : map.get(c);
    res += x;
  }
  if (o.s) {
    const sq = new Set(o.d || ops.length > 1 ? s2.chars : s1.chars);
    let out = '';
    for (const c of res) { if (out.length && out[out.length - 1] === c && sq.has(c)) continue; out += c; }
    res = out;
  }
  io.out(res);
  return 0;
};
HELP.tr = `Utilisation : tr [OPTION]... ENSEMBLE1 [ENSEMBLE2]
Remplace ou supprime des caractères ; lit seulement l'entrée standard (… | tr).
  tr a-z A-Z     mettre en majuscules (ou tr '[:lower:]' '[:upper:]')
  -d ENSEMBLE    supprimer ces caractères      -s   fusionner les répétitions
Exemples : echo bonjour | tr a-z A-Z     cat f | tr -d '0-9'     tr -s ' ' < f
`;

// ---------- less, more, man ----------
function pagerCmd(name) {
  return (args, io, sh) => {
    const g = getopts(name, args, { flags: 'N' }, io);
    if (!g) return 1;
    let text = '';
    let ok = true;
    if (!g.operands.length) {
      if (io.stdin === null) { io.err(name === 'less' ? 'Missing filename ("less --help" for help)\n' : "more: bad usage\nTry 'more --help' for more information.\n"); return 1; }
      text = io.stdin;
    } else {
      for (const op of g.operands) {
        const n = sh.fs.node(sh.fs.resolve(op, sh.cwd));
        if (!n) { io.err(name === 'less' ? `${op}: No such file or directory\n` : `more: cannot open ${op}: No such file or directory\n`); ok = false; continue; }
        if (n.type === 'dir') { io.err(name === 'less' ? `${op} is a directory\n` : `\n*** ${op}: directory ***\n\n`); ok = false; continue; }
        text += n.content;
      }
    }
    if (g.opts.N) text = lines(text).map((l, i) => String(i + 1).padStart(7) + ' ' + l + '\n').join('');
    if (text) io.pager(text, g.operands.join(' ') || '(entrée standard)');
    return ok ? 0 : 1;
  };
}
COMMANDS.less = pagerCmd('less');
COMMANDS.more = pagerCmd('more');
HELP.less = `Utilisation : less [FICHIER]...
Affiche un long fichier page par page (un « pager »).
Dans le pager : Espace ou ▼ page suivante, b ou ▲ page précédente, q pour quitter.
  -N   numéroter les lignes
Exemples : less access.log     ls -la / | less
`;
HELP.more = HELP.less.replace(/less/g, 'more');

COMMANDS.man = (args, io) => {
  if (!args.length) { io.err("What manual page do you want?\nFor example, try 'man man'.\n"); return 1; }
  let code = 0;
  for (const c of args) {
    const key = c === 'source' ? '.' : c;
    if (HELP[key]) io.pager(HELP[key], 'man ' + c);
    else { io.err(`No manual entry for ${c}\n`); code = 16; }
  }
  return code;
};
HELP.man = `Utilisation : man COMMANDE
Affiche le manuel d'une commande (ici, une aide courte en français).
Même aide : COMMANDE --help
Exemples : man ls     man grep     man man
`;

// ---------- which, whoami, date, du, df, clear, true, false ----------
COMMANDS.which = (args, io, sh) => {
  const g = getopts('which', args, { flags: 'a' }, io);
  if (!g) return 1;
  let code = 0;
  for (const c of g.operands) {
    if (c.includes('/')) {
      const n = sh.fs.node(sh.fs.resolve(c, sh.cwd));
      if (n && n.type === 'file' && (n.mode & 0o111)) io.out(c + '\n'); else code = 1;
      continue;
    }
    if (EXTERNALS.includes(c)) { io.out('/usr/bin/' + c + '\n'); if (g.opts.a) io.out('/bin/' + c + '\n'); }
    else code = 1;
  }
  return code;
};
HELP.which = `Utilisation : which COMMANDE...
Dit où se trouve le programme d'une commande (par exemple /usr/bin/ls).
Ne dit rien pour une commande interne du shell, comme cd : essaie type cd.
`;
COMMANDS.whoami = (args, io) => { if (args.length) { io.err(`whoami: extra operand '${args[0]}'\nTry 'whoami --help' for more information.\n`); return 1; } io.out('root\n'); return 0; };
HELP.whoami = `Utilisation : whoami
Affiche le nom de l'utilisateur connecté (ici root, l'administrateur).
`;
COMMANDS.date = (args, io, sh) => {
  let utc = false, fmt = null;
  for (const a of args) {
    if (a === '-u' || a === '--utc') utc = true;
    else if (a.startsWith('+')) fmt = a.slice(1);
    else if (a.startsWith('-')) { io.err(optInconnue('date', a)); return 1; }
    else { io.err(`date : régler l'horloge (date ${a}) n'est pas possible dans ce terminal d'entraînement.\n`); return 1; }
  }
  let d = new Date(sh.now ? sh.now() : Date.now());
  if (utc) {
    const u = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
    const s = strftime(fmt === null ? '%a %b %e %H:%M:%S %Z %Y' : fmt, u).replace(/\b(EAT|CET|CEST|[+-]\d{2,4}|GMT[+-]\d+)\b/g, 'UTC');
    io.out(s + '\n'); return 0;
  }
  io.out(strftime(fmt === null ? '%a %b %e %H:%M:%S %Z %Y' : fmt, d) + '\n');
  return 0;
};
HELP.date = `Utilisation : date [-u] [+FORMAT]
Affiche la date et l'heure.
  -u        en temps universel (UTC)
  +FORMAT   choisir le format : %d jour, %m mois, %Y année, %H heure,
            %M minute, %S seconde, %A nom du jour, %F = %Y-%m-%d, %T = %H:%M:%S
Exemple : date +"%d/%m/%Y %H:%M"
`;
COMMANDS.du = (args, io, sh) => {
  const g = getopts('du', args, { flags: 'shac', long: { summarize: 's', 'human-readable': 'h', all: 'a', total: 'c' } }, io);
  if (!g) return 1;
  const o = g.opts;
  const ops = g.operands.length ? g.operands : ['.'];
  const fmt = (k) => o.h ? (k === 0 ? '0' : human(k * 1024)) : String(k);
  let grand = 0, code = 0;
  for (const op of ops) {
    const node = sh.fs.node(sh.fs.resolve(op, sh.cwd));
    if (!node) { io.err(`du: cannot access '${op}': No such file or directory\n`); code = 1; continue; }
    const walk = (n, shown, depth) => {
      let tot = sh.fs.blocksK(n);
      if (n.type === 'dir') {
        for (const c of Object.keys(n.children).sort(codepointCmp)) {
          tot += walk(n.children[c], shown.endsWith('/') ? shown + c : shown + '/' + c, depth + 1);
        }
        if (!o.s || depth === 0) io.out(fmt(tot) + '\t' + shown + '\n');
      } else if ((o.a && !o.s) || depth === 0) io.out(fmt(tot) + '\t' + shown + '\n');
      return tot;
    };
    grand += walk(node, op, 0);
  }
  if (o.c) io.out(fmt(grand) + '\ttotal\n');
  return code;
};
HELP.du = `Utilisation : du [OPTION]... [FICHIER]...
Mesure la place occupée sur le disque (disk usage), dossier par dossier.
  -s   seulement le total de chaque argument    -h   tailles lisibles (4.0K, 1.2M)
  -a   aussi chaque fichier                     -c   ajouter un total général
Exemple : du -sh ~/infiltration_mirage
`;
COMMANDS.df = (args, io) => {
  const g = getopts('df', args, { flags: 'hT', long: { 'human-readable': 'h' } }, io);
  if (!g) return 1;
  if (g.opts.h) {
    io.out('Filesystem      Size  Used Avail Use% Mounted on\n/dev/vda1        16G  2.1G   13G  14% /\ntmpfs           1.0G     0  1.0G   0% /tmp\n');
  } else {
    io.out('Filesystem     1K-blocks    Used Available Use% Mounted on\n/dev/vda1       16337788 2178664  13305636  15% /\ntmpfs            1048576       0   1048576   0% /tmp\n');
  }
  return 0;
};
HELP.df = `Utilisation : df [-h]
Affiche la place libre sur les disques (disk free).
  -h   tailles lisibles (16G, 2.1G…)
(Dans ce terminal d'entraînement, les valeurs sont celles d'une machine fictive.)
`;
COMMANDS.clear = (args, io) => { io.clear(); return 0; };
HELP.clear = `Utilisation : clear
Efface l'écran du terminal (raccourci : Ctrl+L).
`;
COMMANDS.true = () => 0;
COMMANDS.false = () => 1;
HELP.true = 'Utilisation : true\nNe fait rien et réussit (code de retour 0).\n';
HELP.false = 'Utilisation : false\nNe fait rien et échoue (code de retour 1).\n';

// ---------- ps, kill ----------
function procNow(sh) { return sh.now ? sh.now() : Date.now(); }
function refreshProcs(sh) {
  const now = procNow(sh);
  sh.processes = sh.processes.filter(p => !(p.diesAt && p.diesAt <= now));
  const esp = sh.processes.find(p => p.pid === sh.espionPid);
  if (esp && !sh.processes.some(p => p.comm === 'sleep' && p.ppid === esp.pid)) {
    sh.processes.push({ pid: sh.nextPid++, ppid: esp.pid, tty: 'pts/0', stat: 'S', start: hhmm(now), vsz: 2416, rss: 1024,
      cmd: 'sleep 30', comm: 'sleep', diesAt: now + 30000 });
  }
}
function hhmm(t) { const d = new Date(t); return p2(d.getHours()) + ':' + p2(d.getMinutes()); }

COMMANDS.ps = (args, io, sh) => {
  const a = args.join(' ');
  const modes = { '': 'simple', 'aux': 'aux', '-aux': 'aux', 'ax': 'ax', '-ef': 'ef', '-e': 'e', '-A': 'e', '-f': 'f', '-eF': 'ef', '-Af': 'ef', 'auxww': 'aux', 'aux --forest': 'aux' };
  const mode = modes[a];
  if (!mode) { io.err(`ps : « ps ${a} » : ce terminal d'entraînement connaît seulement ps, ps aux, ps ax, ps -e, ps -f et ps -ef.\n`); return 1; }
  refreshProcs(sh);
  const self = { pid: sh.currentPid || sh.nextPid, ppid: sh.shellPid, tty: 'pts/0', stat: 'R+', start: hhmm(procNow(sh)), vsz: 9884, rss: 4372,
    cmd: ('ps ' + a).trim(), comm: 'ps' };
  let procs = sh.processes.concat([self]).sort((x, y) => x.pid - y.pid);
  if (mode === 'simple' || mode === 'f') procs = procs.filter(p => p.tty === 'pts/0');
  const time8 = '00:00:00';
  if (mode === 'simple' || mode === 'e') {
    io.out('    PID TTY          TIME CMD\n');
    for (const p of procs) io.out(`${String(p.pid).padStart(7)} ${p.tty.padEnd(8)} ${time8} ${p.comm}\n`);
  } else if (mode === 'aux') {
    io.out('USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND\n');
    for (const p of procs) {
      const mem = (p.rss / 20480).toFixed(1);
      io.out(`root     ${String(p.pid).padStart(7)}  0.0 ${mem.padStart(4)} ${String(p.vsz).padStart(6)} ${String(p.rss).padStart(5)} ${p.tty.padEnd(8)} ${p.stat.padEnd(4)} ${p.start}   0:00 ${p.cmd}\n`);
    }
  } else if (mode === 'ax') {
    io.out('    PID TTY      STAT   TIME COMMAND\n');
    for (const p of procs) io.out(`${String(p.pid).padStart(7)} ${p.tty.padEnd(8)} ${p.stat.padEnd(6)} 0:00 ${p.cmd}\n`);
  } else {
    io.out('UID          PID    PPID  C STIME TTY          TIME CMD\n');
    for (const p of procs) io.out(`root     ${String(p.pid).padStart(7)} ${String(p.ppid).padStart(7)}  0 ${p.start} ${p.tty.padEnd(8)} ${time8} ${p.cmd}\n`);
  }
  return 0;
};
HELP.ps = `Utilisation : ps [aux | -ef | -e | ax]
Liste les processus (les programmes qui tournent) avec leur numéro, le PID.
  ps       les processus de ce terminal (PID dans la 1re colonne)
  ps aux   tous les processus, avec utilisateur, mémoire, commande complète
  ps -ef   tous les processus, avec le PID du parent (PPID)
Exemples : ps     ps aux | grep espion
`;

const SIGNALS = { HUP: 1, INT: 2, QUIT: 3, KILL: 9, TERM: 15 };
const SIGLIST = ['HUP', 'INT', 'QUIT', 'ILL', 'TRAP', 'ABRT', 'BUS', 'FPE', 'KILL', 'USR1', 'SEGV', 'USR2', 'PIPE', 'ALRM', 'TERM',
  'STKFLT', 'CHLD', 'CONT', 'STOP', 'TSTP', 'TTIN', 'TTOU', 'URG', 'XCPU', 'XFSZ', 'VTALRM', 'PROF', 'WINCH', 'IO', 'PWR', 'SYS'];
COMMANDS.kill = (args, io, sh) => {
  let sig = 15;
  const targets = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '-l' || a === '-L') {
      let out = '';
      SIGLIST.forEach((s, k) => { out += `${String(k + 1).padStart(2)}) SIG${s}` + ((k + 1) % 5 === 0 ? '\n' : '\t'); });
      io.out(out.replace(/\t$/, '') + '\n'); return 0;
    }
    if (a === '-s' || a === '-n') { const v = args[++i]; if (v === undefined) { io.err(`bash: kill: ${a}: option requires an argument\n`); return 2; } args[i] = '-' + v; i--; continue; }
    if (a.startsWith('-') && a.length > 1 && !targets.length) {
      const s = a.slice(1).toUpperCase().replace(/^SIG/, '');
      if (/^\d+$/.test(s)) {
        const k = +s;
        if (k < 1 || k > 64) { io.err(`bash: kill: ${a.slice(1)}: invalid signal specification\n`); return 1; }
        if (![1, 2, 3, 9, 15].includes(k)) { io.err(`kill : le signal ${k} existe, mais ce terminal d'entraînement ne sait envoyer que -15 (TERM, par défaut), -9 (KILL), -1, -2 et -3.\n`); return 1; }
        sig = k;
      } else if (SIGNALS[s] !== undefined) sig = SIGNALS[s];
      else if (SIGLIST.includes(s)) { io.err(`kill : le signal ${s} existe, mais ce terminal d'entraînement ne sait envoyer que TERM (par défaut), KILL, HUP, INT et QUIT.\n`); return 1; }
      else { io.err(`bash: kill: ${a.slice(1)}: invalid signal specification\n`); return 1; }
      continue;
    }
    targets.push(a);
  }
  if (!targets.length) { io.err('kill: usage: kill [-s sigspec | -n signum | -sigspec] pid | jobspec ... or kill -l [sigspec]\n'); return 2; }
  refreshProcs(sh);
  let code = 0;
  for (const t of targets) {
    if (!/^-?\d+$/.test(t)) { io.err(`bash: kill: ${t}: arguments must be process or job IDs\n`); code = 1; continue; }
    const pid = parseInt(t, 10);
    const idx = sh.processes.findIndex(p => p.pid === pid);
    if (idx === -1) { io.err(`bash: kill: (${t}) - No such process\n`); code = 1; continue; }
    const p = sh.processes[idx];
    if (pid === 1) continue; // init ignore les signaux
    if (pid === sh.shellPid) {
      if (sig === 9) io.err("kill : sur un vrai Linux, tuer ton propre shell (kill -9) fermerait ce terminal. Ce terminal d'entraînement reste ouvert.\n");
      continue; // un bash interactif ignore TERM
    }
    sh.processes.splice(idx, 1);
    if (pid === sh.espionPid) {
      // son « sleep 30 » continue seul, jusqu'à la fin de ses 30 secondes
      for (const q of sh.processes) if (q.ppid === pid) q.ppid = 1;
    }
    refreshProcs(sh);
  }
  return code;
};
HELP.kill = `Utilisation : kill [-9] PID...
Envoie un signal à un processus, par défaut pour lui demander de s'arrêter.
Le PID (numéro du processus) se lit avec ps.
  kill PID      arrêter proprement (signal TERM, 15)
  kill -9 PID   arrêter de force (signal KILL)
  kill -l       liste des signaux
Exemple : ps   puis   kill 1234
`;

// ---------- builtins : history, alias, export, unset, type, exit, source ----------
COMMANDS.history = (args, io, sh) => {
  if (args[0] === '-c') { sh.history = []; return 0; }
  if (args[0] && /^-/.test(args[0])) { io.err(optInconnue('history', args[0])); return 2; }
  if (args[0] !== undefined && !/^\d+$/.test(args[0])) { io.err(`bash: history: ${args[0]}: numeric argument required\n`); return 1; }
  let list = sh.history.map((h, i) => [i + 1, h]);
  if (args[0] !== undefined) list = list.slice(-parseInt(args[0], 10) || list.length);
  for (const [i, h] of list) io.out(`${String(i).padStart(5)}  ${h}\n`);
  return 0;
};
HELP.history = `Utilisation : history [N] | history -c
Liste les commandes déjà tapées, numérotées.
  history N   les N dernières seulement      history -c   tout effacer
Raccourcis : !! relance la dernière commande ; !12 la commande n° 12 ;
             !cat la dernière commande qui commence par cat ; ▲ et ▼ la parcourent.
Exemple : history | grep cd
`;
function shQuote(s) { return "'" + s.replace(/'/g, "'\\''") + "'"; }
COMMANDS.alias = (args, io, sh) => {
  let code = 0;
  if (!args.length || (args.length === 1 && args[0] === '-p')) {
    for (const k of Object.keys(sh.aliases).sort(codepointCmp)) io.out(`alias ${k}=${shQuote(sh.aliases[k])}\n`);
    return 0;
  }
  for (const a of args) {
    const eq = a.indexOf('=');
    if (eq > 0) { sh.aliases[a.slice(0, eq)] = a.slice(eq + 1); continue; }
    if (sh.aliases[a] !== undefined) io.out(`alias ${a}=${shQuote(sh.aliases[a])}\n`);
    else { io.err(`bash: alias: ${a}: not found\n`); code = 1; }
  }
  return code;
};
HELP.alias = `Utilisation : alias [NOM='COMMANDE']
Crée un raccourci : alias ll='ls -la', puis ll.
Sans argument, liste les raccourcis. unalias NOM en supprime un.
`;
COMMANDS.unalias = (args, io, sh) => {
  if (!args.length) { io.err('unalias: usage: unalias [-a] name [name ...]\n'); return 2; }
  let code = 0;
  for (const a of args) {
    if (a === '-a') { sh.aliases = {}; continue; }
    if (sh.aliases[a] === undefined) { io.err(`bash: unalias: ${a}: not found\n`); code = 1; } else delete sh.aliases[a];
  }
  return code;
};
HELP.unalias = 'Utilisation : unalias NOM\nSupprime un raccourci créé par alias.\n';
COMMANDS.export = (args, io, sh) => {
  if (!args.length || args[0] === '-p') {
    for (const k of Object.keys(sh.env).filter(k => sh.exported.has(k)).sort(codepointCmp)) io.out(`declare -x ${k}="${sh.env[k]}"\n`);
    return 0;
  }
  let code = 0;
  for (const a of args) {
    const eq = a.indexOf('=');
    const name = eq >= 0 ? a.slice(0, eq) : a;
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) { io.err(`bash: export: \`${a}': not a valid identifier\n`); code = 1; continue; }
    if (eq >= 0) sh.setVar(name, a.slice(eq + 1));
    sh.exported.add(name);
  }
  return code;
};
HELP.export = `Utilisation : export NOM=valeur
Crée une variable d'environnement, transmise aux commandes lancées.
Variable simple : NOM=valeur (sans espace autour du =), puis echo $NOM.
`;
COMMANDS.unset = (args, io, sh) => {
  for (const a of args) {
    if (a === 'HOME' || a === 'PWD' || a === 'OLDPWD' || a === 'USER' || a === 'PATH' || a === 'SHELL') { sh.setVar(a, ''); continue; }
    delete sh.env[a]; sh.exported.delete(a);
  }
  return 0;
};
HELP.unset = 'Utilisation : unset NOM\nSupprime une variable.\n';
COMMANDS.env = (args, io, sh) => {
  if (args.length) { io.err(`env : lancer une commande avec env n'est pas possible dans ce terminal d'entraînement ; tape-la directement.\n`); return 1; }
  for (const k of Object.keys(sh.env).filter(k => sh.exported.has(k))) io.out(`${k}=${sh.env[k]}\n`);
  return 0;
};
COMMANDS.printenv = (args, io, sh) => {
  if (!args.length) return COMMANDS.env([], io, sh);
  let code = 0;
  for (const a of args) { if (sh.exported.has(a) && sh.env[a] !== undefined) io.out(sh.env[a] + '\n'); else code = 1; }
  return code;
};
HELP.env = `Utilisation : env
Liste les variables d'environnement (HOME, PATH, USER…).
`;
HELP.printenv = 'Utilisation : printenv [NOM]\nAffiche une variable d\'environnement, ou toutes.\n';
COMMANDS.type = (args, io, sh) => {
  let code = 0;
  for (const a of args) {
    if (sh.aliases[a] !== undefined) io.out(`${a} is aliased to \`${sh.aliases[a]}'\n`);
    else if (sh.functions && sh.functions[a]) io.out(`${a} is a function\n`);
    else if (BUILTINS.includes(a)) io.out(`${a} is a shell builtin\n`);
    else if (EXTERNALS.includes(a)) io.out(`${a} is /usr/bin/${a}\n`);
    else { io.err(`bash: type: ${a}: not found\n`); code = 1; }
  }
  return code;
};
HELP.type = `Utilisation : type COMMANDE...
Dit ce qu'est une commande : interne au shell (cd), programme (/usr/bin/ls),
raccourci (alias) ou fonction (comme MISSION et Q1 à Q15 de ce TP).
`;
COMMANDS.exit = (args, io) => {
  io.err("exit : sur un vrai Linux, exit fermerait ce terminal. Ici, il reste ouvert ; pour repartir de zéro, utilise le bouton Recommencer.\n");
  return 0;
};
HELP.exit = 'Utilisation : exit\nFerme le shell (ici, ce terminal d\'entraînement reste ouvert).\n';

// ---------- scripts : ./script.sh, sh script.sh, . script ----------
function scriptRunnable(content) {
  const body = content.split('\n').filter(l => !/^\s*(#.*)?$/.test(l));
  return !body.some(l => /^\s*(while|for|until|if|case|function|select)\b|\$\(|`|\[\s|\btest\b|\bread\b/.test(l));
}
function runScript(sh, io, path, content, here) {
  if (!scriptRunnable(content)) {
    io.err(`${path} : ce script utilise des boucles ou des tests (while, if…), que ce terminal d'entraînement n'exécute pas. ` +
      `Sur un vrai Linux, il tournerait.\n`);
    return 1;
  }
  const saved = here ? null : { cwd: sh.cwd, env: { ...sh.env } };
  let code = 0;
  for (const l of content.split('\n')) {
    if (/^\s*(#.*)?$/.test(l)) continue;
    code = sh.execNested(l, io);
  }
  if (saved) { sh.cwd = saved.cwd; sh.env = saved.env; }
  return code;
}
COMMANDS.sh = (args, io, sh) => {
  if (!args.length || args[0].startsWith('-')) {
    io.err(`sh : ce terminal d'entraînement ne lance pas de nouveau shell. Pour exécuter un script : sh script.sh\n`); return 1;
  }
  const n = sh.fs.node(sh.fs.resolve(args[0], sh.cwd));
  if (!n) { io.err(`sh: 0: cannot open ${args[0]}: No such file\n`); return 2; }
  if (n.type === 'dir') { io.err(`sh: 0: cannot open ${args[0]}: Is a directory\n`); return 2; }
  return runScript(sh, io, args[0], n.content, false);
};
COMMANDS.bash = (args, io, sh) => {
  if (!args.length || args[0].startsWith('-')) {
    io.err(`bash : ce terminal d'entraînement ne lance pas de nouveau shell. Pour exécuter un script : bash script.sh\n`); return 1;
  }
  const n = sh.fs.node(sh.fs.resolve(args[0], sh.cwd));
  if (!n) { io.err(`bash: ${args[0]}: No such file or directory\n`); return 127; }
  if (n.type === 'dir') { io.err(`bash: ${args[0]}: Is a directory\n`); return 126; }
  return runScript(sh, io, args[0], n.content, false);
};
COMMANDS['.'] = (args, io, sh) => {
  if (!args.length) { io.err('bash: .: filename argument required\n.: usage: . filename [arguments]\n'); return 2; }
  const n = sh.fs.node(sh.fs.resolve(args[0], sh.cwd));
  if (!n) { io.err(`bash: ${args[0]}: No such file or directory\n`); return 1; }
  if (n.type === 'dir') { io.err(`bash: .: ${args[0]}: is a directory\n`); return 1; }
  return runScript(sh, io, args[0], n.content, true);
};
COMMANDS.source = COMMANDS['.'];
HELP.sh = `Utilisation : sh SCRIPT
Exécute un script shell (les scripts simples seulement, dans ce terminal).
Un script rendu exécutable (chmod u+x) se lance aussi avec ./script.sh
`;
HELP.bash = HELP.sh.replace(/sh SCRIPT/, 'bash SCRIPT');
HELP['.'] = `Utilisation : . FICHIER   (ou source FICHIER)
Exécute les commandes d'un fichier dans le shell courant.
`;

// ============================================================
//  Le shell
// ============================================================
function stripHtml(h) {
  return h.replace(/<br\s*\/?>/g, '\n').replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
}

class Shell {
  constructor(opts = {}) {
    this.fs = opts.fs || buildMirageFS();
    this.home = '/root';
    this.cwd = '/root';
    this.history = [];
    this.lastError = '';
    this.status = 0;
    this.columns = 80;
    this.aliases = {};
    this.functions = {};
    this.env = {
      HOME: '/root', PWD: '/root', USER: 'root', LOGNAME: 'root', SHELL: '/bin/bash', HOSTNAME: 'mirage',
      PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin', TERM: 'xterm-256color', LANG: 'C.UTF-8',
    };
    this.exported = new Set(Object.keys(this.env));
    this.special = opts.special || null;
    this.now = opts.now || null;
    this.forceTTY = opts.tty !== undefined ? opts.tty : true;
    this.shellPid = 7;
    this.spawnEspion(opts.espionPid);
  }

  spawnEspion(pid) {
    const p = pid || (40 + Math.floor(Math.random() * 60));
    const t = procNow(this);
    this.processes = [
      { pid: 1, ppid: 0, tty: '?', stat: 'Ss', start: hhmm(t), vsz: 2392, rss: 1580, cmd: '/sbin/init', comm: 'init' },
      { pid: this.shellPid, ppid: 1, tty: 'pts/0', stat: 'Ss', start: hhmm(t), vsz: 7236, rss: 4012, cmd: '-bash', comm: 'bash' },
      { pid: p, ppid: 1, tty: 'pts/0', stat: 'S', start: hhmm(t), vsz: 2580, rss: 1540, cmd: '/bin/sh /tmp/espion_mirage.sh', comm: 'espion_mirage.s' },
    ];
    this.espionPid = p;
    this.nextPid = p + 1;
    refreshProcs(this);
  }
  espionAlive() { refreshProcs(this); return this.processes.some(x => x.pid === this.espionPid); }

  setVar(name, value) {
    this.env[name] = value;
    if (name === 'PWD') { /* bash ne change pas de dossier pour autant */ }
  }
  getVar(name) {
    if (name === '?') return String(this.status);
    if (name === '$') return String(this.shellPid);
    if (name === '#') return '0';
    if (name === '0') return 'bash';
    if (/^\d$/.test(name)) return '';
    return this.env[name] !== undefined ? this.env[name] : '';
  }

  prompt() {
    let p = this.cwd;
    if (p === this.home) p = '~';
    else if (p.startsWith(this.home + '/')) p = '~' + p.slice(this.home.length);
    return p + ' #';
  }

  serialize() {
    return {
      fs: this.fs.dump(), cwd: this.cwd, history: this.history, env: this.env, exported: [...this.exported],
      aliases: this.aliases, processes: this.processes, nextPid: this.nextPid, espionPid: this.espionPid, status: this.status,
    };
  }
  restore(s) {
    this.fs.load(s.fs);
    this.cwd = s.cwd;
    this.history = s.history || [];
    if (s.env) this.env = s.env;
    if (s.exported) this.exported = new Set(s.exported);
    this.aliases = s.aliases || {};
    if (s.processes) this.processes = s.processes;
    if (s.nextPid) this.nextPid = s.nextPid;
    if (s.espionPid) this.espionPid = s.espionPid;
    this.status = s.status || 0;
  }

  // ---------- Développement de l'historique : !! !n !-n !texte !$ ----------
  histExpand(line) {
    let out = '', changed = false, sq = false, dq = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === "'" && !dq) { sq = !sq; out += c; continue; }
      if (c === '"' && !sq) { dq = !dq; out += c; continue; }
      if (c === '\\' && !sq && i + 1 < line.length) { out += c + line[i + 1]; i++; continue; }
      if (c !== '!' || sq) { out += c; continue; }
      const nx = line[i + 1];
      if (nx === undefined || ' \t\n=('.includes(nx) || (dq && nx === '"') || (i > 0 && line[i - 1] === '[')) { out += c; continue; }
      let ev = null, spec;
      if (nx === '!') { spec = '!'; ev = this.history[this.history.length - 1]; i++; }
      else if (nx === '$') {
        spec = '$'; const last = this.history[this.history.length - 1];
        if (last !== undefined) { const ws = last.trim().split(/\s+/); ev = ws[ws.length - 1]; }
        i++;
      } else if (/[0-9-]/.test(nx)) {
        const m = /^-?\d+/.exec(line.slice(i + 1));
        if (!m) { out += c; continue; }
        spec = m[0];
        const k = parseInt(m[0], 10);
        ev = k > 0 ? this.history[k - 1] : this.history[this.history.length + k];
        i += m[0].length;
      } else {
        const m = /^[^\s;&|<>()"'`]+/.exec(line.slice(i + 1));
        spec = m[0];
        for (let k = this.history.length - 1; k >= 0; k--) if (this.history[k].startsWith(spec)) { ev = this.history[k]; break; }
        i += m[0].length;
      }
      if (ev === undefined || ev === null) return { error: `bash: !${spec}: event not found\n` };
      out += ev; changed = true;
    }
    return { line: out, changed };
  }

  // ---------- Développement d'un mot ----------
  expandWord(items, opts = {}) {
    const words = opts.noBrace ? [items] : braceExpand(items);
    const results = [];
    for (let w of words) {
      // tilde
      if (w.length && !w[0].q && w[0].c === '~' && (w.length === 1 || (!w[1].q && w[1].c === '/'))) {
        w = [...this.getVar('HOME')].map(c => ({ c, q: true })).concat(w.slice(1));
      }
      // variables
      const flat = [];
      let hasQuote = items.hasQuote;
      for (const it of w) {
        if (it.v !== undefined) {
          const val = this.getVar(it.v);
          for (const c of val) flat.push({ c, q: it.q, split: !it.q });
          if (it.q) hasQuote = true;
        } else flat.push(it);
      }
      // découpage en mots (variables hors guillemets)
      let pieces = [[]];
      if (opts.noSplit) pieces = [flat];
      else {
        for (const it of flat) {
          if (it.split && /[ \t\n]/.test(it.c)) { if (pieces[pieces.length - 1].length) pieces.push([]); continue; }
          pieces[pieces.length - 1].push(it);
        }
        if (pieces.length > 1 && pieces[pieces.length - 1].length === 0) pieces.pop();
      }
      for (const p of pieces) {
        if (p.length === 0) { if (hasQuote && pieces.length === 1) results.push(''); continue; }
        if (!opts.noGlob && hasGlob(p.map(it => (it.split ? { c: it.c, q: false } : it)))) {
          const g = globExpand(p.map(it => (it.split ? { c: it.c, q: false } : it)), this);
          if (g) { results.push(...g); continue; }
        }
        results.push(p.map(it => it.c).join(''));
      }
    }
    return results;
  }

  // ---------- Exécution ----------
  // run() : une ligne tapée par l'élève. Renvoie { stream, code, out, err, html, expanded }.
  run(line) {
    const trimmed = line.trim();
    this.stream = [];
    if (this.special) {
      const r = this.special(trimmed, this);
      if (r !== null && r !== undefined) {
        if (r.html) this.stream.push({ fd: 1, html: r.html });
        return this.finish(r.code || 0, null);
      }
    }
    if (trimmed === '') return this.finish(this.status, null);
    const hx = this.histExpand(trimmed);
    if (hx.error) {
      this.stream.push({ fd: 2, text: hx.error });
      this.lastError = hx.error.trim();
      this.status = 1;
      return this.finish(1, null);
    }
    const ln = hx.line;
    this.history.push(ln);
    this.execLine(ln, null);
    return this.finish(this.status, hx.changed ? ln : null);
  }
  finish(code, expanded) {
    const s = this.stream;
    const res = { stream: s, code, expanded, out: '', err: '', html: '' };
    for (const c of s) {
      if (c.fd === 1 && c.text !== undefined) res.out += c.text;
      if (c.fd === 2) res.err += c.text;
      if (c.html !== undefined) res.html += c.html;
      if (c.pager !== undefined) res.out += c.pager;
    }
    for (const c of s) if (c.fd === 2) { const l = c.text.trim().split('\n'); this.lastError = l[0]; }
    return res;
  }

  // Exécute une ligne dans un flux de sortie donné (sous-script) : renvoie le code.
  execNested(line, io) {
    const saved = this.stream;
    this.stream = [];
    this.execLine(line, null);
    const chunks = this.stream;
    this.stream = saved;
    for (const c of chunks) {
      if (c.fd === 2) io.err(c.text);
      else if (c.text !== undefined) io.out(c.text);
      else if (c.html !== undefined) io.html(c.html);
      else if (c.pager !== undefined) io.out(c.pager);
    }
    return this.status;
  }

  execLine(line, _) {
    let list;
    try {
      const toks = this.expandAliases(lex(line));
      list = parse(toks);
    } catch (e) {
      if (e instanceof ShellError) {
        this.stream.push({ fd: 2, text: e.msg });
        this.status = e.code;
        return;
      }
      throw e;
    }
    let prevOp = null;
    for (const item of list) {
      if (prevOp === '&&' && this.status !== 0) { prevOp = item.op; continue; }
      if (prevOp === '||' && this.status === 0) { prevOp = item.op; continue; }
      this.execPipeline(item.pipeline);
      prevOp = item.op;
    }
  }

  expandAliases(toks) {
    const out = [];
    let atCmd = true;
    for (let k = 0; k < toks.length; k++) {
      const t = toks[k];
      if (t.w && atCmd) {
        const txt = plainText(t.w);
        if (txt !== null && this.aliases[txt] !== undefined) {
          let sub = lex(this.aliases[txt]);
          // une seule passe, sans récursion sur le même nom
          if (sub.length && sub[0].w && plainText(sub[0].w) !== txt) {
            const t2 = plainText(sub[0].w);
            if (t2 !== null && this.aliases[t2] !== undefined && t2 !== txt) sub = lex(this.aliases[t2]).concat(sub.slice(1));
          }
          out.push(...sub);
          atCmd = false;
          continue;
        }
      }
      out.push(t);
      if (t.w) atCmd = false;
      else if (t.op) atCmd = true;
    }
    return out;
  }

  execPipeline(cmds) {
    let input = null;
    for (let k = 0; k < cmds.length; k++) {
      const last = k === cmds.length - 1;
      const r = this.execSimple(cmds[k], k === 0 ? null : input, last, k > 0);
      input = r.stdout;
      if (last) this.status = r.code;
    }
  }

  // Ouvre une redirection : renvoie { abs, node } ou lève un message d'erreur bash.
  openTarget(word, mode) {
    const names = this.expandWord(word);
    if (names.length !== 1) throw new ShellError(`bash: ${word.map(i => i.c || '$' + i.v).join('')}: ambiguous redirect\n`, 1);
    const name = names[0];
    const abs = this.fs.resolve(name, this.cwd);
    if (abs === '/dev/null') return { devnull: true, name };
    const node = this.fs.node(abs);
    if (mode === 'read') {
      if (!node) throw new ShellError(`bash: ${name}: No such file or directory\n`, 1);
      if (node.type === 'dir') throw new ShellError(`bash: ${name}: Is a directory\n`, 1);
      return { node, name };
    }
    if (node && node.type === 'dir') throw new ShellError(`bash: ${name}: Is a directory\n`, 1);
    if (node) { if (mode === 'trunc') { node.content = ''; node.mtime = Date.now(); } return { node, name }; }
    const { parent, name: base } = this.fs.parent(abs);
    if (!parent || parent.type !== 'dir' || name.endsWith('/')) throw new ShellError(`bash: ${name}: ${parent && parent.type !== 'dir' ? 'Not a directory' : (name.endsWith('/') ? 'Is a directory' : 'No such file or directory')}\n`, 1);
    const f = file(base, '');
    parent.children[base] = f;
    parent.mtime = Date.now();
    return { node: f, name };
  }

  execSimple(cmd, stdin, isLast, piped) {
    const term = this.stream;
    let stdoutBuf = '';
    // 1) développement des mots (affectations en tête)
    const assigns = [];
    let w = 0;
    for (; w < cmd.words.length; w++) {
      const items = cmd.words[w];
      let k = 0, name = '';
      while (k < items.length && !items[k].q && items[k].v === undefined && /[A-Za-z0-9_]/.test(items[k].c) && !(k === 0 && /\d/.test(items[k].c))) { name += items[k].c; k++; }
      if (name && k < items.length && !items[k].q && items[k].c === '=') {
        const val = this.expandWord(Object.assign(items.slice(k + 1), { hasQuote: true }), { noSplit: true, noGlob: true, noBrace: true });
        assigns.push([name, val.join('')]);
      } else break;
    }
    let argv = [];
    for (; w < cmd.words.length; w++) argv.push(...this.expandWord(cmd.words[w]));

    // 2) redirections, de gauche à droite
    let out = { kind: isLast ? 'term' : 'pipe' };
    let err = { kind: 'term' };
    let inText = stdin;
    try {
      for (const r of cmd.redirs) {
        if (r.r === '<') { const t = this.openTarget(r.target, 'read'); inText = t.devnull ? '' : t.node.content; continue; }
        if (r.r === '2>&1') { err = out; continue; }
        if (r.r === '>&2') { out = err; continue; }
        if (r.r === '>&1' || r.r === '2>&2') continue;
        const t = this.openTarget(r.target, r.r.endsWith('>>') ? 'append' : 'trunc');
        const dest = t.devnull ? { kind: 'null' } : { kind: 'file', node: t.node };
        if (r.r === '&>') { out = dest; err = dest; }
        else if (r.r.startsWith('2')) err = dest;
        else out = dest;
      }
    } catch (e) {
      if (e instanceof ShellError) { term.push({ fd: 2, text: e.msg }); return { code: e.code, stdout: '' }; }
      throw e;
    }

    const write = (dest, text, fd) => {
      if (!text) return;
      if (dest.kind === 'term') term.push({ fd, text });
      else if (dest.kind === 'pipe') stdoutBuf += text;
      else if (dest.kind === 'file') { dest.node.content += text; dest.node.mtime = Date.now(); }
    };
    const tty = out.kind === 'term' && this.forceTTY;
    const io = {
      stdin: inText,
      tty,
      out: (t) => write(out, t, 1),
      err: (t) => write(err, t, 2),
      html: (h) => { if (out.kind === 'term') term.push({ fd: 1, html: h }); else write(out, stripHtml(h), 1); },
      pager: (t, name) => { if (out.kind === 'term' && this.forceTTY) term.push({ fd: 1, pager: t, name }); else write(out, t, 1); },
      clear: () => { if (out.kind === 'term') term.push({ fd: 1, clear: true }); else write(out, CH(27) + '[H' + CH(27) + '[2J', 1); },
    };

    // 3) seulement des affectations
    if (argv.length === 0) {
      for (const [k, v] of assigns) this.setVar(k, v);
      return { code: 0, stdout: stdoutBuf };
    }
    const saved = {};
    for (const [k, v] of assigns) { saved[k] = this.env[k]; this.env[k] = v; }

    const name = argv[0];
    const args = argv.slice(1);
    let code;
    if (this.functions[name]) {
      code = this.functions[name](args, io, this);
    } else if (COMMANDS[name] && !name.includes('/')) {
      if (args.includes('--help') && name !== 'echo' && HELP[name]) { io.out(HELP[name]); code = 0; }
      else {
        if (!BUILTINS.includes(name)) this.currentPid = this.nextPid++;
        code = COMMANDS[name](args, io, this);
        this.currentPid = null;
      }
    } else if (name.includes('/')) {
      const abs = this.fs.resolve(name, this.cwd);
      const n = this.fs.node(abs);
      if (!n) { io.err(`bash: ${name}: No such file or directory\n`); code = 127; }
      else if (n.type === 'dir') { io.err(`bash: ${name}: Is a directory\n`); code = 126; }
      else if (!(n.mode & 0o111)) { io.err(`bash: ${name}: Permission denied\n`); code = 126; }
      else if (n.bin) {
        const base = abs.split('/').pop();
        if (COMMANDS[base]) { this.currentPid = this.nextPid++; code = COMMANDS[base](args, io, this); this.currentPid = null; }
        else { io.err(`bash: ${name}: No such file or directory\n`); code = 127; }
      } else if (abs === '/tmp/espion_mirage.sh' && args[0] !== '--essai') {
        io.err(`${name} : ce script tourne sans fin (while true). Ce terminal d'entraînement ne le lance pas : l'espion du TP tourne déjà (voir ps).\n`);
        code = 1;
      } else {
        this.nextPid++;
        code = runScript(this, io, name, n.content, false);
      }
    } else if (ABSENTES.includes(name)) {
      io.err(`${name} : cette commande existe sur un vrai Linux, mais ce terminal d'entraînement ne l'a pas.\n`);
      code = 127;
    } else {
      io.err(`bash: ${name}: command not found\n`);
      code = 127;
    }
    for (const k of Object.keys(saved)) { if (saved[k] === undefined) delete this.env[k]; else this.env[k] = saved[k]; }
    return { code: code || 0, stdout: stdoutBuf };
  }
}

// ---------- Export (Node + navigateur) ----------
if (typeof window !== 'undefined') window.MirageShell = { FS, Shell, buildMirageFS, COMMANDS, HELP };
export {
  FS, Shell, buildMirageFS, modeString, octal, COMMANDS, HELP, EXTERNALS, BUILTINS, ABSENTES,
  lex, parse, grepToJs, globExpand, braceExpand, columnsLayout, stripHtml, human,
};
