#!/bin/sh
# ============================================================
#   TP NSI — Operation Mirage  v10.0
#   Terminale NSI — Terminal Linux / JSLinux Alpine
#   https://github.com/babash/TP-commandes-hacker
# ============================================================

RED='\033[0;31m'; GRN='\033[0;32m'; YEL='\033[1;33m'
CYN='\033[0;36m'; BLD='\033[1m'; DIM='\033[2m'; NC='\033[0m'

TP_DIR="$HOME/infiltration_mirage"
NB_Q=15
NOTIFS="$TP_DIR/.notifs"
DAEMON_SH="/tmp/mirage_daemon.sh"
SAVE_DIR="$HOME/.mirage_save"

p() { printf "%b\n" "$*"; }

# ============================================================
# NOTIFICATIONS DU DAEMON
# ============================================================
_flush() {
    [ -s "$NOTIFS" ] || return
    cat "$NOTIFS"
    : > "$NOTIFS"
}

# ============================================================
# HELPERS
# ============================================================
_field()        { echo "$1" | awk "{print \$$2}"; }
_perms()        { stat -c "%a" "$1" 2>/dev/null || stat -f "%OLp" "$1" 2>/dev/null; }
_espion_pid()   { ps 2>/dev/null | grep "[e]spion_mirage" | awk '{print $1}' | head -1; }
_espion_alive() { [ -n "$(_espion_pid)" ]; }
_prog()  { [ -f "$TP_DIR/.prog" ] && cat "$TP_DIR/.prog" \
           || echo "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0"; }
_done()  { [ "$(_field "$(_prog)" "$1")" = "1" ]; }
_inhist(){ history 2>/dev/null | tail -60 | grep -qE "$1"; }

# Niveaux d'indice memorises par mission
_hlvl() {
    [ -f "$TP_DIR/.hints" ] || echo "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0" > "$TP_DIR/.hints"
    _field "$(cat "$TP_DIR/.hints")" "$1"
}
_hinc() {
    _n="$1"
    [ -f "$TP_DIR/.hints" ] || echo "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0" > "$TP_DIR/.hints"
    _c=$(_hlvl "$_n"); [ "$_c" -lt 3 ] && _c=$((_c+1))
    echo "$(cat "$TP_DIR/.hints")" | awk -v n="$_n" -v v="$_c" '{$n=v;print}' > "$TP_DIR/.hints"
    echo "$_c"
}

# Marquer + badge + sauvegarder
_marquer() {
    _done "$1" && return 0
    echo "$(_prog)" | awk -v n="$1" '{$n=1;print}' > "$TP_DIR/.prog"
    mkdir -p "$SAVE_DIR"
    cp "$TP_DIR/.prog" "$SAVE_DIR/.prog" 2>/dev/null
    _badge "$1"
}

_badge() {
    _n="$1"
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
    11) printf "  | Q11 ACCOMPLIE  Espion neutralise.               |\n"
        printf "  | Phase avancee debloquee : options et pipe !     |\n" ;;
    12) printf "  | Q12 ACCOMPLIE  Les fichiers caches sont vus.    |\n" ;;
    13) printf "  | Q13 ACCOMPLIE  Vue complete du serveur.         |\n" ;;
    14) printf "  | Q14 ACCOMPLIE  LE PIPE EST DEBLOQUE !           |\n"
        printf "  | Outil fondamental du terminal. Retenez-le.      |\n" ;;
    15) printf "  | Q15 ACCOMPLIE  *** OPERATION MIRAGE TERMINEE ***|\n"
        printf "  | Felicitations, agent. Mission accomplie.        |\n" ;;
    esac
    _tot=0; _i=1; _pg=$(_prog)
    while [ "$_i" -le 15 ]; do
        [ "$(_field "$_pg" "$_i")" = "1" ] && _tot=$((_tot+1)); _i=$((_i+1))
    done
    printf "  | Score : %s/%-2s                                    |\n" "$_tot" "$NB_Q"
    printf "  +--------------------------------------------------+\n"
    printf "%b\n" "$NC"
}

