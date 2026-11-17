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
  { n: 1, cmd: 'pwd', ctx: 'Ou es-tu exactement ?', tache: 'Taper pwd puis Q1.' },
  { n: 2, cmd: 'ls', ctx: 'Le serveur contient des fichiers et dossiers.', tache: 'Lister le contenu de serveur/ puis taper Q2.' },
  { n: 3, cmd: 'cd', ctx: "Lister c'est bien, entrer dans la zone c'est mieux.", tache: 'Aller dans ~/infiltration_mirage/serveur/ puis taper Q3.' },
  { n: 4, cmd: 'cat', ctx: "Un message chiffre t'attend.", tache: 'Lire message_secret.txt puis taper Q4.' },
  { n: 5, cmd: 'touch', ctx: 'Laisse une empreinte numerique sur ce serveur.', tache: 'Creer serveur/agent.log puis taper Q5.' },
  { n: 6, cmd: 'cp', ctx: 'Le rapport confidentiel doit etre exfiltre.', tache: 'Copier confidentiel/rapport.txt dans serveur/exfiltration/ puis Q6.' },
  { n: 7, cmd: 'mv', ctx: 'Le nom rapport.txt est trop visible. Camouflons-le.', tache: 'Renommer exfiltration/rapport.txt en rapport_cache.txt puis Q7.' },
  { n: 8, cmd: 'mkdir', ctx: 'Il faut une zone de stockage supplementaire.', tache: 'Creer serveur/archive/ puis taper Q8.' },
  { n: 9, cmd: 'chmod 600', ctx: 'Le rapport cache doit etre inaccessible aux autres.', tache: 'Droits 600 sur exfiltration/rapport_cache.txt puis Q9.' },
  { n: 10, cmd: 'chmod u+x', ctx: "Le script d'effacement est bloque. Il faut l'armer.", tache: 'Rendre effacer_traces.sh executable puis Q10.' },
  { n: 11, cmd: 'ps + kill', ctx: 'Un processus espion surveille le serveur.', tache: "Trouver son PID avec ps, l'eliminer avec kill, puis Q11." },
  { n: 12, cmd: 'ls --help', ctx: 'Certains fichiers sont caches. Il faut la bonne option.', tache: 'Consulter ls --help puis taper Q12.' },
  { n: 13, cmd: 'ls -la', ctx: "Mets en pratique l'option trouvee en Q12.", tache: 'Lister serveur/ avec les fichiers caches puis taper Q13.' },
  { n: 14, cmd: 'cat|grep', ctx: 'Le journal access.log contient des lignes suspectes.', tache: 'Filtrer access.log avec cat | grep Transfert puis Q14.' },
  { n: 15, cmd: 'history|grep', ctx: 'Meme principe, sur ton historique de commandes.', tache: 'Executer history | grep Q puis taper Q15.' },
];
const PHASES = {
  1: 'Phase 1 : Reconnaissance', 5: 'Phase 2 : Manipulation de fichiers',
  9: 'Phase 3 : Droits', 11: 'Phase 4 : Processus', 12: 'Phase 5 : Options et pipe |',
};
const BADGES = {
  1: ['Q1  ACCOMPLIE  Bonne orientation, agent·e.'],
  2: ['Q2  ACCOMPLIE  Premiere reconnaissance reussie.'],
  3: ['Q3  ACCOMPLIE  Tu es dans la place.'],
  4: ['Q4  ACCOMPLIE  Message dechiffre.'],
  5: ['Q5  ACCOMPLIE  Empreinte enregistree.'],
  6: ['Q6  ACCOMPLIE  Rapport exfiltre.'],
  7: ['Q7  ACCOMPLIE  Fichier dissimule.'],
  8: ['Q8  ACCOMPLIE  Zone de transit prete.'],
  9: ['Q9  ACCOMPLIE  Fichier protege (rw-------)'],
  10: ['Q10 ACCOMPLIE  Script arme et pret.'],
  11: ['Q11 ACCOMPLIE  Espion neutralise.'],
  12: ['Q12 ACCOMPLIE  La documentation, ton alliee.'],
  13: ['Q13 ACCOMPLIE  Les fichiers caches sont vus.'],
  14: ['Q14 ACCOMPLIE  LE PIPE EST DEBLOQUE !', 'Outil fondamental du terminal. Retiens-le.'],
  15: ['Q15 ACCOMPLIE  *** OPERATION TERMINEE ***', 'Toutes les missions accomplies. Bien joue.'],
};

