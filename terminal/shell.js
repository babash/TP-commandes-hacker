// ============================================================
//  Opération MIRAGE — shell et système de fichiers virtuels
//  Voie (A) : un petit shell POSIX écrit pour le TP, 100 % local.
//  Licence du code : MIT (Babash - NSI Tani Malandi).
//
//  Ce module ne dépend d'aucun site : il tourne dans le navigateur
//  (chargé par terminal/index.html) et sous Node (tests).
//  Les commandes et leurs messages sont choisis pour coller au
//  comportement d'un vrai shell (coreutils/GNU), vérifié sur une
//  machine réelle. Les écarts connus sont listés dans terminal/ECARTS.md.
// ============================================================

'use strict';

// ---------- Système de fichiers ----------
// Un nœud : { type:'dir'|'file', name, mode (entier octal), content, children:{}, mtime }

function dir(name, mode = 0o755) {
  return { type: 'dir', name, mode, children: {}, mtime: Date.now() };
}
function file(name, content = '', mode = 0o644) {
  return { type: 'file', name, content, mode, mtime: Date.now() };
}

class FS {
  constructor() {
    this.root = dir('/', 0o755);
  }
  // Découpe un chemin en segments, en tenant compte de HOME (~) et du cwd.
  resolve(path, cwd, home) {
    if (path === undefined || path === '') path = '.';
    let start;
    if (path === '~' || path.startsWith('~/')) {
      path = home + path.slice(1);
    }
    if (path.startsWith('/')) {
      start = [];
    } else {
      start = cwd.split('/').filter(Boolean);
    }
    const parts = path.split('/').filter(Boolean);
    const out = start.slice();
    for (const p of parts) {
      if (p === '.') continue;
      else if (p === '..') out.pop();
      else out.push(p);
    }
    return '/' + out.join('/');
  }
  // Renvoie le nœud à un chemin absolu, ou null.
  node(abs) {
    if (abs === '/') return this.root;
    const parts = abs.split('/').filter(Boolean);
    let cur = this.root;
    for (const p of parts) {
      if (cur.type !== 'dir' || !cur.children[p]) return null;
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
  // Sérialisation pour localStorage.
  dump() { return JSON.stringify(this.root); }
  load(json) { this.root = JSON.parse(json); }
}

// ---------- Construction de l'arborescence du TP (script v11.1) ----------
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

function buildMirageFS() {
  const fs = new FS();
  const root = fs.root;
  root.children['root'] = dir('root', 0o755);
  const home = root.children['root'];
  const tp = dir('infiltration_mirage', 0o755);
  home.children['infiltration_mirage'] = tp;
  tp.children['message_secret.txt'] = file('message_secret.txt', MESSAGE_SECRET);
  const srv = dir('serveur', 0o755);
  tp.children['serveur'] = srv;
  srv.children['acces.txt'] = file('acces.txt', 'ACCES REFUSE.\n');
  const conf = dir('confidentiel', 0o755);
  srv.children['confidentiel'] = conf;
  conf.children['rapport.txt'] = file('rapport.txt', RAPPORT);
  const pub = dir('public', 0o755);
  srv.children['public'] = pub;
  pub.children['index.html'] = file('index.html', 'Index public MIRAGE.\n');
  const logs = dir('logs', 0o755);
  srv.children['logs'] = logs;
  logs.children['access.log'] = file('access.log', ACCESSLOG);
  srv.children['effacer_traces.sh'] = file('effacer_traces.sh', EFFACER, 0o644);
  srv.children['.fichier_cache'] = file('.fichier_cache', FICHIER_CACHE);
  return fs;
}

// ---------- Utilitaires d'affichage des droits (comme ls -l) ----------
function modeString(node) {
  const t = node.type === 'dir' ? 'd' : '-';
  const m = node.mode;
  const bit = (shift, ch) => (m & (1 << shift)) ? ch : '-';
  return t +
    bit(8, 'r') + bit(7, 'w') + bit(6, 'x') +
    bit(5, 'r') + bit(4, 'w') + bit(3, 'x') +
    bit(2, 'r') + bit(1, 'w') + bit(0, 'x');
}
function octal(node) {
  return (node.mode & 0o777).toString(8);
}

// ---------- Le shell ----------
// Les commandes reçoivent (args, ctx) où ctx = { shell, stdin (string|null) }
// et renvoient { out:string, err:string, code:int }.

class Shell {
  constructor(opts = {}) {
    this.fs = opts.fs || buildMirageFS();
    this.home = '/root';
    this.cwd = '/root';
    this.history = [];
    this.lastError = '';   // dernier message d'erreur en anglais (pour « ? »)
    this.processes = [];   // { pid, user, time, cmd }
    this.nextPid = 100;
    this.env = { HOME: this.home, PWD: this.cwd };
    // hook facultatif : le TP peut intercepter les commandes MISSION/Qn/STATUT
    this.special = opts.special || null;
    this.spawnEspion(opts.espionPid);
  }

  spawnEspion(pid) {
    const p = pid || (40 + Math.floor(Math.random() * 60));
    // quelques processus système plausibles + l'espion
    this.processes = [
      { pid: 1, user: 'root', time: '0:00', cmd: '/sbin/init' },
      { pid: 7, user: 'root', time: '0:00', cmd: '/bin/sh' },
      { pid: p, user: 'root', time: '0:00', cmd: '/tmp/espion_mirage.sh' },
    ];
    this.espionPid = p;
  }
  espionAlive() { return this.processes.some(x => x.pid === this.espionPid); }

  prompt() {
    let p = this.cwd;
    if (p === this.home) p = '~';
    else if (p.startsWith(this.home + '/')) p = '~' + p.slice(this.home.length);
    return p + ' #';
  }

  setErr(msg) { this.lastError = msg; }

  // Point d'entrée : exécute une ligne complète (avec pipes et redirections).
  run(line) {
    const trimmed = line.trim();

    // Commandes spéciales du TP (MISSION, Q1..Q15, STATUT, réponses aux
    // questions…) : interceptées avant tout, sans pipe. Une réponse à une
    // question « read » n'entre pas dans l'historique (noHistory).
    if (this.special) {
      const r = this.special(trimmed, this);
      if (r !== null && r !== undefined) {
        if (!r.noHistory && trimmed !== '') this.history.push(trimmed);
        return r;
      }
    }

    if (trimmed !== '') this.history.push(trimmed);
    if (trimmed === '') return { out: '', err: '', code: 0 };

    // Découpe par pipes au niveau supérieur.
    const stages = splitPipes(trimmed);
    let stdin = null;
    let out = '', err = '', code = 0;
    for (let i = 0; i < stages.length; i++) {
      const res = this.execStage(stages[i], stdin);
      err += res.err;
      code = res.code;
      if (i < stages.length - 1) {
        stdin = res.out; // la sortie alimente l'étage suivant
        out = '';
      } else {
        out = res.out;
      }
    }
    return { out, err, code };
  }

  // Un étage = une commande + éventuelles redirections.
  execStage(stage, stdin) {
    let { tokens, redir } = parseRedir(stage);
    if (tokens.length === 0) return { out: '', err: '', code: 0 };
    const cmd = tokens[0];
    const args = tokens.slice(1);
    const fn = COMMANDS[cmd];
    if (!fn) {
      const msg = `${cmd}: command not found`;
      this.setErr(msg);
      return { out: '', err: msg + '\n', code: 127 };
    }
    let res = fn(args, { shell: this, stdin });
    res = { out: res.out || '', err: res.err || '', code: res.code || 0 };
    if (res.err) this.setErr(res.err.trim().split('\n').pop());
    // Redirection de la sortie standard vers un fichier.
    if (redir) {
      const abs = this.fs.resolve(redir.target, this.cwd, this.home);
      const { parent, name } = this.fs.parent(abs);
      if (!parent || parent.type !== 'dir') {
        const msg = `${cmd}: ${redir.target}: No such file or directory`;
        this.setErr(msg);
        return { out: '', err: msg + '\n', code: 1 };
      }
      let node = parent.children[name];
      if (!node) { node = file(name, ''); parent.children[name] = node; }
      if (node.type === 'dir') {
        const msg = `${cmd}: ${redir.target}: Is a directory`;
        this.setErr(msg);
        return { out: '', err: msg + '\n', code: 1 };
      }
      node.content = (redir.append ? node.content : '') + res.out;
      node.mtime = Date.now();
      return { out: '', err: res.err, code: res.code };
    }
    return res;
  }
}

// ---------- Analyse de la ligne ----------
function splitPipes(line) {
  // Découpe sur | hors guillemets.
  const out = [];
  let cur = '', q = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === q) q = null; cur += c; }
    else if (c === '"' || c === "'") { q = c; cur += c; }
    else if (c === '|') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out.map(s => s.trim());
}

