# Architecture

*Opération MIRAGE, pour les curieux·ses et les contributeur·rice·s : le script, la vérification des missions et les fichiers créés. Cette page ne donne aucune réponse des missions : le corrigé est dans la [fiche professeur](https://babash.github.io/TP-commandes-hacker/fiche_prof_mirage.html). Retour au [README](../README.md).*

## 1. Les fichiers du dépôt

| Fichier | Rôle |
|---|---|
| `tp_infiltration.sh` | Le script du TP, version 11.1, en POSIX sh |
| `fiche_eleve_mirage.html` | La fiche élève, une page A4 (version 11.1) |
| `fiche_prof_mirage.html` | La fiche professeur (version 11.1) |
| `docs/` | Ces guides |

## 2. Ce que fait le script

Chargé avec `. ~/tp_infiltration.sh`, le script définit les commandes `MISSION`, `Q1` à `Q15` et `STATUT` dans le shell ouvert, puis :

1. affiche l'introduction : l'histoire, le rappel de la loi et les trois commandes ;
2. arrête le processus espion d'un lancement précédent, s'il tourne encore ;
3. copie la progression dans `~/.mirage_save/` (sauf si ce dossier a été effacé : c'est la remise à zéro), efface puis recrée le dossier `~/infiltration_mirage/` et ses fichiers ;
4. restaure la progression ;
5. lance le processus espion, `/tmp/espion_mirage.sh` : une boucle qui ne fait qu'attendre. Le script l'exécute directement, pour qu'il garde son nom dans `ps` (le `ps` de Debian et d'Ubuntu n'affiche que le nom du programme, tronqué à 15 caractères : `espion_mirage.s`) ; si `/tmp` interdit l'exécution, il le lance avec `sh`.

Le script ne se connecte à aucun réseau.

## 3. La vérification des missions

| Méthode | Missions | Comment |
|---|---|---|
| L'historique | Q1 | La commande est cherchée dans les 60 dernières lignes de `history`. |
| L'état du système | Q3, Q5 à Q10, Q11 | Le dossier courant (`$PWD`), la présence des fichiers et des dossiers, les droits (`stat -c "%a"`, `[ -x … ]`), le processus espion dans `ps` (un espion arrêté mais pas encore ramassé par le système, un « zombie », ne compte plus). |
| Une question | Q2, Q4, Q11 à Q15 | `read` demande ce que la commande a affiché, et la réponse est comparée à celle attendue. |

Une question remplace l'historique quand la commande peut s'écrire de trop de façons (`ls`, par exemple) : elle vérifie aussi que l'élève a lu le résultat. Q11 pose d'abord une question (le PID de l'espion), puis se valide quand le processus a disparu.

Rien ne valide en arrière-plan : une mission est vérifiée quand l'élève tape son numéro. Une mission réussie affiche un badge et le score ; elle est notée dans `.prog`.

## 4. Les indices

Chaque échec fait monter le niveau d'indice de la mission, gardé dans `.hints` :

1. l'objectif et la commande ;
2. la structure de la commande, avec des `???` à compléter ;
3. la solution complète ; pour les questions Q2, Q12 et Q14, la réponse attendue aussi.

Au-delà, la solution reste affichée à chaque échec. Le message d'échec, lui, ne donne jamais la réponse.

## 5. La progression

`~/infiltration_mirage/.prog` contient 15 nombres, 0 ou 1, un par mission. Le fichier est copié dans `~/.mirage_save/` à chaque mission validée, avec `.hints`. Au lancement suivant, le script les restaure : relancer le TP ne fait pas perdre les missions validées.

## 6. Les versions

- **10** : un démon de surveillance validait seul les missions Q5 à Q10.
- **11.0** (24 mars 2026) : plus de démon ; chaque mission se valide quand l'élève tape son numéro.
- **11.1** (10 novembre 2026) : Q2 et Q14 suivent les indices gradués comme les autres missions, les personnages tutoient les élèves, la remise à zéro marche, l'espion est visible dans le `ps` de Debian et d'Ubuntu ; les fiches décrivent ce script.

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
