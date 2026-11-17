# Le terminal intégré : écarts connus avec un vrai Linux

Le terminal de cette page (`terminal/index.html`) est un **petit shell écrit en
JavaScript** pour le TP, pas un vrai Linux. Il met en œuvre exactement les
commandes, options et comportements dont les 15 missions ont besoin, vérifiés
par des tests automatiques (`terminal/tests/run.mjs`) et comparés à un vrai
shell. Il ne remplace pas un vrai système. Voici ce qui diffère.

Pour qui veut un vrai Linux, la page garde le lien vers **JSLinux** (Alpine) et
la fiche élève : le même script `tp_infiltration.sh` s'y joue à l'identique.

## Messages d'erreur
Les messages suivent ceux de **GNU coreutils** (Debian, Ubuntu, WSL), vérifiés
sur une vraie machine. Sur JSLinux (Alpine, BusyBox), le texte exact diffère
parfois (par exemple `cat: can't open 'x': No such file or directory` au lieu de
`cat: x: No such file or directory`). Les deux sont « de vrais shells » ; le
choix GNU est celui du chemin Debian/Ubuntu, lui aussi annoncé par le TP.

## Commandes et comportements
- **`ls -l`** affiche un format détaillé simplifié : propriétaire `root root`,
  date fixe `2024-01-15 10:00`, taille = nombre de caractères. Les droits
  (`rwx`) et le type (`d`/`-`) sont, eux, exacts.
- **`--help` et `man`** répondent **en français** (demande de la tâche), alors
  qu'un vrai `ls --help` répond en anglais. Le reste des messages d'erreur,
  lui, reste en anglais (règle 20).
- **Un seul utilisateur, `root`.** Comme pour root sur un vrai système, `[ -x ]`
  (mission Q10) considère un fichier exécutable dès qu'un bit `x` est posé.
- **Pas de globbing** : le shell n'étend pas `*` ni `?` sur la ligne de commande
  (sauf dans `find -name`). Les missions n'en ont pas besoin.
- **Pas de scripting** : pas de variables, de boucles ni de `$(...)`. Le TP
  n'en demande pas.
- **`kill`** refuse d'arrêter les processus système simulés (PID 1 et 7) ; seul
  `espion_mirage` peut l'être (mission Q11).
- **Processus** simulés : `ps` montre quelques lignes plausibles et l'espion. Pas
  de vrais PID du système.

## Fichiers de progression
La progression est gardée dans le navigateur (`localStorage`), pas dans des
fichiers `.prog`/`.hints` comme le script shell. Un `ls -la ~/infiltration_mirage/`
ne les montre donc pas. La mission Q13 vise `serveur/` (où seul `.fichier_cache`
est caché) : elle n'est pas affectée.

## Arborescence et missions
L'arborescence (`serveur/`, `confidentiel/rapport.txt`, `logs/access.log`,
`.fichier_cache`, `message_secret.txt`, droits de `effacer_traces.sh`…), les
contenus, le mot de passe `M1r4g3_2024`, les badges, les indices gradués et la
vérification de chaque mission sont **identiques au script v11.1**. Les 15
missions se jouent et se valident comme dans JSLinux.