function tokenize(s) {
  const out = [];
  let cur = '', q = null, has = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { if (c === q) q = null; else cur += c; has = true; }
    else if (c === '"' || c === "'") { q = c; has = true; }
    else if (c === ' ' || c === '\t') { if (has) { out.push(cur); cur = ''; has = false; } }
    else { cur += c; has = true; }
  }
  if (has) out.push(cur);
  return out;
}

function parseRedir(stage) {
  // Repère > ou >> (hors guillemets) et le fichier cible.
  const toks = tokenize(stage);
  let redir = null;
  const tokens = [];
  for (let i = 0; i < toks.length; i++) {
    if (toks[i] === '>' || toks[i] === '>>') {
      redir = { append: toks[i] === '>>', target: toks[i + 1] || '' };
      i++;
    } else if (toks[i].endsWith('>>') && toks[i] !== '>>') {
      // forme collée : echo a>>b
      const t = toks[i].slice(0, -2);
      if (t) tokens.push(t);
      redir = { append: true, target: toks[i + 1] || '' };
      i++;
    } else if (toks[i].endsWith('>') && toks[i] !== '>') {
      const t = toks[i].slice(0, -1);
      if (t) tokens.push(t);
      redir = { append: false, target: toks[i + 1] || '' };
      i++;
    } else {
      tokens.push(toks[i]);
    }
  }
  return { tokens, redir };
}

