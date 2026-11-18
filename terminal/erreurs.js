// ============================================================
//  Opération MIRAGE — table des erreurs courantes du terminal
//  Règle 20 : l'erreur s'affiche d'abord telle que le terminal la donne
//  (en anglais, comme un vrai shell), puis l'élève peut la faire
//  expliquer en français (commande « ? » ou bouton « Expliquer »).
//  Aucun service extérieur : tout est ici. Licence : MIT.
// ============================================================

'use strict';

// Chaque règle : un motif (regexp) sur le message anglais, et une
// explication française qui dit ce que veut dire l'erreur et quoi faire.
const REGLES = [
  {
    re: /bash: (MISSION|STATUT|Q\d+|mission|statut|q\d+): command not found/i,
    fr: "Les commandes du TP s'écrivent en MAJUSCULES : MISSION, STATUT, Q1 à Q15. " +
        "Le terminal distingue les majuscules des minuscules (mission ≠ MISSION)."
  },
  {
    re: /tp_infiltration\.sh: No such file or directory/,
    fr: "Pas besoin du script ici : dans cette page, le TP est déjà chargé. Tape MISSION. " +
        "(Le script tp_infiltration.sh sert dans un vrai Linux, comme JSLinux.)"
  },
  {
    re: /event not found/,
    fr: "« event not found » = « événement introuvable ». Le point d'exclamation ! rappelle une " +
        "commande de l'historique (!! la dernière, !12 la n° 12, !cat la dernière qui commence par cat). " +
        "Aucune ne correspond. Pour écrire un vrai !, mets-le entre apostrophes : echo 'Bravo !'."
  },
  {
    re: /syntax error near unexpected token|syntax error: unexpected end of file/,
    fr: "« syntax error » = « erreur de syntaxe ». La ligne est mal construite : un | ou un ; " +
        "au début, deux à la suite, ou un | à la fin sans commande derrière. Exemple correct : ls | wc -l."
  },
  {
    re: /unexpected EOF while looking for matching/,
    fr: "Un guillemet ouvert n'est pas fermé. Chaque \" ou ' doit aller par paire : echo \"bonjour\"."
  },
  {
    re: /ambiguous redirect/,
    fr: "« ambiguous redirect » = « redirection ambiguë ». Après > ou <, il faut UN seul nom de " +
        "fichier ; ici, le joker en donne plusieurs (ou aucun)."
  },
  {
    re: /Permission denied/,
    fr: "« Permission denied » = « Permission refusée ». Pour lancer un script avec ./script.sh, " +
        "il doit être exécutable : chmod u+x script.sh. Regarde ses droits avec ls -l (le x)."
  },
  {
    re: /arguments must be process or job IDs/,
    fr: "kill attend un numéro de processus (PID), pas un nom. Lis le PID avec ps, puis kill PID."
  },
  {
    re: /Unmatched \( or|Unmatched \[|Unmatched \\\{|Invalid regular expression|Trailing backslash|Invalid content/,
    fr: "grep ne comprend pas le motif : une parenthèse, un crochet ou une accolade n'est pas fermé. " +
        "Pour chercher le caractère lui-même, protège-le : \\( \\[ \\. ou utilise grep -F (texte simple)."
  },
  {
    re: /paths must precede expression/,
    fr: "Piège classique : le shell a remplacé le joker (*.txt) par la liste des fichiers AVANT de " +
        "lancer find. Mets le motif entre guillemets : find . -name \"*.txt\"."
  },
  {
    re: /cannot access '.*[*?[].*': No such file/,
    fr: "Le joker (* ou ?) ne correspond à aucun fichier : le shell l'a laissé tel quel, et la commande " +
        "a cherché un fichier qui s'appelle vraiment comme ça. Vérifie avec ls le nom des fichiers."
  },
  {
    re: /too many arguments/,
    fr: "« too many arguments » = « trop d'arguments ». cd n'accepte qu'un seul dossier. Un nom avec " +
        "des espaces se met entre guillemets : cd \"mon dossier\"."
  },
  {
    re: /OLDPWD not set/,
    fr: "cd - revient au dossier précédent, mais tu n'as encore changé de dossier qu'une fois au plus."
  },
  {
    re: /invalid signal specification/,
    fr: "Ce signal n'existe pas. Les plus courants : kill PID (TERM, 15) et kill -9 PID (KILL)."
  },
  {
    re: /cannot remove '.*[*?].*': No such file/,
    fr: "Le joker ne correspond à aucun fichier (ils sont peut-être déjà supprimés) : rm a cherché un " +
        "fichier dont le nom contient vraiment * ou ?."
  },
  {
    re: /No such file or directory/,
    fr: "« No such file or directory » = « Aucun fichier ou dossier de ce nom ». " +
        "Le chemin que tu as tapé n'existe pas (ou il est mal orthographié). " +
        "Vérifie avec ls où tu es, et le nom exact du fichier ou du dossier."
  },
  {
    re: /command not found/,
    fr: "« command not found » = « commande introuvable ». Le premier mot de ta " +
        "ligne n'est pas une commande connue : faute de frappe, ou commande qui " +
        "n'existe pas sur ce terminal. Vérifie l'orthographe (ls, cd, cat…)."
  },
  {
    re: /Is a directory/,
    fr: "« Is a directory » = « C'est un dossier ». Tu as visé un dossier là où il " +
        "fallait un fichier (par exemple cat sur un dossier). Donne le nom d'un " +
        "fichier, ou entre dans le dossier avec cd."
  },
  {
    re: /Not a directory/,
    fr: "« Not a directory » = « Ce n'est pas un dossier ». Tu essaies d'entrer " +
        "(cd) dans quelque chose qui est un fichier, pas un dossier."
  },
  {
    re: /File exists/,
    fr: "« File exists » = « Le fichier existe déjà ». mkdir ne peut pas créer un " +
        "dossier qui existe déjà. Ce n'est pas grave : il est déjà là."
  },
  {
    re: /Directory not empty/,
    fr: "« Directory not empty » = « Le dossier n'est pas vide ». rmdir ne supprime " +
        "qu'un dossier vide. Pour un dossier plein, il faudrait rm -r (prudence)."
  },
  {
    re: /cannot stat/,
    fr: "« cannot stat '…' » = « impossible de trouver '…' ». cp ou mv ne trouve " +
        "pas le fichier source : vérifie son chemin et son nom exact."
  },
  {
    re: /-r not specified; omitting directory/,
    fr: "cp refuse de copier un dossier sans l'option -r (récursive). Pour copier " +
        "un dossier entier : cp -r source destination. Ici, un simple fichier suffit."
  },
  {
    re: /No such process/,
    fr: "« No such process » = « Aucun processus de ce numéro ». kill ne trouve pas " +
        "de processus avec ce PID : relis la colonne PID de ps, c'est la première."
  },
  {
    re: /Operation not permitted/,
    fr: "« Operation not permitted » = « Opération non autorisée ». Tu essaies " +
        "d'arrêter un processus du système, protégé. Vise plutôt espion_mirage."
  },
  {
    re: /invalid mode/,
    fr: "« invalid mode » = « droits invalides ». Le format donné à chmod n'est pas " +
        "compris. Exemples corrects : chmod 600 fichier, ou chmod u+x fichier."
  },
  {
    re: /missing (file )?operand|missing destination/,
    fr: "« missing operand » = « il manque un argument ». La commande attend un nom " +
        "de fichier ou de dossier que tu n'as pas donné."
  },
];

function explain(enMsg) {
  if (!enMsg) {
    return "Il n'y a pas d'erreur récente à expliquer. Tape une commande, et si le " +
           "terminal répond une erreur en anglais, retape « ? » pour la traduire.";
  }
  for (const r of REGLES) {
    if (r.re.test(enMsg)) return r.fr;
  }
  return "Cette erreur n'est pas dans ma table. Mot à mot : elle décrit ce qui a " +
         "empêché la commande de s'exécuter. Relis le nom du fichier et le chemin.";
}

const API = { explain, REGLES };
if (typeof window !== 'undefined') window.MirageErreurs = API;
export { explain, REGLES };
