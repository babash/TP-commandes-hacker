#!/bin/sh
# ============================================================
#   TP NSI - INFILTRATION : Operation Mirage  v5.1
#   Terminale NSI - Terminal Linux
#   POSIX sh / ash — compatible JSLinux Alpine
#   https://github.com/babash/TP-commandes-hacker
# ============================================================
# PRINCIPES v5 :
#   - 15 missions strictement independantes (setup garantit l'etat initial)
#   - Validation automatique par watcher en arriere-plan (toutes les 3s)
#   - AGENT hors-ligne : analyse l'etat reel + indices progressifs (3 niveaux)
#   - Aucune mission ne pre-suppose qu'une autre soit faite
# ============================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

TP_DIR="$HOME/infiltration_mirage"
NB_Q=15

p() { printf "%b\n" "$*"; }

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
    printf "%b\n" "${YELLOW}          ~~~ Operation MIRAGE  v5.0 ~~~${NC}"
    printf "%b\n" "${DIM}    Terminale NSI - Travaux Pratiques Linux${NC}"
    printf "\n"
}

# ============================================================
# INTRO
# ============================================================
intro() {
    banner
    p "${CYAN}${BOLD}[ TRANSMISSION CHIFFREE RECUE ]${NC}"
    p ""
    p "  Agent, vous avez penetrer le serveur du projet ${RED}${BOLD}MIRAGE${NC}."
    p "  15 objectifs vous attendent — dans l'ordre que vous souhaitez."
    p ""
    p "  ${YELLOW}Rappel legal :${NC} operation ${BOLD}fictive et locale${NC}."
    p "  Art. 323-1 Code Penal : l'acces non autorise est un delit."
    p ""
    p "${DIM}  ----------------------------------------------------------${NC}"
    p "  Dossier de mission : ${CYAN}${BOLD}~/infiltration_mirage/${NC}"
    p ""
    p "  ${BOLD}Commandes :${NC}"
    printf "  ${GREEN}%-14s${NC} -> Afficher toutes les missions + progression\n" "MISSION"
    printf "  ${GREEN}%-14s${NC} -> Verifier/valider une mission\n"               "Q1 .. Q15"
    printf "  ${GREEN}%-14s${NC} -> Score et progression\n"                       "STATUT"
    printf "  ${YELLOW}%-14s${NC} -> Aide hors-ligne  ex: AGENT 7\n"             "AGENT <n>"
    p ""
    p "  ${DIM}Certaines missions se valident ${BOLD}automatiquement${DIM}.${NC}"
    p ""
}

# ============================================================
# HELPERS POSIX
# ============================================================
_get_field() { echo "$1" | awk "{print \$$2}"; }

_get_perms() {
    stat -c "%a" "$1" 2>/dev/null || stat -f "%OLp" "$1" 2>/dev/null
}

# PID de espion_mirage — syntaxe ps POSIX (sans 'aux' pour ash/busybox)
_espion_pid() {
    ps 2>/dev/null | grep "[e]spion_mirage" | awk '{print $1}' | head -1
}
_espion_alive() { [ -n "$(_espion_pid)" ]; }

_marquer() {
    _q="$1"
    _f="$TP_DIR/.progression"
    [ ! -f "$_f" ] && printf "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0\n" > "$_f"
    _new=$(awk -v n="$_q" '{$n=1; print}' "$_f")
    echo "$_new" > "$_f"
}

_est_valide() {
    _q="$1"
    _f="$TP_DIR/.progression"
    [ ! -f "$_f" ] && return 1
    [ "$(_get_field "$(cat "$_f")" "$_q")" = "1" ]
}

verif_ok() {
    p "  ${GREEN}[OK]${NC} $1"
    _est_valide "$2" || _marquer "$2"
}
verif_err() {
    p "  ${RED}[--]${NC} $1"
    p "  ${YELLOW}    ${NC} $2"
}

# Cherche un pattern dans les 50 dernieres commandes de l'historique.
# Retourne 0 (vrai) si trouve. Usage : _verif_history "pattern"
_verif_history() {
    history 2>/dev/null | tail -50 | grep -qE "$1"
}

# ============================================================
# WATCHER — validation automatique en arriere-plan
# Surveille toutes les missions detectables par etat du FS/processus
# ============================================================
_watcher_loop() {
    while true; do
        sleep 3

        # Q9 — touch agent.log
        if ! _est_valide 9 && [ -f "$TP_DIR/serveur/agent.log" ]; then
            _marquer 9
            printf "\n%b[AUTO]%b Q9 validee automatiquement : agent.log cree !\n" \
                "$GREEN" "$NC"
        fi

        # Q11 — mkdir archive/
        if ! _est_valide 11 && [ -d "$TP_DIR/serveur/archive" ]; then
            _marquer 11
            printf "\n%b[AUTO]%b Q11 validee automatiquement : dossier archive/ cree !\n" \
                "$GREEN" "$NC"
        fi

        # Q12 — chmod 600 sur exfiltration/rapport.txt
        if ! _est_valide 12; then
            _t="$TP_DIR/serveur/exfiltration/rapport.txt"
            if [ -f "$_t" ]; then
                _p=$(_get_perms "$_t")
                if [ "$_p" = "600" ]; then
                    _marquer 12
                    printf "\n%b[AUTO]%b Q12 validee automatiquement : droits 600 appliques !\n" \
                        "$GREEN" "$NC"
                fi
            fi
        fi

        # Q13 — chmod u+x sur effacer_traces.sh
        if ! _est_valide 13 && [ -x "$TP_DIR/serveur/effacer_traces.sh" ]; then
            _marquer 13
            printf "\n%b[AUTO]%b Q13 validee automatiquement : effacer_traces.sh executable !\n" \
                "$GREEN" "$NC"
        fi

        # Q15 — kill espion + mv rapport_secret.txt en notes_vacances.txt
        if ! _est_valide 15; then
            _killed=0; _renamed=0
            _espion_alive || _killed=1
            [ -f "$TP_DIR/serveur/exfiltration/notes_vacances.txt" ] && _renamed=1
            if [ "$_killed" = "1" ] && [ "$_renamed" = "1" ]; then
                _marquer 15
                printf "\n%b[AUTO]%b Q15 validee automatiquement : mission accomplie !\n" \
                    "$GREEN" "$NC"
            fi
        fi

    done
}