// ---------- Les commandes ----------
function splitFlags(args) {
  const flags = [];
  const rest = [];
  for (const a of args) {
    if (a === '--') continue;
    if (a.startsWith('--')) flags.push(a);
    else if (a.startsWith('-') && a.length > 1) {
      for (const ch of a.slice(1)) flags.push('-' + ch);
    } else rest.push(a);
  }
  return { flags, rest };
}

const COMMANDS = {};

COMMANDS.pwd = (args, { shell }) => ({ out: shell.cwd + '\n', code: 0 });

COMMANDS.echo = (args) => {
  // -n : pas de saut de ligne final
  let nl = true;
  const parts = [];
  for (const a of args) {
    if (a === '-n' && parts.length === 0) { nl = false; continue; }
    parts.push(a);
  }
  return { out: parts.join(' ') + (nl ? '\n' : ''), code: 0 };
};

COMMANDS.cd = (args, { shell }) => {
  const target = args[0] || '~';
  const abs = shell.fs.resolve(target, shell.cwd, shell.home);
  const node = shell.fs.node(abs);
  if (!node) return { err: `cd: ${target}: No such file or directory\n`, code: 1 };
  if (node.type !== 'dir') return { err: `cd: ${target}: Not a directory\n`, code: 1 };
  shell.cwd = abs;
  shell.env.PWD = abs;
  return { out: '', code: 0 };
};

function listOne(shell, target, flags) {
  const long = flags.includes('-l');
  const all = flags.includes('-a') || flags.includes('--all');
  const abs = shell.fs.resolve(target, shell.cwd, shell.home);
  const node = shell.fs.node(abs);
  if (!node) return { err: `ls: cannot access '${target}': No such file or directory\n`, code: 2 };
  let entries;
  if (node.type === 'file') {
    entries = [{ name: target, node }];
  } else {
    entries = Object.keys(node.children).sort().map(n => ({ name: n, node: node.children[n] }));
    if (all) {
      entries = [{ name: '.', node }, { name: '..', node }].concat(entries);
    } else {
      entries = entries.filter(e => !e.name.startsWith('.'));
    }
  }
  if (long) {
    let out = '';
    if (node.type === 'dir') out += `total ${entries.length}\n`;
    for (const e of entries) {
      const n = e.node;
      const size = n.type === 'dir' ? 4096 : n.content.length;
      out += `${modeString(n)} 1 root root ${String(size).padStart(5)} 2024-01-15 10:00 ${e.name}\n`;
    }
    return { out, code: 0 };
  }
  return { out: entries.map(e => e.name).join('  ') + '\n', code: 0 };
}