# ============================================================
# DAEMON — script independant, heredoc quote, valeurs par sed
# ============================================================
_write_daemon() {
    cat > "$DAEMON_SH" << 'DAEMONEOF'
#!/bin/sh
TP_DIR="PLACEHOLDER_DIR"
NOTIFS="PLACEHOLDER_NOTIFS"
SAVE_DIR="PLACEHOLDER_SAVE"
NB_Q=15

trap '' HUP

_prog()  { [ -f "$TP_DIR/.prog" ] && cat "$TP_DIR/.prog" || echo "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0"; }
_field() { echo "$1" | awk "{print \$$2}"; }
_done()  { [ "$(_field "$(_prog)" "$1")" = "1" ]; }
_perms() { stat -c "%a" "$1" 2>/dev/null || stat -f "%OLp" "$1" 2>/dev/null; }
_alive() { ps 2>/dev/null | grep -q "[e]spion_mirage"; }

_mark() {
    _qn="$1"; _done "$_qn" && return 0
    echo "$(_prog)" | awk -v n="$_qn" '{$n=1;print}' > "$TP_DIR/.prog"
    mkdir -p "$SAVE_DIR"
    cp "$TP_DIR/.prog" "$SAVE_DIR/.prog" 2>/dev/null
    _wbadge "$_qn"
}

_wbadge() {
    _n="$1"; _tot=0; _i=1
    {
    printf "  +--------------------------------------------------+\n"
    case "$_n" in
    5)  printf "  | Q5  ACCOMPLIE [daemon]  Empreinte enregistree.  |\n" ;;
    6)  printf "  | Q6  ACCOMPLIE [daemon]  Rapport exfiltre.       |\n" ;;
    7)  printf "  | Q7  ACCOMPLIE [daemon]  Fichier dissimule.      |\n" ;;
    8)  printf "  | Q8  ACCOMPLIE [daemon]  Zone de transit prete.  |\n" ;;
    9)  printf "  | Q9  ACCOMPLIE [daemon]  Fichier protege.        |\n" ;;
    10) printf "  | Q10 ACCOMPLIE [daemon]  Script arme.            |\n" ;;
    11) printf "  | Q11 ACCOMPLIE [daemon]  Espion neutralise.      |\n"
        printf "  | Phase avancee debloquee !                       |\n" ;;
    esac
    _pg=$(cat "$TP_DIR/.prog" 2>/dev/null || echo "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0")
    while [ "$_i" -le "$NB_Q" ]; do
        _v=$(echo "$_pg" | awk "{print \$$_i}")
        [ "$_v" = "1" ] && _tot=$((_tot+1)); _i=$((_i+1))
    done
    printf "  | Score : %s/%s                                     |\n" "$_tot" "$NB_Q"
    printf "  +--------------------------------------------------+\n\n"
    } >> "$NOTIFS"
}

mkdir -p "$SAVE_DIR"
echo $$ > "$TP_DIR/.daemon_pid"
while true; do
    sleep 3
    [ ! -d "$TP_DIR" ] && exit 0
    if ! _done 5  && [ -f "$TP_DIR/serveur/agent.log" ];   then _mark 5;  fi
    if ! _done 6  && [ -f "$TP_DIR/serveur/exfiltration/rapport.txt" ]; then _mark 6; fi
    if ! _done 7  && [ -f "$TP_DIR/serveur/exfiltration/rapport_cache.txt" ]; then _mark 7; fi
    if ! _done 8  && [ -d "$TP_DIR/serveur/archive" ];      then _mark 8;  fi
    if ! _done 9  && [ -f "$TP_DIR/serveur/exfiltration/rapport_cache.txt" ]; then
        [ "$(_perms "$TP_DIR/serveur/exfiltration/rapport_cache.txt")" = "600" ] && _mark 9
    fi
    if ! _done 10 && [ -x "$TP_DIR/serveur/effacer_traces.sh" ]; then _mark 10; fi
    if ! _done 11 && ! _alive; then _mark 11; fi
done
DAEMONEOF
    sed -i "s|PLACEHOLDER_DIR|$TP_DIR|g"    "$DAEMON_SH"
    sed -i "s|PLACEHOLDER_NOTIFS|$NOTIFS|g" "$DAEMON_SH"
    sed -i "s|PLACEHOLDER_SAVE|$SAVE_DIR|g" "$DAEMON_SH"
    chmod +x "$DAEMON_SH"
}

_start_daemon() {
    [ -f "$TP_DIR/.daemon_pid" ] && kill "$(cat "$TP_DIR/.daemon_pid")" 2>/dev/null
    rm -f "$TP_DIR/.daemon_pid"
    _write_daemon
    : > "$NOTIFS"
    (sh "$DAEMON_SH" </dev/null >>"$NOTIFS" 2>&1 &)
    _w=0
    while [ ! -s "$TP_DIR/.daemon_pid" ] && [ "$_w" -lt 6 ]; do
        sleep 1; _w=$((_w+1))
    done
}