_start_watcher() {
    # Tuer l'ancien watcher
    _wf="$TP_DIR/.watcher_pid"
    if [ -f "$_wf" ]; then
        kill "$(cat "$_wf")" 2>/dev/null
        rm -f "$_wf"
    fi
    _watcher_loop &
    echo $! > "$_wf"
}

# ============================================================
# SETUP — garantit l'etat initial de chaque mission
# Chaque Q a ce dont elle a besoin sans depend. sur les autres
# ============================================================
setup_tp() {
    p "${YELLOW}[SETUP] Initialisation du serveur infiltre...${NC}"

    # Tuer watcher et espion precedents
    _wf="$TP_DIR/.watcher_pid"
    [ -f "$_wf" ] && kill "$(cat "$_wf")" 2>/dev/null && rm -f "$_wf"
    ps 2>/dev/null | grep "[e]spion_mirage" | awk '{print $1}' | while read _pid; do
        kill "$_pid" 2>/dev/null
    done

    rm -rf "$TP_DIR"
    mkdir -p "$TP_DIR/serveur/confidentiel"
    mkdir -p "$TP_DIR/serveur/public"
    mkdir -p "$TP_DIR/serveur/logs"
    # Q12 : exfiltration/ existe deja au depart avec rapport.txt en 644
    mkdir -p "$TP_DIR/serveur/exfiltration"

    # Fichiers de base
    echo "Acces refuse. Identifiez-vous." > "$TP_DIR/serveur/acces.txt"

    # rapport.txt — source pour Q10 (find) et Q12 (chmod)
    cat > "$TP_DIR/serveur/confidentiel/rapport.txt" << 'EOF'
RAPPORT CONFIDENTIEL -- Operation Mirage
Niveau : SECRET DEFENSE
Auteur : Agent X
Coordonnees : 48.8566 N, 2.3522 E
Cle de chiffrement : MIRAGE-2024-ALPHA
Ce fichier ne doit pas quitter le serveur.
EOF

    # rapport.txt dans exfiltration/ — cible de Q12 (chmod 600)
    cp "$TP_DIR/serveur/confidentiel/rapport.txt" \
       "$TP_DIR/serveur/exfiltration/rapport.txt"
    chmod 644 "$TP_DIR/serveur/exfiltration/rapport.txt"

    # rapport_secret.txt dans exfiltration/ — cible de Q15 (mv -> notes_vacances.txt)
    # fichier different de rapport.txt pour que Q15 soit independante
    cat > "$TP_DIR/serveur/exfiltration/rapport_secret.txt" << 'EOF'
DOCUMENT ULTRA-SECRET -- A effacer apres lecture
Cible operationnelle : serveur backup 10.0.0.99
Prochain transfert : 03:00 UTC
Renommez ce fichier pour masquer son existence.
EOF

    echo "Serveur public MIRAGE." > "$TP_DIR/serveur/public/index.html"

    # access.log — cible de Q7 (cat | grep Transfert)
    cat > "$TP_DIR/serveur/logs/access.log" << 'EOF'
2024-01-15 08:23:11 - Connexion root depuis 192.168.1.1
2024-01-15 09:11:42 - Tentative acces refusee depuis 10.0.0.42
2024-01-15 09:45:00 - Lecture fichier config.sys
2024-01-15 10:00:01 - Transfert fichier rapport.txt vers 10.0.0.99
2024-01-15 10:00:03 - Deconnexion
2024-01-15 11:30:17 - Connexion admin depuis 192.168.1.1
EOF

    # effacer_traces.sh — cible de Q13 (chmod u+x)
    cat > "$TP_DIR/serveur/effacer_traces.sh" << 'EOF'
#!/bin/sh
echo "Traces effacees."
EOF
    chmod 644 "$TP_DIR/serveur/effacer_traces.sh"

    # .fichier_cache — cible de Q4 (ls -la)
    cat > "$TP_DIR/serveur/.fichier_cache" << 'EOF'
ECHO : Bien. Vous savez voir ce que les autres ignorent.
Indice : le rapport se trouve dans confidentiel/
EOF

    # message_secret.txt — cible de Q6 (cat)
    cat > "$TP_DIR/message_secret.txt" << 'EOF'
[TRANSMISSION DECHIFFREE -- AGENT ECHO]
Serveur MIRAGE operationnel depuis 72h.
Cible principale : dossier confidentiel/
Traces suspectes dans serveur/logs/access.log
EOF

    # Progression vierge
    printf "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0\n" > "$TP_DIR/.progression"

    # Processus espion — cible de Q14 (ps|grep) et Q15 (kill)
    cat > /tmp/espion_mirage.sh << 'EOF'
#!/bin/sh
# espion_mirage - surveillance fictive NSI
while true; do sleep 30; done
EOF
    chmod +x /tmp/espion_mirage.sh
    sh /tmp/espion_mirage.sh &
    echo $! > "$TP_DIR/.espion_pid"

    p "${GREEN}[OK] Serveur initialise dans ~/infiltration_mirage/${NC}"

    # Demarrer le watcher
    _start_watcher
    p "${GREEN}[OK] Validation automatique active (intervalle : 3s)${NC}"
    p ""
}

