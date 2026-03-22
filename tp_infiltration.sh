#!/bin/sh
# ============================================================
#   TP NSI — Operation Mirage  v8.0
#   Terminale NSI — Terminal Linux
#   POSIX sh / ash — JSLinux Alpine
#   https://github.com/babash/TP-commandes-hacker
# ============================================================

RED='\033[0;31m'; GRN='\033[0;32m'; YEL='\033[1;33m'
CYN='\033[0;36m'; MAG='\033[0;35m'; BLD='\033[1m'; DIM='\033[2m'; NC='\033[0m'

TP_DIR="$HOME/infiltration_mirage"
NB_Q=15
NOTIFS="$TP_DIR/.notifs"
DAEMON_SH="/tmp/mirage_daemon.sh"

p() { printf "%b\n" "$*"; }

# ============================================================
# LECTURE DES NOTIFICATIONS DU DAEMON
# Appelee au debut de chaque commande interactive
# ============================================================
_flush() {
    [ -s "$NOTIFS" ] || return
    while IFS= read -r _line; do printf "%b\n" "$_line"; done < "$NOTIFS"
    : > "$NOTIFS"
}

# ============================================================
# HELPERS
# ============================================================
_field()   { echo "$1" | awk "{print \$$2}"; }
_perms()   { stat -c "%a" "$1" 2>/dev/null || stat -f "%OLp" "$1" 2>/dev/null; }
_espion_pid()   { ps 2>/dev/null | grep "[e]spion_mirage" | awk '{print $1}' | head -1; }
_espion_alive() { [ -n "$(_espion_pid)" ]; }
_prog()    { [ -f "$TP_DIR/.prog" ] && cat "$TP_DIR/.prog" \
             || echo "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0"; }
_done()    { [ "$(_field "$(_prog)" "$1")" = "1" ]; }
_inhist()  { history 2>/dev/null | tail -60 | grep -qE "$1"; }

# Niveau d'indice pour chaque mission (incremente a chaque echec)
_hint_get() {
    [ -f "$TP_DIR/.hints" ] || echo "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0" > "$TP_DIR/.hints"
    _field "$(cat "$TP_DIR/.hints")" "$1"
}
_hint_inc() {
    _n="$1"
    [ -f "$TP_DIR/.hints" ] || echo "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0" > "$TP_DIR/.hints"
    _c=$(_hint_get "$_n"); [ "$_c" -lt 3 ] && _c=$((_c+1))
    echo "$(cat "$TP_DIR/.hints")" | awk -v n="$_n" -v v="$_c" '{$n=v;print}' > "$TP_DIR/.hints"
    echo "$_c"
}

# ============================================================
# MARQUER UNE MISSION (utilisé par daemon ET par Qn)
# ============================================================
_marquer() {
    _done "$1" && return 0
    echo "$(_prog)" | awk -v n="$1" '{$n=1;print}' > "$TP_DIR/.prog"
}

# ============================================================
# BADGE — ecrit dans .notifs par le daemon, lu par _flush
# ============================================================
_badge_text() {
    printf "%b\n" "$GRN"
    printf "  +--------------------------------------------------+\n"
    case "$1" in
    1)  printf "  | Q1  ACCOMPLIE - Bonne orientation, agent.       |\n"
        printf "  | Tout commence par connaitre sa position.        |\n" ;;
    2)  printf "  | Q2  ACCOMPLIE - Premiere reconnaissance reussie.|\n"
        printf "  | Le serveur commence a livrer ses secrets.       |\n" ;;
    3)  printf "  | Q3  ACCOMPLIE - Vous lisez la doc avant d'agir. |\n"
        printf "  | Un vrai professionnel. Q4 va etre facile.       |\n" ;;
    4)  printf "  | Q4  ACCOMPLIE - Les fichiers caches sont vus.   |\n"
        printf "  | Excellent travail d'infiltration.               |\n" ;;
    5)  printf "  | Q5  ACCOMPLIE - Vous etes dans la place.        |\n"
        printf "  | Navigation maitrisee.                           |\n" ;;
    6)  printf "  | Q6  ACCOMPLIE - Message dechiffre.              |\n"
        printf "  | Les donnees sont a portee de main.              |\n" ;;
    7)  printf "  | Q7  ACCOMPLIE - LE PIPE EST DEBLOQUE !          |\n"
        printf "  | Outil fondamental du terminal. Bien joue.       |\n" ;;
    8)  printf "  | Q8  ACCOMPLIE - L'historique ne ment pas.       |\n"
        printf "  | Un operateur imprudent a laisse des traces.     |\n" ;;
    9)  printf "  | Q9  ACCOMPLIE [daemon] - Empreinte enregistree. |\n"
        printf "  | Discret, mais visible pour qui sait chercher.   |\n" ;;
    10) printf "  | Q10 ACCOMPLIE - Rapport localise.               |\n"
        printf "  | find est votre allie dans les profondeurs.      |\n" ;;
    11) printf "  | Q11 ACCOMPLIE [daemon] - Zone de transit prete. |\n"
        printf "  | La phase d'exfiltration peut commencer.         |\n" ;;
    12) printf "  | Q12 ACCOMPLIE [daemon] - Fichier protege.       |\n"
        printf "  | rw------- : vous seul pouvez y acceder.         |\n" ;;
    13) printf "  | Q13 ACCOMPLIE [daemon] - Script arme.           |\n"
        printf "  | Permissions maitrisees.                         |\n" ;;
    14) printf "  | Q14 ACCOMPLIE - Espion identifie.               |\n"
        printf "  | Vous avez son PID. Il ne sait pas ce qui vient. |\n" ;;
    15) printf "  | Q15 ACCOMPLIE [daemon]                          |\n"
        printf "  |   *** OPERATION MIRAGE TERMINEE ***             |\n"
        printf "  | Espion neutralise. Traces brouillees.           |\n"
        printf "  | Mission reussie. Deconnexion en cours...        |\n" ;;
    esac
    _tot=0; _i=1
    while [ "$_i" -le 15 ]; do
        _f="$TP_DIR/.prog"
        [ -f "$_f" ] && _v=$(awk "{print \$$_i}" "$_f") || _v=0
        [ "$_v" = "1" ] && _tot=$((_tot+1)); _i=$((_i+1))
    done
    printf "  | Score : %s/%s                                    |\n" "$_tot" "$NB_Q"
    printf "  +--------------------------------------------------+\n"
    printf "%b\n" "$NC"
}