# ============================================================
# BANNIERE
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
    printf "%b\n" "${YEL}          ~~~ Operation MIRAGE  v10.0 ~~~${NC}"
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
    printf "  ${GRN}%-10s${NC}  Verifie la mission N.\n"                         "Q1..Q15"
    printf "  %-10s  ${GRN}Succes${NC} : badge + score mis a jour.\n"           ""
    printf "  %-10s  ${RED}Echec${NC}  : indice (retapez pour le suivant).\n"   ""
    printf "  ${GRN}%-10s${NC}  Score rapide.\n"                                "STATUT"
    p ""
    p "${DIM}  Les missions [auto] se valident sans taper Qn.${NC}"
    p "${DIM}  Le badge apparait a la prochaine commande tapee.${NC}"
    p ""
}

# ============================================================
# SETUP
# ============================================================
setup_tp() {
    p "${YEL}[SETUP] Initialisation...${NC}"
    [ -f "$TP_DIR/.daemon_pid" ] && kill "$(cat "$TP_DIR/.daemon_pid")" 2>/dev/null
    ps 2>/dev/null | grep "[e]spion_mirage" | awk '{print $1}' | \
        while read _p; do kill "$_p" 2>/dev/null; done

    # Sauvegarder progression avant rm -rf
    mkdir -p "$SAVE_DIR"
    [ -f "$TP_DIR/.prog" ]  && cp "$TP_DIR/.prog"  "$SAVE_DIR/.prog"
    [ -f "$TP_DIR/.hints" ] && cp "$TP_DIR/.hints" "$SAVE_DIR/.hints"

    rm -rf "$TP_DIR"
    mkdir -p "$TP_DIR/serveur/confidentiel" "$TP_DIR/serveur/public" \
             "$TP_DIR/serveur/logs"

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

    # Restaurer progression ou demarrer a zero
    if [ -f "$SAVE_DIR/.prog" ]; then
        cp "$SAVE_DIR/.prog"  "$TP_DIR/.prog"
        cp "$SAVE_DIR/.hints" "$TP_DIR/.hints" 2>/dev/null || \
            printf "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0\n" > "$TP_DIR/.hints"
        p "${CYN}[INFO] Progression restauree.${NC}"
    else
        printf "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0\n" > "$TP_DIR/.prog"
        printf "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0\n" > "$TP_DIR/.hints"
    fi
    : > "$NOTIFS"

    cat > /tmp/espion_mirage.sh << 'EOF'
#!/bin/sh
# espion_mirage - surveillance fictive NSI
while true; do sleep 30; done
EOF
    chmod +x /tmp/espion_mirage.sh
    (sh /tmp/espion_mirage.sh </dev/null >/dev/null 2>&1 &)
    echo $! > "$TP_DIR/.espion_pid"

    _start_daemon
    p "${GRN}[OK] Serveur pret. Daemon actif (PID: $(cat $TP_DIR/.daemon_pid 2>/dev/null || echo '?')).${NC}"
}

