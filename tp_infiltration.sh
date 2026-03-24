#!/bin/sh
# ============================================================
#   TP NSI — Operation Mirage  v11.0
#   Terminale NSI — Terminal Linux / JSLinux Alpine
#   https://github.com/babash/TP-commandes-hacker
# ============================================================

RED='\033[0;31m'; GRN='\033[0;32m'; YEL='\033[1;33m'
CYN='\033[0;36m'; BLD='\033[1m'; DIM='\033[2m'; NC='\033[0m'

TP_DIR="$HOME/infiltration_mirage"
SAVE_DIR="$HOME/.mirage_save"
NB_Q=15

p() { printf "%b\n" "$*"; }

# ============================================================
# PERSISTANCE — lecture / écriture du score
# Format : "v1 v2 v3 ... v15"  (15 entiers 0 ou 1)
# ============================================================
_prog_file() { echo "$TP_DIR/.prog"; }

_prog_read() {
    _f=$(_prog_file)
    if [ -f "$_f" ]; then cat "$_f"; else echo "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0"; fi
}

# Écrire la valeur 1 pour la mission N, en préservant les 15 champs
_prog_set() {
    _n="$1"
    _cur=$(_prog_read)
    _new=$(echo "$_cur" | awk -v n="$_n" '
        BEGIN { for(i=1;i<=15;i++) a[i]=0 }
        { for(i=1;i<=NF;i++) a[i]=$i; a[n]=1 }
        END { for(i=1;i<=15;i++) printf "%s%s", a[i], (i<15?" ":"\n") }
    ')
    echo "$_new" > "$(_prog_file)"
    # Sauvegarder immédiatement hors de $TP_DIR
    mkdir -p "$SAVE_DIR"
    cp "$(_prog_file)" "$SAVE_DIR/.prog"
}

_field() {
    # Extraire le Nième champ d'une chaîne
    echo "$1" | awk -v n="$2" '{print $n}'
}

_done() { [ "$(_field "$(_prog_read)" "$1")" = "1" ]; }

# Niveaux d'indice (0=jamais demandé, 1/2/3)
_hints_file() { echo "$TP_DIR/.hints"; }

_hint_lvl() {
    _f=$(_hints_file)
    [ -f "$_f" ] || echo "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0" > "$_f"
    _field "$(cat "$_f")" "$1"
}

_hint_inc() {
    _n="$1"
    _f=$(_hints_file)
    [ -f "$_f" ] || echo "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0" > "$_f"
    _cur=$(_hint_lvl "$_n")
    [ "$_cur" -lt 3 ] && _cur=$((_cur+1))
    _new=$(cat "$_f" | awk -v n="$_n" -v v="$_cur" '
        BEGIN { for(i=1;i<=15;i++) a[i]=0 }
        { for(i=1;i<=NF;i++) a[i]=$i; a[n]=v }
        END { for(i=1;i<=15;i++) printf "%s%s", a[i], (i<15?" ":"\n") }
    ')
    echo "$_new" > "$_f"
    echo "$_cur"
}

# ============================================================
# HELPERS SYSTÈME
# ============================================================
_perms()        { stat -c "%a" "$1" 2>/dev/null || stat -f "%OLp" "$1" 2>/dev/null; }
_espion_pid()   { ps 2>/dev/null | grep "[e]spion_mirage" | awk '{print $1}' | head -1; }
_espion_alive() { [ -n "$(_espion_pid)" ]; }
_inhist()       { history 2>/dev/null | tail -60 | grep -qE "$1"; }

# ============================================================
# BADGE DE SUCCÈS
# ============================================================
_badge() {
    _n="$1"
    _tot=0; _i=1; _pg=$(_prog_read)
    while [ "$_i" -le "$NB_Q" ]; do
        [ "$(_field "$_pg" "$_i")" = "1" ] && _tot=$((_tot+1))
        _i=$((_i+1))
    done
    printf "%b" "$GRN"
    printf "  +--------------------------------------------------+\n"
    case "$_n" in
    1)  printf "  | Q1  ACCOMPLIE  Bonne orientation, agent.        |\n" ;;
    2)  printf "  | Q2  ACCOMPLIE  Premiere reconnaissance reussie. |\n" ;;
    3)  printf "  | Q3  ACCOMPLIE  Vous etes dans la place.         |\n" ;;
    4)  printf "  | Q4  ACCOMPLIE  Message dechiffre.               |\n" ;;
    5)  printf "  | Q5  ACCOMPLIE  Empreinte enregistree.           |\n" ;;
    6)  printf "  | Q6  ACCOMPLIE  Rapport exfiltre.                |\n" ;;
    7)  printf "  | Q7  ACCOMPLIE  Fichier dissimule.               |\n" ;;
    8)  printf "  | Q8  ACCOMPLIE  Zone de transit prete.           |\n" ;;
    9)  printf "  | Q9  ACCOMPLIE  Fichier protege (rw-------)      |\n" ;;
    10) printf "  | Q10 ACCOMPLIE  Script arme et pret.             |\n" ;;
    11) printf "  | Q11 ACCOMPLIE  Espion neutralise.               |\n" ;;
    12) printf "  | Q12 ACCOMPLIE  La documentation, votre alliee.  |\n" ;;
    13) printf "  | Q13 ACCOMPLIE  Les fichiers caches sont vus.    |\n" ;;
    14) printf "  | Q14 ACCOMPLIE  LE PIPE EST DEBLOQUE !           |\n"
        printf "  | Outil fondamental du terminal. Retenez-le.      |\n" ;;
    15) printf "  | Q15 ACCOMPLIE  *** OPERATION TERMINEE ***       |\n"
        printf "  | Toutes les missions accomplies. Bien joue.      |\n" ;;
    esac
    printf "  | Score : %d/%-2d                                    |\n" "$_tot" "$NB_Q"
    printf "  +--------------------------------------------------+\n"
    printf "%b\n" "$NC"
}