# ============================================================
# DAEMON — script independant ecrit sur disque
# Il ne depend d'aucune fonction du shell parent
# ============================================================
_write_daemon() {
    cat > "$DAEMON_SH" << DAEMONEOF
#!/bin/sh
TP_DIR="$TP_DIR"
NOTIFS="$NOTIFS"
NB_Q=$NB_Q
RED='\\033[0;31m'; GRN='\\033[0;32m'; YEL='\\033[1;33m'; NC='\\033[0m'; DIM='\\033[2m'

_prog()  { [ -f "\$TP_DIR/.prog" ] && cat "\$TP_DIR/.prog" || echo "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0"; }
_field() { echo "\$1" | awk "{print \\$\$2}"; }
_done()  { [ "\$(_field "\$(_prog)" "\$1")" = "1" ]; }
_perms() { stat -c "%a" "\$1" 2>/dev/null || stat -f "%OLp" "\$1" 2>/dev/null; }
_espion_alive() { ps 2>/dev/null | grep "[e]spion_mirage" | grep -qv grep; }

_mark() {
    _qn="\$1"
    _done "\$_qn" && return 0
    echo "\$(_prog)" | awk -v n="\$_qn" '{\\$n=1;print}' > "\$TP_DIR/.prog"
    _badge "\$_qn"
}

_badge() {
    _n="\$1"; _tot=0; _i=1
    {
    printf "%b\\n" "\$GRN"
    printf "  +--------------------------------------------------+\\n"
    case "\$_n" in
    1)  printf "  | Q1  ACCOMPLIE - Bonne orientation, agent.       |\\n"
        printf "  | Tout commence par connaitre sa position.        |\\n" ;;
    2)  printf "  | Q2  ACCOMPLIE - Premiere reconnaissance reussie.|\\n"
        printf "  | Le serveur commence a livrer ses secrets.       |\\n" ;;
    3)  printf "  | Q3  ACCOMPLIE - Vous lisez la doc avant d'agir. |\\n"
        printf "  | Un vrai professionnel. Q4 va etre facile.       |\\n" ;;
    4)  printf "  | Q4  ACCOMPLIE - Les fichiers caches sont vus.   |\\n"
        printf "  | Excellent travail d'infiltration.               |\\n" ;;
    5)  printf "  | Q5  ACCOMPLIE - Vous etes dans la place.        |\\n"
        printf "  | Navigation maitrisee.                           |\\n" ;;
    6)  printf "  | Q6  ACCOMPLIE - Message dechiffre.              |\\n"
        printf "  | Les donnees sont a portee de main.              |\\n" ;;
    7)  printf "  | Q7  ACCOMPLIE - LE PIPE EST DEBLOQUE !          |\\n"
        printf "  | Outil fondamental du terminal. Bien joue.       |\\n" ;;
    8)  printf "  | Q8  ACCOMPLIE - L historique ne ment pas.       |\\n"
        printf "  | Un operateur imprudent a laisse des traces.     |\\n" ;;
    9)  printf "  | Q9  ACCOMPLIE [daemon] - Empreinte enregistree. |\\n"
        printf "  | Discret, mais visible pour qui sait chercher.   |\\n" ;;
    10) printf "  | Q10 ACCOMPLIE - Rapport localise.               |\\n"
        printf "  | find est votre allie dans les profondeurs.      |\\n" ;;
    11) printf "  | Q11 ACCOMPLIE [daemon] - Zone de transit prete. |\\n"
        printf "  | La phase d exfiltration peut commencer.         |\\n" ;;
    12) printf "  | Q12 ACCOMPLIE [daemon] - Fichier protege.       |\\n"
        printf "  | rw------- : vous seul pouvez y acceder.         |\\n" ;;
    13) printf "  | Q13 ACCOMPLIE [daemon] - Script arme.           |\\n"
        printf "  | Permissions maitrisees.                         |\\n" ;;
    14) printf "  | Q14 ACCOMPLIE - Espion identifie.               |\\n"
        printf "  | Vous avez son PID. Il ne sait pas ce qui vient. |\\n" ;;
    15) printf "  | Q15 ACCOMPLIE [daemon]                          |\\n"
        printf "  |   *** OPERATION MIRAGE TERMINEE ***             |\\n"
        printf "  | Espion neutralise. Traces brouillees.           |\\n"
        printf "  | Mission reussie. Deconnexion en cours...        |\\n" ;;
    esac
    while [ "\$_i" -le 15 ]; do
        _f="\$TP_DIR/.prog"
        [ -f "\$_f" ] && _v=\$(awk "{print \\$\$_i}" "\$_f") || _v=0
        [ "\$_v" = "1" ] && _tot=\$((_tot+1)); _i=\$((_i+1))
    done
    printf "  | Score : %s/%s                                     |\\n" "\$_tot" "\$NB_Q"
    printf "  +--------------------------------------------------+\\n"
    printf "%b\\n" "\$NC"
    } >> "\$NOTIFS"
}

