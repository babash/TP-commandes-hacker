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
