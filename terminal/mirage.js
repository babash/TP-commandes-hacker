// ============================================================
//  Opération MIRAGE — la logique du TP (missions, indices, badges)
//  Portage fidèle du script tp_infiltration.sh v11.1.
//  Textes des missions et des indices : CC BY-SA 4.0 (repris du script).
//  Code : MIT. Auteur : Babash - NSI Tani Malandi.
// ============================================================

'use strict';

const NB_Q = 15;
const TP = '/root/infiltration_mirage';

// --- Petites aides pour produire du HTML coloré et échappé ---
function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function col(cls, s) { return `<span class="${cls}">${esc(s)}</span>`; }
const g = s => col('g', s), r = s => col('r', s), y = s => col('y', s),
      c = s => col('c', s), dim = s => col('dim', s), b = s => col('b', s);

// Contexte et tâche de chaque mission (pour MISSION), repris du script.
const MISSIONS = [
  { n: 1, cmd: 'pwd', ctx: 'Où es-tu exactement ?', tache: 'Taper pwd puis Q1.' },
  { n: 2, cmd: 'ls', ctx: 'Le serveur contient des fichiers et dossiers.', tache: 'Lister le contenu de serveur/ puis taper Q2.' },
  { n: 3, cmd: 'cd', ctx: "Lister c'est bien, entrer dans la zone c'est mieux.", tache: 'Aller dans ~/infiltration_mirage/serveur/ puis taper Q3.' },
  { n: 4, cmd: 'cat', ctx: "Un message chiffré t'attend.", tache: 'Lire message_secret.txt puis taper Q4.' },
  { n: 5, cmd: 'touch', ctx: 'Laisse une empreinte numérique sur ce serveur.', tache: 'Créer serveur/agent.log puis taper Q5.' },
  { n: 6, cmd: 'cp', ctx: 'Le rapport confidentiel doit être exfiltré.', tache: 'Copier confidentiel/rapport.txt dans serveur/exfiltration/ puis Q6.' },
  { n: 7, cmd: 'mv', ctx: 'Le nom rapport.txt est trop visible. Camouflons-le.', tache: 'Renommer exfiltration/rapport.txt en rapport_cache.txt puis Q7.' },
  { n: 8, cmd: 'mkdir', ctx: 'Il faut une zone de stockage supplémentaire.', tache: 'Créer serveur/archive/ puis taper Q8.' },
  { n: 9, cmd: 'chmod 600', ctx: 'Le rapport caché doit être inaccessible aux autres.', tache: 'Droits 600 sur exfiltration/rapport_cache.txt puis Q9.' },
  { n: 10, cmd: 'chmod u+x', ctx: "Le script d'effacement est bloqué. Il faut l'armer.", tache: 'Rendre effacer_traces.sh exécutable puis Q10.' },
  { n: 11, cmd: 'ps + kill', ctx: 'Un processus espion surveille le serveur.', tache: "Trouver son PID avec ps, l'éliminer avec kill, puis Q11." },
  { n: 12, cmd: 'ls --help', ctx: 'Certains fichiers sont cachés. Il faut la bonne option.', tache: 'Consulter ls --help puis taper Q12.' },
  { n: 13, cmd: 'ls -la', ctx: "Mets en pratique l'option trouvée en Q12.", tache: 'Lister serveur/ avec les fichiers cachés puis taper Q13.' },
  { n: 14, cmd: 'cat|grep', ctx: 'Le journal access.log contient des lignes suspectes.', tache: 'Filtrer access.log avec cat | grep Transfert puis Q14.' },
  { n: 15, cmd: 'history|grep', ctx: 'Même principe, sur ton historique de commandes.', tache: 'Exécuter history | grep Q puis taper Q15.' },
];
const PHASES = {
  1: 'Phase 1 : Reconnaissance', 5: 'Phase 2 : Manipulation de fichiers',
  9: 'Phase 3 : Droits', 11: 'Phase 4 : Processus', 12: 'Phase 5 : Options et pipe |',
};
const BADGES = {
  1: ['Q1  ACCOMPLIE  Bonne orientation, agent·e.'],
  2: ['Q2  ACCOMPLIE  Première reconnaissance réussie.'],
  3: ['Q3  ACCOMPLIE  Tu es dans la place.'],
  4: ['Q4  ACCOMPLIE  Message déchiffré.'],
  5: ['Q5  ACCOMPLIE  Empreinte enregistrée.'],
  6: ['Q6  ACCOMPLIE  Rapport exfiltré.'],
  7: ['Q7  ACCOMPLIE  Fichier dissimulé.'],
  8: ['Q8  ACCOMPLIE  Zone de transit prête.'],
  9: ['Q9  ACCOMPLIE  Fichier protégé (rw-------)'],
  10: ['Q10 ACCOMPLIE  Script armé et prêt.'],
  11: ['Q11 ACCOMPLIE  Espion neutralisé.'],
  12: ['Q12 ACCOMPLIE  La documentation, ton alliée.'],
  13: ['Q13 ACCOMPLIE  Les fichiers cachés sont vus.'],
  14: ['Q14 ACCOMPLIE  LE PIPE EST DÉBLOQUÉ !', 'Outil fondamental du terminal. Retiens-le.'],
  15: ['Q15 ACCOMPLIE  *** OPÉRATION TERMINÉE ***', 'Toutes les missions accomplies. Bien joué.'],
};