# Marquer une mission réussie et afficher le badge
_marquer() {
    _done "$1" && return 0
    _prog_set "$1"
    _badge "$1"
}

# ============================================================
# VÉRIFICATEURS : _ok / _fail
# ============================================================
_ok() {
    # $1 = message facultatif, $2 = numéro de mission
    [ -n "$1" ] && p "  ${GRN}[OK]${NC} $1"
    _marquer "$2"
}

_fail() {
    # $1 = numéro, $2 = message d'échec
    p "  ${RED}[--]${NC} $2"
    _lvl=$(_hint_inc "$1")
    p "  ${YEL}[Indice $_lvl/3]${NC}"
    case "$_lvl" in
        1) _hint1 "$1" ;;
        2) _hint2 "$1" ;;
        3) _hint3 "$1" ;;
    esac
    [ "$_lvl" -lt 3 ] && p "  ${DIM}Retapez Q${1} pour l'indice suivant.${NC}"
}

# ============================================================
# BANNIÈRE
# ============================================================
banner() {
    clear
    printf "%b" "$RED"
    cat << 'EOF'
  ___  ____  ____  ____   __  ____  __  ____  __ _
 / _ \(  _ \( ___)(  _ \ / _\(_  _)(  )(  _ \(  ( \
( (_) )) __/ ) _)  )   //    \ )(   )(  )   //    /
 \___/(__)  (____)(_)\_)\_/\_/(__) (__)(____)(\___)
EOF
    printf "%b\n" "${YEL}          ~~~ Operation MIRAGE  v11.0 ~~~${NC}"
    printf "%b\n" "${DIM}    Terminale NSI - Travaux Pratiques Linux${NC}"
    printf "\n"
}