# ============================================================
# MISSION — liste toutes les questions avec leur statut
# ============================================================
MISSION() {
    banner
    p "${YELLOW}+============================================================+${NC}"
    p "${YELLOW}|       DOSSIER DE MISSION : OPERATION MIRAGE                |${NC}"
    p "${YELLOW}+============================================================+${NC}"
    p ""
    p "  ${DIM}Aide pour une mission : ${YELLOW}AGENT <numero>${DIM}  ex: AGENT 7${NC}"
    p ""

    _f="$TP_DIR/.progression"
    [ -f "$_f" ] && _prog=$(cat "$_f") || _prog="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0"

    _pq() {
        _n="$1"; _titre="$2"; _desc="$3"
        _v=$(_get_field "$_prog" "$_n")
        if [ "$_v" = "1" ]; then _m="${GREEN}[OK]${NC}"
        else                      _m="${DIM}[  ]${NC}"; fi
        printf "  %b ${CYAN}${BOLD}Q%-2s${NC} ${BOLD}%-22s${NC} %s\n" \
            "$_m" "$_n" "$_titre" "$_desc"
    }

    p "  ${DIM}--- Navigation & Lecture -----------------------------------------------${NC}"
    _pq  1 "pwd"          "Affichez votre repertoire courant."
    _pq  2 "ls"           "Listez le contenu de serveur/."
    _pq  3 "man ls"       "Trouvez l'option pour les fichiers caches."
    _pq  4 "ls -la"       "Listez serveur/ avec les details et fichiers caches."
    _pq  5 "cd"           "Deplacez-vous dans serveur/."
    _pq  6 "cat"          "Lisez message_secret.txt."
    p ""
    p "  ${DIM}--- Le pipe | ----------------------------------------------------------${NC}"
    _pq  7 "cat | grep"   "Filtrez access.log sur le mot 'Transfert'."
    _pq  8 "history|grep" "Cherchez 'passwd' dans l'historique."
    p ""
    p "  ${DIM}--- Fichiers -----------------------------------------------------------${NC}"
    _pq  9 "touch"        "Creez un fichier vide agent.log dans serveur/."
    _pq 10 "find"         "Trouvez rapport.txt dans toute l'arborescence."
    _pq 11 "mkdir"        "Creez un dossier archive/ dans serveur/."
    p ""
    p "  ${DIM}--- Droits -------------------------------------------------------------${NC}"
    _pq 12 "chmod 600"    "Appliquez les droits 600 sur exfiltration/rapport.txt."
    _pq 13 "chmod u+x"    "Rendez effacer_traces.sh executable."
    p ""
    p "  ${DIM}--- Processus ----------------------------------------------------------${NC}"
    _pq 14 "ps | grep"    "Trouvez le PID de espion_mirage."
    _pq 15 "kill + mv"    "Tuez espion_mirage. Renommez rapport_secret.txt."
    p ""
}

# ============================================================
# VERIFICATEURS — validation manuelle Q1-Q15
# Appellent _marquer si OK (idempotent avec _est_valide)
# ============================================================

Q1() {
    p "${BOLD}[Q1] pwd — Repertoire courant${NC}"
    p "  Vous etes dans : ${CYAN}${BOLD}$PWD${NC}"
    p "  ${DIM}pwd = print working directory — affiche le chemin absolu.${NC}"
    # Validation : tapé Q1 OU pwd trouve dans l'historique
    if _verif_history "^[0-9 ]*pwd[[:space:]]*$"; then
        p "  ${DIM}(pwd detecte dans l'historique)${NC}"
    fi
    verif_ok "Q1 validee." 1
}

Q2() {
    p "${BOLD}[Q2] ls — Lister serveur/${NC}"
    if [ -d "$TP_DIR/serveur" ]; then
        p "  ${DIM}Commande : ls ~/infiltration_mirage/serveur/${NC}"
        p "  Contenu visible :"
        ls "$TP_DIR/serveur/" | sed 's/^/    /'
        p "  ${DIM}(les fichiers caches ne sont pas montres ici — Q4 les revelera)${NC}"
        # Validation : tapé Q2 OU ls sur serveur/ detecte dans l'historique
        if _verif_history "^[0-9 ]*ls[[:space:]]+~/infiltration_mirage/serveur/[[:space:]]*$"; then
            p "  ${DIM}(ls serveur/ detecte dans l'historique)${NC}"
        fi
        verif_ok "Q2 validee." 2
    else
        verif_err "serveur/ inaccessible." "Relancez : . ~/tp_infiltration.sh"
    fi
}

Q3() {
    p "${BOLD}[Q3] man ls — Documentation${NC}"
    p "  ${DIM}Commande a taper : man ls${NC}"
    p "  ${DIM}Navigation : Espace=avancer  /mot=chercher  n=suivant  q=quitter${NC}"
    p ""
    p "  Reponse : l'option ${YELLOW}-a${NC} (ou --all) affiche tous les fichiers,"
    p "  y compris ceux dont le nom commence par un point (fichiers caches)."
    # Validation : tapé Q3 OU man ls detecte dans l'historique
    if _verif_history "man[[:space:]]+ls"; then
        p "  ${DIM}(man ls detecte dans l'historique — bien joue !)${NC}"
    fi
    verif_ok "Q3 validee." 3
}

Q4() {
    p "${BOLD}[Q4] ls -la — Fichiers caches${NC}"
    if [ -f "$TP_DIR/serveur/.fichier_cache" ]; then
        p "  ${DIM}Commande : ls -la ~/infiltration_mirage/serveur/${NC}"
        p ""
        p "  ${CYAN}Contenu de .fichier_cache :${NC}"
        cat "$TP_DIR/serveur/.fichier_cache" | sed 's/^/    /'
        # Validation : tapé Q4 OU ls -la / ls -al detecte dans l'historique
        if _verif_history "ls[[:space:]]+-la|ls[[:space:]]+-al"; then
            p "  ${DIM}(ls -la detecte dans l'historique)${NC}"
        fi
        verif_ok "Q4 validee." 4
    else
        verif_err "Fichier cache absent." "Relancez le TP."
    fi
}

Q5() {
    p "${BOLD}[Q5] cd — Navigation${NC}"
    if [ "$PWD" = "$TP_DIR/serveur" ]; then
        verif_ok "Q5 validee. Vous etes dans serveur/." 5
    else
        verif_err "Vous etes dans : $PWD" \
                  "Tapez : cd ~/infiltration_mirage/serveur/"
    fi
}

Q6() {
    p "${BOLD}[Q6] cat — Lecture${NC}"
    if [ -f "$TP_DIR/message_secret.txt" ]; then
        p "  ${DIM}Commande : cat ~/infiltration_mirage/message_secret.txt${NC}"
        p ""
        p "  ${CYAN}Contenu de message_secret.txt :${NC}"
        cat "$TP_DIR/message_secret.txt" | sed 's/^/    /'
        # Validation : tapé Q6 OU cat message_secret detecte
        if _verif_history "cat.*message_secret"; then
            p "  ${DIM}(cat message_secret.txt detecte dans l'historique)${NC}"
        fi
        verif_ok "Q6 validee." 6
    else
        verif_err "message_secret.txt introuvable." "Verifiez avec pwd."
    fi
}