// Indices gradués (niveaux 1, 2, 3), repris mot pour mot du script.
const HINT1 = {
  1: ['Commande : pwd — affiche le chemin du répertoire courant.'],
  2: ['Commande : ls — liste le contenu d\'un dossier.', 'Le fichier cherché a un nom qui finit par .txt.'],
  3: ['Commande : cd — change de répertoire. Taper cd puis le chemin, puis Q3.'],
  4: ['Commande : cat — affiche le contenu d\'un fichier texte.'],
  5: ['Commande : touch /chemin/fichier — crée un fichier vide.'],
  6: ['Commande : cp source destination — copie un fichier.', 'Créer d\'abord exfiltration/ : mkdir ~/infiltration_mirage/serveur/exfiltration'],
  7: ['Commande : mv ancien nouveau — renomme un fichier.'],
  8: ['Commande : mkdir /chemin/dossier — crée un dossier.'],
  9: ['Commande : chmod — modifie les droits. r=4 w=2 x=1.', '600 = User(r+w=6) Group(0) Others(0).'],
  10: ['Commande : chmod u+x fichier — rend exécutable.', 'u=user  +=ajouter  x=exécution'],
  11: ['Commande : ps — liste les processus. La colonne 1 est le PID.', 'Chercher la ligne espion_mirage.'],
  12: ['Utiliser : ls --help (ou man ls)', 'Chercher l\'option marquée « all » ou « cachés ».'],
  13: ['Commande : ls -la — l=détails, a=all (fichiers cachés).', 'Les fichiers cachés ont un nom commençant par un point.'],
  14: ['Le pipe | : commande1 | commande2', 'La sortie de gauche devient l\'entrée de droite.', 'grep mot filtre les lignes contenant \'mot\'.'],
  15: ['history affiche les commandes déjà tapées.', 'Le combiner avec grep par le pipe : history | grep Q'],
};
const HINT2 = {
  1: ['???'],
  2: ['ls ~/infiltration_mirage/???/  (le dossier du serveur)'],
  3: ['cd ~/infiltration_mirage/???/  puis Q3'],
  4: ['cat ~/infiltration_mirage/???'],
  5: ['touch ~/infiltration_mirage/serveur/agent.log'],
  6: ['mkdir ~/infiltration_mirage/serveur/exfiltration', 'cp .../confidentiel/rapport.txt .../exfiltration/'],
  7: ['mv .../exfiltration/rapport.txt .../exfiltration/rapport_cache.txt'],
  8: ['mkdir ~/infiltration_mirage/serveur/archive'],
  9: ['chmod ??? .../exfiltration/rapport_cache.txt', '(User=6 Group=0 Others=0)'],
  10: ['chmod ???+??? .../effacer_traces.sh  (u et x)'],
  11: ['ps  puis lire la colonne PID de espion_mirage', 'kill <PID>'],
  12: ['ls ???  (option longue d\'aide)'],
  13: ['ls -?? ~/infiltration_mirage/serveur/  (deux lettres)'],
  14: ['cat .../access.log | ??? Transfert'],
  15: ['??? | grep Q'],
};
function hint3(n, shell) {
  switch (n) {
    case 1: return ['pwd'];
    case 2: return ['ls ~/infiltration_mirage/serveur/', 'Réponse : acces.txt'];
    case 3: return ['cd ~/infiltration_mirage/serveur/  puis  Q3'];
    case 4: return ['cat ~/infiltration_mirage/message_secret.txt'];
    case 5: return ['touch ~/infiltration_mirage/serveur/agent.log'];
    case 6: return ['mkdir ~/infiltration_mirage/serveur/exfiltration', 'cp ~/infiltration_mirage/serveur/confidentiel/rapport.txt \\', '   ~/infiltration_mirage/serveur/exfiltration/'];
    case 7: return ['mv ~/infiltration_mirage/serveur/exfiltration/rapport.txt \\', '   ~/infiltration_mirage/serveur/exfiltration/rapport_cache.txt'];
    case 8: return ['mkdir ~/infiltration_mirage/serveur/archive'];
    case 9: return ['chmod 600 ~/infiltration_mirage/serveur/exfiltration/rapport_cache.txt'];
    case 10: return ['chmod u+x ~/infiltration_mirage/serveur/effacer_traces.sh'];
    case 11: return ['ps', 'kill ' + (shell.espionAlive() ? shell.espionPid : '<PID>')];
    case 12: return ['ls --help   (l\'option est -a)'];
    case 13: return ['ls -la ~/infiltration_mirage/serveur/'];
    case 14: return ['cat ~/infiltration_mirage/serveur/logs/access.log | grep Transfert', 'Réponse : 2 (deux lignes contiennent Transfert)'];
    case 15: return ['history | grep Q'];
  }
  return [];
}