# ============================================================
# INTRO
# ============================================================
intro() {
    banner
    p "${CYN}${BLD}[ TRANSMISSION CHIFFREE RECUE ]${NC}"
    p ""
    p "  Agent, vous avez penetrer le serveur ${RED}${BLD}MIRAGE${NC}."
    p "  15 missions vous attendent, dans l'ordre que vous voulez."
    p ""
    p "  ${YEL}Rappel legal :${NC} simulation fictive et 100%% locale."
    p "  Art. 323-1 Code Penal : acces non autorise = delit."
    p ""
    p "${DIM}  ──────────────────────────────────────────────────────${NC}"
    p ""
    p "  ${BLD}Trois commandes :${NC}"
    p ""
    printf "  ${GRN}%-10s${NC}  Affiche les 15 missions avec statut [OK]/[ ]\n" "MISSION"
    p ""
    printf "  ${GRN}%-10s${NC}  Verifie la mission N.\n"                         "Q1..Q15"
    printf "  %-10s  ${GRN}Succes${NC} : badge de felicitations + score.\n"     ""
    printf "  %-10s  ${RED}Echec${NC}  : indice (retapez pour le suivant).\n"   ""
    p ""
    printf "  ${GRN}%-10s${NC}  Score rapide.\n"                                "STATUT"
    p ""
    p "${DIM}  Votre progression est sauvegardee automatiquement.${NC}"
    p "${DIM}  Pour repartir de zero : rm -rf ~/.mirage_save${NC}"
    p ""
}

# ============================================================
# SETUP
# ============================================================
setup_tp() {
    p "${YEL}[SETUP] Initialisation...${NC}"

    # Arrêter l'espion précédent
    ps 2>/dev/null | grep "[e]spion_mirage" | awk '{print $1}' | \
        while read _p; do kill "$_p" 2>/dev/null; done

    # Sauvegarder la progression avant rm -rf
    mkdir -p "$SAVE_DIR"
    [ -f "$TP_DIR/.prog" ]  && cp "$TP_DIR/.prog"  "$SAVE_DIR/.prog"
    [ -f "$TP_DIR/.hints" ] && cp "$TP_DIR/.hints" "$SAVE_DIR/.hints"

    rm -rf "$TP_DIR"
    mkdir -p "$TP_DIR/serveur/confidentiel" \
             "$TP_DIR/serveur/public" \
             "$TP_DIR/serveur/logs"

    # Fichiers de contenu
    echo "ACCES REFUSE." > "$TP_DIR/serveur/acces.txt"

    cat > "$TP_DIR/serveur/confidentiel/rapport.txt" << 'EOF'
RAPPORT CONFIDENTIEL -- Operation Mirage
Classification : SECRET DEFENSE  |  Date : 2024-01-15
---
Coordonnees : 48.8566 N, 2.3522 E
Cle : MIRAGE-2024-ALPHA  |  Transfert : 03:00 UTC
Ce fichier ne doit pas quitter le perimetre securise.
EOF

    echo "Index public MIRAGE." > "$TP_DIR/serveur/public/index.html"

    cat > "$TP_DIR/serveur/logs/access.log" << 'EOF'
2024-01-15 08:23:11 - Connexion root         depuis 192.168.1.1  [OK]
2024-01-15 09:11:42 - Connexion inconnue     depuis 10.0.0.42    [REFUSE]
2024-01-15 09:45:00 - Lecture config.sys     depuis 192.168.1.1  [OK]
2024-01-15 10:00:01 - Transfert rapport.txt  vers   10.0.0.99    [OK]
2024-01-15 10:00:03 - Transfert cles.txt     vers   10.0.0.99    [OK]
2024-01-15 10:00:05 - Deconnexion root                           [OK]
2024-01-15 11:30:17 - Connexion admin        depuis 192.168.1.1  [OK]
2024-01-15 14:12:55 - Lecture access.log     depuis 10.0.0.42    [REFUSE]
EOF

    cat > "$TP_DIR/serveur/effacer_traces.sh" << 'EOF'
#!/bin/sh
echo "Nettoyage en cours... Traces effacees."
EOF
    chmod 644 "$TP_DIR/serveur/effacer_traces.sh"

    cat > "$TP_DIR/serveur/.fichier_cache" << 'EOF'
[ECHO] Bien joue. Les fichiers en point sont caches par defaut.
Le rapport confidentiel se trouve dans confidentiel/
EOF

    cat > "$TP_DIR/message_secret.txt" << 'EOF'
[ECHO] Operation MIRAGE | Priorite HAUTE
Serveur actif depuis 72h.
Des transferts suspects figurent dans serveur/logs/access.log
Un processus de surveillance tourne en arriere-plan.
Mot de passe secours : M1r4g3_2024
EOF

    # Restaurer ou initialiser la progression
    if [ -f "$SAVE_DIR/.prog" ]; then
        cp "$SAVE_DIR/.prog"  "$TP_DIR/.prog"
        cp "$SAVE_DIR/.hints" "$TP_DIR/.hints" 2>/dev/null || \
            echo "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0" > "$TP_DIR/.hints"
        p "${CYN}[INFO] Progression restauree.${NC}"
    else
        echo "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0" > "$TP_DIR/.prog"
        echo "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0" > "$TP_DIR/.hints"
    fi

    # Lancer l'espion
    cat > /tmp/espion_mirage.sh << 'EOF'
#!/bin/sh
# espion_mirage - surveillance fictive NSI
while true; do sleep 30; done
EOF
    chmod +x /tmp/espion_mirage.sh
    (sh /tmp/espion_mirage.sh </dev/null >/dev/null 2>&1 &)
}

