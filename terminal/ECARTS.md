# Le terminal intégré : ce qui marche, et les écarts avec un vrai Linux

Le terminal de cette page (`terminal/index.html`) est un **petit shell écrit en
JavaScript** pour le TP, pas un vrai Linux. Il imite **bash 5.2 et GNU coreutils 9**
(Debian, Ubuntu, WSL) en locale `C.UTF-8`, avec l'utilisateur `root`.

Sa fidélité est vérifiée par trois bancs de tests :
- `terminal/tests/run.mjs` : 320 tests (un par commande et par option, les cas
  d'élèves, les 15 missions et leurs contournements possibles) ;
- `terminal/tests/page.mjs` : la page dans Chromium (rendu, 15 missions, balises, injection, clavier) ;
- `terminal/tests/diff.mjs` : 181 commandes exécutées **à la fois dans un vrai bash et
  dans ce terminal**, sortie, erreurs et code de retour comparés ; 179 identiques,
  2 écarts voulus (plus bas). L'arborescence y est recréée à partir du code de ce
  terminal, jamais en lançant le script du TP.

Pour un vrai Linux, la page garde le lien vers **JSLinux** (Alpine) et la fiche
élève : le script `tp_infiltration.sh` s'y joue à l'identique.

## Ce qui marche comme dans bash

- **Jokers** : `*`, `?`, `[abc]`, `[a-z]`, `[!…]`, `[^…]`, `[[:digit:]]`… sur plusieurs
  niveaux (`*/notes`, `logs/*.log`) ; `*` ne prend pas les fichiers cachés, `.*` ne
  prend ni `.` ni `..` ; un motif sans correspondance reste tel quel et la commande
  donne sa vraie erreur ; les guillemets et `\` empêchent le développement ;
  accolades `{a,b}`, `{1..5}`, `{a..e}` ; `~` ; `cd -`, `cd ..`, `cd`.
- **La ligne** : `;`, `&&`, `||`, le tube `|`, les redirections `>`, `>>`, `<`, `2>`,
  `2>>`, `2>&1`, `&>`, `/dev/null` ; guillemets `'…'` et `"…"` ; commentaires `#`.
- **Variables** : `NOM=valeur`, `echo $NOM`, `"$NOM"`, `${NOM}`, `$HOME`, `$PWD`,
  `$OLDPWD`, `$USER`, `$PATH`, `$?`, `$$`, `$RANDOM` ; `export`, `unset`, `env`, `printenv`.
- **Historique** : `history`, `history N`, `history -c`, `!!`, `!12`, `!-2`, `!texte`,
  `!$` (la commande développée est affichée et enregistrée, comme bash) ;
  `[!…]` n'est pas pris pour l'historique ; flèches ▲ ▼ ; complétion par Tab.
- **`alias`** et **`unalias`** simples ; **`type`** et **`which`**.
- **Fichiers** : `ls` (`-a -A -l -h -R -d -1 -t -S -r -F`, colonnes à la largeur
  de l'écran, un nom par ligne dans un tube), `cd`, `pwd`, `cat` (`-n -b -E`),
  `touch`, `mkdir` (`-p -v`), `cp` (`-r -v`), `mv`, `rm` (`-r -f -v -d`), `rmdir`,
  `chmod` (octal et symbolique, `-R`), `stat` (`-c %a %A %s %n %F…`), `file`,
  `find` (`-name -iname -type -maxdepth -mindepth -empty`), `tree` (`-a -d -L -f`),
  `du` (`-s -h -a -c`).
- **Texte** : `grep` avec les vraies expressions régulières de GNU grep, de base
  (`.` `*` `^` `$` `[…]` `\(…\)` `\{n,m\}` `\|` `\+` `\?` `\1` `\<` `\>`) et étendues
  avec `-E` (`+` `?` `|` `()` `{n,m}`), traduites une à une (pièges vérifiés : `+`
  littéral sans `-E`, `\` littéral entre crochets, `^` et `$` au milieu d'une
  expression de base, `*` en tête) ; options `-i -v -n -c -l -L -w -x -o -r -R -h -H
  -q -s -m -e -E -F -A -B -C`, plusieurs fichiers (préfixe du nom), lecture depuis
  un tube, codes de retour 0, 1 et 2, messages d'erreur de grep.
  `head`, `tail` (`-n`, `-N`, `-n +N`, `-c`), `wc` (`-l -w -c -m`, largeurs de
  colonnes de GNU), `sort` (`-r -n -u -f -k -t`), `uniq` (`-c -d -u -i`), `cut`
  (`-d -f -c`), `tr` (intervalles, `[:lower:]`…, `-d -s`), `echo` (`-n -e`), `less`
  et `more` (pager simple : Espace, b, q ; dans un tube, ils se comportent comme
  `cat`), `man` et `--help` (en français).
- **Processus** : `ps`, `ps aux`, `ps ax`, `ps -e`, `ps -f`, `ps -ef` (colonnes de
  procps) ; `kill PID`, `kill -9`, `kill -TERM`, `kill -l`, messages de bash.
  L'espion du TP y figure (`espion_mirage.s` dans `ps`, nom tronqué à 15 caractères
  comme sous Debian ; `/bin/sh /tmp/espion_mirage.sh` dans `ps aux`), avec son
  `sleep 30` : tuer le `sleep` ne suffit pas, l'espion en relance un.
- **Scripts** : `./effacer_traces.sh` (refusé tant qu'il n'est pas exécutable :
  `Permission denied`, puis il s'exécute après `chmod u+x`), `sh script`, `. script`.
- **Divers** : `whoami`, `date` (et `date +FORMAT`, `-u`), `df -h`, `clear` (et
  Ctrl+L), Ctrl+C pour abandonner une ligne, `true`, `false`.
- Les commandes du TP (`MISSION`, `Q1` à `Q15`, `STATUT`) sont des fonctions,
  comme dans le script : elles marchent après `;`, `&&` et dans un tube.

## Écarts voulus

- **Une option non gérée** d'une commande connue (`ls -z`, `tail -f`, `grep --include`…)
  donne un message **en français** qui dit que ce terminal d'entraînement ne la
  connaît pas, au lieu du message de GNU (consigne).
- **Une commande qui lit le clavier** sans fichier ni tube (`cat`, `grep motif`,
  `tr a b`, `sort`…) : un vrai terminal attendrait la saisie jusqu'à Ctrl+D ; ici, un
  message en français invite à donner un fichier ou à utiliser un tube.
- **Une commande réelle absente** (`nano`, `vi`, `sed`, `awk`, `ln`, `sleep`, `sudo`…)
  répond en français qu'elle existe sur un vrai Linux mais pas dans ce terminal,
  au lieu de « command not found », qui serait faux.
- **`?`, `explique`, `aide`, `recommencer`** sont des commandes de la page (expliquer la
  dernière erreur en français, aide, remise à zéro). Dans bash, `?` serait un joker.
- **Le clavier** : Tab complète, comme dans bash ; pour sortir du terminal, **Échap puis Tab** (ou Échap puis Maj+Tab), comme dans Lagon Arena.
- **Les textes du TP** sont accentués dans la page ; le script `tp_infiltration.sh`, lui, reste sans accents pour les terminaux qui les affichent mal.
- **`exit`** ne ferme pas le terminal ; **`kill -9`** du shell non plus.
- **Les réponses aux questions des missions** (Q2, Q4, Q11 à Q15) ne sont pas
  développées (un `*.txt` reste `*.txt`) et n'entrent pas dans l'historique, comme
  avec `read` dans le script.

## Ce qui reste hors du terminal

- Le scripting : boucles et tests (`while`, `for`, `if`, `case`, `test`, `[ ]`),
  fonctions, substitution de commande `$(…)` et `` `…` ``, sous-shell `( … )`,
  arrière-plan `&` et contrôle des tâches, `<<` ; un script qui en contient (comme
  `/tmp/espion_mirage.sh`) n'est pas exécuté, avec un message en français.
- Les développements avancés de variables (`${#x}`, `${x:-y}`…), le découpage selon
  `IFS`, `printf`, `read`, `set`, `shopt`.
- `sed`, `awk`, `xargs`, `tee`, `diff`, `ln` et les liens, `tar`, les réseaux,
  les utilisateurs et groupes (`chown`, `sudo`), `top`.
- `grep` : pas de couleurs (`--color` est accepté et ignoré), pas de `--include`,
  pas de `-P` ; les classes de caractères comme `[[:alpha:]]` couvrent l'alphabet
  latin, accents compris.
- **L'ordre** des résultats de `grep -r`, `find` et `du` est alphabétique ; un vrai
  Linux suit l'ordre du disque, qui peut varier.
- **Le tri** suit l'ordre des caractères de la locale `C.UTF-8` (chiffres, majuscules,
  minuscules) ; un système en `fr_FR.UTF-8` trie autrement.
- **Valeurs simulées** : les dates des fichiers, numéros d'inode et de périphérique
  de `stat`, les mémoires de `ps aux` et les volumes de `df` sont plausibles mais
  inventés ; `/usr/bin` contient des programmes vides (`cat /usr/bin/ls` le dit).
- `ls -l` affiche toujours `root root` ; un seul utilisateur, `root` ; pas de
  `umask` modifiable (022).
- **JSLinux** (Alpine, BusyBox) a d'autres messages : par exemple
  `cat: can't open 'x': No such file or directory` au lieu de
  `cat: x: No such file or directory`, et un `ps` plus simple. Les deux sont de
  vrais systèmes ; ce terminal suit Debian.
- `tree` n'a pas pu être comparé à un vrai `tree` (absent de la machine de test) :
  il suit le format documenté de tree 2.x. **Non vérifié** : son code de retour
  pour un dossier absent (0 ici ; la page de manuel de tree 2.x n'en parle pas).

## La progression

Elle est gardée dans le navigateur (`localStorage`), avec le système de fichiers,
le dossier courant, l'historique, les variables, les alias et les processus ; pas
dans des fichiers `.prog`/`.hints` comme le script shell (`ls -la ~/infiltration_mirage/`
ne les montre donc pas ; la mission Q13 vise `serveur/` et n'est pas touchée).