// Indices gradués (niveaux 1, 2, 3), repris mot pour mot du script.
const HINT1 = {
  1: ['Commande : pwd — affiche le chemin du repertoire courant.'],
  2: ['Commande : ls — liste le contenu d\'un dossier.', 'Le fichier cherche a un nom qui finit par .txt.'],
  3: ['Commande : cd — change de repertoire. Taper cd puis le chemin, puis Q3.'],
  4: ['Commande : cat — affiche le contenu d\'un fichier texte.'],
  5: ['Commande : touch /chemin/fichier — cree un fichier vide.'],
  6: ['Commande : cp source destination — copie un fichier.', 'Creer d\'abord exfiltration/ : mkdir ~/infiltration_mirage/serveur/exfiltration'],
  7: ['Commande : mv ancien nouveau — renomme un fichier.'],
  8: ['Commande : mkdir /chemin/dossier — cree un dossier.'],
  9: ['Commande : chmod — modifie les droits. r=4 w=2 x=1.', '600 = User(r+w=6) Group(0) Others(0).'],
  10: ['Commande : chmod u+x fichier — rend executable.', 'u=user  +=ajouter  x=execution'],
  11: ['Commande : ps — liste les processus. La colonne 1 est le PID.', 'Chercher la ligne espion_mirage.'],
  12: ['Sur ce terminal, man n\'est pas toujours la. Utiliser : ls --help', 'Chercher l\'option marquee \'all\' ou \'caches\'.'],
  13: ['Commande : ls -la — l=details, a=all (fichiers caches).', 'Les fichiers caches ont un nom commencant par un point.'],
  14: ['Le pipe | : commande1 | commande2', 'La sortie de gauche devient l\'entree de droite.', 'grep mot filtre les lignes contenant \'mot\'.'],
  15: ['history affiche les commandes deja tapees.', 'Le combiner avec grep par le pipe : history | grep Q'],
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
    case 2: return ['ls ~/infiltration_mirage/serveur/', 'Reponse : acces.txt'];
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
    case 14: return ['cat ~/infiltration_mirage/serveur/logs/access.log | grep Transfert', 'Reponse : 2 (deux lignes contiennent Transfert)'];
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
    // restaurer l'état du shell (FS, cwd, history, processes) si fourni
    if (st.shell) {
      try {
        this.shell.fs.load(st.shell.fs);
        this.shell.cwd = st.shell.cwd;
        this.shell.history = st.shell.history || [];
        this.shell.processes = st.shell.processes || this.shell.processes;
        this.shell.espionPid = st.shell.espionPid;
      } catch (e) {}
    }
  }

  snapshot() {
    return {
      prog: this.prog, hints: this.hints, pseudo: this.pseudo,
      espionPid: this.shell.espionPid,
      shell: {
        fs: this.shell.fs.dump(), cwd: this.shell.cwd,
        history: this.shell.history, processes: this.shell.processes,
        espionPid: this.shell.espionPid,
      },
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
    else if (lvl === 2) { h += '  ' + dim('Completer les ??? :') + '\n'; lines = HINT2[n] || []; }
    else { h += '  ' + dim('Solution :') + '\n'; lines = hint3(n, this.shell); }
    for (const l of lines) h += '  ' + y(l) + '\n';
    if (lvl < 3) h += '  ' + dim(`Retape Q${n} pour l'indice suivant.`) + '\n';
    return h;
  }

  // Vérificateurs de mission ------------------------------------
  check(n) {
    const sh = this.shell;
    const R = (html) => ({ html, code: 0 });
    if (this.done(n)) return R('  ' + g('[OK]') + ` Q${n} deja validee.\n`);

    switch (n) {
      case 1: {
        const hit = sh.history.some(x => /^pwd\s*$/.test(x.trim()));
        return R(hit ? this.ok(1) : this.fail(1, "pwd non detecte dans l'historique."));
      }
      case 3:
        return R(sh.cwd === TP + '/serveur' ? this.ok(3)
          : ('  ' + dim('Position actuelle : ' + sh.cwd) + '\n' + this.fail(3, "Tu n'es pas dans serveur/.")));
      case 5:
        return R(sh.fs.node(TP + '/serveur/agent.log') ? this.ok(5) : this.fail(5, 'agent.log absent de serveur/.'));
      case 6:
        return R(sh.fs.node(TP + '/serveur/exfiltration/rapport.txt') ? this.ok(6) : this.fail(6, "rapport.txt absent d'exfiltration/."));
      case 7:
        return R(sh.fs.node(TP + '/serveur/exfiltration/rapport_cache.txt') ? this.ok(7) : this.fail(7, 'rapport_cache.txt absent. As-tu utilise mv ?'));
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
        return R('  ' + dim('Droits actuels : ' + pp) + '\n' + this.fail(10, 'effacer_traces.sh non executable.'));
      }
      case 11: {
        if (!sh.espionAlive()) return R(this.ok(11));
        // pose une question : le PID
        this.awaiting = { n: 11, validate: (rep) => {
          if (rep.trim() === String(sh.espionPid)) {
            return '  ' + g('Correct !') + ' Maintenant : ' + y('kill ' + sh.espionPid) + '\n'
              + '  ' + dim('Retape Q11 apres l\'avoir arrete.') + '\n';
          }
          return this.fail(11, 'PID incorrect. Cherche la ligne espion_mirage dans ps.');
        }};
        return R('  ' + c('Q11 — ps + kill') + '\n  Executer : ps\n  Quel est le PID du processus espion_mirage ?\n');
      }
      // Missions à question
      case 2: return this.ask(2, 'Q2 — ls', ['Lister le contenu de serveur/ (peu importe comment).', 'Quel fichier .txt se trouve dans ce dossier ?'],
        rep => /^acces(\.txt)?$/i.test(rep.trim()), 'Reponse incorrecte. Relis bien ce que ls affiche.');
      case 4: return this.ask(4, 'Q4 — cat', ['Lire ~/infiltration_mirage/message_secret.txt', 'Quel est le mot de passe mentionne dans ce fichier ?'],
        rep => /^M1r4g3_2024$/i.test(rep.trim()), 'Reponse incorrecte. As-tu bien lu le fichier ?');
      case 12: return this.ask(12, 'Q12 — ls --help', ['Executer : ls --help', 'Quelle option affiche les fichiers caches ?'],
        rep => /^(-a|a|--all)$/.test(rep.trim()), "Reponse incorrecte. Cherche 'all' dans ls --help.");
      case 13: return this.ask(13, 'Q13 — ls -la', ['Executer : ls -la ~/infiltration_mirage/serveur/', 'Quel fichier cache (commencant par .) apparait ?'],
        rep => /^\.?fichier_cache$/.test(rep.trim()), 'Reponse incorrecte. Les fichiers caches commencent par un point.');
      case 14: return this.ask(14, 'Q14 — cat | grep', ['Le pipe | envoie la sortie d\'une commande vers l\'entree d\'une autre.', 'Executer : cat ~/infiltration_mirage/serveur/logs/access.log | grep Transfert', "Combien de lignes contenant 'Transfert' s'affichent ?"],
        rep => /^(2|deux)$/i.test(rep.trim()), 'Reponse incorrecte. Compte les lignes affichees par grep.');
      case 15: return this.ask(15, 'Q15 — history | grep', ['Meme principe qu\'en Q14. Executer : history | grep Q', 'Quelle commande apparait en premier dans les resultats ?'],
        rep => /^q[0-9]/i.test(rep.trim().replace(/\s/g, '')), 'Reponse incorrecte. Execute bien : history | grep Q');
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
    h += '  ' + y(`OPERATION MIRAGE — ${this.total()}/${NB_Q} missions accomplies`) + '\n';
    h += '  ' + dim('──────────────────────────────────────────────────────') + '\n\n';
    for (const m of MISSIONS) {
      if (PHASES[m.n]) h += '  ' + dim('── ' + PHASES[m.n] + ' ──') + '\n\n';
      const mark = this.done(m.n) ? g('[OK]') : dim('[ ]');
      h += '  ' + mark + ' ' + c(b('Q' + m.n)) + '  ' + y(m.cmd) + '\n';
      h += '     ' + dim(m.ctx) + '\n';
      h += '     ' + b('>> ' + m.tache) + '\n\n';
    }
    return h;
  }
  statutScreen() {
    let h = '\n  ' + b('Score — Operation MIRAGE') + '\n\n';
    for (let i = 1; i <= NB_Q; i++) {
      h += this.done(i) ? '  ' + g('OK') + ' Q' + i + '\n' : '  ' + dim('--') + ' Q' + i + '\n';
    }
    h += '\n  ' + b(this.total() + '/' + NB_Q) + '\n';
    if (this.total() === NB_Q) h += '  ' + g(b('OPERATION TERMINEE. Felicitations, agent·e.')) + '\n';
    else h += '  ' + dim('Tape MISSION pour les details.') + '\n';
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
      return { html, code: 0, noHistory: true };
    }
    const t = line.trim();
    if (t === 'MISSION' || t === 'mission') return { html: this.missionScreen(), code: 0 };
    if (t === 'STATUT' || t === 'statut') return { html: this.statutScreen(), code: 0 };
    const mq = t.match(/^Q([0-9]{1,2})$/i);
    if (mq) {
      const n = parseInt(mq[1], 10);
      if (n >= 1 && n <= NB_Q) { const res = this.check(n); this.persist(); return res; }
    }
    return null; // commande ordinaire : le shell s'en charge
  }
}

const API = { Mirage, NB_Q, MISSIONS, esc };
if (typeof window !== 'undefined') window.MirageTP = API;
export { Mirage, NB_Q, MISSIONS, esc };