# ============================================================
# MISSION
# ============================================================
MISSION() {
    banner
    _p=$(_prog_read)
    _total=0; _i=1
    while [ "$_i" -le "$NB_Q" ]; do
        [ "$(_field "$_p" "$_i")" = "1" ] && _total=$((_total+1))
        _i=$((_i+1))
    done
    p "${YEL}  OPERATION MIRAGE — ${_total}/${NB_Q} missions accomplies${NC}"
    p "${DIM}  ──────────────────────────────────────────────────────${NC}"
    p ""

    _show() {
        _n="$1"; _cmd="$2"; _ctx="$3"; _tache="$4"
        [ "$(_field "$_p" "$_n")" = "1" ] && _m="${GRN}[OK]${NC}" || _m="${DIM}[ ]${NC}"
        p "  $_m ${CYN}${BLD}Q${_n}${NC}  ${YEL}${_cmd}${NC}"
        p "     ${DIM}${_ctx}${NC}"
        p "     ${BLD}>> ${_tache}${NC}"
        p ""
    }

    p "  ${DIM}── Phase 1 : Reconnaissance ────────────────────────────${NC}"; p ""
    _show  1 "pwd"    "Ou etes-vous exactement ?" \
                      "Tapez pwd puis Q1."
    _show  2 "ls"     "Le serveur contient des fichiers et dossiers." \
                      "Listez le contenu de serveur/ puis tapez Q2."
    _show  3 "cd"     "Lister c'est bien, entrer dans la zone c'est mieux." \
                      "Allez dans ~/infiltration_mirage/serveur/ puis tapez Q3."
    _show  4 "cat"    "Un message chiffre vous attend." \
                      "Lisez message_secret.txt puis tapez Q4."

    p "  ${DIM}── Phase 2 : Manipulation de fichiers ──────────────────${NC}"; p ""
    _show  5 "touch"  "Laissez une empreinte numerique sur ce serveur." \
                      "Creez serveur/agent.log puis tapez Q5."
    _show  6 "cp"     "Le rapport confidentiel doit etre exfiltre." \
                      "Copiez confidentiel/rapport.txt dans serveur/exfiltration/ puis Q6."
    _show  7 "mv"     "Le nom rapport.txt est trop visible. Camouflons-le." \
                      "Renommez exfiltration/rapport.txt en rapport_cache.txt puis Q7."
    _show  8 "mkdir"  "Il faut une zone de stockage supplementaire." \
                      "Creez serveur/archive/ puis tapez Q8."

    p "  ${DIM}── Phase 3 : Droits ────────────────────────────────────${NC}"; p ""
    _show  9 "chmod 600" "Le rapport cache doit etre inaccessible aux autres." \
                         "Droits 600 sur exfiltration/rapport_cache.txt puis Q9."
    _show 10 "chmod u+x" "Le script d'effacement est bloque. Il faut l'armer." \
                         "Rendez effacer_traces.sh executable puis Q10."

    p "  ${DIM}── Phase 4 : Processus ─────────────────────────────────${NC}"; p ""
    _show 11 "ps + kill" "Un processus espion surveille le serveur." \
                         "Trouvez son PID avec ps, eliminez-le avec kill, puis Q11."

    p "  ${DIM}── Phase 5 : Options et pipe | ─────────────────────────${NC}"; p ""
    _show 12 "ls --help" "Certains fichiers sont caches. Il faut la bonne option." \
                         "Consultez ls --help puis tapez Q12."
    _show 13 "ls -la"    "Mettez en pratique l'option trouvee en Q12." \
                         "Listez serveur/ avec les fichiers caches puis tapez Q13."
    _show 14 "cat|grep"  "Le journal access.log contient des lignes suspectes." \
                         "Filtrez access.log avec cat | grep Transfert puis Q14."
    _show 15 "history|grep" "Meme principe, sur votre historique de commandes." \
                            "Executez history | grep Q puis tapez Q15."
}

