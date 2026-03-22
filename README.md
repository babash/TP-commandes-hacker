# 🕵️ Opération MIRAGE — TP Linux NSI

[![GitHub](https://img.shields.io/badge/GitHub-babash%2FTP--commandes--hacker-181717?logo=github)](https://github.com/babash/TP-commandes-hacker)
![Version](https://img.shields.io/badge/version-10.0-green)

> **Terminale NSI · Terminal Linux · 15 missions · Auto-corrigé · Indices progressifs**

Vous venez de pénétrer le serveur du projet **MIRAGE**. Votre mission : naviguer dans l'arborescence, manipuler des fichiers, gérer les droits, neutraliser un processus espion — puis maîtriser les options avancées et le pipe.

Conçu pour **[JSLinux Alpine](https://bellard.org/jslinux/vm.html?url=alpine-x86.cfg&mem=192)** — Linux dans le navigateur, sans installation.

---

## 🚀 Lancer le TP

### 1. Ouvrir JSLinux
👉 **https://bellard.org/jslinux/vm.html?url=alpine-x86.cfg&mem=192**

> ⚠️ `Ctrl+V` ne fonctionne pas — coller via **clic droit → Paste**.

### 2. Télécharger le script
👉 **https://github.com/babash/TP-commandes-hacker/raw/main/tp_infiltration.sh**

### 3. Importer dans JSLinux
Cliquez sur la **flèche ↑** sous le terminal, sélectionnez `tp_infiltration.sh`.

### 4. Lancer
```sh
. ~/tp_infiltration.sh
```
> Utilisez `.` (point), **pas** `source` — non reconnu par ash sur Alpine.

---

## 🖥️ Trois commandes

```sh
MISSION    # Les 15 missions avec contexte et statut [OK]/[ ]
Q1..Q15   # Vérifier une mission
STATUT     # Score rapide
```

**`Qn` en cas d'échec** → indice niveau 1. Retaper → niveau 2. Retaper → solution complète.

**Progression sauvegardée** dans `~/.mirage_save/` — survivre à une réinitialisation du TP.

---

## 🎯 Les 15 missions

| Phase | Q | Commande | Validation |
|-------|---|----------|------------|
| Reconnaissance | Q1 | `pwd` | history |
| Reconnaissance | Q2 | `ls` | question : quel fichier vois-tu ? |
| Reconnaissance | Q3 | `cd` | position `$PWD` |
| Reconnaissance | Q4 | `cat` | question : quel mot de passe ? |
| Fichiers | Q5 | `touch` | **auto** — fichier créé |
| Fichiers | Q6 | `cp` | **auto** — fichier copié |
| Fichiers | Q7 | `mv` | **auto** — fichier renommé |
| Fichiers | Q8 | `mkdir` | **auto** — dossier créé |
| Droits | Q9 | `chmod 600` | **auto** — droits vérifiés |
| Droits | Q10 | `chmod u+x` | **auto** — bit +x vérifié |
| Processus | Q11 | `ps` + `kill` | question : quel PID ? |
| Options | Q12 | `ls --help` | question : quelle option ? |
| Options | Q13 | `ls -la` | question : quel fichier caché ? |
| Pipe | Q14 | `cat \| grep` | question : combien de lignes ? |
| Pipe | Q15 | `history \| grep` | question : que vois-tu ? |

### Progression pédagogique

Les phases 1–4 (Q1–Q11) couvrent les fondamentaux : navigation, fichiers, droits, processus. La phase 5 (Q12–Q15) introduit les notions plus avancées — options de commandes et pipe `|` — une fois que l'élève est à l'aise avec le terminal.

### Daemon de surveillance

Un script indépendant `/tmp/mirage_daemon.sh` surveille le filesystem toutes les 3 secondes. Dès qu'une mission `[auto]` est accomplie, il écrit un badge dans `.notifs`. Ce badge s'affiche à la prochaine commande tapée (`Qn`, `MISSION`, `STATUT`).

Le daemon est détaché du shell parent via `(sh ... </dev/null >>"$NOTIFS" 2>&1 &)` + `trap '' HUP` — il survit à la fin du sourcing.

---

## 🔁 Réinitialiser

```sh
. ~/tp_infiltration.sh
```

La progression est **sauvegardée automatiquement** dans `~/.mirage_save/` et restaurée au prochain lancement. Pour repartir de zéro :

```sh
rm -rf ~/.mirage_save && . ~/tp_infiltration.sh
```

---

## ⚙️ Compatibilité

| Environnement | Statut |
|---|---|
| **JSLinux Alpine x86** | ✅ Cible principale |
| Linux Debian / Ubuntu | ✅ Compatible |
| WSL (Windows) | ✅ Compatible |
| macOS | ⚠️ `stat -c` peut différer |

Script **POSIX sh strict** — compatible `ash`, `dash`, `bash`. Prérequis : `sh`, `ps`, `stat`, `awk`, `sed` (présents par défaut sur Alpine).

---

## 📁 Arborescence générée

```
~/infiltration_mirage/
├── message_secret.txt          ← Q4 · cat  (mot de passe : M1r4g3_2024)
├── .prog                       ← progression (caché)
├── .hints                      ← niveaux d'indices (caché)
├── .notifs                     ← notifications daemon (caché)
├── .daemon_pid                 ← PID daemon (caché)
└── serveur/
    ├── acces.txt               ← Q2 · ls  (réponse attendue)
    ├── effacer_traces.sh       ← Q10 · chmod u+x
    ├── .fichier_cache          ← Q13 · ls -la  (réponse attendue)
    ├── confidentiel/
    │   └── rapport.txt         ← Q6 · cp (source)
    ├── public/index.html
    ├── logs/
    │   └── access.log          ← Q14 · cat | grep Transfert (2 lignes)
    ├── exfiltration/           ← créé par l'élève (Q6)
    │   ├── rapport.txt         ← Q6 · cp (destination)
    │   └── rapport_cache.txt   ← Q7 · mv + Q9 · chmod 600
    └── archive/                ← Q8 · mkdir

~/.mirage_save/
├── .prog                       ← sauvegarde de progression
└── .hints                      ← sauvegarde des niveaux d'indices

/tmp/espion_mirage.sh           ← Q11 · ps + kill
/tmp/mirage_daemon.sh           ← daemon auto
```

---

## 👩‍🏫 Pour les enseignants

| Document | Lien |
|---|---|
| Fiche professeur | [fiche_prof_mirage.html](https://babash.github.io/TP-commandes-hacker/fiche_prof_mirage.html) |
| Fiche élève A4 | [fiche_eleve_mirage.html](https://babash.github.io/TP-commandes-hacker/fiche_eleve_mirage.html) |

**Durée :** 1h30–2h · **Niveau :** Terminale NSI · **Prérequis :** notion de répertoire, navigateur

---

## ⚖️ Avertissement légal

Simulation **fictive et 100 % locale**. Aucune connexion réseau externe. Art. 323-1 Code Pénal : accès non autorisé = délit.

---

*v10.0 — Terminale NSI — Séquence Terminal Linux*
