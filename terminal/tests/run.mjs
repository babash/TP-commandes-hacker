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
function sh() { return new Shell({ tty: false }); }
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
  eq(r.err, 'bash: cd: nexistepas: No such file or directory\n', 'cd inexistant');
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
  eq(s.run('mkdir exfiltration').err, 'mkdir: cannot create directory ' + String.fromCharCode(0x2018) + 'exfiltration' + String.fromCharCode(0x2019) + ': File exists\n', 'mkdir existant');
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
  eq(r.err, 'bash: foobar: command not found\n', 'commande inconnue');
  eq(r.code, 127, 'code 127');
}
{ // ps / kill
  const s = sh();
  ok(s.run('ps').out.includes('espion_mirage'), 'ps montre espion');
  const pid = s.espionPid;
  eq(s.run('kill ' + pid).code, 0, 'kill espion ok');
  ok(!s.run('ps').out.includes('espion_mirage'), 'espion disparu de ps');
  eq(s.run('kill 99999').err, 'bash: kill: (99999) - No such process\n', 'kill PID inconnu');
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


// ============================================================
//  Ajouts du 17/11 : un test par ajout
// ============================================================
import { HELP, COMMANDS, EXTERNALS } from '../shell.js';
const SRV = '/root/infiltration_mirage/serveur';
function srv() { const s = new Shell({ tty: false }); s.run('cd ~/infiltration_mirage/serveur'); return s; }
const LQ = String.fromCharCode(0x2018), RQ = String.fromCharCode(0x2019);

// --- Jokers ---
{ const s = srv();
  eq(s.run('echo *.txt').out, 'acces.txt\n', 'joker * (un niveau)');
  eq(s.run('echo */*.log').out, 'logs/access.log\n', 'joker sur deux niveaux');
  eq(s.run('echo */index.html').out, 'public/index.html\n', 'joker dans un dossier intermédiaire');
  eq(s.run('echo ?????.txt').out, 'acces.txt\n', 'joker ?');
  eq(s.run('echo [ae]*').out, 'acces.txt effacer_traces.sh\n', 'joker [ae]');
  eq(s.run('echo [!a]*.txt').out, '[!a]*.txt\n', 'joker [!a] sans correspondance gardé tel quel');
  eq(s.run('echo [a-c]*').out, 'acces.txt confidentiel\n', 'joker [a-c]');
  ok(!s.run('echo *').out.includes('.fichier_cache'), '* ne prend pas les fichiers cachés');
  eq(s.run('echo .*').out, '.fichier_cache\n', '.* prend les cachés, sans . ni ..');
  eq(s.run('echo *.zzz').out, '*.zzz\n', 'motif sans correspondance gardé tel quel');
  eq(s.run('ls *.zzz').err, "ls: cannot access '*.zzz': No such file or directory\n", 'puis la vraie erreur de la commande');
  eq(s.run('echo "*.txt" \'*.txt\' \\*.txt').out, '*.txt *.txt *.txt\n', 'guillemets et \\ empêchent le développement');
  eq(s.run('echo {a,b}.txt x{1..3}').out, 'a.txt b.txt x1 x2 x3\n', 'accolades {a,b} et {1..3}');
  eq(s.run('echo ~').out, '/root\n', 'tilde');
  s.run('cd logs'); eq(s.run('cd -').out, SRV + '\n', 'cd - affiche et revient');
  eq(s.run('pwd').out, SRV + '\n', 'cd - : bon dossier');
}
// --- Cas d'élèves demandés ---
{ const s = srv();
  eq(s.run('ls *.txt').out, 'acces.txt\n', 'élève : ls *.txt');
  s.run('echo "Erreur disque" > a.log; echo "erreur reseau" >> a.log; echo ok >> a.log');
  eq(s.run('cat *.log | grep -i erreur').out, 'Erreur disque\nerreur reseau\n', 'élève : cat *.log | grep -i erreur');
  const r = s.run('grep -rn "rapport" .');
  ok(r.out.includes('./.fichier_cache:2:Le rapport confidentiel') && r.out.includes('./logs/access.log:4:'), 'élève : grep -rn "mot" .');
  s.run('touch a.tmp b.tmp'); s.run('rm *.tmp');
  ok(!s.fs.node(SRV + '/a.tmp') && !s.fs.node(SRV + '/b.tmp'), 'élève : rm *.tmp');
  eq(s.run('rm *.tmp').err, "rm: cannot remove '*.tmp': No such file or directory\n", 'élève : rm *.tmp une 2e fois → vraie erreur');
}
// --- grep : regex de base, étendues, pièges ---
{ const s = srv(); const L = 'logs/access.log';
  const cnt = (c) => s.run(c).out.split('\n').filter(Boolean).length;
  eq(cnt('grep "^2024.*REFUSE$" ' + L), 0, 'piège : les lignes finissent par « ] », pas par REFUSE');
  eq(cnt('grep "^2024.*REFUSE\\]$" ' + L), 2, 'grep ^ .* \\] $');
  eq(cnt('grep -E "(Transfert|Deconnexion) " ' + L), 3, 'grep -E groupe et |');
  eq(cnt('grep "Transfert\\|Deconnexion" ' + L), 3, 'grep BRE \\|');
  eq(cnt('grep "o+t" ' + L), 0, 'piège : + est littéral sans -E');
  eq(cnt('grep -E "[0-9]{3}\\.[0-9]" ' + L), 3, 'grep -E {3}');
  eq(cnt('grep "[0-9]\\{3\\}\\.[0-9]" ' + L), 3, 'grep BRE \\{3\\}');
  eq(cnt('grep "[.]" acces.txt'), 1, 'piège : [.] est un point littéral');
  eq(s.run('grep -o "10\\.0\\.0\\.[0-9]*" ' + L).out.split('\n')[0], '10.0.0.42', 'grep -o');
  eq(s.run('grep -c REFUSE ' + L).out, '2\n', 'grep -c');
  eq(s.run('grep -w root ' + L).out.split('\n').filter(Boolean).length, 2, 'grep -w');
  eq(s.run('grep -A1 Deconnexion ' + L).out.split('\n').filter(Boolean).length, 2, 'grep -A');
  eq(s.run('grep rien ' + L).code, 1, 'grep : code 1 si rien');
  eq(s.run('grep x nexiste').code, 2, 'grep : code 2 si erreur');
  eq(s.run('grep -E "(" acces.txt').err, 'grep: Unmatched ( or \\(\n', 'grep : parenthèse non fermée');
  eq(s.run('grep').code, 2, 'grep sans motif : usage, code 2');
}
// --- tree ---
{ const s = srv();
  const t = s.run('tree').out;
  ok(t.startsWith('.\n') && t.includes('├── confidentiel') && t.endsWith('\n3 directories, 5 files\n'), 'tree : dessin et décompte');
  ok(s.run('tree -a').out.includes('.fichier_cache') && s.run('tree -a').out.endsWith('6 files\n'), 'tree -a');
  eq(s.run('tree -d').out.trim().split('\n').pop(), '3 directories', 'tree -d');
  eq(s.run('tree -L 1 ~').out.trim().split('\n').pop(), '1 directory, 0 files', 'tree -L 1 (et singulier)');
}
// --- ps, kill ---
{ const s = srv();
  ok(/^\s+PID TTY\s+TIME CMD\n/.test(s.run('ps').out), 'ps : en-tête');
  ok(s.run('ps').out.includes('espion_mirage.s'), 'ps : espion visible (nom tronqué à 15 caractères, comme Debian)');
  ok(s.run('ps aux').out.startsWith('USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND\n') && s.run('ps aux').out.includes('/bin/sh /tmp/espion_mirage.sh'), 'ps aux');
  ok(s.run('ps -ef').out.startsWith('UID          PID    PPID  C STIME TTY          TIME CMD\n'), 'ps -ef');
  eq(s.run('ps aux | grep -c [e]spion_mirage').out, '1\n', 'ps aux | grep [e]spion_mirage (le joker [e] est développé, sans fichier qui corresponde)');
  eq(s.run('kill abc').err, 'bash: kill: abc: arguments must be process or job IDs\n', 'kill : argument non numérique');
  ok(s.run('ps -Z').err.includes("ce terminal d'entraînement"), 'ps : option non gérée en français');
  const sl = s.processes.find(p => p.comm === 'sleep').pid;
  s.run('kill ' + sl);
  ok(s.espionAlive() && s.processes.some(p => p.comm === 'sleep' && p.pid !== sl), 'kill du sleep : l\'espion en relance un');
  s.run('kill -9 ' + s.espionPid);
  ok(!s.espionAlive(), 'kill -9 de l\'espion');
}
// --- sort, uniq, cut, tr, less, which, whoami, date, file, stat, du, df ---
{ const s = srv();
  s.run('printf_absent=1');
  s.run('echo b > l.txt; echo a >> l.txt; echo b >> l.txt; echo 10 >> l.txt; echo 9 >> l.txt');
  eq(s.run('sort l.txt').out, '10\n9\na\nb\nb\n', 'sort');
  eq(s.run('sort -n l.txt').out, 'a\nb\nb\n9\n10\n', 'sort -n');
  eq(s.run('sort l.txt | uniq -c').out, '      1 10\n      1 9\n      1 a\n      2 b\n', 'uniq -c');
  eq(s.run('cut -d" " -f4 logs/access.log | head -2').out, 'Connexion\nConnexion\n', 'cut -d -f');
  eq(s.run('echo bonjour | tr a-z A-Z').out, 'BONJOUR\n', 'tr');
  eq(s.run('cat acces.txt | less').out, 'ACCES REFUSE.\n', 'less dans un tube = cat');
  const t = new Shell({ tty: true }); const r = t.run('less ~/infiltration_mirage/message_secret.txt');
  ok(r.stream.some(c => c.pager !== undefined), 'less au terminal ouvre le pager');
  eq(s.run('which ls cd').out, '/usr/bin/ls\n', 'which');
  eq(s.run('which cd').code, 1, 'which d\'un builtin : code 1');
  eq(s.run('whoami').out, 'root\n', 'whoami');
  ok(/^\d{4}-\d\d-\d\d$/.test(s.run('date +%F').out.trim()), 'date +FORMAT');
  ok(/^[A-Z][a-z]{2} [A-Z][a-z]{2} [ \d]\d \d\d:\d\d:\d\d \S+ \d{4}$/.test(s.run('date').out.trim()), 'date (format de GNU)');
  eq(s.run('file effacer_traces.sh').out, 'effacer_traces.sh: POSIX shell script, ASCII text executable\n', 'file');
  ok(s.run('stat acces.txt').out.includes('Access: (0644/-rw-r--r--)'), 'stat');
  eq(s.run('du -sh confidentiel').out, '8.0K\tconfidentiel\n', 'du -sh');
  ok(s.run('df -h').out.startsWith('Filesystem      Size  Used Avail Use% Mounted on'), 'df -h');
}
// --- historique, !!, alias, variables, && || ; 2> < ---
{ const s = srv();
  s.run('echo salut');
  const r = s.run('!!');
  eq([r.expanded, r.out], ['echo salut', 'salut\n'], '!! : commande développée, affichée, exécutée');
  eq(s.history[s.history.length - 1], 'echo salut', '!! : la commande développée entre dans l\'historique');
  eq(s.run('!zzz').err, 'bash: !zzz: event not found\n', '!texte introuvable');
  ok(s.run('echo [!a]*').out.length > 0 && !s.run('echo [!a]*').err, '[! n\'est pas un développement d\'historique');
  s.run("alias ll='ls -l'");
  ok(s.run('ll confidentiel').out.includes('rapport.txt'), 'alias');
  eq(s.run('alias').out, "alias ll='ls -l'\n", 'alias liste');
  s.run('NOM=Agent'); eq(s.run('echo "Bonjour $NOM" $HOME $USER').out, 'Bonjour Agent /root root\n', 'variables');
  eq(s.run('false || echo plan B; true && echo ok; echo fin').out, 'plan B\nok\nfin\n', '&& || ;');
  eq(s.run('ls nexiste 2>/dev/null; echo $?').out, '2\n', '2>/dev/null et $?');
  eq(s.run('wc -l < logs/access.log').out, '8\n', 'redirection <');
  const h = s.run('history').out.split('\n').filter(Boolean);
  ok(/^\s+\d+  /.test(h[0]), 'history numérote comme bash');
}
// --- jamais faux : inconnu, absent, option non gérée ---
{ const s = srv();
  eq(s.run('mission').err, 'bash: mission: command not found\n', 'commande inconnue (les commandes du TP sont en majuscules, comme dans le script)');
  ok(s.run('nano f').err.includes("existe sur un vrai Linux"), 'commande réelle absente : message honnête');
  ok(s.run('ls --zzz').err.includes("n'est pas connue de ce terminal"), 'option longue non gérée : français');
  ok(s.run('tail -f logs/access.log').err.includes("n'est pas connue de ce terminal"), 'tail -f : français');
}
// --- l'aide couvre chaque commande ---
for (const c of Object.keys(COMMANDS)) {
  if (['env', 'printenv'].includes(c)) continue;
  ok(HELP[c] && HELP[c].length > 20, `--help/man en français pour ${c}`);
}
{ const s = srv(); ok(s.run('grep --help').out.includes('Expressions régulières'), 'grep --help'); eq(s.run('echo --help').out, '--help\n', 'echo --help affiche --help, comme bash'); }

// ============================================================
//  Les missions : aucun contournement nouveau
// ============================================================
{ // Q1 : « pwd; Q1 » ne valide pas (comme le script : la ligne d'historique n'est pas « pwd »)
  const m = newTP();
  m.shell.run('pwd; Q1');
  ok(!m.done(1), 'Q1 : « pwd; Q1 » ne valide pas, comme dans le script');
  m.shell.run('pwd'); m.shell.run('Q1');
  ok(m.done(1), 'Q1 : pwd puis Q1 valide');
}
{ // Q1 : pwd tapé il y a plus de 60 lignes ne compte plus (history | tail -60)
  const m = newTP();
  m.shell.run('pwd');
  for (let i = 0; i < 60; i++) m.shell.run('true');
  m.shell.run('Q1');
  ok(!m.done(1), 'Q1 : pwd hors des 60 dernières lignes');
}
{ // !! après pwd : bash enregistre « pwd » → valide (le script aussi)
  const m = newTP(); m.shell.run('pwd'); m.shell.run('!!'); m.shell.run('Q1'); ok(m.done(1), 'Q1 : pwd puis !! valide, comme dans bash');
}
{ // Q5 : un joker sans correspondance crée un fichier au nom littéral, pas agent.log
  const m = newTP(); m.shell.run('cd ~/infiltration_mirage/serveur'); m.shell.run('touch agent.lo?'); m.shell.run('Q5');
  ok(!m.done(5) && m.shell.fs.node(SRV + '/agent.lo?'), 'Q5 : touch agent.lo? ne valide pas (fichier « agent.lo? » créé, comme bash)');
}
{ // Q6 avec un joker : accepté, comme par le script (il vérifie le fichier)
  const m = newTP(); m.shell.run('cd ~/infiltration_mirage/serveur'); m.shell.run('mkdir exfiltration'); m.shell.run('cp confidentiel/* exfiltration/'); m.shell.run('Q6');
  ok(m.done(6), 'Q6 : cp confidentiel/* exfiltration/ valide (le script l\'accepte aussi)');
}
{ // Q9 : chmod avec un joker sur le bon fichier : accepté, comme le script
  const m = newTP(); const sh = m.shell; sh.run('cd ~/infiltration_mirage/serveur'); sh.run('mkdir exfiltration'); sh.run('cp confidentiel/rapport.txt exfiltration/rapport_cache.txt');
  sh.run('chmod 600 exfiltration/*'); sh.run('Q9'); ok(m.done(9), 'Q9 : chmod 600 exfiltration/* valide');
}
{ // Q2, Q4 : réponses sensibles à la casse, comme les « case » du script ; un joker n'est pas développé dans une réponse
  const m = newTP();
  m.shell.run('Q2'); m.shell.run('ACCES.TXT'); ok(!m.done(2), 'Q2 : ACCES.TXT refusé (comme le script)');
  m.shell.run('Q2'); m.shell.run('*.txt'); ok(!m.done(2), 'Q2 : « *.txt » refusé, la réponse n\'est pas développée');
  m.shell.run('Q4'); m.shell.run('M1R4G3_2024'); ok(!m.done(4), 'Q4 : M1R4G3_2024 refusé (comme le script)');
  m.shell.run('Q4'); m.shell.run('m1r4g3_2024'); ok(m.done(4), 'Q4 : m1r4g3_2024 accepté (comme le script)');
  ok(!m.shell.history.includes('*.txt'), 'les réponses aux questions n\'entrent pas dans l\'historique');
}
{ // Q11 : kill -9 et ps aux marchent ; tuer le sleep ne suffit pas
  const m = newTP(); const sh = m.shell;
  const sl = sh.processes.find(p => p.comm === 'sleep').pid;
  sh.run('kill ' + sl); sh.run('Q11'); sh.run('0');
  ok(!m.done(11), 'Q11 : tuer le sleep ne neutralise pas l\'espion');
  sh.run('kill -9 ' + sh.espionPid); sh.run('Q11');
  ok(m.done(11), 'Q11 : kill -9 PID valide');
}
{ // Q14/Q15 avec les nouveaux outils : grep -c donne bien 2 ; history | grep Q marche
  const m = newTP(); const sh = m.shell;
  eq(sh.run('grep -c Transfert ~/infiltration_mirage/serveur/logs/access.log').out, '2\n', 'Q14 : grep -c confirme 2');
  sh.run('Q1'); sh.run('history | grep Q');
  ok(sh.run('history | grep Q').out.includes('Q1'), 'Q15 : history | grep Q liste les Qn');
}
{ // Les commandes du TP marchent après ; et dans un tube, comme des fonctions sh
  const m = newTP(); const sh = m.shell;
  const r = sh.run('cd ~/infiltration_mirage/serveur && Q3');
  ok(m.done(3), 'Q3 : « cd … && Q3 » valide, comme avec la fonction du script');
  ok(sh.run('MISSION | grep -c Q').out.trim() !== '0', 'MISSION | grep : la sortie du TP passe dans un tube');
}

console.log(`\n  Tests : ${pass} réussis, ${fail} échoués\n`);
if (fail) { console.log(fails.map(f => '  ✗ ' + f).join('\n') + '\n'); process.exit(1); }
