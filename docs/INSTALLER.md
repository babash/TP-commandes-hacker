# Installer et lancer le TP

*Opération MIRAGE : lancer le TP, le relancer, le faire tourner ailleurs que dans JSLinux, et le dépanner. Le déroulé de la séance et le corrigé sont dans la [fiche professeur](https://babash.github.io/TP-commandes-hacker/fiche_prof_mirage.html). Retour au [README](../README.md).*

## 1. Avant la séance

- Teste le lancement complet sur un poste élève, avec le navigateur de la salle.
- Le lancement se termine par ce message : « TP pret ! Tape MISSION pour commencer. »
- Tape `ps` : la ligne de `espion_mirage` doit apparaître (c'est la cible de Q11).
- Imprime la [fiche élève](https://babash.github.io/TP-commandes-hacker/fiche_eleve_mirage.html) : une page A4.

## 2. Lancer le TP dans JSLinux

1. Ouvre JSLinux, un Linux Alpine qui tourne dans le navigateur. Le chargement prend 15 à 20 secondes.
   <https://bellard.org/jslinux/vm.html?url=alpine-x86.cfg&mem=192>
2. Télécharge le script sur l'ordinateur :
   <https://github.com/babash/TP-commandes-hacker/raw/main/tp_infiltration.sh>
3. Importe-le dans JSLinux : clique sur la **flèche ↑** sous le terminal, puis choisis `tp_infiltration.sh`.
4. Lance-le, avec un point au début, comme le demande la fiche élève (pas avec `source`) :
   ```sh
   . ~/tp_infiltration.sh
   ```
   Le point charge le script dans le shell ouvert : les commandes `MISSION`, `Q1` à `Q15` et `STATUT` y restent disponibles.
5. Tape `MISSION` pour afficher les missions.

**Copier-coller** : dans JSLinux, `Ctrl+V` ne marche pas. On colle avec un **clic droit → Paste**.

## 3. Relancer ou repartir de zéro

```sh
. ~/tp_infiltration.sh                              # relancer
rm -rf ~/.mirage_save && . ~/tp_infiltration.sh     # repartir de zéro
```

Relancer recrée le dossier `~/infiltration_mirage/` à neuf : les fichiers créés par l'élève disparaissent, mais les missions validées et les niveaux d'indices sont gardés dans `~/.mirage_save/`, puis restaurés. Le processus espion est relancé lui aussi.

## 4. Ailleurs que dans JSLinux

| Système | Compatibilité annoncée |
|---|---|
| JSLinux, Alpine x86 | la cible principale |
| Linux Debian ou Ubuntu | compatible |
| WSL (Windows) | compatible |
| macOS | `stat -c` peut donner un autre résultat (le script essaie alors `stat -f`) |

Le script est écrit en POSIX sh strict, pour `ash`, `dash` et `bash`. Il a besoin de `sh`, `ps`, `stat`, `awk` et `grep`, présents par défaut sur Alpine.

Les missions Q1 et Q15 lisent l'historique des commandes (`history`) : lance le TP dans un shell interactif qui en garde un, comme `ash` (JSLinux) ou `bash`. `dash` n'a pas de commande `history`.

## 5. Dépannage

| Ce qui se passe | Que faire |
|---|---|
| `MISSION` : commande introuvable | Le script a été lancé sans le point (par exemple `sh tp_infiltration.sh`) : relance-le avec `. ~/tp_infiltration.sh`. |
| `Ctrl+V` ne colle rien | Dans JSLinux, coller avec un **clic droit → Paste**. |
| `man` n'existe pas | JSLinux n'a pas `man` : `--help` le remplace (c'est le sujet de Q12). |
| Q11 : quel PID ? | Dans l'affichage de `ps`, le PID est la première colonne ; on cherche la ligne de `espion_mirage` (`espion_mirage.s` sous Debian ou Ubuntu). |

## 6. Ta propre copie

Les fiches élève et professeur sont des pages publiées avec GitHub Pages. La fiche élève donne l'adresse du script de **ce** dépôt (étape 2) : si tu modifies le script dans ta copie, change aussi cette adresse dans `fiche_eleve_mirage.html`.