COMMANDS.ls = (args, { shell }) => {
  const { flags, rest } = splitFlags(args);
  if (flags.includes('--help')) {
    return { out: HELP.ls, code: 0 };
  }
  const targets = rest.length ? rest : ['.'];
  let out = '', err = '', code = 0;
  for (const t of targets) {
    const r = listOne(shell, t, flags);
    out += r.out || '';
    err += r.err || '';
    if (r.code) code = r.code;
  }
  return { out, err, code };
};

COMMANDS.cat = (args, { shell, stdin }) => {
  const { rest } = splitFlags(args);
  if (rest.length === 0) {
    return { out: stdin || '', code: 0 };
  }
  let out = '', err = '', code = 0;
  for (const t of rest) {
    const abs = shell.fs.resolve(t, shell.cwd, shell.home);
    const node = shell.fs.node(abs);
    if (!node) { err += `cat: ${t}: No such file or directory\n`; code = 1; continue; }
    if (node.type === 'dir') { err += `cat: ${t}: Is a directory\n`; code = 1; continue; }
    out += node.content;
  }
  return { out, err, code };
};

COMMANDS.mkdir = (args, { shell }) => {
  const { flags, rest } = splitFlags(args);
  const parents = flags.includes('-p');
  if (rest.length === 0) return { err: 'mkdir: missing operand\n', code: 1 };
  let err = '', code = 0;
  for (const t of rest) {
    const abs = shell.fs.resolve(t, shell.cwd, shell.home);
    if (parents) {
      const parts = abs.split('/').filter(Boolean);
      let cur = shell.fs.root, p = '';
      for (const seg of parts) {
        p += '/' + seg;
        if (!cur.children[seg]) cur.children[seg] = dir(seg);
        else if (cur.children[seg].type !== 'dir') { err += `mkdir: cannot create directory '${t}': Not a directory\n`; code = 1; break; }
        cur = cur.children[seg];
      }
      continue;
    }
    const { parent, name } = shell.fs.parent(abs);
    if (!parent || parent.type !== 'dir') { err += `mkdir: cannot create directory '${t}': No such file or directory\n`; code = 1; continue; }
    if (parent.children[name]) { err += `mkdir: cannot create directory '${t}': File exists\n`; code = 1; continue; }
    parent.children[name] = dir(name);
  }
  return { err, code };
};

COMMANDS.touch = (args, { shell }) => {
  const { rest } = splitFlags(args);
  if (rest.length === 0) return { err: 'touch: missing file operand\n', code: 1 };
  let err = '', code = 0;
  for (const t of rest) {
    const abs = shell.fs.resolve(t, shell.cwd, shell.home);
    const { parent, name } = shell.fs.parent(abs);
    if (!parent || parent.type !== 'dir') { err += `touch: cannot touch '${t}': No such file or directory\n`; code = 1; continue; }
    if (!parent.children[name]) parent.children[name] = file(name, '');
    else parent.children[name].mtime = Date.now();
  }
  return { err, code };
};

function copyNode(n) {
  if (n.type === 'file') return file(n.name, n.content, n.mode);
  const d = dir(n.name, n.mode);
  for (const k of Object.keys(n.children)) d.children[k] = copyNode(n.children[k]);
  return d;
}

