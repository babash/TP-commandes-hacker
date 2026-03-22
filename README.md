# 🕵️ Opération MIRAGE — TP Linux NSI

[![GitHub](https://img.shields.io/badge/GitHub-babash%2FTP--commandes--hacker-181717?logo=github)](https://github.com/babash/TP-commandes-hacker)
![License](https://img.shields.io/github/license/babash/TP-commandes-hacker)
![Version](https://img.shields.io/badge/version-5.1-green)

> **Terminale NSI · Terminal Linux · 15 missions · Auto-corrigé · Aide hors-ligne**

Vous venez de pénétrer le serveur du projet **MIRAGE**. Votre mission : naviguer dans l'arborescence, analyser des journaux, exfiltrer des données, gérer les droits d'accès et neutraliser un processus espion — en maîtrisant les commandes fondamentales du terminal Linux.

Ce TP est conçu pour **[JSLinux Alpine](https://bellard.org/jslinux/vm.html?url=alpine-x86.cfg&mem=192)** — un Linux complet dans le navigateur, sans installation.

---

## 🖥️ Environnement : JSLinux

Ouvrez ce lien dans votre navigateur :

👉 **https://bellard.org/jslinux/vm.html?url=alpine-x86.cfg&mem=192**

> ⚠️ **`Ctrl+V` ne fonctionne pas dans JSLinux.**
> Pour coller du texte : **clic droit sur le terminal → Paste**.
> Pour importer un fichier : utiliser la **flèche ↑ sous le terminal** (voir procédure complète sur la fiche élève).

---

## 🚀 Lancer le TP — procédure complète

### 1. Télécharger le script sur votre machine

👉 **https://github.com/babash/TP-commandes-hacker/raw/main/tp_infiltration.sh**

*(Clic droit → "Enregistrer le lien sous..." si le navigateur affiche le contenu)*

### 2. Importer dans JSLinux

Cliquez sur la **flèche ↑** sous le terminal JSLinux et sélectionnez `tp_infiltration.sh`.  
Le fichier est copié automatiquement dans `~/`.

### 3. Lancer

```sh
. ~/tp_infiltration.sh
```

> **Important :** utilisez `.` (point) et **non** `source` — JSLinux tourne sous `ash` (Alpine), qui ne reconnaît pas `source`.

### 4. Afficher les missions

```sh
MISSION
```

---

## 🖥️ Commandes disponibles

```sh
MISSION      # Lister les 15 missions avec leur statut [OK] / [ ]
Q1 .. Q15   # Vérifier / valider une mission
STATUT       # Score et progression globale
AGENT <n>   # Aide hors-ligne pour la mission n  (ex: AGENT 7)
```

---

## 🎯 Les 15 missions

15 missions **indépendantes**, réalisables dans n'importe quel ordre :

| # | Compétence | Commande | Validation |
|---|------------|----------|------------|
| Q1 | Se repérer | `pwd` | manuelle + history |
| Q2 | Lister un dossier | `ls` | manuelle + history |
| Q3 | Lire la doc | `man` | manuelle + history |
| Q4 | Fichiers cachés | `ls -la` | manuelle + history |
| Q5 | Se déplacer | `cd` | `$PWD` + history |
| Q6 | Lire un fichier | `cat` | manuelle + history |
| Q7 | **Intro pipe `\|`** — filtrer un journal | `cat \| grep` | manuelle + history |
| Q8 | Pipe sur l'historique | `history \| grep` | manuelle + history |
| Q9 | Créer un fichier vide | `touch` | **auto** (filesystem) |
| Q10 | Recherche récursive | `find` | manuelle + history |
| Q11 | Créer un dossier | `mkdir` | **auto** (filesystem) |
| Q12 | Droits restrictifs | `chmod 600` | **auto** (droits fichier) |
| Q13 | Rendre exécutable | `chmod u+x` | **auto** (bit +x) |
| Q14 | Observer les processus | `top` + `ps \| grep` | manuelle + history |
| Q15 | Terminer + renommer | `kill` + `mv` | **auto** (processus + fichier) |

### Double validation : automatique ET manuelle

- **Missions auto** (Q9, Q11, Q12, Q13, Q15) : un watcher vérifie l'état du système toutes les 3 secondes. Dès que la condition est remplie, la mission se valide sans que l'élève ait à taper `Qn`.
- **Missions manuelles** : l'élève tape `Qn`. Le vérificateur contrôle l'état ET cherche la bonne commande dans les 50 dernières lignes de l'historique. Les patterns sont volontairement **stricts** pour éviter les fausses validations.

### Le pipe `|` introduit progressivement

Q7 explique le principe sur un cas concret (filtrer un journal de connexions), Q8 le réutilise immédiatement sur l'historique. Les élèves comprennent avant de reproduire.

---

## 🤖 Agent ECHO — aide hors-ligne

```sh
AGENT 7   # Aide pour la mission 7
```

ECHO est un système d'aide **entièrement hors-ligne**, sans IA, sans réseau. Pour chaque mission il propose **3 niveaux d'indices** :

- **Niveau 1** — rappel de l'objectif et de la commande concernée
- **Niveau 2** — structure de la commande avec des `???` à compléter
- **Niveau 3** — solution complète

Avant de répondre, ECHO **analyse l'état réel du système** (droits actuels, fichiers présents, PID du processus espion…) pour contextualiser l'indice. Chaque réponse se termine par un rappel : *"Reviens me voir si tu as besoin de plus d'aide."*

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
| Linux Debian / Ubuntu | ✅ Compatible |
| WSL (Windows) | ✅ Compatible |
| macOS | ⚠️ `stat -c` peut différer |

Le script est écrit en **POSIX sh strict** — compatible `ash`, `dash`, `bash`.  
Prérequis : `sh`, `ps`, `stat`, `find`, `awk` — présents par défaut sur Alpine.

---

## ⚖️ Avertissement légal

Ce TP est une **simulation entièrement fictive et locale**. Aucune connexion réseau réelle n'est effectuée. L'accès non autorisé à un système est un délit réprimé par l'**article 323-1 du Code Pénal** français. Ce rappel est affiché à chaque lancement.

---

## 📁 Arborescence générée

```
~/infiltration_mirage/
├── message_secret.txt          ← Q6 · cat
├── .progression                ← suivi interne (caché)
├── .watcher_pid                ← PID du watcher auto (caché)
└── serveur/
    ├── acces.txt
    ├── effacer_traces.sh       ← Q13 · chmod u+x
    ├── .fichier_cache          ← Q4 · visible avec ls -la
    ├── confidentiel/
    │   └── rapport.txt         ← Q10 · find
    ├── public/
    │   └── index.html
    ├── logs/
    │   └── access.log          ← Q7 · cat | grep Transfert
    ├── archive/                ← Q11 · mkdir  (créé par l'élève)
    └── exfiltration/
        ├── rapport.txt         ← Q12 · chmod 600
        └── rapport_secret.txt  ← Q15 · mv → notes_vacances.txt

/tmp/espion_mirage.sh           ← Q14/Q15 · top, ps, kill
```

---

## 👩‍🏫 Pour les enseignants

| Document | Lien |
|---|---|
| Fiche professeur (corrigé + conseils) | [fiche_prof_mirage.html](https://babash.github.io/TP-commandes-hacker/fiche_prof_mirage.html) |
| Fiche élève A4 (procédure JSLinux + aide) | [fiche_eleve_mirage.html](https://babash.github.io/TP-commandes-hacker/fiche_eleve_mirage.html) |

**Durée estimée :** 1 h 30 à 2 h · **Niveau :** Terminale NSI · **Prérequis :** notion de répertoire, accès navigateur

---

*Conçu pour la Terminale NSI — Séquence Terminal Linux · v5.1*