while true; do
    sleep 3
    [ ! -d "\$TP_DIR" ] && exit 0
    # Q9 : touch agent.log
    if ! _done 9 && [ -f "\$TP_DIR/serveur/agent.log" ]; then _mark 9; fi
    # Q11 : mkdir archive/
    if ! _done 11 && [ -d "\$TP_DIR/serveur/archive" ]; then _mark 11; fi
    # Q12 : chmod 600
    if ! _done 12 && [ -f "\$TP_DIR/serveur/exfiltration/rapport.txt" ]; then
        _pp=\$(_perms "\$TP_DIR/serveur/exfiltration/rapport.txt")
        [ "\$_pp" = "600" ] && _mark 12
    fi
    # Q13 : chmod u+x
    if ! _done 13 && [ -x "\$TP_DIR/serveur/effacer_traces.sh" ]; then _mark 13; fi
    # Q15 : kill + mv
    if ! _done 15 && ! _espion_alive \
       && [ -f "\$TP_DIR/serveur/exfiltration/notes_vacances.txt" ]; then
        _mark 15
    fi
done
DAEMONEOF
    chmod +x "$DAEMON_SH"
}

_start_daemon() {
    # Tuer ancien daemon si present
    if [ -f "$TP_DIR/.daemon_pid" ]; then
        kill "$(cat "$TP_DIR/.daemon_pid")" 2>/dev/null
        rm -f "$TP_DIR/.daemon_pid"
    fi
    _write_daemon
    sh "$DAEMON_SH" &
    echo $! > "$TP_DIR/.daemon_pid"
    : > "$NOTIFS"
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
    printf "%b\n" "${YEL}          ~~~ Operation MIRAGE  v8.0 ~~~${NC}"
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
    p "  ${BLD}Trois commandes seulement :${NC}"
    p ""
    printf "  ${GRN}%-10s${NC}  Affiche chaque mission avec son contexte,\n"   "MISSION"
    printf "  %-10s  son statut [OK]/[ ] et ce qu'il faut faire.\n"            ""
    p ""
    printf "  ${GRN}%-10s${NC}  Verifie si la mission N est reussie.\n"        "Q1..Q15"
    printf "  %-10s  ${GRN}Succes${NC} : badge de felicitations + score.\n"   ""
    printf "  %-10s  ${RED}Echec${NC}  : indice progressif (3 niveaux).\n"    ""
    printf "  %-10s  Retapez Qn pour obtenir l'indice suivant.\n"             ""
    p ""
    printf "  ${GRN}%-10s${NC}  Affiche votre score et la liste des missions.\n" "STATUT"
    p ""
    p "${DIM}  ──────────────────────────────────────────────────────${NC}"
    p ""
    p "  ${DIM}Un daemon surveille le systeme en arriere-plan.${NC}"
    p "  ${DIM}Les missions [auto] se valident seules ; le badge${NC}"
    p "  ${DIM}s'affiche a votre prochaine commande (Q, MISSION...).${NC}"
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

    rm -rf "$TP_DIR"
    mkdir -p "$TP_DIR/serveur/confidentiel" "$TP_DIR/serveur/public" \
             "$TP_DIR/serveur/logs" "$TP_DIR/serveur/exfiltration"

    echo "ACCES REFUSE." > "$TP_DIR/serveur/acces.txt"

    cat > "$TP_DIR/serveur/confidentiel/rapport.txt" << 'EOF'
RAPPORT CONFIDENTIEL -- Operation Mirage
Classification : SECRET DEFENSE  |  Date : 2024-01-15
---
Coordonnees : 48.8566 N, 2.3522 E
Cle : MIRAGE-2024-ALPHA  |  Transfert : 03:00 UTC
---
Ce fichier ne doit pas quitter le perimetre securise.
EOF

    cp "$TP_DIR/serveur/confidentiel/rapport.txt" \
       "$TP_DIR/serveur/exfiltration/rapport.txt"
    chmod 644 "$TP_DIR/serveur/exfiltration/rapport.txt"

    cat > "$TP_DIR/serveur/exfiltration/rapport_secret.txt" << 'EOF'
ULTRA-SECRET -- Phase 2
Cible : serveur backup 10.0.0.99  |  Heure : 03:00 UTC
INSTRUCTION : renommez ce fichier (trop visible dans les logs).
EOF

    echo "Index public MIRAGE." > "$TP_DIR/serveur/public/index.html"

    cat > "$TP_DIR/serveur/logs/access.log" << 'EOF'
2024-01-15 08:23:11 - Connexion root         depuis 192.168.1.1  [OK]
2024-01-15 09:11:42 - Connexion inconnue     depuis 10.0.0.42    [REFUSE]
2024-01-15 09:45:00 - Lecture config.sys     depuis 192.168.1.1  [OK]
2024-01-15 10:00:01 - Transfert rapport.txt  vers   10.0.0.99    [OK]
2024-01-15 10:00:03 - Deconnexion root                           [OK]
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
Indice : le rapport est dans confidentiel/
EOF

    cat > "$TP_DIR/message_secret.txt" << 'EOF'
[ECHO] Operation MIRAGE | Priorite HAUTE
Serveur actif 72h. Cible : confidentiel/
Transfert suspect dans serveur/logs/access.log
Processus de surveillance actif en arriere-plan.
Mot de passe secours : M1r4g3_2024
EOF

    printf "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0\n" > "$TP_DIR/.prog"
    printf "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0\n" > "$TP_DIR/.hints"
    : > "$NOTIFS"

    cat > /tmp/espion_mirage.sh << 'EOF'
#!/bin/sh
# espion_mirage - surveillance fictive NSI
while true; do sleep 30; done
EOF
    chmod +x /tmp/espion_mirage.sh
    sh /tmp/espion_mirage.sh &
    echo $! > "$TP_DIR/.espion_pid"

    _start_daemon
    p "${GRN}[OK] Serveur pret. Daemon actif (PID: $(cat $TP_DIR/.daemon_pid)).${NC}"
}

