// Banc différentiel : compare le terminal intégré à un vrai bash 5 + GNU coreutils.
// L'arborescence du TP est recréée sur disque à partir de buildMirageFS()
// (le code de ce terminal), jamais en lançant le script du TP.
// Lancer (Linux, bash et GNU coreutils/grep installés) : node terminal/tests/diff.mjs
import { spawnSync } from 'node:child_process';
import fsn from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Shell, buildMirageFS } from '../shell.js';

const base = fsn.mkdtempSync(path.join(process.env.MIRAGE_TMP || os.tmpdir(), 'mirage-diff-'));

function writeTree(node, dst) {
  if (node.type === 'dir') {
    fsn.mkdirSync(dst, { recursive: true });
    for (const k of Object.keys(node.children)) writeTree(node.children[k], path.join(dst, k));
    fsn.chmodSync(dst, node.mode);
  } else {
    fsn.writeFileSync(dst, node.content);
    fsn.chmodSync(dst, node.mode);
  }
}
// Quelques fichiers en plus, pour les cas d'élèves (*.tmp, erreurs, doublons…)
function extras(fs) {
  const srv = fs.node('/root/infiltration_mirage/serveur');
  const mk = (name, content) => { srv.children[name] = { type: 'file', name, content, mode: 0o644, mtime: Date.now() }; };
  mk('a.tmp', 'brouillon\n');
  mk('b.tmp', '');
  mk('erreurs.log', 'INFO demarrage\nErreur disque\nERREUR reseau\ninfo fin\nerreur: memoire\n');
  mk('noms.txt', 'zoe\nAli\nbob\nali\nbob\n10\n9\n');
  mk('notes.csv', 'nom;note;classe\nAli;12;1G1\nZoe;15;1G2\nBob;9;1G1\n');
}

let n = 0, ok = 0;
const fails = [];
const voulus = [];
function norm(s, root) {
  return s.split(root).join('')
    .replace(/[A-Z][a-z]{2} [ 0-9]\d \d\d:\d\d/g, 'DATE')
    .split('\n').filter(l => !/no job control|cannot set terminal process group|Inappropriate ioctl/.test(l)).join('\n');
}
function check(cmd, opts = {}) {
  n++;
  const dir = path.join(base, 'case' + n);
  const fs = buildMirageFS();
  extras(fs);
  writeTree(fs.node('/root'), path.join(dir, 'root'));
  const home = path.join(dir, 'root');
  const rel = opts.cwd === undefined ? 'infiltration_mirage/serveur' : opts.cwd;
  const real = spawnSync('bash', ['--norc', '--noprofile', '-i', '-c', cmd], {
    cwd: path.join(home, rel),
    env: { HOME: home, PATH: '/usr/bin:/bin', LC_ALL: 'C.UTF-8', TERM: 'dumb', USER: 'root', LOGNAME: 'root' },
    encoding: 'utf8',
  });
  const sh = new Shell({ fs, tty: false });
  sh.cwd = rel ? '/root/' + rel : '/root';
  sh.env.PWD = sh.cwd;
  const mine = sh.run(cmd);
  let ro = norm(real.stdout, dir), re = norm(real.stderr, dir);
  let mo = norm(mine.out, ''), me = norm(mine.err, '');
  if (opts.sort) { const s = x => x.split('\n').filter(Boolean).sort().join('\n'); ro = s(ro); mo = s(mo); }
  const same = ro === mo && re.trim() === me.trim() && real.status === mine.code;
  if (opts.voulu) { voulus.push(`$ ${cmd}  (${opts.voulu})`); if (real.status === mine.code || opts.voulu) return; }
  if (same) ok++;
  else fails.push(`$ ${cmd}\n  bash  : code ${real.status}\n${indent(ro)}${re ? indent('[err] ' + re) : ''}  ici   : code ${mine.code}\n${indent(mo)}${me ? indent('[err] ' + me) : ''}`);
}
const indent = s => s ? s.replace(/\n$/, '').split('\n').map(l => '    | ' + l).join('\n') + '\n' : '';

