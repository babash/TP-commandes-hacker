// Tests Node du shell et du TP MIRAGE. Lancer : node terminal/tests/run.mjs
import { Shell, buildMirageFS } from '../shell.js';
import { Mirage, NB_Q } from '../mirage.js';

let pass = 0, fail = 0;
const fails = [];
function eq(actual, expected, msg) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { pass++; } else { fail++; fails.push(`${msg}\n    attendu ${e}\n    obtenu  ${a}`); }
}
function ok(cond, msg) { if (cond) pass++; else { fail++; fails.push(msg); } }
const strip = h => (h || '').replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

// ---------- Shell : commandes de base ----------
function sh() { return new Shell(); }
{
  const s = sh();
  eq(s.run('pwd').out, '/root\n', 'pwd');
  eq(s.run('cd infiltration_mirage/serveur').code, 0, 'cd ok');
  eq(s.run('pwd').out, '/root/infiltration_mirage/serveur\n', 'pwd après cd');
  eq(s.run('cd ~').code, 0, 'cd ~');
  eq(s.run('pwd').out, '/root\n', 'cd ~ ramène au home');
}
{ // cd erreur
  const s = sh();
  const r = s.run('cd nexistepas');
  eq(r.err, 'cd: nexistepas: No such file or directory\n', 'cd inexistant');
  eq(r.code, 1, 'cd code 1');
}
{ // ls simple / -a / -la
  const s = sh();
  s.run('cd ~/infiltration_mirage/serveur');
  const r = s.run('ls');
  ok(r.out.includes('acces.txt') && !r.out.includes('.fichier_cache'), 'ls cache les points');
  const ra = s.run('ls -a');
  ok(ra.out.includes('.fichier_cache'), 'ls -a montre les cachés');
  const rl = s.run('ls -la');
  ok(/drwx.* confidentiel/.test(rl.out) || /d.* confidentiel/.test(rl.out), 'ls -la format long sur dossier');
  ok(rl.out.includes('.fichier_cache'), 'ls -la montre les cachés');
}
{ // ls --help en français mentionne -a
  const s = sh();
  const r = s.run('ls --help');
  ok(/-a/.test(r.out) && /cach/.test(r.out), 'ls --help FR parle de -a et des fichiers cachés');
}
{ // cat + erreur
  const s = sh();
  const r = s.run('cat ~/infiltration_mirage/message_secret.txt');
  ok(r.out.includes('M1r4g3_2024'), 'cat message_secret contient le mot de passe');
  const e = s.run('cat nope.txt');
  eq(e.err, 'cat: nope.txt: No such file or directory\n', 'cat fichier absent');
}
{ // touch, mkdir, cp, mv, rm
  const s = sh();
  s.run('cd ~/infiltration_mirage/serveur');
  eq(s.run('touch agent.log').code, 0, 'touch');
  ok(s.fs.node('/root/infiltration_mirage/serveur/agent.log'), 'agent.log créé');
  eq(s.run('mkdir exfiltration').code, 0, 'mkdir');
  eq(s.run('mkdir exfiltration').err, "mkdir: cannot create directory 'exfiltration': File exists\n", 'mkdir existant');
  eq(s.run('cp confidentiel/rapport.txt exfiltration/').code, 0, 'cp vers dossier');
  ok(s.fs.node('/root/infiltration_mirage/serveur/exfiltration/rapport.txt'), 'rapport.txt copié');
  eq(s.run('mv exfiltration/rapport.txt exfiltration/rapport_cache.txt').code, 0, 'mv renomme');
  ok(!s.fs.node('/root/infiltration_mirage/serveur/exfiltration/rapport.txt'), 'ancien nom disparu');
  ok(s.fs.node('/root/infiltration_mirage/serveur/exfiltration/rapport_cache.txt'), 'nouveau nom présent');
  eq(s.run('cp nope.txt x').err, "cp: cannot stat 'nope.txt': No such file or directory\n", 'cp source absente');
}
{ // chmod octal + symbolique
  const s = sh();
  s.run('cd ~/infiltration_mirage/serveur');
  s.run('mkdir exfiltration'); s.run('cp confidentiel/rapport.txt exfiltration/rapport_cache.txt');
  eq(s.run('chmod 600 exfiltration/rapport_cache.txt').code, 0, 'chmod 600');
  eq(s.run('stat -c %a exfiltration/rapport_cache.txt').out, '600\n', 'stat %a = 600');
  // effacer_traces.sh démarre en 644, chmod u+x -> exécutable
  const before = s.fs.node('/root/infiltration_mirage/serveur/effacer_traces.sh').mode & 0o111;
  eq(before, 0, 'effacer_traces.sh non exécutable au départ');
  s.run('chmod u+x effacer_traces.sh');
  ok(s.fs.node('/root/infiltration_mirage/serveur/effacer_traces.sh').mode & 0o100, 'u+x pose le bit x user');
}
{ // grep + pipe + redirection
  const s = sh();
  const r = s.run('cat ~/infiltration_mirage/serveur/logs/access.log | grep Transfert');
  eq(r.out.split('\n').filter(Boolean).length, 2, 'cat | grep Transfert = 2 lignes');
  const r2 = s.run('grep REFUSE ~/infiltration_mirage/serveur/logs/access.log');
  eq(r2.out.split('\n').filter(Boolean).length, 2, 'grep direct REFUSE = 2 lignes');
  s.run('cd ~'); s.run('echo bonjour > note.txt');
  eq(s.fs.node('/root/note.txt').content, 'bonjour\n', 'echo > écrit');
  s.run('echo suite >> note.txt');
  eq(s.fs.node('/root/note.txt').content, 'bonjour\nsuite\n', 'echo >> ajoute');
}
{ // head / tail / wc / find
  const s = sh();
  const log = '~/infiltration_mirage/serveur/logs/access.log';
  eq(s.run('wc -l ' + log).out.trim().split(/\s+/)[0], '8', 'wc -l = 8 lignes');
  eq(s.run('head -2 ' + log).out.split('\n').filter(Boolean).length, 2, 'head -2');
  eq(s.run('tail -1 ' + log).out.split('\n').filter(Boolean).length, 1, 'tail -1');
  const f = s.run('find ~/infiltration_mirage -name rapport.txt');
  ok(f.out.includes('rapport.txt'), 'find -name rapport.txt');
}
{ // commande inconnue
  const s = sh();
  const r = s.run('foobar');
  eq(r.err, 'foobar: command not found\n', 'commande inconnue');
  eq(r.code, 127, 'code 127');
}
{ // ps / kill
  const s = sh();
  ok(s.run('ps').out.includes('espion_mirage'), 'ps montre espion');
  const pid = s.espionPid;
  eq(s.run('kill ' + pid).code, 0, 'kill espion ok');
  ok(!s.run('ps').out.includes('espion_mirage'), 'espion disparu de ps');
  eq(s.run('kill 99999').err, 'kill: (99999): No such process\n', 'kill PID inconnu');
}