# ============================================================
# STATUT
# ============================================================
STATUT() {
    _p=$(_prog_read); _total=0; _i=1
    p ""; p "  ${BLD}Score — Operation MIRAGE${NC}"; p ""
    while [ "$_i" -le "$NB_Q" ]; do
        if [ "$(_field "$_p" "$_i")" = "1" ]; then
            printf "  ${GRN}OK${NC} Q%s\n" "$_i"; _total=$((_total+1))
        else
            printf "  ${DIM}--${NC} Q%s\n" "$_i"
        fi
        _i=$((_i+1))
    done
    p ""
    p "  ${BLD}${_total}/${NB_Q}${NC}"
    if [ "$_total" -eq "$NB_Q" ]; then
        p "  ${GRN}${BLD}OPERATION TERMINEE. Felicitations, agent.${NC}"
    else
        p "  ${DIM}Tapez MISSION pour les details.${NC}"
    fi
    p ""
}

# ============================================================
# Q1–Q15 : vérificateurs
# ============================================================

# Q1 — pwd — history
Q1() {
    _done 1 && { p "  ${GRN}[OK]${NC} Q1 deja validee."; return; }
    _inhist "^[0-9 ]*pwd[[:space:]]*$" \
        && _ok "" 1 \
        || _fail 1 "pwd non detecte dans l'historique."
}

# Q2 — ls — question : quel fichier .txt ?
Q2() {
    _done 2 && { p "  ${GRN}[OK]${NC} Q2 deja validee."; return; }
    p "  ${CYN}Q2 — ls${NC}"
    p "  Listez le contenu de serveur/ (peu importe comment)."
    p "  Quel fichier .txt voyez-vous dans ce dossier ?"
    printf "  > "; read _r
    case "$_r" in
        acces.txt|acces) _ok "" 2 ;;
        *) _fail 2 "Reponse incorrecte (attendu : acces.txt)." ;;
    esac
}

# Q3 — cd — $PWD
Q3() {
    _done 3 && { p "  ${GRN}[OK]${NC} Q3 deja validee."; return; }
    if [ "$PWD" = "$TP_DIR/serveur" ]; then
        _ok "" 3
    else
        p "  ${DIM}Position actuelle : $PWD${NC}"
        _fail 3 "Vous n'etes pas dans serveur/."
    fi
}

# Q4 — cat — question : mot de passe
Q4() {
    _done 4 && { p "  ${GRN}[OK]${NC} Q4 deja validee."; return; }
    p "  ${CYN}Q4 — cat${NC}"
    p "  Lisez ~/infiltration_mirage/message_secret.txt"
    p "  Quel est le mot de passe mentionne dans ce fichier ?"
    printf "  > "; read _r
    case "$_r" in
        M1r4g3_2024|m1r4g3_2024) _ok "" 4 ;;
        *) _fail 4 "Reponse incorrecte. Avez-vous bien lu le fichier ?" ;;
    esac
}

# Q5 — touch — filesystem
Q5() {
    _done 5 && { p "  ${GRN}[OK]${NC} Q5 deja validee."; return; }
    [ -f "$TP_DIR/serveur/agent.log" ] \
        && _ok "" 5 \
        || _fail 5 "agent.log absent de serveur/."
}