Q7() {
    p "${BOLD}[Q7] cat | grep — Le pipe${NC}"
    p ""
    p "  ${CYAN}Principe du pipe | :${NC}"
    p "  La SORTIE de la commande de gauche devient l'ENTREE de droite."
    p ""
    p "  ${DIM}cat access.log${NC}                    -> affiche tout le fichier"
    p "  ${DIM}cat access.log | grep Transfert${NC}   -> garde seulement les lignes avec 'Transfert'"
    p ""
    p "  ${YELLOW}Commande complete :${NC}"
    p "  cat ~/infiltration_mirage/serveur/logs/access.log | grep Transfert"
    p ""
    p "  ${CYAN}Resultat :${NC}"
    grep "Transfert" "$TP_DIR/serveur/logs/access.log" 2>/dev/null | sed 's/^/    /' \
        || p "    (fichier log absent — relancez le TP)"
    # Validation : tapé Q7 OU cat...grep / cat...pipe detecte dans l'historique
    if _verif_history "cat.*access\.log.*\|.*grep.*Transfert|cat.*\|.*grep.*Transfert"; then
        p "  ${DIM}(cat | grep detecte dans l'historique)${NC}"
    fi
    verif_ok "Q7 validee." 7
}

Q8() {
    p "${BOLD}[Q8] history | grep — Pipe sur l'historique${NC}"
    p ""
    p "  ${DIM}Meme principe que Q7 : history | grep passwd${NC}"
    p ""
    _hist=$(history 2>/dev/null | grep "passwd")
    if [ -n "$_hist" ]; then
        p "  ${CYAN}Lignes trouvees dans l'historique :${NC}"
        echo "$_hist" | sed 's/^/    /'
    else
        p "  ${DIM}(Aucun resultat — normal, vous n'avez pas encore tape 'passwd')${NC}"
        p "  Dans un vrai scenario : '  42  mysql -u root -pmonpasswd'"
    fi
    p ""
    p "  ${DIM}Le pipe fonctionne avec n'importe quelle commande produisant du texte.${NC}"
    # Validation : tapé Q8 OU history|grep detecte
    if _verif_history "history[[:space:]]*\|[[:space:]]*grep"; then
        p "  ${DIM}(history | grep detecte dans l'historique)${NC}"
    fi
    verif_ok "Q8 validee." 8
}

Q9() {
    p "${BOLD}[Q9] touch — Creer un fichier vide${NC}"
    if [ -f "$TP_DIR/serveur/agent.log" ]; then
        verif_ok "Q9 validee. agent.log existe dans serveur/." 9
    else
        verif_err "agent.log absent de serveur/." \
                  "Tapez : touch ~/infiltration_mirage/serveur/agent.log"
        p "  ${DIM}(validation automatique dans les 3 secondes apres creation)${NC}"
    fi
}

Q10() {
    p "${BOLD}[Q10] find — Recherche recursive${NC}"
    _found=$(find "$TP_DIR" -name "rapport.txt" 2>/dev/null)
    if [ -n "$_found" ]; then
        p "  ${DIM}Commande : find ~/infiltration_mirage/ -name rapport.txt${NC}"
        p "  ${DIM}find cherche dans tous les sous-dossiers, contrairement a ls.${NC}"
        p ""
        p "  ${CYAN}Fichiers trouves :${NC}"
        echo "$_found" | sed 's/^/    /'
        # Validation : tapé Q10 OU find -name rapport detecte dans l'historique
        if _verif_history "find.*-name.*rapport|find.*rapport\.txt"; then
            p "  ${DIM}(find rapport.txt detecte dans l'historique)${NC}"
        fi
        verif_ok "Q10 validee." 10
    else
        verif_err "rapport.txt introuvable." \
                  "Tapez : find ~/infiltration_mirage/ -name rapport.txt"
    fi
}

Q11() {
    p "${BOLD}[Q11] mkdir — Creer un dossier${NC}"
    if [ -d "$TP_DIR/serveur/archive" ]; then
        verif_ok "Q11 validee. Dossier archive/ cree dans serveur/." 11
    else
        verif_err "Dossier archive/ absent de serveur/." \
                  "Tapez : mkdir ~/infiltration_mirage/serveur/archive"
        p "  ${DIM}(validation automatique dans les 3 secondes apres creation)${NC}"
    fi
}

Q12() {
    p "${BOLD}[Q12] chmod 600 — Droits restrictifs${NC}"
    _t="$TP_DIR/serveur/exfiltration/rapport.txt"
    if [ ! -f "$_t" ]; then
        verif_err "exfiltration/rapport.txt absent." "Relancez le TP."
        return
    fi
    _p=$(_get_perms "$_t")
    if [ "$_p" = "600" ]; then
        p "  ${DIM}600 = rw------- : User(6=rw) Group(0=---) Others(0=---)${NC}"
        verif_ok "Q12 validee. Droits 600 appliques." 12
    else
        verif_err "Droits actuels : ${_p:-inconnus} — attendu : 600." \
                  "Tapez : chmod 600 ~/infiltration_mirage/serveur/exfiltration/rapport.txt"
        p "  ${DIM}(validation automatique dans les 3 secondes)${NC}"
    fi
}

Q13() {
    p "${BOLD}[Q13] chmod u+x — Rendre executable${NC}"
    _t="$TP_DIR/serveur/effacer_traces.sh"
    _p=$(_get_perms "$_t" 2>/dev/null)
    if [ -x "$_t" ]; then
        p "  ${DIM}u+x : ajouter (+) execution (x) au proprietaire (u). Droits : $_p${NC}"
        verif_ok "Q13 validee. effacer_traces.sh est executable." 13
    else
        verif_err "Pas executable. Droits actuels : ${_p:-inconnus}." \
                  "Tapez : chmod u+x ~/infiltration_mirage/serveur/effacer_traces.sh"
        p "  ${DIM}(validation automatique dans les 3 secondes)${NC}"
    fi
}