// ============================================================
//  Le moteur du TP : enveloppe un Shell et gère l'état.
// ============================================================
class Mirage {
  constructor(Shell, opts = {}) {
    this.save = opts.save || (() => {});   // callback de persistance
    const st = opts.state || {};
    this.prog = st.prog ? st.prog.slice() : Array(NB_Q).fill(0);
    this.hints = st.hints ? st.hints.slice() : Array(NB_Q).fill(0);
    this.pseudo = st.pseudo || '';
    this.awaiting = null;  // { n, validate } quand une mission pose une question
    this.shell = new Shell({
      espionPid: st.espionPid,
      special: (line, sh) => this.special(line, sh),
    });
    // Les commandes du TP sont des fonctions du shell, comme dans le script
    // (où MISSION, Q1…Q15 et STATUT sont des fonctions sh) : elles marchent
    // aussi après ; && || et dans un tube |.
    const fn = (f) => (args, io) => { io.html(f()); this.persist(); return 0; };
    this.shell.functions.MISSION = fn(() => this.missionScreen());
    this.shell.functions.STATUT = fn(() => this.statutScreen());
    for (let n = 1; n <= NB_Q; n++) this.shell.functions['Q' + n] = fn(() => this.check(n).html);
    // restaurer l'état du shell (FS, dossier, historique, variables, processus)
    if (st.shell) { try { this.shell.restore(st.shell); } catch (e) {} }
  }

  snapshot() {
    return {
      prog: this.prog, hints: this.hints, pseudo: this.pseudo,
      espionPid: this.shell.espionPid, shell: this.shell.serialize(),
    };
  }
  persist() { try { this.save(this.snapshot()); } catch (e) {} }

  done(n) { return this.prog[n - 1] === 1; }
  total() { return this.prog.reduce((a, x) => a + x, 0); }

  badge(n) {
    const lines = BADGES[n] || [];
    let h = '<div class="badge">';
    h += '  +--------------------------------------------------+\n';
    for (const l of lines) h += '  | ' + esc(l.padEnd(48)) + ' |\n';
    h += `  | Score : ${String(this.total()).padStart(2)}/${NB_Q}${' '.repeat(36)} |\n`;
    h += '  +--------------------------------------------------+';
    h += '</div>';
    return h;
  }
  marquer(n) {
    if (this.done(n)) return '';
    this.prog[n - 1] = 1;
    this.persist();
    return this.badge(n) + '\n';
  }
  ok(n, msg) {
    let h = '';
    if (msg) h += '  ' + g('[OK]') + ' ' + esc(msg) + '\n';
    h += this.marquer(n);
    return h;
  }
  fail(n, msg) {
    let h = '  ' + r('[--]') + ' ' + esc(msg) + '\n';
    let lvl = this.hints[n - 1];
    if (lvl < 3) lvl++;
    this.hints[n - 1] = lvl;
    this.persist();
    h += '  ' + y(`[Indice ${lvl}/3]`) + '\n';
    let lines = [];
    if (lvl === 1) lines = HINT1[n] || [];
    else if (lvl === 2) { h += '  ' + dim('Compléter les ??? :') + '\n'; lines = HINT2[n] || []; }
    else { h += '  ' + dim('Solution :') + '\n'; lines = hint3(n, this.shell); }
    for (const l of lines) h += '  ' + y(l) + '\n';
    if (lvl < 3) h += '  ' + dim(`Retape Q${n} pour l'indice suivant.`) + '\n';
    return h;
  }