# Q6 — cp — filesystem
Q6() {
    _done 6 && { p "  ${GRN}[OK]${NC} Q6 deja validee."; return; }
    [ -f "$TP_DIR/serveur/exfiltration/rapport.txt" ] \
        && _ok "" 6 \
        || _fail 6 "rapport.txt absent d'exfiltration/."
}

# Q7 — mv — filesystem
Q7() {
    _done 7 && { p "  ${GRN}[OK]${NC} Q7 deja validee."; return; }
    [ -f "$TP_DIR/serveur/exfiltration/rapport_cache.txt" ] \
        && _ok "" 7 \
        || _fail 7 "rapport_cache.txt absent. Avez-vous utilise mv ?"
}

# Q8 — mkdir — filesystem
Q8() {
    _done 8 && { p "  ${GRN}[OK]${NC} Q8 deja validee."; return; }
    [ -d "$TP_DIR/serveur/archive" ] \
        && _ok "" 8 \
        || _fail 8 "Dossier archive/ absent de serveur/."
}

# Q9 — chmod 600 — filesystem
Q9() {
    _done 9 && { p "  ${GRN}[OK]${NC} Q9 deja validee."; return; }
    _t="$TP_DIR/serveur/exfiltration/rapport_cache.txt"
    if [ ! -f "$_t" ]; then
        _fail 9 "rapport_cache.txt absent. Completez Q7 d'abord."
        return
    fi
    _pp=$(_perms "$_t")
    if [ "$_pp" = "600" ]; then
        _ok "" 9
    else
        p "  ${DIM}Droits actuels : ${_pp:-?}  (attendu : 600)${NC}"
        _fail 9 "Droits incorrects sur rapport_cache.txt."
    fi
}

# Q10 — chmod u+x — filesystem
Q10() {
    _done 10 && { p "  ${GRN}[OK]${NC} Q10 deja validee."; return; }
    if [ -x "$TP_DIR/serveur/effacer_traces.sh" ]; then
        _ok "" 10
    else
        p "  ${DIM}Droits actuels : $(_perms "$TP_DIR/serveur/effacer_traces.sh")${NC}"
        _fail 10 "effacer_traces.sh non executable."
    fi
}

# Q11 — ps + kill — question : PID, puis vérif processus mort
Q11() {
    _done 11 && { p "  ${GRN}[OK]${NC} Q11 deja validee."; return; }
    _pid=$(_espion_pid)
    if [ -z "$_pid" ]; then
        # Espion déjà mort = validé
        _ok "" 11
        return
    fi
    p "  ${CYN}Q11 — ps + kill${NC}"
    p "  Executez : ps"
    p "  Quel est le PID du processus espion_mirage ?"
    printf "  > "; read _r
    if [ "$_r" = "$_pid" ]; then
        p "  ${GRN}Correct !${NC} Maintenant : ${YEL}kill $_pid${NC}"
        p "  ${DIM}Retapez Q11 apres l'avoir tue.${NC}"
    else
        _fail 11 "PID incorrect. Cherchez la ligne espion_mirage dans ps."
    fi
}

# Q12 — ls --help — question : option -a
Q12() {
    _done 12 && { p "  ${GRN}[OK]${NC} Q12 deja validee."; return; }
    p "  ${CYN}Q12 — ls --help${NC}"
    p "  Executez : ls --help"
    p "  Quelle option affiche les fichiers caches ?"
    printf "  > "; read _r
    case "$_r" in
        -a|a|--all) _ok "" 12 ;;
        *) _fail 12 "Reponse incorrecte. Cherchez 'all' dans ls --help." ;;
    esac
}

# Q13 — ls -la — question : fichier caché
Q13() {
    _done 13 && { p "  ${GRN}[OK]${NC} Q13 deja validee."; return; }
    p "  ${CYN}Q13 — ls -la${NC}"
    p "  Executez : ls -la ~/infiltration_mirage/serveur/"
    p "  Quel fichier cache (commencant par .) trouvez-vous ?"
    printf "  > "; read _r
    case "$_r" in
        .fichier_cache|fichier_cache) _ok "" 13 ;;
        *) _fail 13 "Reponse incorrecte. Les fichiers caches commencent par un point." ;;
    esac
}