# ============================================================
# MISSION
# ============================================================
MISSION() {
    _flush
    banner
    _p=$(_prog)
    _total=0; _i=1
    while [ "$_i" -le 15 ]; do
        [ "$(_field "$_p" "$_i")" = "1" ] && _total=$((_total+1))
        _i=$((_i+1))
    done
    p "${YEL}  OPERATION MIRAGE — ${_total}/${NB_Q} missions accomplies${NC}"
    p "${DIM}  ──────────────────────────────────────────────────────${NC}"
    p ""

    _show() {
        _n="$1"; _cmd="$2"; _auto="$3"; _ctx="$4"; _tache="$5"
        _v=$(_field "$_p" "$_n")
        [ "$_v" = "1" ] && _m="${GRN}[OK]${NC}" || _m="${DIM}[ ]${NC}"
        [ "$_auto" = "1" ] && _tag=" ${DIM}[auto]${NC}" || _tag=""
        p "  $_m ${CYN}${BLD}Q${_n}${NC}${_tag}  ${YEL}${_cmd}${NC}"
        p "     ${DIM}${_ctx}${NC}"
        p "     ${BLD}>> ${_tache}${NC}"
        p ""
    }

    p "  ${DIM}── Phase 1 : Reconnaissance ────────────────────────────${NC}"; p ""
    _show  1 "pwd"       0 "Ou etes-vous exactement sur ce serveur ?" \
             "Affichez le chemin de votre repertoire actuel."
    _show  2 "ls"        0 "Le serveur contient des fichiers et dossiers." \
             "Listez le contenu du dossier serveur/."
    _show  3 "cd"        0 "Lister c'est bien, entrer dans la zone c'est mieux." \
             "Deplacez-vous dans ~/infiltration_mirage/serveur/ puis tapez Q3."
    _show  4 "cat"       0 "Un message chiffre vous attend a la racine." \
             "Lisez le fichier ~/infiltration_mirage/message_secret.txt"

    p "  ${DIM}── Phase 2 : Fichiers ──────────────────────────────────${NC}"; p ""
    _show  5 "touch"     1 "Laissez une empreinte numerique sur ce serveur." \
             "Creez le fichier vide agent.log dans serveur/"
    _show  6 "cp"        1 "Le rapport confidentiel doit etre exfiltre." \
             "Copiez confidentiel/rapport.txt dans serveur/exfiltration/"
    _show  7 "mv"        1 "Le nom rapport.txt est trop visible. Camouflons-le." \
             "Renommez exfiltration/rapport.txt en exfiltration/rapport_cache.txt"
    _show  8 "mkdir"     1 "Il faut une zone de stockage supplementaire." \
             "Creez le dossier archive/ dans serveur/"

    p "  ${DIM}── Phase 3 : Droits ────────────────────────────────────${NC}"; p ""
    _show  9 "chmod 600" 1 "Le rapport cache doit etre inaccessible aux autres." \
             "Appliquez les droits 600 sur exfiltration/rapport_cache.txt"
    _show 10 "chmod u+x" 1 "Le script d'effacement est bloque. Il faut l'armer." \
             "Rendez serveur/effacer_traces.sh executable."

    p "  ${DIM}── Phase 4 : Processus ─────────────────────────────────${NC}"; p ""
    _show 11 "ps + kill" 0 "Un processus espion surveille le serveur. Neutralisez-le." \
             "Trouvez le PID de espion_mirage avec ps, puis eliminez-le avec kill."

    p "  ${DIM}── Phase 5 : Options et pipe (avance) ───────────────────${NC}"; p ""
    _show 12 "ls --help" 0 "Certains fichiers sont caches. Il faut la bonne option." \
             "Utilisez ls --help pour trouver l'option qui affiche les fichiers caches."
    _show 13 "ls -la"    0 "Vous connaissez l'option (Q12). Mettez-la en pratique." \
             "Listez serveur/ avec tous les details et les fichiers caches."
    _show 14 "cat|grep"  0 "Le journal access.log contient des lignes suspectes." \
             "Filtrez access.log pour afficher uniquement les lignes 'Transfert'."
    _show 15 "history|grep" 0 "Reutilisez le pipe avec history." \
             "Cherchez 'Q' dans votre historique avec history | grep Q"
}

# ============================================================
# STATUT
# ============================================================
STATUT() {
    _flush
    _p=$(_prog); _total=0; _i=1
    p ""; p "  ${BLD}Score — Operation MIRAGE${NC}"; p ""
    while [ "$_i" -le 15 ]; do
        _v=$(_field "$_p" "$_i")
        case "$_i" in
            1)  _l="pwd              " ;;  2)  _l="ls               " ;;
            3)  _l="cd               " ;;  4)  _l="cat              " ;;
            5)  _l="touch      [auto]" ;;  6)  _l="cp         [auto]" ;;
            7)  _l="mv         [auto]" ;;  8)  _l="mkdir      [auto]" ;;
            9)  _l="chmod 600  [auto]" ;;  10) _l="chmod u+x  [auto]" ;;
            11) _l="ps + kill        " ;;  12) _l="ls --help        " ;;
            13) _l="ls -la           " ;;  14) _l="cat | grep       " ;;
            15) _l="history | grep   " ;;
        esac
        if [ "$_v" = "1" ]; then
            printf "  ${GRN}OK${NC}  Q%-2s  %s\n" "$_i" "$_l"; _total=$((_total+1))
        else
            printf "  ${DIM}--${NC}  Q%-2s  %s\n" "$_i" "$_l"
        fi
        _i=$((_i+1))
    done
    p ""
    p "  ${BLD}${_total}/${NB_Q}${NC}"
    [ "$_total" -eq "$NB_Q" ] \
        && p "  ${GRN}${BLD}OPERATION TERMINEE.${NC}" \
        || p "  ${DIM}Tapez MISSION pour les details.${NC}"
    p ""
}