# ============================================================
# MISSION — une mission par ecran
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
    _show  1 "pwd"         0 "Ou etes-vous sur ce serveur ?" \
             "Affichez le chemin complet de votre repertoire actuel."
    _show  2 "ls"          0 "Le serveur contient des dossiers a explorer." \
             "Listez le contenu de ~/infiltration_mirage/serveur/"
    _show  3 "ls --help"   0 "Certains fichiers sont caches — il faut la bonne option." \
             "Consultez ls --help et trouvez l'option qui affiche les fichiers caches."
    _show  4 "ls -la"      0 "Vous connaissez l'option (Q3). Utilisez-la." \
             "Listez serveur/ avec TOUS les details et les fichiers caches."
    _show  5 "cd"          0 "Lister c'est bien. Entrer dans la zone, c'est mieux." \
             "Allez dans ~/infiltration_mirage/serveur/ puis tapez Q5."
    _show  6 "cat"         0 "Un message chiffre vous attend." \
             "Lisez ~/infiltration_mirage/message_secret.txt"

    p "  ${DIM}── Phase 2 : Le pipe | ─────────────────────────────────${NC}"; p ""
    _show  7 "cat | grep"  0 "Le journal access.log est long. Cherchez les transferts." \
             "Filtrez access.log pour voir uniquement les lignes 'Transfert'."
    _show  8 "history|grep" 0 "Un operateur a peut-etre tape un mot de passe." \
             "Cherchez 'passwd' dans votre historique avec history et grep."

    p "  ${DIM}── Phase 3 : Fichiers ──────────────────────────────────${NC}"; p ""
    _show  9 "touch"       1 "Laissez une empreinte sur ce serveur." \
             "Creez le fichier vide agent.log dans serveur/"
    _show 10 "find"        0 "Le rapport est cache quelque part." \
             "Trouvez tous les rapport.txt dans ~/infiltration_mirage/"
    _show 11 "mkdir"       1 "Il faut une zone de transit pour exfiltrer." \
             "Creez le dossier archive/ dans serveur/"

    p "  ${DIM}── Phase 4 : Droits ────────────────────────────────────${NC}"; p ""
    _show 12 "chmod 600"   1 "Le rapport exfiltre doit etre inaccessible aux autres." \
             "Appliquez les droits 600 sur serveur/exfiltration/rapport.txt"
    _show 13 "chmod u+x"   1 "Le script d'effacement est bloque. Armez-le." \
             "Rendez serveur/effacer_traces.sh executable."

    p "  ${DIM}── Phase 5 : Processus ─────────────────────────────────${NC}"; p ""
    _show 14 "ps | grep"   0 "Un processus inconnu surveille le serveur. Identifiez-le." \
             "Trouvez le PID de espion_mirage avec ps | grep. Puis tapez Q14."
    _show 15 "kill + mv"   1 "Derniere etape : neutraliser et camoufler." \
             "Tuez espion_mirage (kill), renommez rapport_secret.txt en notes_vacances.txt"
}

