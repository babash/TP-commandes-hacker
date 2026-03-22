# 🕵️ Opération MIRAGE — TP Linux NSI

[![GitHub](https://img.shields.io/badge/GitHub-babash%2FTP--commandes--hacker-181717?logo=github)](https://github.com/babash/TP-commandes-hacker)
![License](https://img.shields.io/github/license/babash/TP-commandes-hacker)
![Version](https://img.shields.io/badge/version-8.0-green)

> **Terminale NSI · Terminal Linux · 15 missions · Auto-corrigé · Indices progressifs**

Vous venez de pénétrer le serveur du projet **MIRAGE**. Votre mission : naviguer dans l'arborescence, analyser des journaux, exfiltrer des données, gérer les droits d'accès et neutraliser un processus espion.

Ce TP est conçu pour **[JSLinux Alpine](https://bellard.org/jslinux/vm.html?url=alpine-x86.cfg&mem=192)** — un Linux complet dans le navigateur, sans installation.

---

## 🖥️ Lancer le TP dans JSLinux

### 1. Ouvrir JSLinux

👉 **https://bellard.org/jslinux/vm.html?url=alpine-x86.cfg&mem=192**

Attendez 15–20 secondes que le terminal démarre.

> ⚠️ **`Ctrl+V` ne fonctionne pas.** Pour coller : **clic droit → Paste**.

### 2. Télécharger le script

👉 **https://github.com/babash/TP-commandes-hacker/raw/main/tp_infiltration.sh**

*(Clic droit → "Enregistrer le lien sous..." si le navigateur affiche le contenu)*

### 3. Importer dans JSLinux

Cliquez sur la **flèche ↑** sous le terminal JSLinux, sélectionnez `tp_infiltration.sh`.

### 4. Lancer

```sh
. ~/tp_infiltration.sh
```

> **Important :** utilisez `.` (point) et **non** `source` — JSLinux tourne sous `ash` qui ne reconnaît pas `source`.

---

## 🖥️ Trois commandes seulement

```sh
MISSION    # Lister les 15 missions avec contexte et statut [OK]/[ ]
Q1..Q15   # Vérifier une mission — badge si succès, indice si échec
STATUT     # Score rapide
```

### Comment ça marche

**`MISSION`** affiche les 15 missions organisées en 5 phases, avec pour chacune son statut `[OK]` ou `[ ]`, son contexte narratif et la tâche à accomplir.

**`Q1`..`Q15`** vérifie si la mission est réussie :
- ✅ **Succès** → badge de félicitations + score mis à jour
- ❌ **Échec** → indice progressif (3 niveaux). Retaper `Qn` donne l'indice suivant, jusqu'à la solution complète au 3e appel.

**`STATUT`** affiche simplement le score et la liste des missions validées.

---

## 🎯 Les 15 missions

| Phase | # | Commande | Validation |
|-------|---|----------|------------|
| Reconnaissance | Q1 | `pwd` | history |
| Reconnaissance | Q2 | `ls` | history strict |
| Reconnaissance | Q3 | `ls --help` | history |
| Reconnaissance | Q4 | `ls -la` | history strict |
| Reconnaissance | Q5 | `cd` | `$PWD` + history |
| Reconnaissance | Q6 | `cat` | history |
| Pipe \| | Q7 | `cat \| grep` | history strict |
| Pipe \| | Q8 | `history \| grep` | history (pipe obligatoire) |
| Fichiers | Q9 | `touch` | **auto** (daemon) |
| Fichiers | Q10 | `find` | history strict |
| Fichiers | Q11 | `mkdir` | **auto** (daemon) |
| Droits | Q12 | `chmod 600` | **auto** (daemon) |
| Droits | Q13 | `chmod u+x` | **auto** (daemon) |
| Processus | Q14 | `ps \| grep` | history (pipe obligatoire) |
| Processus | Q15 | `kill` + `mv` | **auto** (daemon) |

> **Note :** sur JSLinux, `man` n'est pas installé. Q3 utilise `ls --help` à la place.

### Daemon de surveillance

Un script indépendant (`/tmp/mirage_daemon.sh`) tourne en arrière-plan et surveille le filesystem et les processus toutes les 3 secondes. Dès qu'une mission auto est accomplie, il écrit un badge dans un fichier de notifications. Ce badge s'affiche à la prochaine commande tapée (`Qn`, `MISSION` ou `STATUT`).

---

## 🔁 Réinitialiser

```sh
. ~/tp_infiltration.sh
```

Tout est recréé : arborescence, espion, daemon, progression.

---

## ⚙️ Compatibilité

| Environnement | Statut |
|---|---|
| **JSLinux Alpine x86** | ✅ Cible principale |
| Linux Debian / Ubuntu | ✅ Compatible |
| WSL (Windows) | ✅ Compatible |
| macOS | ⚠️ `stat -c` peut différer |

Script en **POSIX sh strict** — compatible `ash`, `dash`, `bash`.

---

## ⚖️ Avertissement légal

Simulation **fictive et locale**. Aucune connexion réseau externe. L'accès non autorisé à un système est un délit réprimé par l'**article 323-1 du Code Pénal** français.

---

## 📁 Arborescence générée

```
~/infiltration_mirage/
├── message_secret.txt          ← Q6 · cat
├── .prog                       ← progression (caché)
├── .hints                      ← niveaux d'indices (caché)
├── .notifs                     ← notifications daemon (caché)
└── serveur/
    ├── acces.txt
    ├── effacer_traces.sh       ← Q13 · chmod u+x
    ├── .fichier_cache          ← Q4 · ls -la
    ├── confidentiel/
    │   └── rapport.txt         ← Q10 · find
    ├── public/
    │   └── index.html
    ├── logs/
    │   └── access.log          ← Q7 · cat | grep Transfert
    ├── archive/                ← Q11 · mkdir (créé par l'élève)
    └── exfiltration/
        ├── rapport.txt         ← Q12 · chmod 600
        └── rapport_secret.txt  ← Q15 · mv → notes_vacances.txt

/tmp/espion_mirage.sh           ← Q14/Q15 · ps | grep, kill
/tmp/mirage_daemon.sh           ← daemon de surveillance auto
```

---

## 👩‍🏫 Pour les enseignants

| Document | Lien |
|---|---|
| Fiche professeur | [fiche_prof_mirage.html](https://babash.github.io/TP-commandes-hacker/fiche_prof_mirage.html) |
| Fiche élève A4 | [fiche_eleve_mirage.html](https://babash.github.io/TP-commandes-hacker/fiche_eleve_mirage.html) |

**Durée :** 1h30–2h · **Niveau :** Terminale NSI · **Prérequis :** notion de répertoire, navigateur

---

*v8.0 — Terminale NSI — Séquence Terminal Linux*