# ============================================================
# VERIFICATEURS
# ============================================================
_ok()  { _marquer "$2"; _flush; }
_fail() {
    p "  ${RED}[--]${NC} $2"
    _lvl=$(_hinc "$1")
    p "  ${YEL}[Indice $_lvl/3]${NC}"
    case "$_lvl" in 1) _hint1 "$1" ;; 2) _hint2 "$1" ;; 3) _hint3 "$1" ;; esac
    [ "$_lvl" -lt 3 ] && p "  ${DIM}Retapez Q${1} pour l'indice suivant.${NC}"
}

# Q1 — pwd — history
Q1() {
    _flush
    _done 1 && { p "  ${GRN}[OK]${NC} Q1 deja validee."; return; }
    _inhist "pwd" \
        && _ok "pwd detecte." 1 \
        || _fail 1 "pwd non detecte dans l'historique."
}

# Q2 — ls — input
Q2() {
    _flush
    _done 2 && { p "  ${GRN}[OK]${NC} Q2 deja validee."; return; }
    p "  ${CYN}Q2 — ls${NC}"
    p "  Executez ls sur le dossier serveur/, puis repondez :"
    p "  Quel fichier .txt voyez-vous dans ce dossier ?"
    printf "  > "; read _r
    case "$_r" in
        acces.txt|acces) _ok "Bonne reponse." 2 ;;
        *) _fail 2 "Reponse incorrecte (attendu : acces.txt)." ;;
    esac
}

# Q3 — cd — $PWD
Q3() {
    _flush
    _done 3 && { p "  ${GRN}[OK]${NC} Q3 deja validee."; return; }
    if [ "$PWD" = "$TP_DIR/serveur" ]; then
        _ok "Vous etes dans serveur/." 3
    else
        p "  ${DIM}Position actuelle : $PWD${NC}"
        _fail 3 "Vous n'etes pas dans serveur/."
    fi
}

# Q4 — cat — input mot de passe
Q4() {
    _flush
    _done 4 && { p "  ${GRN}[OK]${NC} Q4 deja validee."; return; }
    p "  ${CYN}Q4 — cat${NC}"
    p "  Lisez ~/infiltration_mirage/message_secret.txt puis repondez :"
    p "  Quel est le mot de passe mentionne dans ce fichier ?"
    printf "  > "; read _r
    case "$_r" in
        M1r4g3_2024|m1r4g3_2024) _ok "Correct. cat maitrise." 4 ;;
        *) _fail 4 "Reponse incorrecte. Avez-vous bien lu le fichier ?" ;;
    esac
}

# Q5 — touch — filesystem [auto]
Q5() {
    _flush
    _done 5 && { p "  ${GRN}[OK]${NC} Q5 deja validee."; return; }
    [ -f "$TP_DIR/serveur/agent.log" ] \
        && _ok "agent.log present dans serveur/." 5 \
        || _fail 5 "agent.log absent de serveur/."
}

# Q6 — cp — filesystem [auto]
Q6() {
    _flush
    _done 6 && { p "  ${GRN}[OK]${NC} Q6 deja validee."; return; }
    [ -f "$TP_DIR/serveur/exfiltration/rapport.txt" ] \
        && _ok "rapport.txt copie dans exfiltration/." 6 \
        || _fail 6 "rapport.txt absent d'exfiltration/."
}

# Q7 — mv — filesystem [auto]
Q7() {
    _flush
    _done 7 && { p "  ${GRN}[OK]${NC} Q7 deja validee."; return; }
    [ -f "$TP_DIR/serveur/exfiltration/rapport_cache.txt" ] \
        && _ok "rapport_cache.txt present dans exfiltration/." 7 \
        || _fail 7 "rapport_cache.txt absent. Avez-vous renomme rapport.txt ?"
}

# Q8 — mkdir — filesystem [auto]
Q8() {
    _flush
    _done 8 && { p "  ${GRN}[OK]${NC} Q8 deja validee."; return; }
    [ -d "$TP_DIR/serveur/archive" ] \
        && _ok "Dossier archive/ present dans serveur/." 8 \
        || _fail 8 "Dossier archive/ absent de serveur/."
}