// ---------- Jokers ----------
check('echo *.txt');
check('echo *');
check('echo .*');
check('echo */*.txt');
check('echo */index.html');
check('echo ?????.txt');
check('echo [ae]*');
check('echo [a-c]*.tmp');
check('echo [!a]*.txt');
check('echo [^a]*.txt');
check('echo *.zzz');
check('ls *.zzz');
check('echo "*.txt" \'*.txt\' \\*.txt');
check('echo {a,b}.tmp');
check('echo x{1..3} {c..a}');
check('ls *.txt');
check('ls -d */');
check('ls conf*');
check('ls ~/infiltration_mirage/*');
check('cat */*.log | grep -c Transfert');
check('rm *.tmp; ls');
check('cp *.txt public/; ls public');
check('echo ~ ~/x');
check('cd logs; cd -; pwd');
check('cd ..; pwd; cd ~; pwd');
check('cd -');
check('cd nulle_part');
check('cd acces.txt');
// ---------- Variables, opérateurs, redirections ----------
check('echo $HOME $USER');
check('X=bonjour; echo $X "$X" \'$X\'');
check('echo $NEXISTEPAS fin');
check('echo "$NEXISTEPAS" | wc -c');
check('true && echo oui || echo non');
check('false && echo oui || echo non');
check('ls nexiste 2>/dev/null; echo code=$?');
check('ls nexiste 2> err.txt; cat err.txt');
check('ls acces.txt nexiste > out.txt 2>&1; cat out.txt');
check('echo un > f.txt; echo deux >> f.txt; cat f.txt');
check('wc -l < logs/access.log');
check('cat < nexiste');
check('echo a > nexiste/f');
check('ls | wc -l');
check('foo');
check('ls | foo');
check('echo a; ; echo b');
check('| ls');
check('echo -e "a\\tb\\nc"');
check('echo -n sans; echo');
// ---------- grep ----------
check('grep Transfert logs/access.log');
check('cat logs/access.log | grep Transfert');
check('grep -c REFUSE logs/access.log');
check('grep -n Connexion logs/access.log');
check('grep -i erreur erreurs.log');
check('cat *.log | grep -i erreur');
check('grep -v OK logs/access.log');
check('grep -w root logs/access.log');
check('grep -o "10\\.0\\.0\\.[0-9]*" logs/access.log');
check('grep "^2024.*REFUSE$" logs/access.log');
check('grep "[0-9]\\{3\\}\\.[0-9]" logs/access.log');
check('grep -E "[0-9]{3}\\.[0-9]" logs/access.log');
check('grep -E "(Transfert|Deconnexion) " logs/access.log');
check('grep "Transfert\\|Deconnexion" logs/access.log');
check('grep -E "o+t" logs/access.log');
check('grep "o+t" logs/access.log');
check('grep -E "ex?i" logs/access.log');
check('grep "\\(ab\\)*c" erreurs.log');
check('grep -E "^(info|INFO)" erreurs.log');
check('grep "a.c" logs/access.log');
check('grep "\\." acces.txt');
check('grep "[.]" acces.txt');
check('grep "[[:upper:]]\\{5\\}" erreurs.log');
check('grep -x "info fin" erreurs.log');
check('grep -l MIRAGE *.txt public/index.html');
check('grep -c . *.txt');
check('grep -rn MIRAGE .', { sort: true });
check('grep -r Transfert', { sort: true });
check('grep -A1 Deconnexion logs/access.log');
check('grep -B2 -n admin logs/access.log');
check('grep -C1 -e cles -e admin logs/access.log');
check('grep -m 2 OK logs/access.log');
check('grep -q OK logs/access.log; echo $?');
check('grep rien logs/access.log; echo $?');
check('grep x nexiste; echo $?');
check('grep x logs; echo $?');
check('grep -E "(" acces.txt');
check('grep "\\(" acces.txt');
check('grep "a\\{2" acces.txt');
check('grep -F "a.c" logs/access.log; echo $?');
check('grep');
check('grep -e Transfert -e REFUSE -c logs/access.log');
check('grep -h REFUSE logs/access.log erreurs.log; grep -H Deco logs/access.log');
check('grep -ri "erreur" .', { sort: true });
// ---------- Autres commandes ----------
check('sort noms.txt');
check('sort -r noms.txt');
check('sort -n noms.txt');
check('sort -u noms.txt');
check('sort -f noms.txt');
check('sort noms.txt | uniq');
check('sort noms.txt | uniq -c');
check('sort noms.txt | uniq -d');
check('sort noms.txt | uniq -u');
check('sort -t";" -k2 -n notes.csv');
check('cut -d";" -f1 notes.csv');
check('cut -d";" -f2,3 notes.csv');
check('cut -c1-10 logs/access.log');
check('cut -d" " -f4 logs/access.log | sort | uniq -c');
check('echo bonjour | tr a-z A-Z');
check('echo "a  b   c" | tr -s " "');
check('echo h3ll0 | tr -d 0-9');
check("echo abc | tr '[:lower:]' '[:upper:]'");
check('tr a b', { voulu: 'sans tube, ce terminal ne lit pas le clavier : message en français' });
check('head -3 logs/access.log');
check('head -n 2 logs/access.log acces.txt');
check('tail -2 logs/access.log');
check('tail -n +7 logs/access.log');
check('wc logs/access.log');
check('wc -l logs/access.log acces.txt');
check('cat logs/access.log | wc');
check('cat logs/access.log | wc -l');
check('wc -w acces.txt');
check('cat -n acces.txt');
check('ls');
check('ls -a');
check('ls -A');
check('ls -l', {});
check('ls -la confidentiel');
check('ls -lh logs');
check('ls -1 confidentiel logs acces.txt');
check('ls -R');
check('ls -F');
check('ls acces.txt nexiste');
check('ls -z', { voulu: 'option non gérée : message en français (consigne)' });
check('mkdir archive; mkdir archive');
check('mkdir -p a/b/c; ls -R a');
check('mkdir x/y');
check('touch nouveau; ls nouveau');
check('cp confidentiel/rapport.txt .; ls rapport.txt');
check('cp confidentiel .');
check('cp -r confidentiel copie; ls copie');
check('cp nexiste x');
check('cp acces.txt');
check('mv acces.txt nouveau.txt; ls *.txt');
check('mv nexiste x');
check('rm nexiste');
check('rm confidentiel');
check('rm -r confidentiel; ls');
check('rm -f nexiste; echo $?');
check('rmdir confidentiel');
check('chmod 600 acces.txt; stat -c %a acces.txt');
check('chmod u+x effacer_traces.sh; stat -c %A effacer_traces.sh');
check('chmod +x acces.txt; stat -c %a acces.txt');
check('chmod go-r acces.txt; stat -c %A acces.txt');
check('chmod a=r acces.txt; stat -c %a acces.txt');
check('chmod abc acces.txt');
check('chmod 600 nexiste');
check('chmod 600');
check('./effacer_traces.sh');
check('chmod u+x effacer_traces.sh; ./effacer_traces.sh');
check('sh effacer_traces.sh');
check('./nexiste.sh');
check('./logs');
check('file acces.txt effacer_traces.sh logs b.tmp public/index.html');
check('stat -c "%n %s %F" acces.txt logs b.tmp');
check('stat nexiste');
check('du -s confidentiel');
check('du confidentiel logs');
check('du -sh ~/infiltration_mirage');
check('find . -name "*.txt"', { sort: true });
check('find . -type d', { sort: true });
check('find ~ -name rapport.txt');
check('find . -name *.tmp');
check('find . -maxdepth 1 -type f', { sort: true });
check('find nexiste');
check('which ls grep cd; echo $?');
check('type cd ls');
check('whoami');
check('kill 99999');
check('kill abc');
check('history 0');
check('alias ll="ls -l"; alias');
check('cd; pwd');

console.log(`\n  Banc différentiel : ${ok}/${n - voulus.length} identiques à bash (+ ${voulus.length} écarts voulus)\n`);
for (const v of voulus) console.log('  écart voulu : ' + v);
if (fails.length) console.log(fails.join('\n') + '\n');
fsn.rmSync(base, { recursive: true, force: true });
process.exit(fails.length ? 1 : 0);