# Q14 — cat | grep — question : nb lignes
Q14() {
    _done 14 && { p "  ${GRN}[OK]${NC} Q14 deja validee."; return; }
    p "  ${CYN}Q14 — cat | grep${NC}"
    p "  Le pipe | envoie la sortie d'une commande vers l'entree d'une autre."
    p "  Executez : cat ~/infiltration_mirage/serveur/logs/access.log | grep Transfert"
    p "  Combien de lignes contenant 'Transfert' s'affichent ?"
    printf "  > "; read _r
    case "$_r" in
        2|deux) _ok "" 14 ;;
        *) _fail 14 "Reponse incorrecte (attendu : 2 lignes)." ;;
    esac
}

# Q15 — history | grep — question : résultat
Q15() {
    _done 15 && { p "  ${GRN}[OK]${NC} Q15 deja validee."; return; }
    p "  ${CYN}Q15 — history | grep${NC}"
    p "  Meme principe qu'en Q14. Executez : history | grep Q"
    p "  Que voyez-vous en premier dans les resultats ?"
    printf "  > "; read _r
    _clean=$(echo "$_r" | tr -d ' ')
    case "$_clean" in
        Q[0-9]*|q[0-9]*) _ok "" 15 ;;
        *) _fail 15 "Reponse incorrecte. Executez bien : history | grep Q" ;;
    esac
}

# ============================================================
# INDICES
# ============================================================
_hint1() {
    case "$1" in
    1)  p "  Commande : ${YEL}pwd${NC} — affiche le chemin du repertoire courant." ;;
    2)  p "  Commande : ${YEL}ls${NC} — liste les fichiers. Essayez : ls ~/infiltration_mirage/serveur/" ;;
    3)  p "  Commande : ${YEL}cd${NC} — change de repertoire. Tapez cd puis le chemin, puis Q3." ;;
    4)  p "  Commande : ${YEL}cat${NC} — affiche le contenu d'un fichier texte." ;;
    5)  p "  Commande : ${YEL}touch${NC} /chemin/fichier — cree un fichier vide." ;;
    6)  p "  Commande : ${YEL}cp${NC} source destination — copie un fichier."
        p "  Creez d'abord exfiltration/ : ${YEL}mkdir ~/infiltration_mirage/serveur/exfiltration${NC}" ;;
    7)  p "  Commande : ${YEL}mv${NC} ancien nouveau — renomme un fichier." ;;
    8)  p "  Commande : ${YEL}mkdir${NC} /chemin/dossier — cree un dossier." ;;
    9)  p "  Commande : ${YEL}chmod${NC} — modifie les droits. r=4 w=2 x=1."
        p "  600 = User(r+w=6) Group(0) Others(0)." ;;
    10) p "  Commande : ${YEL}chmod u+x${NC} fichier — rend executable."
        p "  u=user  +=ajouter  x=execution" ;;
    11) p "  Commande : ${YEL}ps${NC} — liste les processus. La colonne 1 est le PID."
        p "  Cherchez la ligne espion_mirage." ;;
    12) p "  Sur JSLinux, man n'est pas installe. Utilisez : ${YEL}ls --help${NC}"
        p "  Cherchez l'option marquee 'all' ou 'hidden'." ;;
    13) p "  Commande : ${YEL}ls -la${NC} — l=details, a=all (fichiers caches)."
        p "  Les fichiers caches ont un nom commencant par un point." ;;
    14) p "  Le ${YEL}pipe |${NC} : commande1 | commande2"
        p "  La sortie de gauche devient l'entree de droite."
        p "  ${YEL}grep mot${NC} filtre les lignes contenant 'mot'." ;;
    15) p "  ${YEL}history${NC} affiche vos commandes tapees."
        p "  Combinez avec grep via le pipe : history | grep Q" ;;
    esac
}