# Q9 — chmod 600 — filesystem [auto]
Q9() {
    _flush
    _done 9 && { p "  ${GRN}[OK]${NC} Q9 deja validee."; return; }
    _t="$TP_DIR/serveur/exfiltration/rapport_cache.txt"
    if [ ! -f "$_t" ]; then
        _fail 9 "rapport_cache.txt absent. Completez Q7 d'abord."; return
    fi
    _pp=$(_perms "$_t")
    [ "$_pp" = "600" ] \
        && _ok "Droits 600 appliques sur rapport_cache.txt." 9 \
        || { p "  ${DIM}Droits actuels : ${_pp:-?}  (attendu : 600)${NC}"
             _fail 9 "Droits incorrects."; }
}

# Q10 — chmod u+x — filesystem [auto]
Q10() {
    _flush
    _done 10 && { p "  ${GRN}[OK]${NC} Q10 deja validee."; return; }
    [ -x "$TP_DIR/serveur/effacer_traces.sh" ] \
        && _ok "effacer_traces.sh executable." 10 \
        || { p "  ${DIM}Droits actuels : $(_perms "$TP_DIR/serveur/effacer_traces.sh")${NC}"
             _fail 10 "effacer_traces.sh non executable."; }
}

# Q11 — ps + kill — input PID puis processus mort
Q11() {
    _flush
    _done 11 && { p "  ${GRN}[OK]${NC} Q11 deja validee."; return; }
    _pid=$(_espion_pid)
    if [ -z "$_pid" ]; then
        _ok "Espion neutralise." 11; return
    fi
    p "  ${CYN}Q11 — ps + kill${NC}"
    p "  Un processus espion surveille le serveur."
    p "  Executez : ps"
    p "  Quel est le PID du processus espion_mirage ?"
    printf "  > "; read _r
    if [ "$_r" = "$_pid" ]; then
        p "  ${GRN}Correct !${NC} Maintenant eliminez-le : ${YEL}kill $_pid${NC}"
        p "  ${DIM}Retapez Q11 apres l'avoir tue.${NC}"
    else
        p "  ${DIM}PID actuel de espion_mirage : lisez la colonne PID dans ps${NC}"
        _fail 11 "PID incorrect ou espion toujours actif."
    fi
}

# Q12 — ls --help — input option
Q12() {
    _flush
    _done 12 && { p "  ${GRN}[OK]${NC} Q12 deja validee."; return; }
    p "  ${CYN}Q12 — ls --help${NC}"
    p "  Executez : ls --help"
    p "  Quelle option (lettre) affiche les fichiers caches ?"
    printf "  > "; read _r
    case "$_r" in
        -a|a|--all) _ok "Exact. -a (--all) affiche les fichiers caches." 12 ;;
        *) _fail 12 "Reponse incorrecte. Cherchez 'all' dans ls --help." ;;
    esac
}

# Q13 — ls -la — input fichier cache
Q13() {
    _flush
    _done 13 && { p "  ${GRN}[OK]${NC} Q13 deja validee."; return; }
    p "  ${CYN}Q13 — ls -la${NC}"
    p "  Executez : ls -la ~/infiltration_mirage/serveur/"
    p "  Quel fichier cache (commencant par .) trouvez-vous ?"
    printf "  > "; read _r
    case "$_r" in
        .fichier_cache|fichier_cache)
            _ok "Bien vu. ls -la revele les fichiers caches." 13 ;;
        *) _fail 13 "Reponse incorrecte. Les fichiers caches commencent par un point." ;;
    esac
}

# Q14 — cat | grep — input nb lignes
Q14() {
    _flush
    _done 14 && { p "  ${GRN}[OK]${NC} Q14 deja validee."; return; }
    p "  ${CYN}Q14 — cat | grep${NC}"
    p "  Le pipe | envoie la sortie d'une commande vers l'entree d'une autre."
    p "  Executez : cat ~/infiltration_mirage/serveur/logs/access.log | grep Transfert"
    p "  Combien de lignes contenant 'Transfert' s'affichent ?"
    printf "  > "; read _r
    case "$_r" in
        2|deux) _ok "Exact. Le pipe | + grep maitrise." 14 ;;
        *)      _fail 14 "Reponse incorrecte (attendu : 2 lignes)." ;;
    esac
}

