# Architecture

*Opération MIRAGE, pour les curieux·ses et les contributeur·rice·s : le script, la vérification des missions et les fichiers créés. Cette page ne donne aucune réponse des missions : le corrigé est dans la [fiche professeur](https://babash.github.io/TP-commandes-hacker/fiche_prof_mirage.html). Retour au [README](../README.md).*

## 1. Les fichiers du dépôt

| Fichier | Rôle |
|---|---|
| `tp_infiltration.sh` | Le script du TP, version 11.0, en POSIX sh |
| `fiche_eleve_mirage.html` | La fiche élève, une page A4 (version 10.0) |
| `fiche_prof_mirage.html` | La fiche professeur (version 10.0) |
| `docs/` | Ces guides |

## 2. Ce que fait le script

Chargé avec `. ~/tp_infiltration.sh`, le script définit les commandes `MISSION`, `Q1` à `Q15` et `STATUT` dans le shell ouvert, puis :

1. affiche l'introduction : l'histoire, le rappel de la loi et les trois commandes ;
2. arrête le processus espion d'un lancement précédent, s'il tourne encore ;
3. copie la progression dans `~/.mirage_save/`, efface puis recrée le dossier `~/infiltration_mirage/` et ses fichiers ;
4. restaure la progression ;
5. lance le processus espion, `/tmp/espion_mirage.sh` : une boucle qui ne fait qu'attendre.

Le script ne se connecte à aucun réseau.

## 3. La vérification des missions

| Méthode | Missions | Comment |
|---|---|---|
| L'historique | Q1 | La commande est cherchée dans les 60 dernières lignes de `history`. |
| L'état du système | Q3, Q5 à Q10, Q11 | Le dossier courant (`$PWD`), la présence des fichiers et des dossiers, les droits (`stat -c "%a"`, `[ -x … ]`), le processus espion dans `ps`. |
| Une question | Q2, Q4, Q11 à Q15 | `read` demande ce que la commande a affiché, et la réponse est comparée à celle attendue. |

Une question remplace l'historique quand la commande peut s'écrire de trop de façons (`ls`, par exemple) : elle vérifie aussi que l'élève a lu le résultat. Q11 pose d'abord une question (le PID de l'espion), puis se valide quand le processus a disparu.

Une mission réussie affiche un badge et le score ; elle est notée dans `.prog`.

## 4. Les indices

Chaque échec fait monter le niveau d'indice de la mission, gardé dans `.hints` :

1. l'objectif et la commande ;
2. la structure de la commande, avec des `???` à compléter ;
3. la solution complète.

Au-delà, la solution reste affichée à chaque échec.

## 5. La progression

`~/infiltration_mirage/.prog` contient 15 nombres, 0 ou 1, un par mission. Le fichier est copié dans `~/.mirage_save/` à chaque mission validée, avec `.hints`. Au lancement suivant, le script les restaure : relancer le TP ne fait pas perdre les missions validées.

## 6. Le démon des versions 10

Les fiches élève et professeur (version 10.0) parlent d'un démon de surveillance (`/tmp/mirage_daemon.sh`) qui validait seul, toutes les 3 secondes, les missions marquées `[auto]` (Q5 à Q10). La version 11.0 du script (24 mars 2026) n'a plus de démon : chaque mission se valide quand l'élève tape son numéro. Les fiches restent à mettre à jour sur ce point.

## 7. Les fichiers créés

Sans les réponses : les noms à trouver par les élèves sont remplacés par une description.

```text
~/infiltration_mirage/
├── message_secret.txt         Q4 (cat)
├── .prog  .hints              progression et niveaux d'indices (cachés)
└── serveur/
    ├── (un fichier texte)     Q2 (ls) : à trouver
    ├── (un fichier caché)     Q13 (ls -la) : à trouver
    ├── effacer_traces.sh      Q10 (chmod u+x)
    ├── confidentiel/
    │   └── rapport.txt        Q6 (cp) : le fichier à copier
    ├── public/
    │   └── index.html
    ├── logs/
    │   └── access.log         Q14 (cat | grep)
    ├── agent.log              créé par l'élève (Q5)
    ├── exfiltration/          créé par l'élève (Q6, puis Q7 et Q9)
    └── archive/               créé par l'élève (Q8)

~/.mirage_save/                copie de .prog et .hints
/tmp/espion_mirage.sh          le processus espion (Q11)
```