COMMANDS.cp = (args, { shell }) => {
  const { flags, rest } = splitFlags(args);
  const recursive = flags.includes('-r') || flags.includes('-R') || flags.includes('--recursive');
  if (rest.length < 2) return { err: 'cp: missing destination file operand\n', code: 1 };
  const dest = rest.pop();
  const destAbs = shell.fs.resolve(dest, shell.cwd, shell.home);
  const destNode = shell.fs.node(destAbs);
  let err = '', code = 0;
  for (const src of rest) {
    const sAbs = shell.fs.resolve(src, shell.cwd, shell.home);
    const sNode = shell.fs.node(sAbs);
    if (!sNode) { err += `cp: cannot stat '${src}': No such file or directory\n`; code = 1; continue; }
    if (sNode.type === 'dir' && !recursive) { err += `cp: -r not specified; omitting directory '${src}'\n`; code = 1; continue; }
    const copy = copyNode(sNode);
    if (destNode && destNode.type === 'dir') {
      copy.name = sNode.name;
      destNode.children[sNode.name] = copy;
    } else {
      const { parent, name } = shell.fs.parent(destAbs);
      if (!parent || parent.type !== 'dir') { err += `cp: cannot create '${dest}': No such file or directory\n`; code = 1; continue; }
      copy.name = name;
      parent.children[name] = copy;
    }
  }
  return { err, code };
};

COMMANDS.mv = (args, { shell }) => {
  const { rest } = splitFlags(args);
  if (rest.length < 2) return { err: 'mv: missing destination file operand\n', code: 1 };
  const dest = rest.pop();
  const destAbs = shell.fs.resolve(dest, shell.cwd, shell.home);
  const destNode = shell.fs.node(destAbs);
  let err = '', code = 0;
  for (const src of rest) {
    const sAbs = shell.fs.resolve(src, shell.cwd, shell.home);
    const sNode = shell.fs.node(sAbs);
    if (!sNode) { err += `mv: cannot stat '${src}': No such file or directory\n`; code = 1; continue; }
    const sp = shell.fs.parent(sAbs);
    delete sp.parent.children[sp.name];
    if (destNode && destNode.type === 'dir') {
      destNode.children[sNode.name] = sNode;
    } else {
      const { parent, name } = shell.fs.parent(destAbs);
      if (!parent || parent.type !== 'dir') { err += `mv: cannot move '${src}': No such file or directory\n`; code = 1; continue; }
      sNode.name = name;
      parent.children[name] = sNode;
    }
  }
  return { err, code };
};

COMMANDS.rm = (args, { shell }) => {
  const { flags, rest } = splitFlags(args);
  const recursive = flags.includes('-r') || flags.includes('-R') || flags.includes('--recursive');
  const force = flags.includes('-f') || flags.includes('--force');
  if (rest.length === 0 && !force) return { err: 'rm: missing operand\n', code: 1 };
  let err = '', code = 0;
  for (const t of rest) {
    const abs = shell.fs.resolve(t, shell.cwd, shell.home);
    const node = shell.fs.node(abs);
    if (!node) { if (!force) { err += `rm: cannot remove '${t}': No such file or directory\n`; code = 1; } continue; }
    if (node.type === 'dir' && !recursive) { err += `rm: cannot remove '${t}': Is a directory\n`; code = 1; continue; }
    const { parent, name } = shell.fs.parent(abs);
    delete parent.children[name];
  }
  return { err, code };
};

COMMANDS.rmdir = (args, { shell }) => {
  const { rest } = splitFlags(args);
  let err = '', code = 0;
  for (const t of rest) {
    const abs = shell.fs.resolve(t, shell.cwd, shell.home);
    const node = shell.fs.node(abs);
    if (!node) { err += `rmdir: failed to remove '${t}': No such file or directory\n`; code = 1; continue; }
    if (node.type !== 'dir') { err += `rmdir: failed to remove '${t}': Not a directory\n`; code = 1; continue; }
    if (Object.keys(node.children).length) { err += `rmdir: failed to remove '${t}': Directory not empty\n`; code = 1; continue; }
    const { parent, name } = shell.fs.parent(abs);
    delete parent.children[name];
  }
  return { err, code };
};