# Q15 — history | grep — input resultat
Q15() {
    _flush
    _done 15 && { p "  ${GRN}[OK]${NC} Q15 deja validee."; return; }
    p "  ${CYN}Q15 — history | grep${NC}"
    p "  Meme principe qu'en Q14. Executez : history | grep Q"
    p "  Quelle commande apparait dans les resultats ?"
    printf "  > "; read _r
    _clean=$(echo "$_r" | tr -d ' ')
    case "$_clean" in
        Q[0-9]*|q[0-9]*) _ok "Exact. history | grep maitrise." 15 ;;
        *) _fail 15 "Reponse incorrecte. Executez bien : history | grep Q" ;;
    esac
}

# ============================================================
# INDICES
# ============================================================
_hint1() {
    case "$1" in
    1)  p "  Commande : ${YEL}pwd${NC} — affiche le chemin du repertoire courant." ;;
    2)  p "  Commande : ${YEL}ls${NC} — liste les fichiers d'un dossier."
        p "  Essayez : ls  ou  ls .  ou  ls ~/infiltration_mirage/serveur/" ;;
    3)  p "  Commande : ${YEL}cd${NC} (change directory)."
        p "  Exemple : cd /chemin/vers/dossier   Puis retapez Q3." ;;
    4)  p "  Commande : ${YEL}cat${NC} — affiche le contenu d'un fichier texte."
        p "  Exemple : cat ~/infiltration_mirage/message_secret.txt" ;;
    5)  p "  Commande : ${YEL}touch${NC} /chemin/fichier — cree un fichier vide." ;;
    6)  p "  Commande : ${YEL}cp${NC} source destination — copie un fichier."
        p "  Creez d'abord exfiltration/ : mkdir ~/infiltration_mirage/serveur/exfiltration" ;;
    7)  p "  Commande : ${YEL}mv${NC} ancien_nom nouveau_nom — renomme un fichier." ;;
    8)  p "  Commande : ${YEL}mkdir${NC} /chemin/dossier — cree un dossier." ;;
    9)  p "  Commande : ${YEL}chmod${NC} — modifie les droits d'acces."
        p "  600 = User(r+w) Group(rien) Others(rien). r=4 w=2 x=1." ;;
    10) p "  Commande : ${YEL}chmod${NC} mode symbolique."
        p "  u=user +=ajouter x=execution → chmod u+x fichier" ;;
    11) p "  Commande : ${YEL}ps${NC} — liste les processus actifs."
        p "  La 1ere colonne est le PID. Cherchez espion_mirage." ;;
    12) p "  Commande : ${YEL}ls --help${NC} — affiche toutes les options de ls."
        p "  Cherchez celle qui dit 'all'." ;;
    13) p "  Commande : ${YEL}ls -la${NC} — l=details, a=all (fichiers caches)."
        p "  Les fichiers caches commencent par un point (ex: .cache)" ;;
    14) p "  Le ${YEL}pipe |${NC} : cmd1 | cmd2 envoie la sortie de cmd1 vers cmd2."
        p "  ${YEL}grep mot${NC} garde uniquement les lignes contenant 'mot'." ;;
    15) p "  ${YEL}history${NC} affiche les commandes tapees. Combinez avec grep via |." ;;
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
    6)  p "    Etape 1 : ${YEL}mkdir ~/infiltration_mirage/serveur/exfiltration${NC}"
        p "    Etape 2 : ${YEL}cp .../confidentiel/rapport.txt .../exfiltration/${NC}" ;;
    7)  p "    ${YEL}mv .../exfiltration/rapport.txt .../exfiltration/rapport_cache.txt${NC}" ;;
    8)  p "    ${YEL}mkdir ~/infiltration_mirage/serveur/archive${NC}" ;;
    9)  p "    ${YEL}chmod ??? .../exfiltration/rapport_cache.txt${NC}  (User=6 Group=0 Others=0)" ;;
    10) p "    ${YEL}chmod ???+??? .../effacer_traces.sh${NC}  (u et x)" ;;
    11) p "    ${YEL}ps${NC}  puis lisez la colonne PID de espion_mirage"
        p "    ${YEL}kill <PID>${NC}" ;;
    12) p "    ${YEL}ls ???${NC}  (option longue)" ;;
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
        p "    ${GRN}ps${NC}  (reperer espion_mirage)"
        p "    ${GRN}kill ${_pid:-<PID>}${NC}" ;;
    12) p "    ${GRN}ls --help${NC}  (l'option est -a)" ;;
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
