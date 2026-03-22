# 🕵️ Opération MIRAGE — TP Linux NSI

[![GitHub](https://img.shields.io/badge/GitHub-babash%2FTP--commandes--hacker-181717?logo=github)](https://github.com/babash/TP-commandes-hacker)
![License](https://img.shields.io/github/license/babash/TP-commandes-hacker)

> **Terminale NSI · Terminal Linux · 15 questions · Auto-corrigé · Agent IA intégré**

Vous venez de pénétrer le serveur du projet **MIRAGE**. Votre mission : naviguer dans l'arborescence, analyser des journaux, exfiltrer des données, gérer les droits d'accès et neutraliser un processus espion — en maîtrisant les commandes fondamentales du terminal Linux.

Ce TP est conçu pour fonctionner directement dans **[JSLinux](https://bellard.org/jslinux/vm.html?url=alpine-x86.cfg&mem=192)**, un émulateur Linux Alpine accessible depuis n'importe quel navigateur, sans installation.

---

## 🖥️ Environnement : JSLinux

Le TP tourne sur **[JSLinux Alpine x86](https://bellard.org/jslinux/vm.html?url=alpine-x86.cfg&mem=192)** — un Linux complet dans le navigateur.

> ⚠️ **Le copier-coller clavier (`Ctrl+V`) ne fonctionne pas dans JSLinux.**
> Pour coller du texte : **clic droit sur le terminal → Paste**.
> Pour importer un fichier : utiliser la **flèche ↑ en bas du terminal** (voir procédure ci-dessous).

---

## 🚀 Lancer le TP dans JSLinux — procédure complète

### Étape 1 — Ouvrir JSLinux

Ouvrez ce lien dans votre navigateur et attendez que le terminal démarre (10–20 secondes) :

👉 **https://bellard.org/jslinux/vm.html?url=alpine-x86.cfg&mem=192**

### Étape 2 — Télécharger `tp_infiltration.sh` sur votre ordinateur

Téléchargez le fichier depuis GitHub sur votre machine locale :

👉 **https://github.com/babash/TP-commandes-hacker/raw/main/tp_infiltration.sh**

*(Clic droit → "Enregistrer le lien sous..." si le navigateur l'affiche au lieu de le télécharger)*

### Étape 3 — Importer le fichier dans JSLinux

Dans la page JSLinux, cliquez sur la **flèche montante ↑** située sous le terminal.

```
[ Terminal JSLinux                    ]
[                                     ]
[  ~$                                 ]
[_____________________________________|
          ↑  ← cliquez ici
```

Sélectionnez le fichier `tp_infiltration.sh` téléchargé à l'étape 2.  
Le fichier est automatiquement copié dans votre répertoire personnel (`~/`).

### Étape 4 — Lancer le TP

Dans le terminal JSLinux, tapez :

```sh
. ~/tp_infiltration.sh
```

> **Important :** utilisez `.` (point) et **non** `source` — le shell de JSLinux (`ash`) ne reconnaît pas `source`. Le point `.` est la commande POSIX équivalente.

### Étape 5 — Afficher les questions

```sh
MISSION
```

---

## 🖥️ Commandes disponibles après chargement

```sh
MISSION   # Afficher les 15 questions avec leurs énoncés
Q1        # Vérifier la question 1 — de Q1 à Q15
STATUT    # Score et progression globale
AGENT     # Contacter l'agent ECHO (IA) pour de l'aide
```

Chaque vérificateur `Qn` affiche si la tâche est réussie et fournit un **indice précis** en cas d'échec.

---

## 🎯 Objectifs pédagogiques

15 questions progressives, du plus simple au plus complexe :

| # | Compétence | Commande(s) |
|---|------------|-------------|
| Q1 | Se repérer dans le système | `pwd` |
| Q2 | Lister le contenu d'un dossier | `ls` |
| Q3 | Consulter la documentation | `man` |
| Q4 | Lister avec les fichiers cachés | `ls -la` |
| Q5 | Naviguer dans l'arborescence | `cd` |
| Q6 | Afficher le contenu d'un fichier | `cat` |
| Q7 | **Introduction du pipe `\|`** — filtrer un journal | `cat … \| grep` |
| Q8 | Réutiliser le pipe sur l'historique | `history \| grep` |
| Q9 | Créer un fichier vide | `touch` |
| Q10 | Rechercher dans toute l'arborescence | `find` |
| Q11 | Créer un dossier et copier un fichier | `mkdir`, `cp` |
| Q12 | Modifier les droits (mode octal) | `chmod 600` |
| Q13 | Rendre un script exécutable | `chmod u+x` |
| Q14 | Observer et identifier un processus | `top`, `ps aux \| grep` |
| Q15 | Terminer un processus, renommer un fichier | `kill`, `mv` |

### Point fort pédagogique : le pipe introduit progressivement

Le pipe `|` est introduit en **Q7 sur un cas concret** (filtrer un vrai journal de connexions), puis immédiatement réutilisé en **Q8** sur l'historique. Les élèves comprennent le mécanisme avant de le reproduire, pas l'inverse.

---

## 🤖 L'agent ECHO

La commande `AGENT` ouvre une ligne de communication avec **ECHO**, un assistant IA (Claude) qui connaît le contexte du TP, votre progression et les 15 questions. Il peut :

- Expliquer un concept (le pipe, les droits octaux, les processus…)
- Débloquer un élève sans donner la réponse directement
- Répondre à des questions libres en restant dans la narration

> ECHO nécessite une connexion internet depuis JSLinux (active par défaut, limitée à 40 kB/s). Sans connexion, le TP fonctionne normalement — seule la commande `AGENT` est indisponible.

---

## 🔁 Réinitialiser le TP

```sh
. ~/tp_infiltration.sh
```

L'arborescence est recréée, le processus espion relancé, la progression réinitialisée.

---

## ⚙️ Compatibilité

| Environnement | Statut |
|---|---|
| **JSLinux Alpine x86** | ✅ Cible principale |
| Linux Debian / Ubuntu (bash) | ✅ Compatible |
| WSL (Windows Subsystem for Linux) | ✅ Compatible |
| macOS | ⚠️ `stat -c` peut différer |

Le script est écrit en **POSIX sh strict** — compatible `ash`, `dash`, `bash`.

---

## ⚖️ Avertissement légal

Ce TP est une **simulation entièrement fictive et locale**. Aucune connexion réseau réelle n'est effectuée vers un serveur tiers. Dans la réalité, l'accès non autorisé à un système informatique est un délit réprimé par l'**article 323-1 du Code Pénal** français. Ce rappel est affiché à chaque lancement du script.

---

## 📁 Arborescence générée

```
~/infiltration_mirage/
├── message_secret.txt          ← Q6 · cat
├── .progression                ← suivi interne (caché)
└── serveur/
    ├── acces.txt
    ├── effacer_traces.sh       ← Q13 · chmod u+x
    ├── .fichier_cache          ← Q4 · visible avec ls -la
    ├── confidentiel/
    │   └── rapport.txt         ← Q10/Q11 · find + cp
    ├── public/
    │   └── index.html
    ├── logs/
    │   └── access.log          ← Q7 · cat | grep Transfert
    └── exfiltration/           ← Q11/Q12/Q15 · mkdir, cp, chmod, mv
        └── rapport.txt → notes_vacances.txt

/tmp/espion_mirage.sh           ← Q14/Q15 · top, ps, kill
```

---

## 👩‍🏫 Pour les enseignants

| Document | Description |
|---|---|
| [`fiche_prof_mirage.html`](https://babash.github.io/TP-commandes-hacker/fiche_prof_mirage.html) | Corrigé complet des 15 questions, conseils pédagogiques, points d'attention, rôle de l'agent ECHO |
| [`fiche_eleve_mirage.html`](https://babash.github.io/TP-commandes-hacker/fiche_eleve_mirage.html) | Fiche A4 à imprimer — procédure JSLinux illustrée, commandes disponibles, utilisation d'ECHO |

**Durée estimée :** 1 h 30 à 2 h · **Niveau :** Terminale NSI · **Prérequis :** notion de répertoire, accès navigateur

---

*Conçu pour la Terminale NSI — Séquence Terminal Linux*