function applySymbolic(node, spec) {
  // ex : u+x, go-w, a+r, u=rw
  const m = spec.match(/^([ugoa]*)([+\-=])([rwx]*)$/);
  if (!m) return false;
  let who = m[1] || 'a';
  const op = m[2];
  const perms = m[3];
  const classes = { u: 6, g: 3, o: 0 };
  const whoList = who === 'a' ? ['u', 'g', 'o'] : who.split('');
  let bits = 0;
  if (perms.includes('r')) bits |= 4;
  if (perms.includes('w')) bits |= 2;
  if (perms.includes('x')) bits |= 1;
  let mode = node.mode & 0o777;
  for (const w of whoList) {
    const sh = classes[w];
    if (op === '+') mode |= (bits << sh);
    else if (op === '-') mode &= ~(bits << sh);
    else if (op === '=') { mode &= ~(7 << sh); mode |= (bits << sh); }
  }
  node.mode = mode;
  return true;
}

COMMANDS.chmod = (args, { shell }) => {
  const { rest } = splitFlags(args.filter(a => a !== '-R'));
  const recursive = args.includes('-R');
  if (rest.length < 2) return { err: 'chmod: missing operand\n', code: 1 };
  const spec = rest[0];
  const targets = rest.slice(1);
  let err = '', code = 0;
  const applyTo = (node, spec) => {
    if (/^[0-7]{3,4}$/.test(spec)) {
      node.mode = parseInt(spec.slice(-3), 8);
      return true;
    }
    let ok = true;
    for (const part of spec.split(',')) ok = applySymbolic(node, part) && ok;
    return ok;
  };
  for (const t of targets) {
    const abs = shell.fs.resolve(t, shell.cwd, shell.home);
    const node = shell.fs.node(abs);
    if (!node) { err += `chmod: cannot access '${t}': No such file or directory\n`; code = 1; continue; }
    if (!applyTo(node, spec)) { err += `chmod: invalid mode: '${spec}'\n`; code = 1; continue; }
    if (recursive && node.type === 'dir') {
      const walk = (d) => { for (const k of Object.keys(d.children)) { applyTo(d.children[k], spec); if (d.children[k].type === 'dir') walk(d.children[k]); } };
      walk(node);
    }
  }
  return { err, code };
};

COMMANDS.grep = (args, { shell, stdin }) => {
  const { flags, rest } = splitFlags(args);
  const ignore = flags.includes('-i');
  const count = flags.includes('-c');
  const invert = flags.includes('-v');
  const number = flags.includes('-n');
  if (rest.length === 0) return { err: 'usage: grep PATTERN [FILE...]\n', code: 2 };
  const pattern = rest[0];
  const fileArgs = rest.slice(1);
  let re;
  try { re = new RegExp(pattern, ignore ? 'i' : ''); }
  catch (e) { return { err: `grep: invalid pattern\n`, code: 2 }; }
  const sources = [];
  if (fileArgs.length) {
    for (const t of fileArgs) {
      const abs = shell.fs.resolve(t, shell.cwd, shell.home);
      const node = shell.fs.node(abs);
      if (!node) { sources.push({ name: t, err: `grep: ${t}: No such file or directory` }); continue; }
      if (node.type === 'dir') { sources.push({ name: t, err: `grep: ${t}: Is a directory` }); continue; }
      sources.push({ name: t, content: node.content });
    }
  } else {
    sources.push({ name: null, content: stdin || '' });
  }
  let out = '', err = '', code = 1;
  const multi = fileArgs.length > 1;
  for (const s of sources) {
    if (s.err) { err += s.err + '\n'; code = 2; continue; }
    const lines = s.content.split('\n');
    if (lines[lines.length - 1] === '') lines.pop();
    let matched = [];
    lines.forEach((ln, i) => {
      const hit = re.test(ln);
      if (hit !== invert) matched.push({ i: i + 1, ln });
    });
    if (matched.length) code = 0;
    if (count) {
      out += (multi ? s.name + ':' : '') + matched.length + '\n';
    } else {
      for (const m of matched) {
        let prefix = multi ? s.name + ':' : '';
        if (number) prefix += m.i + ':';
        out += prefix + m.ln + '\n';
      }
    }
  }
  return { out, err, code };
};