# ============================================================
# STATUT — score rapide
# ============================================================
STATUT() {
    _flush
    _p=$(_prog); _total=0; _i=1
    p ""; p "  ${BLD}Score — Operation MIRAGE${NC}"; p ""
    while [ "$_i" -le 15 ]; do
        _v=$(_field "$_p" "$_i")
        if [ "$_v" = "1" ]; then
            printf "  ${GRN}OK${NC} Q%s\n" "$_i"; _total=$((_total+1))
        else
            printf "  ${DIM}--${NC} Q%s\n" "$_i"
        fi
        _i=$((_i+1))
    done
    p ""
    p "  ${BLD}${_total}/${NB_Q}${NC}"
    [ "$_total" -eq "$NB_Q" ] && p "  ${GRN}${BLD}OPERATION TERMINEE.${NC}" \
        || p "  ${DIM}Tapez MISSION pour les details.${NC}"
    p ""
}

# ============================================================
# VERIFICATEURS — validation + indice progressif si echec
# ============================================================

# Succes : marquer + badge (via _write_badge dans le shell courant)
_ok() {
    _marquer "$2"
    printf "%b\n" "$GRN"
    printf "  +--------------------------------------------------+\n"
    case "$2" in
    1)  printf "  | Q1  ACCOMPLIE - Bonne orientation, agent.       |\n"
        printf "  | Tout commence par connaitre sa position.        |\n" ;;
    2)  printf "  | Q2  ACCOMPLIE - Premiere reconnaissance reussie.|\n"
        printf "  | Le serveur commence a livrer ses secrets.       |\n" ;;
    3)  printf "  | Q3  ACCOMPLIE - Vous lisez la doc avant d'agir. |\n"
        printf "  | Un vrai professionnel. Q4 va etre facile.       |\n" ;;
    4)  printf "  | Q4  ACCOMPLIE - Les fichiers caches sont vus.   |\n"
        printf "  | Excellent travail d'infiltration.               |\n" ;;
    5)  printf "  | Q5  ACCOMPLIE - Vous etes dans la place.        |\n"
        printf "  | Navigation maitrisee.                           |\n" ;;
    6)  printf "  | Q6  ACCOMPLIE - Message dechiffre.              |\n"
        printf "  | Les donnees sont a portee de main.              |\n" ;;
    7)  printf "  | Q7  ACCOMPLIE - LE PIPE EST DEBLOQUE !          |\n"
        printf "  | Outil fondamental du terminal. Bien joue.       |\n" ;;
    8)  printf "  | Q8  ACCOMPLIE - L historique ne ment pas.       |\n"
        printf "  | Un operateur imprudent a laisse des traces.     |\n" ;;
    9)  printf "  | Q9  ACCOMPLIE - Empreinte enregistree.          |\n"
        printf "  | Discret, mais visible pour qui sait chercher.   |\n" ;;
    10) printf "  | Q10 ACCOMPLIE - Rapport localise.               |\n"
        printf "  | find est votre allie dans les profondeurs.      |\n" ;;
    11) printf "  | Q11 ACCOMPLIE - Zone de transit prete.          |\n"
        printf "  | La phase d exfiltration peut commencer.         |\n" ;;
    12) printf "  | Q12 ACCOMPLIE - Fichier protege.                |\n"
        printf "  | rw------- : vous seul pouvez y acceder.         |\n" ;;
    13) printf "  | Q13 ACCOMPLIE - Script arme.                    |\n"
        printf "  | Permissions maitrisees.                         |\n" ;;
    14) printf "  | Q14 ACCOMPLIE - Espion identifie.               |\n"
        printf "  | Vous avez son PID. Il ne sait pas ce qui vient. |\n" ;;
    15) printf "  | Q15 ACCOMPLIE - *** OPERATION TERMINEE ***      |\n"
        printf "  | Espion neutralise. Mission reussie, agent.      |\n" ;;
    esac
    _tot=0; _i=1; _pg=$(_prog)
    while [ "$_i" -le 15 ]; do
        [ "$(_field "$_pg" "$_i")" = "1" ] && _tot=$((_tot+1)); _i=$((_i+1))
    done
    printf "  | Score : %s/%s                                    |\n" "$_tot" "$NB_Q"
    printf "  +--------------------------------------------------+\n"
    printf "%b\n" "$NC"
}