// ---------- MIRAGE : parcours solution complet ----------
function newTP() {
  let saved = null;
  const m = new Mirage(Shell, { save: s => { saved = s; } });
  return m;
}
// Les solutions attendues de chaque mission, dans l'ordre.
function solveAll(m) {
  const sh = m.shell;
  sh.run('pwd'); sh.run('Q1');
  sh.run('ls ~/infiltration_mirage/serveur/'); sh.run('Q2'); sh.run('acces.txt');
  sh.run('cd ~/infiltration_mirage/serveur'); sh.run('Q3');
  sh.run('cat ~/infiltration_mirage/message_secret.txt'); sh.run('Q4'); sh.run('M1r4g3_2024');
  sh.run('touch ~/infiltration_mirage/serveur/agent.log'); sh.run('Q5');
  sh.run('mkdir ~/infiltration_mirage/serveur/exfiltration');
  sh.run('cp ~/infiltration_mirage/serveur/confidentiel/rapport.txt ~/infiltration_mirage/serveur/exfiltration/'); sh.run('Q6');
  sh.run('mv ~/infiltration_mirage/serveur/exfiltration/rapport.txt ~/infiltration_mirage/serveur/exfiltration/rapport_cache.txt'); sh.run('Q7');
  sh.run('mkdir ~/infiltration_mirage/serveur/archive'); sh.run('Q8');
  sh.run('chmod 600 ~/infiltration_mirage/serveur/exfiltration/rapport_cache.txt'); sh.run('Q9');
  sh.run('chmod u+x ~/infiltration_mirage/serveur/effacer_traces.sh'); sh.run('Q10');
  const pid = sh.espionPid;
  sh.run('ps'); sh.run('Q11'); sh.run(String(pid)); sh.run('kill ' + pid); sh.run('Q11');
  sh.run('ls --help'); sh.run('Q12'); sh.run('-a');
  sh.run('ls -la ~/infiltration_mirage/serveur/'); sh.run('Q13'); sh.run('.fichier_cache');
  sh.run('cat ~/infiltration_mirage/serveur/logs/access.log | grep Transfert'); sh.run('Q14'); sh.run('2');
  sh.run('history | grep Q'); sh.run('Q15'); sh.run('Q1');
}
{
  const m = newTP();
  solveAll(m);
  eq(m.total(), NB_Q, 'parcours solution : 15/15 missions validées');
  for (let i = 1; i <= NB_Q; i++) ok(m.done(i), 'Q' + i + ' validée par la solution');
}