COMMANDS.head = (args, { shell, stdin }) => {
  const { flags, rest } = splitFlags(args);
  let n = 10;
  const files = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-n') { n = parseInt(args[++i], 10); }
    else if (/^-\d+$/.test(args[i])) { n = parseInt(args[i].slice(1), 10); }
    else if (!args[i].startsWith('-')) files.push(args[i]);
  }
  return sliceLines(shell, stdin, files, 'head', n);
};
COMMANDS.tail = (args, { shell, stdin }) => {
  let n = 10;
  const files = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-n') { n = parseInt(args[++i], 10); }
    else if (/^-\d+$/.test(args[i])) { n = parseInt(args[i].slice(1), 10); }
    else if (!args[i].startsWith('-')) files.push(args[i]);
  }
  return sliceLines(shell, stdin, files, 'tail', n);
};
function sliceLines(shell, stdin, files, which, n) {
  const take = (content) => {
    const lines = content.split('\n');
    if (lines[lines.length - 1] === '') lines.pop();
    const sel = which === 'head' ? lines.slice(0, n) : lines.slice(-n);
    return sel.length ? sel.join('\n') + '\n' : '';
  };
  if (files.length === 0) return { out: take(stdin || ''), code: 0 };
  let out = '', err = '', code = 0;
  for (const t of files) {
    const abs = shell.fs.resolve(t, shell.cwd, shell.home);
    const node = shell.fs.node(abs);
    if (!node) { err += `${which}: cannot open '${t}' for reading: No such file or directory\n`; code = 1; continue; }
    out += take(node.content);
  }
  return { out, err, code };
}

COMMANDS.wc = (args, { shell, stdin }) => {
  const { flags, rest } = splitFlags(args);
  const onlyL = flags.includes('-l'), onlyW = flags.includes('-w'), onlyC = flags.includes('-c');
  const any = onlyL || onlyW || onlyC;
  const stat = (content) => {
    const lines = (content.match(/\n/g) || []).length;
    const words = content.split(/\s+/).filter(Boolean).length;
    const chars = content.length;
    let parts = [];
    if (onlyL || !any) parts.push(lines);
    if (onlyW || !any) parts.push(words);
    if (onlyC || !any) parts.push(chars);
    return parts.map(x => String(x).padStart(onlyL && any ? 0 : 0)).join(' ');
  };
  if (rest.length === 0) return { out: stat(stdin || '') + '\n', code: 0 };
  let out = '', err = '', code = 0;
  for (const t of rest) {
    const abs = shell.fs.resolve(t, shell.cwd, shell.home);
    const node = shell.fs.node(abs);
    if (!node) { err += `wc: ${t}: No such file or directory\n`; code = 1; continue; }
    out += stat(node.content) + ' ' + t + '\n';
  }
  return { out, err, code };
};

COMMANDS.find = (args, { shell }) => {
  // find [chemin] [-name motif] [-type f|d]
  let start = '.';
  let name = null, type = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-name') name = args[++i];
    else if (args[i] === '-type') type = args[++i];
    else if (!args[i].startsWith('-')) start = args[i];
  }
  const startAbs = shell.fs.resolve(start, shell.cwd, shell.home);
  const node = shell.fs.node(startAbs);
  if (!node) return { err: `find: '${start}': No such file or directory\n`, code: 1 };
  const results = [];
  const toRe = (glob) => new RegExp('^' + glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
  const re = name ? toRe(name) : null;
  const walk = (n, path) => {
    const base = path.split('/').filter(Boolean).pop() || path;
    const okType = !type || (type === 'f' && n.type === 'file') || (type === 'd' && n.type === 'dir');
    const okName = !re || re.test(base);
    if (okType && okName) results.push(path);
    if (n.type === 'dir') {
      for (const k of Object.keys(n.children).sort()) {
        walk(n.children[k], path === '/' ? '/' + k : path + '/' + k);
      }
    }
  };
  walk(node, start);
  return { out: results.join('\n') + (results.length ? '\n' : ''), code: 0 };
};

COMMANDS.ps = (args, { shell }) => {
  let out = '  PID USER     TIME  COMMAND\n';
  for (const p of shell.processes) {
    out += `${String(p.pid).padStart(5)} ${p.user.padEnd(8)} ${p.time} ${p.cmd}\n`;
  }
  return { out, code: 0 };
};

