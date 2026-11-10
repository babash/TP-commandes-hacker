# 🕵️ Opération MIRAGE : TP de commandes Linux

**Le terminal Linux en 15 missions d'infiltration, avec de vraies commandes, dans un Linux qui tourne dans le navigateur.** Pour la 1re et la terminale NSI.

> Les élèves s'introduisent dans le serveur fictif du projet MIRAGE. Ils et elles s'y repèrent, lisent un message secret, copient puis cachent un rapport confidentiel, changent des droits, et finissent par **repérer un processus espion avec `ps` et l'arrêter avec `kill`**. Chaque mission se vérifie d'une commande, de `Q1` à `Q15` : après un échec, un indice s'affiche, puis un deuxième, puis la solution.

## 👉 [Essayer maintenant : babash.github.io/TP-commandes-hacker/fiche_eleve_mirage.html](https://babash.github.io/TP-commandes-hacker/fiche_eleve_mirage.html)

**Gratuit · sans compte · rien à installer · ce qui est saisi reste dans le navigateur**

Opération MIRAGE fait partie des [Ressources NSI et SNT](https://babash.github.io/Babash-NSI-SNT/), rubriques [NSI Première](https://babash.github.io/Babash-NSI-SNT/nsi-premiere/) et [NSI Terminale](https://babash.github.io/Babash-NSI-SNT/nsi-terminale/).

---

## Une séance en quatre étapes

1. **Tu** imprimes la [fiche élève](https://babash.github.io/TP-commandes-hacker/fiche_eleve_mirage.html) (une page A4) et testes le lancement complet sur un poste élève. La [fiche professeur](https://babash.github.io/TP-commandes-hacker/fiche_prof_mirage.html) donne l'installation, le corrigé et les conseils. En classe, 5 minutes suffisent pour présenter l'histoire, rappeler la loi (voir « Avertissement ») et distribuer la fiche.
2. **Les élèves** ouvrent [JSLinux](https://bellard.org/jslinux/vm.html?url=alpine-x86.cfg&mem=192), un Linux qui tourne dans le navigateur (15 à 20 secondes de chargement). Ils et elles téléchargent le script [`tp_infiltration.sh`](https://github.com/babash/TP-commandes-hacker/raw/main/tp_infiltration.sh), l'importent avec la **flèche ↑** sous le terminal, puis tapent `. ~/tp_infiltration.sh` (avec un point, pas `source`). Compter 10 minutes. Dans JSLinux, `Ctrl+V` ne marche pas : on colle avec **clic droit → Paste**.
3. **Les élèves** travaillent en autonomie (65 à 75 minutes) : `MISSION` affiche les missions et leur état, `Q1` à `Q15` vérifie une mission, `STATUT` donne le score.
4. **Tu fais le bilan** (15 minutes) : la correction collective des droits (`chmod`, Q9), du pipe (Q14) et de `kill` (Q11).

Tu veux d'abord essayer le TP seul·e ? Les étapes 2 et 3 suffisent.

## Ce que font les élèves

`MISSION` affiche les 15 missions, chacune avec son contexte, sa tâche et son état (`[OK]` ou `[ ]`) :

```text
  [ ] Q11  ps + kill
     Un processus espion surveille le serveur.
     >> Trouver son PID avec ps, l'eliminer avec kill, puis Q11.
```

Une fois la tâche faite, l'élève tape le numéro de la mission (`Q11`). Selon la mission, le script regarde l'historique des commandes, le dossier courant, les fichiers et leurs droits, ou pose une question sur ce que la commande a affiché. Un échec donne un indice : d'abord l'objectif et la commande, puis la structure avec des `???` à compléter, enfin la solution. Le message d'échec ne donne jamais la réponse.

| Phase | Missions | Commandes | La tâche |
|---|---|---|---|
| 1. Reconnaissance | Q1 à Q4 | `pwd`, `ls`, `cd`, `cat` | se situer, explorer le serveur, y entrer, lire un message secret |
| 2. Fichiers | Q5 à Q8 | `touch`, `cp`, `mv`, `mkdir` | laisser une trace, copier un rapport confidentiel, le renommer, créer un dossier |
| 3. Droits | Q9 et Q10 | `chmod 600`, `chmod u+x` | protéger le rapport copié, rendre un script exécutable |
| 4. Processus | Q11 | `ps`, `kill` | trouver le numéro (PID) du processus espion, puis l'arrêter |
| 5. Options et pipe | Q12 à Q15 | `ls --help`, `ls -la`, `cat … \| grep`, `history \| grep` | chercher dans l'aide comment voir les fichiers cachés, les afficher, filtrer un journal, puis l'historique des commandes |

Le pipe (le tube) `|` envoie ce qu'affiche une commande vers une autre. Il arrive en dernier, quand le terminal est devenu familier.

## Pour quels usages

| Usage | Comment |
|---|---|
| **Une séance en classe** (90 à 120 minutes) | Le déroulé de la [fiche professeur](https://babash.github.io/TP-commandes-hacker/fiche_prof_mirage.html) : introduction, lancement, travail en autonomie, correction collective. |
| **En 1re NSI** | Les commandes de base et les droits (toutes les missions sauf Q11) sont au programme de première ; les processus (Q11), à celui de terminale. |
| **Sans JSLinux** | Le script marche aussi dans un terminal Linux (Debian, Ubuntu) ou sous WSL (Windows) : voir [Installer et lancer le TP](docs/INSTALLER.md). |

## Pourquoi ça marche

- **Un vrai terminal, sans rien installer** : JSLinux fait tourner Linux dans le navigateur, et les élèves tapent de vraies commandes sur de vrais fichiers.
- **Une correction immédiate** : `Q1` à `Q15` vérifient la mission tout de suite, avec un badge et le score.
- **Des coups de pouce gradués** : l'objectif, puis la structure, puis la solution ; chaque mission se retente autant de fois qu'il le faut.
- **Lire le résultat, pas seulement taper la commande** : pour `ls`, `cat`, `ps` ou `grep`, la mission pose une question sur ce qui s'est affiché.
- **Une progression** : se repérer et manipuler des fichiers d'abord, les droits et les processus ensuite, les options et le pipe à la fin.
- **L'éthique hacker** (celle des passionné·e·s d'informatique qui explorent les systèmes sans enfreindre la loi) : l'histoire d'infiltration donne envie, et le TP commence par rappeler la loi.

## Avertissement

Opération MIRAGE est une simulation **fictive et entièrement locale** : le serveur, le rapport et le processus espion sont inventés, et le script ne se connecte à aucun réseau. Le TP le rappelle dès son lancement : accéder sans autorisation à un système informatique est un délit (article 323-1 du Code pénal).

## Pour aller plus loin

| Document | Contenu |
|---|---|
| [Fiche élève](https://babash.github.io/TP-commandes-hacker/fiche_eleve_mirage.html) | La page A4 à distribuer : le lancement, les trois commandes, les indices, les 15 missions |
| [Fiche professeur](https://babash.github.io/TP-commandes-hacker/fiche_prof_mirage.html) | L'installation, la vérification des missions, le corrigé, le déroulé conseillé et les points d'attention |
| [Installer et lancer le TP](docs/INSTALLER.md) | JSLinux pas à pas, relancer ou repartir de zéro, les autres systèmes, le dépannage |
| [Architecture](docs/ARCHITECTURE.md) | Pour les curieux·ses et les contributeur·rice·s : le script, la vérification des missions, les fichiers créés |

## Contact

Conçu par Babash - NSI Tani Malandi pour les classes de NSI de l'académie de Mayotte.
Une question, une idée, un bug ? Les [issues GitHub](https://github.com/babash/TP-commandes-hacker/issues) du dépôt. Toutes les ressources sont sur le site [Ressources NSI et SNT](https://babash.github.io/Babash-NSI-SNT/).

## Licence

- **Le code** (le script `tp_infiltration.sh`, sauf ses textes) est sous licence [MIT](LICENSE).
- **Les documents** (les textes des missions et des indices du script, la fiche élève, la fiche professeur et les guides de `docs/`) sont sous licence [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.fr).
- **[JSLinux](https://bellard.org/jslinux/)**, de Fabrice Bellard : le Linux du navigateur, un service en ligne utilisé tel quel, qui ne fait pas partie du dépôt.
- **Les polices** Share Tech Mono, Barlow Condensed et Exo 2 : licence SIL OFL, par Google Fonts.

Tu peux les réutiliser et les modifier, y compris pour tes classes, en mentionnant Babash - NSI Tani Malandi et la licence ; un document modifié se partage sous la même licence. Si tu utilises l'IA pour les modifier, merci de le préciser.