// ---------- MIRAGE : erreurs typiques → bon message + bon indice ----------
{
  // Q1 sans avoir tapé pwd
  const m = newTP();
  const r = strip(m.shell.run('Q1').html);
  ok(/pwd non detecte/.test(r) && /Indice 1\/3/.test(r), 'Q1 sans pwd : message + indice 1');
  ok(!m.done(1), 'Q1 non validée');
  // 2e échec -> indice 2
  const r2 = strip(m.shell.run('Q1').html);
  ok(/Indice 2\/3/.test(r2), 'Q1 2e échec : indice 2');
  const r3 = strip(m.shell.run('Q1').html);
  ok(/Indice 3\/3/.test(r3) && /Solution/.test(r3), 'Q1 3e échec : solution');
}
{
  // Q2 mauvaise réponse : la réponse n'apparaît PAS au 1er échec
  const m = newTP();
  m.shell.run('Q2');
  const r = strip(m.shell.run('log.txt').html);
  ok(/Indice 1\/3/.test(r) && !/acces\.txt/.test(r), 'Q2 1er échec : indice sans la réponse');
  m.shell.run('Q2'); const r2 = strip(m.shell.run('log.txt').html);
  ok(/Indice 2\/3/.test(r2) && !/Reponse : acces/.test(r2), 'Q2 2e échec : toujours pas la réponse');
  m.shell.run('Q2'); const r3 = strip(m.shell.run('log.txt').html);
  ok(/Reponse : acces\.txt/.test(r3), 'Q2 3e échec : la réponse apparaît');
}
{
  // Q14 : mauvais compte -> indice, bonne réponse "deux" acceptée
  const m = newTP();
  m.shell.run('Q14'); const r = strip(m.shell.run('5').html);
  ok(/Compte les lignes/.test(r), 'Q14 mauvais compte : message');
  m.shell.run('Q14'); const r2 = strip(m.shell.run('deux').html);
  ok(m.done(14), 'Q14 "deux" accepté');
}
{
  // Q9 avant Q7 : message spécifique
  const m = newTP();
  m.shell.run('Q9');
  const r = strip(m.shell.run('Q9').html); // relance pour voir le fail (1re fois pose rien car fichier absent)
  ok(/rapport_cache.txt absent/.test(strip(m.shell.run('Q9').html)) || /Termine Q7/.test(r), 'Q9 sans Q7 : message dépendance');
}
{
  // Q11 : PID incorrect -> indice ; puis bon PID -> invite kill ; puis kill -> validé
  const m = newTP();
  m.shell.run('Q11');
  const bad = strip(m.shell.run('12345').html);
  ok(/PID incorrect/.test(bad), 'Q11 mauvais PID : message');
  m.shell.run('Q11');
  const good = strip(m.shell.run(String(m.shell.espionPid)).html);
  ok(/Correct/.test(good) && /kill/.test(good), 'Q11 bon PID : invite à kill');
  m.shell.run('kill ' + m.shell.espionPid);
  m.shell.run('Q11');
  ok(m.done(11), 'Q11 validée après kill');
}
{
  // Persistance : l'état est restauré
  let saved = null;
  const m1 = new Mirage(Shell, { save: s => { saved = s; } });
  m1.shell.run('pwd'); m1.shell.run('Q1');
  m1.shell.run('touch ~/infiltration_mirage/serveur/agent.log'); m1.shell.run('Q5');
  const m2 = new Mirage(Shell, { state: saved, save: () => {} });
  ok(m2.done(1) && m2.done(5), 'persistance : Q1 et Q5 restaurées');
  ok(m2.shell.fs.node('/root/infiltration_mirage/serveur/agent.log'), 'persistance : fichier agent.log restauré');
}

console.log(`\n  Tests : ${pass} réussis, ${fail} échoués\n`);
if (fail) { console.log(fails.map(f => '  ✗ ' + f).join('\n') + '\n'); process.exit(1); }