COMMANDS.kill = (args, { shell }) => {
  const { rest } = splitFlags(args);
  if (rest.length === 0) return { err: 'kill: usage: kill [-s sigspec | -signum] pid\n', code: 1 };
  let err = '', code = 0;
  for (const t of rest) {
    const pid = parseInt(t, 10);
    const idx = shell.processes.findIndex(p => p.pid === pid);
    if (idx === -1) { err += `kill: (${t}): No such process\n`; code = 1; continue; }
    if (pid === 1 || pid === 7) { err += `kill: (${t}): Operation not permitted\n`; code = 1; continue; }
    shell.processes.splice(idx, 1);
  }
  return { err, code };
};

COMMANDS.history = (args, { shell }) => {
  let out = '';
  shell.history.forEach((h, i) => { out += `${String(i + 1).padStart(5)}  ${h}\n`; });
  return { out, code: 0 };
};

COMMANDS.clear = () => ({ out: '\x0c', code: 0 }); // \x0c = demande d'effacement

COMMANDS.whoami = () => ({ out: 'root\n', code: 0 });
COMMANDS.stat = (args, { shell }) => {
  // stat -c "%a" fichier  (droits en octal)
  let fmt = null; const files = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-c') fmt = args[++i];
    else if (!args[i].startsWith('-')) files.push(args[i]);
  }
  let out = '', err = '', code = 0;
  for (const t of files) {
    const abs = shell.fs.resolve(t, shell.cwd, shell.home);
    const node = shell.fs.node(abs);
    if (!node) { err += `stat: cannot statx '${t}': No such file or directory\n`; code = 1; continue; }
    if (fmt === '%a') out += octal(node) + '\n';
    else out += `${t}: ${modeString(node)}\n`;
  }
  return { out, err, code };
};

// man : renvoie l'aide française si on la connaît
COMMANDS.man = (args) => {
  const c = args[0];
  if (c && HELP[c]) return { out: HELP[c], code: 0 };
  return { err: `man: commande inconnue : ${c || ''}. Essaie plutôt « ${c || 'ls'} --help ».\n`, code: 1 };
};

// ---------- Aides françaises (--help / man) ----------
const HELP = {
  ls: `Utilisation : ls [OPTION]... [FICHIER]...
Liste le contenu d'un dossier (le dossier courant par défaut).

  -a, --all      afficher aussi les fichiers cachés (ceux dont le nom
                 commence par un point .)
  -l             format détaillé : droits, taille, nom (un par ligne)
      --help     afficher cette aide

Exemple : ls -la    (détaillé + fichiers cachés)
`,
  cat: `Utilisation : cat [FICHIER]...
Affiche le contenu d'un ou plusieurs fichiers texte.
Sans fichier, recopie l'entrée standard (utile après un pipe |).
`,
  grep: `Utilisation : grep [OPTION]... MOTIF [FICHIER]...
Affiche les lignes qui contiennent MOTIF.
  -i   ignorer la casse (majuscules/minuscules)
  -c   compter les lignes au lieu de les afficher
  -v   afficher les lignes qui NE contiennent PAS le motif
  -n   afficher le numéro de ligne
Après un pipe : commande | grep MOTIF
`,
  chmod: `Utilisation : chmod DROITS FICHIER...
Modifie les droits d'un fichier.
  Octal : r=4  w=2  x=1, additionnés par classe Utilisateur/Groupe/Autres.
          chmod 600 = rw------- (user: lecture+écriture ; rien pour les autres)
  Symbolique : u=user g=group o=others a=tous ; + ajoute, - retire, = fixe.
          chmod u+x fichier   (rend exécutable pour l'utilisateur)
`,
};

// ---------- Export (Node + navigateur) ----------
const API = { FS, Shell, buildMirageFS, modeString, octal, COMMANDS, HELP, tokenize, splitPipes, parseRedir };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
if (typeof window !== 'undefined') window.MirageShell = API;
export { FS, Shell, buildMirageFS, modeString, octal, COMMANDS, HELP, tokenize, splitPipes, parseRedir };