# Echec : indice progressif
_fail() {
    _qn="$1"; _why="$2"
    p "  ${RED}[--]${NC} $_why"
    _lvl=$(_hint_inc "$_qn")
    p "  ${YEL}[Indice $_lvl/3]${NC}"
    case "$_lvl" in
        1) _hint1 "$_qn" ;;
        2) _hint2 "$_qn" ;;
        3) _hint3 "$_qn" ;;
    esac
    [ "$_lvl" -lt 3 ] && p "  ${DIM}Retapez Q${_qn} pour l'indice suivant.${NC}"
}

_hint1() {
    case "$1" in
    1)  p "  Objectif : savoir ou vous etes dans l'arborescence."
        p "  Commande : ${YEL}pwd${NC} (print working directory). Sans argument." ;;
    2)  p "  Objectif : voir les fichiers d'un dossier."
        p "  Commande : ${YEL}ls${NC}. Donnez le chemin en argument." ;;
    3)  p "  Objectif : trouver l'option de ls pour les fichiers caches."
        p "  Sur JSLinux : utilisez ${YEL}ls --help${NC} (man n'est pas installe)." ;;
    4)  p "  Objectif : voir TOUS les fichiers, y compris les caches (nom en point)."
        p "  ls a deux options utiles : ${YEL}-l${NC} (details) et ${YEL}-a${NC} (all = tout)." ;;
    5)  p "  Objectif : se deplacer dans un dossier."
        p "  ${YEL}ls${NC} liste. ${YEL}cd${NC} entre. Ce sont deux commandes differentes." ;;
    6)  p "  Objectif : lire le contenu d'un fichier texte."
        p "  Commande : ${YEL}cat${NC}. Syntaxe : cat /chemin/fichier" ;;
    7)  p "  Objectif : filtrer les lignes d'un fichier contenant un mot."
        p "  Le ${YEL}pipe |${NC} envoie la sortie d'une commande vers l'entree d'une autre."
        p "  ${YEL}grep mot${NC} garde uniquement les lignes contenant 'mot'." ;;
    8)  p "  Objectif : chercher dans les commandes deja tapees."
        p "  ${YEL}history${NC} affiche l'historique. Combinez avec grep via le pipe." ;;
    9)  p "  Objectif : creer un fichier vide."
        p "  Commande : ${YEL}touch${NC} /chemin/nom_fichier" ;;
    10) p "  Objectif : trouver un fichier dans tous les sous-dossiers."
        p "  Commande : ${YEL}find${NC}. Syntaxe : find /dossier -name \"nom\"" ;;
    11) p "  Objectif : creer un nouveau dossier."
        p "  Commande : ${YEL}mkdir${NC} /chemin/nouveau_dossier" ;;
    12) p "  Objectif : rendre un fichier lisible par vous seul."
        p "  Commande : ${YEL}chmod${NC}. Droits en octal : r=4 w=2 x=1."
        p "  On additionne par groupe : User | Group | Others." ;;
    13) p "  Objectif : rendre un script executable par son proprietaire."
        p "  ${YEL}chmod${NC} en mode symbolique : u=user + =ajouter x=execution" ;;
    14) p "  Objectif : trouver le PID du processus espion."
        p "  ${YEL}ps${NC} liste les processus. Combinez avec grep via le pipe." ;;
    15) p "  Deux actions : ${YEL}kill PID${NC} arrete un processus."
        p "  ${YEL}mv source dest${NC} renomme ou deplace un fichier." ;;
    esac
}

_hint2() {
    p "  Completez les ??? :"
    case "$1" in
    1)  p "    ${YEL}???${NC}" ;;
    2)  p "    ${YEL}??? ~/infiltration_mirage/serveur/${NC}" ;;
    3)  p "    ${YEL}ls ???${NC}   (option longue pour l'aide)" ;;
    4)  p "    ${YEL}ls -?? ~/infiltration_mirage/serveur/${NC}  (deux lettres)" ;;
    5)  p "    ${YEL}cd ~/infiltration_mirage/???/${NC}  puis Q5" ;;
    6)  p "    ${YEL}??? ~/infiltration_mirage/message_secret.txt${NC}" ;;
    7)  p "    ${YEL}cat .../access.log | ??? Transfert${NC}" ;;
    8)  p "    ${YEL}??? | grep passwd${NC}" ;;
    9)  p "    ${YEL}??? ~/infiltration_mirage/serveur/agent.log${NC}" ;;
    10) p "    ${YEL}find ~/infiltration_mirage/ -name \"???\"${NC}" ;;
    11) p "    ${YEL}mkdir ~/infiltration_mirage/serveur/???${NC}" ;;
    12) p "    ${YEL}chmod ??? .../serveur/exfiltration/rapport.txt${NC}"
        p "    (User=6 Group=0 Others=0)" ;;
    13) p "    ${YEL}chmod ???+??? .../serveur/effacer_traces.sh${NC}"
        p "    (1er ???=u  2e ???=x)" ;;
    14) p "    ${YEL}ps | grep ???${NC}" ;;
    15) _pid=$(_espion_pid)
        p "    ${YEL}kill ???${NC}  (PID de Q14 : ${_pid:-?})"
        p "    ${YEL}mv .../rapport_secret.txt .../???${NC}" ;;
    esac
}