  // Vérificateurs de mission ------------------------------------
  check(n) {
    const sh = this.shell;
    const R = (html) => ({ html, code: 0 });
    if (this.done(n)) return R('  ' + g('[OK]') + ` Q${n} déjà validée.\n`);

    switch (n) {
      case 1: {
        // comme le script : « history | tail -60 | grep -qE '^[0-9 ]*pwd[[:space:]]*$' »
        const hit = sh.history.slice(-60).some(x => /^pwd[ \t]*$/.test(x));
        return R(hit ? this.ok(1) : this.fail(1, "pwd non détecté dans l'historique."));
      }
      case 3:
        return R(sh.cwd === TP + '/serveur' ? this.ok(3)
          : ('  ' + dim('Position actuelle : ' + sh.cwd) + '\n' + this.fail(3, "Tu n'es pas dans serveur/.")));
      case 5:
        return R(sh.fs.node(TP + '/serveur/agent.log') ? this.ok(5) : this.fail(5, 'agent.log absent de serveur/.'));
      case 6:
        return R(sh.fs.node(TP + '/serveur/exfiltration/rapport.txt') ? this.ok(6) : this.fail(6, "rapport.txt absent d'exfiltration/."));
      case 7:
        return R(sh.fs.node(TP + '/serveur/exfiltration/rapport_cache.txt') ? this.ok(7) : this.fail(7, 'rapport_cache.txt absent. As-tu utilisé mv ?'));
      case 8: {
        const nd = sh.fs.node(TP + '/serveur/archive');
        return R(nd && nd.type === 'dir' ? this.ok(8) : this.fail(8, 'Dossier archive/ absent de serveur/.'));
      }
      case 9: {
        const nd = sh.fs.node(TP + '/serveur/exfiltration/rapport_cache.txt');
        if (!nd) return R(this.fail(9, 'rapport_cache.txt absent. Termine Q7 d\'abord.'));
        const pp = (nd.mode & 0o777).toString(8);
        if (pp === '600') return R(this.ok(9));
        return R('  ' + dim(`Droits actuels : ${pp}  (attendu : 600)`) + '\n' + this.fail(9, 'Droits incorrects sur rapport_cache.txt.'));
      }
      case 10: {
        const nd = sh.fs.node(TP + '/serveur/effacer_traces.sh');
        if (nd && (nd.mode & 0o111)) return R(this.ok(10));
        const pp = nd ? (nd.mode & 0o777).toString(8) : '?';
        return R('  ' + dim('Droits actuels : ' + pp) + '\n' + this.fail(10, 'effacer_traces.sh non exécutable.'));
      }
      case 11: {
        if (!sh.espionAlive()) return R(this.ok(11));
        // pose une question : le PID
        this.awaiting = { n: 11, validate: (rep) => {
          if (rep.trim() === String(sh.espionPid)) {
            return '  ' + g('Correct !') + ' Maintenant : ' + y('kill ' + sh.espionPid) + '\n'
              + '  ' + dim('Retape Q11 après l\'avoir arrêté.') + '\n';
          }
          return this.fail(11, 'PID incorrect. Cherche la ligne espion_mirage dans ps.');
        }};
        return R('  ' + c('Q11 — ps + kill') + '\n  Exécuter : ps\n  Quel est le PID du processus espion_mirage ?\n');
      }
      // Missions à question
      case 2: return this.ask(2, 'Q2 — ls', ['Lister le contenu de serveur/ (peu importe comment).', 'Quel fichier .txt se trouve dans ce dossier ?'],
        rep => /^acces(\.txt)?$/.test(rep.trim()), 'Réponse incorrecte. Relis bien ce que ls affiche.');
      case 4: return this.ask(4, 'Q4 — cat', ['Lire ~/infiltration_mirage/message_secret.txt', 'Quel est le mot de passe mentionné dans ce fichier ?'],
        rep => /^(M1r4g3_2024|m1r4g3_2024)$/.test(rep.trim()), 'Réponse incorrecte. As-tu bien lu le fichier ?');
      case 12: return this.ask(12, 'Q12 — ls --help', ['Exécuter : ls --help', 'Quelle option affiche les fichiers cachés ?'],
        rep => /^(-a|a|--all)$/.test(rep.trim()), "Réponse incorrecte. Cherche « all » dans ls --help.");
      case 13: return this.ask(13, 'Q13 — ls -la', ['Exécuter : ls -la ~/infiltration_mirage/serveur/', 'Quel fichier caché (commençant par .) apparaît ?'],
        rep => /^\.?fichier_cache$/.test(rep.trim()), 'Réponse incorrecte. Les fichiers cachés commencent par un point.');
      case 14: return this.ask(14, 'Q14 — cat | grep', ['Le pipe | envoie la sortie d\'une commande vers l\'entrée d\'une autre.', 'Exécuter : cat ~/infiltration_mirage/serveur/logs/access.log | grep Transfert', "Combien de lignes contenant 'Transfert' s'affichent ?"],
        rep => /^(2|deux)$/.test(rep.trim()), 'Réponse incorrecte. Compte les lignes affichées par grep.');
      case 15: return this.ask(15, 'Q15 — history | grep', ['Même principe qu\'en Q14. Exécuter : history | grep Q', 'Quelle commande apparaît en premier dans les résultats ?'],
        rep => /^q[0-9]/i.test(rep.trim().replace(/\s/g, '')), 'Réponse incorrecte. Exécute bien : history | grep Q');
    }
    return R('');
  }