Q14() {
    p "${BOLD}[Q14] ps | grep — Reperer un processus${NC}"
    _pid=$(_espion_pid)
    if [ -n "$_pid" ]; then
        p "  ${DIM}Commande : ps | grep espion_mirage${NC}"
        p "  ${DIM}(la ligne contenant 'grep' apparait aussi — ignorez-la)${NC}"
        p ""
        p "  ${CYAN}Processus espion_mirage detecte :${NC}"
        ps 2>/dev/null | grep "[e]spion_mirage" | sed 's/^/    /'
        p ""
        # Validation : tapé Q14 OU ps|grep espion detecte
        if _verif_history "ps[[:space:]]*\|[[:space:]]*grep.*(espion|mirage)"; then
            p "  ${DIM}(ps | grep detecte dans l'historique)${NC}"
        fi
        verif_ok "Q14 validee. PID de espion_mirage : ${RED}${BOLD}$_pid${NC}" 14
        p "  ${DIM}Notez ce PID — il vous servira pour Q15 : kill $_pid${NC}"
    else
        verif_err "espion_mirage ne tourne pas." \
                  "Relancez le TP : . ~/tp_infiltration.sh"
    fi
}

Q15() {
    p "${BOLD}[Q15] kill + mv — Neutralisation et camouflage${NC}"
    _espion_mort=0; _renomme=0
    _espion_alive || _espion_mort=1
    [ -f "$TP_DIR/serveur/exfiltration/notes_vacances.txt" ] && _renomme=1

    if [ "$_espion_mort" = "1" ] && [ "$_renomme" = "1" ]; then
        verif_ok "Q15 validee. Espion neutralise + fichier camouffle." 15
        p ""
        p "  ${GREEN}${BOLD}OPERATION MIRAGE TERMINEE. Bien joue, agent.${NC}"
    else
        if [ "$_espion_mort" = "0" ]; then
            _pid=$(_espion_pid)
            verif_err "Espion toujours actif (PID : $_pid)." \
                      "Tapez : kill $_pid   (force : kill -9 $_pid)"
        else
            p "  ${GREEN}[OK]${NC}  Espion neutralise."
        fi
        if [ "$_renomme" = "0" ]; then
            verif_err "rapport_secret.txt pas encore renomme." \
                      "Tapez : mv ~/infiltration_mirage/serveur/exfiltration/rapport_secret.txt ~/infiltration_mirage/serveur/exfiltration/notes_vacances.txt"
            p "  ${DIM}(validation automatique dans les 3 secondes)${NC}"
        else
            p "  ${GREEN}[OK]${NC}  Fichier renomme en notes_vacances.txt."
        fi
    fi
}