_hint3() {
    p "  Solution :"
    case "$1" in
    1)  p "    ${GRN}pwd${NC}" ;;
    2)  p "    ${GRN}ls ~/infiltration_mirage/serveur/${NC}" ;;
    3)  p "    ${GRN}ls --help${NC}   (l'option est -a)" ;;
    4)  p "    ${GRN}ls -la ~/infiltration_mirage/serveur/${NC}" ;;
    5)  p "    ${GRN}cd ~/infiltration_mirage/serveur/${NC}  puis  ${GRN}Q5${NC}" ;;
    6)  p "    ${GRN}cat ~/infiltration_mirage/message_secret.txt${NC}" ;;
    7)  p "    ${GRN}cat ~/infiltration_mirage/serveur/logs/access.log | grep Transfert${NC}" ;;
    8)  p "    ${GRN}history | grep passwd${NC}" ;;
    9)  p "    ${GRN}touch ~/infiltration_mirage/serveur/agent.log${NC}" ;;
    10) p "    ${GRN}find ~/infiltration_mirage/ -name \"rapport.txt\"${NC}" ;;
    11) p "    ${GRN}mkdir ~/infiltration_mirage/serveur/archive${NC}" ;;
    12) p "    ${GRN}chmod 600 ~/infiltration_mirage/serveur/exfiltration/rapport.txt${NC}" ;;
    13) p "    ${GRN}chmod u+x ~/infiltration_mirage/serveur/effacer_traces.sh${NC}" ;;
    14) _pid=$(_espion_pid)
        p "    ${GRN}ps | grep espion_mirage${NC}"
        [ -n "$_pid" ] && p "    PID actuel : ${RED}${BLD}$_pid${NC}" ;;
    15) _pid=$(_espion_pid)
        p "    ${GRN}kill ${_pid:-<PID_Q14>}${NC}"
        p "    ${GRN}mv ~/infiltration_mirage/serveur/exfiltration/rapport_secret.txt \\"
        p "       ~/infiltration_mirage/serveur/exfiltration/notes_vacances.txt${NC}" ;;
    esac
}