  ask(n, titre, lines, validate, failMsg) {
    this.awaiting = { n, validate: (rep) => validate(rep) ? this.ok(n) : this.fail(n, failMsg) };
    let h = '  ' + c(titre) + '\n';
    for (const l of lines) h += '  ' + esc(l) + '\n';
    return { html: h, code: 0 };
  }

  // Écran MISSION ------------------------------------------------
  missionScreen() {
    let h = '';
    h += '  ' + y(`OPÉRATION MIRAGE — ${this.total()}/${NB_Q} missions accomplies`) + '\n';
    h += '  ' + dim('──────────────────────────────────────────────────────') + '\n\n';
    for (const m of MISSIONS) {
      if (PHASES[m.n]) h += '  ' + dim('── ' + PHASES[m.n] + ' ──') + '\n\n';
      const mark = this.done(m.n) ? g('[OK]') : dim('[ ]');
      h += '  ' + mark + ' ' + col('c b', 'Q' + m.n) + '  ' + y(m.cmd) + '\n';
      h += '     ' + dim(m.ctx) + '\n';
      h += '     ' + b('>> ' + m.tache) + '\n\n';
    }
    return h;
  }
  statutScreen() {
    let h = '\n  ' + b('Score — Opération MIRAGE') + '\n\n';
    for (let i = 1; i <= NB_Q; i++) {
      h += this.done(i) ? '  ' + g('OK') + ' Q' + i + '\n' : '  ' + dim('--') + ' Q' + i + '\n';
    }
    h += '\n  ' + b(this.total() + '/' + NB_Q) + '\n';
    if (this.total() === NB_Q) h += '  ' + col('g b', 'OPÉRATION TERMINÉE. Félicitations, agent·e.') + '\n';
    else h += '  ' + dim('Tape MISSION pour les détails.') + '\n';
    return h + '\n';
  }

  // Interception des commandes du TP -----------------------------
  special(line, sh) {
    // Si une mission attend une réponse, cette ligne EST la réponse.
    if (this.awaiting) {
      const a = this.awaiting;
      this.awaiting = null;
      const html = a.validate(line);
      this.persist();
      return { html, code: 0 };
    }
    return null; // commande ordinaire : le shell s'en charge
  }
}

const API = { Mirage, NB_Q, MISSIONS, esc };
if (typeof window !== 'undefined') window.MirageTP = API;
export { Mirage, NB_Q, MISSIONS, esc };