# ============================================================
# AGENT — aide hors-ligne avec 3 niveaux d'indices
# Analyse l'etat reel du systeme avant de repondre
# ============================================================
AGENT() {
    _n="${1:-}"

    if [ -z "$_n" ]; then
        p ""
        p "${YELLOW}+--[ AGENT -- Aide hors-ligne ]------------------------------+${NC}"
        p "${YELLOW}|${NC}"
        p "${YELLOW}|${NC}  Pour quelle mission ? (1-15, ou 'fin') :"
        printf "${YELLOW}|${NC}  > "
        read _n
        if [ "$_n" = "fin" ] || [ -z "$_n" ]; then
            p "${YELLOW}|${NC}  Annule."
            p "${YELLOW}+------------------------------------------------------------+${NC}"
            return
        fi
    fi

    case "$_n" in
        1|2|3|4|5|6|7|8|9|10|11|12|13|14|15) ;;
        *)
            p "  ${RED}Numero invalide. Exemple : AGENT 7${NC}"
            return ;;
    esac

    p ""
    p "${YELLOW}+--[ AGENT -- Mission Q${_n} ]-----------------------------------+${NC}"
    p "${YELLOW}|${NC}"

    # Verifier si deja validee
    if _est_valide "$_n"; then
        p "${YELLOW}|${NC}  ${GREEN}Cette mission est deja validee. Bravo !${NC}"
        p "${YELLOW}|${NC}  Tapez MISSION pour voir les autres objectifs."
        p "${YELLOW}+------------------------------------------------------------+${NC}"
        return
    fi

    # Analyser l'etat et donner les indices en fonction
    case "$_n" in

    1)
        p "${YELLOW}|${NC}  ${BOLD}Objectif :${NC} afficher votre repertoire courant."
        p "${YELLOW}|${NC}"
        p "${YELLOW}|${NC}  Analyse : vous etes actuellement dans ${CYAN}$PWD${NC}"
        p "${YELLOW}|${NC}"
        p "${YELLOW}|${NC}  [Indice 1] Il existe une commande courte (3 lettres)"
        p "${YELLOW}|${NC}             pour afficher ou on se trouve."
        p "${YELLOW}|${NC}  [Indice 2] Son nom vient de 'Print Working Directory'."
        p "${YELLOW}|${NC}  [Indice 3] Commande : ${YELLOW}pwd${NC}  puis tapez Q1."
        ;;

    2)
        p "${YELLOW}|${NC}  ${BOLD}Objectif :${NC} lister le contenu de serveur/."
        p "${YELLOW}|${NC}"
        if [ -d "$TP_DIR/serveur" ]; then
            p "${YELLOW}|${NC}  Analyse : le dossier serveur/ existe bien."
        else
            p "${YELLOW}|${NC}  ${RED}Analyse : serveur/ est absent — relancez le TP.${NC}"
        fi
        p "${YELLOW}|${NC}"
        p "${YELLOW}|${NC}  [Indice 1] 'ls' liste le contenu d'un dossier."
        p "${YELLOW}|${NC}  [Indice 2] On peut donner un chemin en argument : ls /chemin/"
        p "${YELLOW}|${NC}  [Indice 3] Commande : ${YELLOW}ls ~/infiltration_mirage/serveur/${NC}"
        ;;

    3)
        p "${YELLOW}|${NC}  ${BOLD}Objectif :${NC} trouver l'option -a de ls dans le manuel."
        p "${YELLOW}|${NC}"
        p "${YELLOW}|${NC}  [Indice 1] 'man commande' ouvre le manuel de cette commande."
        p "${YELLOW}|${NC}             Naviguez avec Espace, quittez avec q."
        p "${YELLOW}|${NC}  [Indice 2] Dans man, tapez /all puis Entree pour chercher"
        p "${YELLOW}|${NC}             le mot 'all'. n passe a l'occurrence suivante."
        p "${YELLOW}|${NC}  [Indice 3] L'option est ${YELLOW}-a${NC} (ou --all)."
        p "${YELLOW}|${NC}             Apres avoir consulte man, tapez Q3 pour valider."
        ;;

    4)
        p "${YELLOW}|${NC}  ${BOLD}Objectif :${NC} lister serveur/ avec fichiers caches."
        p "${YELLOW}|${NC}"
        _c="non"; [ -f "$TP_DIR/serveur/.fichier_cache" ] && _c="oui"
        p "${YELLOW}|${NC}  Analyse : fichier cache .fichier_cache present = $_c"
        p "${YELLOW}|${NC}"
        p "${YELLOW}|${NC}  [Indice 1] Les fichiers dont le nom commence par '.' sont"
        p "${YELLOW}|${NC}             caches par defaut. L'option -a les rend visibles."
        p "${YELLOW}|${NC}  [Indice 2] L'option -l affiche les details (droits, taille...)."
        p "${YELLOW}|${NC}             On peut combiner plusieurs options : -la ou -l -a"
        p "${YELLOW}|${NC}  [Indice 3] Commande : ${YELLOW}ls -la ~/infiltration_mirage/serveur/${NC}"
        ;;

    5)
        p "${YELLOW}|${NC}  ${BOLD}Objectif :${NC} se deplacer dans serveur/."
        p "${YELLOW}|${NC}"
        p "${YELLOW}|${NC}  Analyse : vous etes dans ${CYAN}$PWD${NC}"
        p "${YELLOW}|${NC}           destination : ${CYAN}$TP_DIR/serveur${NC}"
        p "${YELLOW}|${NC}"
        p "${YELLOW}|${NC}  [Indice 1] 'ls' LISTE un dossier sans y aller."
        p "${YELLOW}|${NC}             'cd' CHANGE de dossier (change directory)."
        p "${YELLOW}|${NC}  [Indice 2] cd suivi d'un chemin vous deplace dans ce dossier."
        p "${YELLOW}|${NC}  [Indice 3] Commande : ${YELLOW}cd ~/infiltration_mirage/serveur/${NC}"
        p "${YELLOW}|${NC}             puis tapez Q5 pour valider."
        ;;

    6)
        p "${YELLOW}|${NC}  ${BOLD}Objectif :${NC} lire le contenu de message_secret.txt."
        p "${YELLOW}|${NC}"
        _e="non"; [ -f "$TP_DIR/message_secret.txt" ] && _e="oui"
        p "${YELLOW}|${NC}  Analyse : message_secret.txt present = $_e"
        p "${YELLOW}|${NC}"
        p "${YELLOW}|${NC}  [Indice 1] 'cat' affiche le contenu d'un fichier texte."
        p "${YELLOW}|${NC}             Son nom vient de 'concatenate'."
        p "${YELLOW}|${NC}  [Indice 2] Donnez le chemin du fichier en argument."
        p "${YELLOW}|${NC}  [Indice 3] Commande : ${YELLOW}cat ~/infiltration_mirage/message_secret.txt${NC}"
        ;;

    7)
        p "${YELLOW}|${NC}  ${BOLD}Objectif :${NC} filtrer access.log avec cat | grep."
        p "${YELLOW}|${NC}"
        _l="non"
        [ -f "$TP_DIR/serveur/logs/access.log" ] && _l="oui"
        p "${YELLOW}|${NC}  Analyse : access.log present = $_l"
        p "${YELLOW}|${NC}"
        p "${YELLOW}|${NC}  [Indice 1] Le symbole | s'appelle 'pipe' (tuyau)."
        p "${YELLOW}|${NC}             Il branche la SORTIE de gauche sur l'ENTREE de droite."
        p "${YELLOW}|${NC}             commande1 | commande2"
        p "${YELLOW}|${NC}"
        p "${YELLOW}|${NC}  [Indice 2] 'grep mot' filtre les lignes contenant 'mot'."
        p "${YELLOW}|${NC}             Avec pipe : cat fichier | grep mot"
        p "${YELLOW}|${NC}"
        p "${YELLOW}|${NC}  [Indice 3] Commande complete :"
        p "${YELLOW}|${NC}    ${YELLOW}cat ~/infiltration_mirage/serveur/logs/access.log | grep Transfert${NC}"
        p "${YELLOW}|${NC}    Puis tapez Q7 pour valider."
        ;;

    8)
        p "${YELLOW}|${NC}  ${BOLD}Objectif :${NC} chercher 'passwd' dans l'historique."
        p "${YELLOW}|${NC}"
        p "${YELLOW}|${NC}  [Indice 1] 'history' affiche les dernieres commandes tapees."
        p "${YELLOW}|${NC}             Essayez : history"
        p "${YELLOW}|${NC}"
        p "${YELLOW}|${NC}  [Indice 2] Combinez history et grep avec le pipe (comme Q7)."
        p "${YELLOW}|${NC}             history | grep <motif>"
        p "${YELLOW}|${NC}"
        p "${YELLOW}|${NC}  [Indice 3] Commande : ${YELLOW}history | grep passwd${NC}"
        p "${YELLOW}|${NC}             (le resultat peut etre vide — c'est normal)"
        p "${YELLOW}|${NC}             Puis tapez Q8 pour valider."
        ;;

    9)
        p "${YELLOW}|${NC}  ${BOLD}Objectif :${NC} creer le fichier vide agent.log."
        p "${YELLOW}|${NC}"
        _e="non"; [ -f "$TP_DIR/serveur/agent.log" ] && _e="oui"
        p "${YELLOW}|${NC}  Analyse : agent.log existe deja = $_e"
        p "${YELLOW}|${NC}"
        if [ "$_e" = "oui" ]; then
            p "${YELLOW}|${NC}  ${GREEN}Le fichier existe — validation automatique en cours.${NC}"
        else
            p "${YELLOW}|${NC}  [Indice 1] 'touch' cree un fichier vide."
            p "${YELLOW}|${NC}             Si le fichier existe deja, il met juste a jour sa date."
            p "${YELLOW}|${NC}  [Indice 2] Donnez le chemin complet du fichier a creer."
            p "${YELLOW}|${NC}  [Indice 3] Commande :"
            p "${YELLOW}|${NC}    ${YELLOW}touch ~/infiltration_mirage/serveur/agent.log${NC}"
            p "${YELLOW}|${NC}    (validation automatique en 3 secondes)"
        fi
        ;;

    10)
        p "${YELLOW}|${NC}  ${BOLD}Objectif :${NC} localiser rapport.txt avec find."
        p "${YELLOW}|${NC}"
        _n_found=$(find "$TP_DIR" -name "rapport.txt" 2>/dev/null | wc -l | tr -d ' ')
        p "${YELLOW}|${NC}  Analyse : ${_n_found} fichier(s) rapport.txt dans l'arborescence."
        p "${YELLOW}|${NC}"
        p "${YELLOW}|${NC}  [Indice 1] 'ls' ne voit qu'un seul niveau de dossier."
        p "${YELLOW}|${NC}             'find' explore recursivement tous les sous-dossiers."
        p "${YELLOW}|${NC}"
        p "${YELLOW}|${NC}  [Indice 2] Syntaxe : find <dossier_de_depart> -name <nom_fichier>"
        p "${YELLOW}|${NC}"
        p "${YELLOW}|${NC}  [Indice 3] Commande :"
        p "${YELLOW}|${NC}    ${YELLOW}find ~/infiltration_mirage/ -name rapport.txt${NC}"
        ;;

    11)
        p "${YELLOW}|${NC}  ${BOLD}Objectif :${NC} creer le dossier archive/ dans serveur/."
        p "${YELLOW}|${NC}"
        _e="non"; [ -d "$TP_DIR/serveur/archive" ] && _e="oui"
        p "${YELLOW}|${NC}  Analyse : dossier archive/ existe deja = $_e"
        p "${YELLOW}|${NC}"
        if [ "$_e" = "oui" ]; then
            p "${YELLOW}|${NC}  ${GREEN}Le dossier existe — validation automatique en cours.${NC}"
        else
            p "${YELLOW}|${NC}  [Indice 1] 'mkdir' cree un nouveau dossier (make directory)."
            p "${YELLOW}|${NC}  [Indice 2] Donnez le chemin complet du dossier a creer."
            p "${YELLOW}|${NC}  [Indice 3] Commande :"
            p "${YELLOW}|${NC}    ${YELLOW}mkdir ~/infiltration_mirage/serveur/archive${NC}"
            p "${YELLOW}|${NC}    (validation automatique en 3 secondes)"
        fi
        ;;

    12)
        p "${YELLOW}|${NC}  ${BOLD}Objectif :${NC} chmod 600 sur exfiltration/rapport.txt."
        p "${YELLOW}|${NC}"
        _t="$TP_DIR/serveur/exfiltration/rapport.txt"
        _p=$(_get_perms "$_t" 2>/dev/null)
        p "${YELLOW}|${NC}  Analyse : droits actuels = ${CYAN}${_p:-fichier absent}${NC}"
        p "${YELLOW}|${NC}           droits attendus = ${GREEN}600${NC}"
        p "${YELLOW}|${NC}"
        if [ "$_p" = "600" ]; then
            p "${YELLOW}|${NC}  ${GREEN}Droits corrects — validation automatique en cours.${NC}"
        else
            p "${YELLOW}|${NC}  [Indice 1] Les droits en octal : r=4, w=2, x=1."
            p "${YELLOW}|${NC}             On additionne par groupe : user / group / others."
            p "${YELLOW}|${NC}             Exemple : 7 = r+w+x, 6 = r+w, 4 = r seulement."
            p "${YELLOW}|${NC}"
            p "${YELLOW}|${NC}  [Indice 2] 600 = User:6(lire+ecrire) Group:0 Others:0"
            p "${YELLOW}|${NC}             Seul le proprietaire peut acceder au fichier."
            p "${YELLOW}|${NC}"
            p "${YELLOW}|${NC}  [Indice 3] Commande :"
            p "${YELLOW}|${NC}    ${YELLOW}chmod 600 ~/infiltration_mirage/serveur/exfiltration/rapport.txt${NC}"
        fi
        ;;

    13)
        p "${YELLOW}|${NC}  ${BOLD}Objectif :${NC} rendre effacer_traces.sh executable."
        p "${YELLOW}|${NC}"
        _t="$TP_DIR/serveur/effacer_traces.sh"
        _p=$(_get_perms "$_t" 2>/dev/null)
        _x="non"; [ -x "$_t" ] && _x="oui"
        p "${YELLOW}|${NC}  Analyse : droits actuels = ${CYAN}${_p:-inconnus}${NC}"
        p "${YELLOW}|${NC}           executable par le proprietaire = $_x"
        p "${YELLOW}|${NC}"
        if [ "$_x" = "oui" ]; then
            p "${YELLOW}|${NC}  ${GREEN}Fichier executable — validation automatique en cours.${NC}"
        else
            p "${YELLOW}|${NC}  [Indice 1] Mode relatif de chmod : on designe qui (u/g/o),"
            p "${YELLOW}|${NC}             l'action (+ ajoute, - retire) et le droit (r/w/x)."
            p "${YELLOW}|${NC}             u = user (proprietaire), x = execution."
            p "${YELLOW}|${NC}"
            p "${YELLOW}|${NC}  [Indice 2] 'u+x' = ajouter le droit d'execution au proprietaire."
            p "${YELLOW}|${NC}"
            p "${YELLOW}|${NC}  [Indice 3] Commande :"
            p "${YELLOW}|${NC}    ${YELLOW}chmod u+x ~/infiltration_mirage/serveur/effacer_traces.sh${NC}"
        fi
        ;;

    14)
        p "${YELLOW}|${NC}  ${BOLD}Objectif :${NC} trouver le PID de espion_mirage."
        p "${YELLOW}|${NC}"
        _pid=$(_espion_pid)
        if [ -n "$_pid" ]; then
            p "${YELLOW}|${NC}  Analyse : espion_mirage tourne. ${GREEN}PID = ${RED}$_pid${NC}"
        else
            p "${YELLOW}|${NC}  ${RED}Analyse : espion_mirage ne tourne pas — relancez le TP.${NC}"
        fi
        p "${YELLOW}|${NC}"
        p "${YELLOW}|${NC}  [Indice 1] 'ps' liste les processus en cours d'execution."
        p "${YELLOW}|${NC}             Sur ce systeme, 'ps' sans option liste vos processus."
        p "${YELLOW}|${NC}"
        p "${YELLOW}|${NC}  [Indice 2] Combinez ps et grep avec un pipe pour filtrer."
        p "${YELLOW}|${NC}             La colonne PID est la premiere colonne affichee."
        p "${YELLOW}|${NC}"
        p "${YELLOW}|${NC}  [Indice 3] Commande : ${YELLOW}ps | grep espion_mirage${NC}"
        p "${YELLOW}|${NC}             Puis tapez Q14 pour valider."
        ;;

    15)
        p "${YELLOW}|${NC}  ${BOLD}Objectif :${NC} tuer espion_mirage + renommer rapport_secret.txt."
        p "${YELLOW}|${NC}"
        _pid=$(_espion_pid)
        _vit="non"; _espion_alive && _vit="oui"
        _ren="non"
        [ -f "$TP_DIR/serveur/exfiltration/notes_vacances.txt" ] && _ren="oui"
        _src_ok="non"
        [ -f "$TP_DIR/serveur/exfiltration/rapport_secret.txt" ] && _src_ok="oui"
        p "${YELLOW}|${NC}  Analyse :"
        p "${YELLOW}|${NC}    espion_mirage actif            = $(_espion_alive && echo oui || echo non)"
        p "${YELLOW}|${NC}    rapport_secret.txt present     = $_src_ok"
        p "${YELLOW}|${NC}    notes_vacances.txt cree        = $_ren"
        p "${YELLOW}|${NC}"
        if [ "$_vit" = "oui" ] && [ -n "$_pid" ]; then
            p "${YELLOW}|${NC}  -- Tuer le processus --"
            p "${YELLOW}|${NC}  [Indice 1] 'kill PID' envoie un signal d'arret au processus."
            p "${YELLOW}|${NC}  [Indice 2] Le PID est dans l'analyse ci-dessus."
            p "${YELLOW}|${NC}             Vous pouvez aussi le retrouver avec : ps | grep espion"
            p "${YELLOW}|${NC}  [Indice 3] Commande : ${YELLOW}kill $_pid${NC}"
            p "${YELLOW}|${NC}             Si bloque : ${YELLOW}kill -9 $_pid${NC}"
            p "${YELLOW}|${NC}"
        fi
        if [ "$_ren" = "non" ]; then
            p "${YELLOW}|${NC}  -- Renommer le fichier --"
            p "${YELLOW}|${NC}  [Indice 1] 'mv' sert a deplacer ET a renommer des fichiers."
            p "${YELLOW}|${NC}             Syntaxe : mv <source> <destination>"
            p "${YELLOW}|${NC}  [Indice 2] Pour renommer, la destination est dans le meme"
            p "${YELLOW}|${NC}             dossier mais avec un nom different."
            p "${YELLOW}|${NC}  [Indice 3] Commande :"
            p "${YELLOW}|${NC}    ${YELLOW}mv ~/infiltration_mirage/serveur/exfiltration/rapport_secret.txt \\"
            p "${YELLOW}|${NC}       ~/infiltration_mirage/serveur/exfiltration/notes_vacances.txt${NC}"
        fi
        ;;
    esac

    p "${YELLOW}|${NC}"
    p "${YELLOW}|${NC}  ${DIM}Reviens me voir si tu as besoin de plus d'aide : tape ${YELLOW}AGENT ${_n}${DIM}.${NC}"
    p "${YELLOW}+------------------------------------------------------------+${NC}"
    p ""
}