# ============================================================
# Q1 - Q15
# ============================================================
Q1() {
    _flush
    _done 1 && { p "  ${GRN}[OK]${NC} Q1 deja validee."; return; }
    _inhist "^[0-9 ]*pwd[[:space:]]*$" \
        && _ok "pwd detecte. Repertoire : $PWD" 1 \
        || _fail 1 "pwd non detecte dans l'historique."
}
Q2() {
    _flush
    _done 2 && { p "  ${GRN}[OK]${NC} Q2 deja validee."; return; }
    _inhist "^[0-9 ]*ls[[:space:]]+~/infiltration_mirage/serveur/[[:space:]]*$" \
        && _ok "ls serveur/ detecte." 2 \
        || _fail 2 "ls ~/infiltration_mirage/serveur/ non detecte."
}
Q3() {
    _flush
    _done 3 && { p "  ${GRN}[OK]${NC} Q3 deja validee."; return; }
    _inhist "ls[[:space:]]+--help" \
        && _ok "ls --help detecte. Option = -a (--all)." 3 \
        || _fail 3 "ls --help non detecte dans l'historique."
}
Q4() {
    _flush
    _done 4 && { p "  ${GRN}[OK]${NC} Q4 deja validee."; return; }
    _inhist "ls[[:space:]]+-la|ls[[:space:]]+-al" \
        && _ok "ls -la detecte." 4 \
        || _fail 4 "ls -la ou ls -al non detecte dans l'historique."
}
Q5() {
    _flush
    _done 5 && { p "  ${GRN}[OK]${NC} Q5 deja validee."; return; }
    if [ "$PWD" = "$TP_DIR/serveur" ] || \
       _inhist "^[0-9 ]*cd[[:space:]]+.*/infiltration_mirage/serveur[[:space:]]*$"; then
        _ok "cd serveur/ detecte (position : $PWD)." 5
    else
        _fail 5 "cd ~/infiltration_mirage/serveur/ non detecte."
    fi
}
Q6() {
    _flush
    _done 6 && { p "  ${GRN}[OK]${NC} Q6 deja validee."; return; }
    _inhist "cat[[:space:]]+.*/message_secret\.txt" \
        && _ok "cat message_secret.txt detecte." 6 \
        || _fail 6 "cat message_secret.txt non detecte dans l'historique."
}
Q7() {
    _flush
    _done 7 && { p "  ${GRN}[OK]${NC} Q7 deja validee."; return; }
    _inhist "cat.*access\.log.*\|.*grep.*Transfert|cat.*\|.*grep.*Transfert" \
        && _ok "cat | grep Transfert detecte." 7 \
        || _fail 7 "cat access.log | grep Transfert non detecte (pipe obligatoire)."
}
Q8() {
    _flush
    _done 8 && { p "  ${GRN}[OK]${NC} Q8 deja validee."; return; }
    _inhist "history[[:space:]]*\|[[:space:]]*grep" \
        && _ok "history | grep detecte." 8 \
        || _fail 8 "history | grep non detecte (le pipe est obligatoire)."
}
Q9() {
    _flush
    _done 9 && { p "  ${GRN}[OK]${NC} Q9 deja validee."; return; }
    [ -f "$TP_DIR/serveur/agent.log" ] \
        && _ok "agent.log present dans serveur/." 9 \
        || _fail 9 "agent.log absent de serveur/."
}
Q10() {
    _flush
    _done 10 && { p "  ${GRN}[OK]${NC} Q10 deja validee."; return; }
    _inhist "find.*-name.*rapport|find.*rapport\.txt" \
        && _ok "find rapport.txt detecte." 10 \
        || _fail 10 "find -name rapport.txt non detecte dans l'historique."
}
Q11() {
    _flush
    _done 11 && { p "  ${GRN}[OK]${NC} Q11 deja validee."; return; }
    [ -d "$TP_DIR/serveur/archive" ] \
        && _ok "Dossier archive/ present dans serveur/." 11 \
        || _fail 11 "Dossier archive/ absent de serveur/."
}
Q12() {
    _flush
    _done 12 && { p "  ${GRN}[OK]${NC} Q12 deja validee."; return; }
    _t="$TP_DIR/serveur/exfiltration/rapport.txt"
    [ ! -f "$_t" ] && { _fail 12 "rapport.txt absent d'exfiltration/. Relancez le TP."; return; }
    _pp=$(_perms "$_t")
    [ "$_pp" = "600" ] \
        && _ok "Droits 600 appliques." 12 \
        || { p "  ${DIM}Droits actuels : ${_pp:-?}  (attendu : 600)${NC}"
             _fail 12 "Droits incorrects sur rapport.txt."; }
}
Q13() {
    _flush
    _done 13 && { p "  ${GRN}[OK]${NC} Q13 deja validee."; return; }
    [ -x "$TP_DIR/serveur/effacer_traces.sh" ] \
        && _ok "effacer_traces.sh executable." 13 \
        || { p "  ${DIM}Droits actuels : $(_perms "$TP_DIR/serveur/effacer_traces.sh")${NC}"
             _fail 13 "effacer_traces.sh non executable."; }
}
Q14() {
    _flush
    _done 14 && { p "  ${GRN}[OK]${NC} Q14 deja validee."; return; }
    _pid=$(_espion_pid)
    [ -z "$_pid" ] && { _fail 14 "espion_mirage inactif. Relancez le TP."; return; }
    _inhist "ps[[:space:]]*\|[[:space:]]*grep.*(espion|mirage)" \
        && _ok "ps | grep espion_mirage detecte. PID : ${RED}${BLD}$_pid${NC}" 14 \
        || { p "  ${DIM}espion_mirage tourne (PID : $_pid).${NC}"
             _fail 14 "ps | grep espion_mirage non detecte (pipe obligatoire)."; }
}
Q15() {
    _flush
    _done 15 && { p "  ${GRN}[OK]${NC} Q15 deja validee."; return; }
    _eo=0; _ro=0
    _espion_alive || _eo=1
    [ -f "$TP_DIR/serveur/exfiltration/notes_vacances.txt" ] && _ro=1
    if [ "$_eo" = "1" ] && [ "$_ro" = "1" ]; then
        _ok "Espion neutralise + fichier renomme." 15
    else
        [ "$_eo" = "1" ] && p "  ${GRN}OK${NC} Espion neutralise." \
            || { _pid=$(_espion_pid); p "  ${RED}--${NC} Espion actif (PID : $_pid)."; }
        [ "$_ro" = "1" ] && p "  ${GRN}OK${NC} Fichier renomme." \
            || p "  ${RED}--${NC} rapport_secret.txt pas encore renomme."
        _fail 15 "Les deux conditions ne sont pas encore remplies."
    fi
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