_hint2() {
    p "  Completez les ??? :"
    case "$1" in
    1)  p "    ${YEL}???${NC}" ;;
    2)  p "    ${YEL}ls ~/infiltration_mirage/serveur/${NC}" ;;
    3)  p "    ${YEL}cd ~/infiltration_mirage/???/${NC}  puis Q3" ;;
    4)  p "    ${YEL}cat ~/infiltration_mirage/???${NC}" ;;
    5)  p "    ${YEL}touch ~/infiltration_mirage/serveur/agent.log${NC}" ;;
    6)  p "    ${YEL}mkdir ~/infiltration_mirage/serveur/exfiltration${NC}"
        p "    ${YEL}cp .../confidentiel/rapport.txt .../exfiltration/${NC}" ;;
    7)  p "    ${YEL}mv .../exfiltration/rapport.txt .../exfiltration/rapport_cache.txt${NC}" ;;
    8)  p "    ${YEL}mkdir ~/infiltration_mirage/serveur/archive${NC}" ;;
    9)  p "    ${YEL}chmod ??? .../exfiltration/rapport_cache.txt${NC}"
        p "    (User=6 Group=0 Others=0)" ;;
    10) p "    ${YEL}chmod ???+??? .../effacer_traces.sh${NC}  (u et x)" ;;
    11) p "    ${YEL}ps${NC}  puis lisez la colonne PID de espion_mirage"
        p "    ${YEL}kill <PID>${NC}" ;;
    12) p "    ${YEL}ls ???${NC}  (option longue d'aide)" ;;
    13) p "    ${YEL}ls -?? ~/infiltration_mirage/serveur/${NC}  (deux lettres)" ;;
    14) p "    ${YEL}cat .../access.log | ??? Transfert${NC}" ;;
    15) p "    ${YEL}??? | grep Q${NC}" ;;
    esac
}

_hint3() {
    p "  Solution :"
    case "$1" in
    1)  p "    ${GRN}pwd${NC}" ;;
    2)  p "    ${GRN}ls ~/infiltration_mirage/serveur/${NC}" ;;
    3)  p "    ${GRN}cd ~/infiltration_mirage/serveur/${NC}  puis  ${GRN}Q3${NC}" ;;
    4)  p "    ${GRN}cat ~/infiltration_mirage/message_secret.txt${NC}" ;;
    5)  p "    ${GRN}touch ~/infiltration_mirage/serveur/agent.log${NC}" ;;
    6)  p "    ${GRN}mkdir ~/infiltration_mirage/serveur/exfiltration${NC}"
        p "    ${GRN}cp ~/infiltration_mirage/serveur/confidentiel/rapport.txt \\"
        p "       ~/infiltration_mirage/serveur/exfiltration/${NC}" ;;
    7)  p "    ${GRN}mv ~/infiltration_mirage/serveur/exfiltration/rapport.txt \\"
        p "       ~/infiltration_mirage/serveur/exfiltration/rapport_cache.txt${NC}" ;;
    8)  p "    ${GRN}mkdir ~/infiltration_mirage/serveur/archive${NC}" ;;
    9)  p "    ${GRN}chmod 600 ~/infiltration_mirage/serveur/exfiltration/rapport_cache.txt${NC}" ;;
    10) p "    ${GRN}chmod u+x ~/infiltration_mirage/serveur/effacer_traces.sh${NC}" ;;
    11) _pid=$(_espion_pid)
        p "    ${GRN}ps${NC}"
        p "    ${GRN}kill ${_pid:-<PID>}${NC}" ;;
    12) p "    ${GRN}ls --help${NC}   (l'option est -a)" ;;
    13) p "    ${GRN}ls -la ~/infiltration_mirage/serveur/${NC}" ;;
    14) p "    ${GRN}cat ~/infiltration_mirage/serveur/logs/access.log | grep Transfert${NC}" ;;
    15) p "    ${GRN}history | grep Q${NC}" ;;
    esac
}

# ============================================================
# INIT
# ============================================================
_init_tp() {
    intro
    p "${YEL}[SETUP] Preparation...${NC}"
    setup_tp
    p ""
    p "${GRN}${BLD}TP pret !${NC}  Tapez ${CYN}MISSION${NC} pour commencer."
    p ""
}

_init_tp