# ============================================================
# STATUT
# ============================================================
STATUT() {
    p "${BOLD}+=========================================+${NC}"
    p "${BOLD}|    PROGRESSION -- OPERATION MIRAGE      |${NC}"
    p "${BOLD}+=========================================+${NC}"
    p ""
    _f="$TP_DIR/.progression"
    [ ! -f "$_f" ] && p "  Aucune progression enregistree." && return
    _total=0
    _i=1
    while [ "$_i" -le 15 ]; do
        _v=$(_get_field "$(cat "$_f")" "$_i")
        case "$_i" in
            1)  _l="pwd       -- Repertoire courant" ;;
            2)  _l="ls        -- Lister serveur/" ;;
            3)  _l="man ls    -- Documentation" ;;
            4)  _l="ls -la    -- Fichiers caches" ;;
            5)  _l="cd        -- Navigation" ;;
            6)  _l="cat       -- Lecture fichier" ;;
            7)  _l="cat|grep  -- Introduction pipe" ;;
            8)  _l="hist|grep -- Pipe historique" ;;
            9)  _l="touch     -- Creer agent.log" ;;
            10) _l="find      -- Localiser rapport.txt" ;;
            11) _l="mkdir     -- Creer archive/" ;;
            12) _l="chmod 600 -- Droits restrictifs" ;;
            13) _l="chmod u+x -- Script executable" ;;
            14) _l="ps|grep   -- Reperer espion_mirage" ;;
            15) _l="kill+mv   -- Neutraliser et camoufler" ;;
        esac
        if [ "$_v" = "1" ]; then
            printf "  ${GREEN}OK${NC}  Q%-2s  %s\n" "$_i" "$_l"
            _total=$((_total + 1))
        else
            printf "  ${DIM}--${NC}  Q%-2s  %s\n" "$_i" "$_l"
        fi
        _i=$((_i + 1))
    done
    p ""
    p "  Score : ${BOLD}${_total}/${NB_Q}${NC}"
    if [ "$_total" -eq "$NB_Q" ]; then
        p ""
        p "  ${GREEN}${BOLD}MISSION ACCOMPLIE -- Operation MIRAGE terminee.${NC}"
    elif [ "$_total" -ge 10 ]; then
        p "  ${YELLOW}Plus que $(($NB_Q - $_total)) objectif(s).${NC}"
    else
        p "  ${DIM}Tapez MISSION pour voir les objectifs.${NC}"
    fi
    p ""
}

# ============================================================
# INIT
# ============================================================
_init_tp() {
    intro
    p "${YELLOW}[SETUP] Preparation de l'environnement...${NC}"
    setup_tp
    p "${GREEN}${BOLD}TP pret !${NC}"
    p "   ${CYAN}${BOLD}MISSION${NC}      -> liste les 15 missions et leur statut"
    p "   ${CYAN}${BOLD}STATUT${NC}       -> score detaille"
    p "   ${YELLOW}${BOLD}AGENT <n>${NC}   -> aide pour une mission  ex: AGENT 7"
    p ""
}

_init_tp
