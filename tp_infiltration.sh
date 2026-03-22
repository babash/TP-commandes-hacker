#!/bin/sh
# ============================================================
#   TP NSI - INFILTRATION : Opération Mirage  v4.0
#   Terminale NSI - Terminal Linux
#   Compatible POSIX sh / ash (Alpine, JSLinux)
#   https://github.com/babash/TP-commandes-hacker
# ============================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
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
    printf "%b\n" "${YELLOW}          ~~~ Operation MIRAGE  v4.0 ~~~${NC}"
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
    p "  Agent, vous avez reussi a penetrer le serveur du projet ${RED}${BOLD}MIRAGE${NC}."
    p "  Ce serveur stocke des donnees sensibles a recuperer."
    p ""
    p "  Notre analyste ${MAGENTA}${BOLD}ECHO${NC} vous accompagne a distance."
    p "  En cas de blocage : ${MAGENTA}${BOLD}AGENT${NC}"
    p ""
    p "  ${YELLOW}Rappel legal :${NC} Cette operation est ${BOLD}fictive et locale${NC}."
    p "  L'acces non autorise a un systeme est reprime par l'art. 323-1 du Code Penal."
    p ""
    p "${DIM}  ----------------------------------------------------------${NC}"
    p ""
    p "  Dossier de mission : ${CYAN}${BOLD}~/infiltration_mirage/${NC}"
    p ""
    p "  ${BOLD}Commandes disponibles :${NC}"
    printf "  ${GREEN}%-12s${NC} -> Afficher les 15 questions\n" "MISSION"
    printf "  ${GREEN}%-12s${NC} -> Verifier la question N\n" "Q1 .. Q15"
    printf "  ${GREEN}%-12s${NC} -> Voir votre progression\n" "STATUT"
    printf "  ${MAGENTA}%-12s${NC} -> Contacter l'agent ECHO\n" "AGENT"
    p ""
}

# ============================================================
# HELPERS POSIX
# ============================================================

# Affiche ok/err
verif_ok()  { p "  ${GREEN}OK  :${NC} $1"; }
verif_err() {
    p "  ${RED}ERR :${NC} $1"
    p "  ${YELLOW}Aide:${NC} $2"
    p "  ${DIM}Bloque ? Tapez : ${MAGENTA}AGENT${NC}"
}

# Lire le champ N (1-based) d'une ligne espace-separee
_get_field() {
    _str="$1"
    _n="$2"
    echo "$_str" | awk "{print \$$_n}"
}

# Marquer question Q comme reussie
_marquer() {
    _q="$1"
    _f="$TP_DIR/.progression"
    if [ ! -f "$_f" ]; then
        echo "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0" > "$_f"
    fi
    _old=$(cat "$_f")
    # Remplacer le Neme champ par 1
    _new=$(echo "$_old" | awk -v n="$_q" '{$n=1; print}')
    echo "$_new" > "$_f"
}

# Tester si question Q est deja reussie (retourne 0=oui, 1=non)
_deja_fait() {
    _q="$1"
    _f="$TP_DIR/.progression"
    [ ! -f "$_f" ] && return 1
    _val=$(_get_field "$(cat "$_f")" "$_q")
    [ "$_val" = "1" ]
}

# Verifier les droits octaux d'un fichier
_get_perms() {
    stat -c "%a" "$1" 2>/dev/null || stat -f "%OLp" "$1" 2>/dev/null
}

# Trouver PID de espion_mirage (POSIX: ps + grep, sans pgrep)
_espion_pid() {
    ps aux 2>/dev/null | grep "[e]spion_mirage" | awk '{print $2}' | head -1
}

_espion_alive() {
    _pid=$(_espion_pid)
    [ -n "$_pid" ]
}

# ============================================================
# AGENT ECHO — appel API Claude via curl
# ============================================================
AGENT() {
    # Construire contexte de progression
    _f="$TP_DIR/.progression"
    _done=""
    _todo=""
    if [ -f "$_f" ]; then
        _i=1
        while [ "$_i" -le 15 ]; do
            _v=$(_get_field "$(cat "$_f")" "$_i")
            if [ "$_v" = "1" ]; then
                _done="${_done}Q${_i} "
            else
                _todo="${_todo}Q${_i} "
            fi
            _i=$((_i + 1))
        done
    fi
    _prog="Reussies: ${_done:-aucune}. Restantes: ${_todo:-aucune}."

    p ""
    p "${MAGENTA}+--[ AGENT ECHO - Ligne securisee ]${NC}"
    p "${MAGENTA}|${NC}"
    p "${MAGENTA}|${NC}  Votre message (Entree = aide generale, 'fin' = fermer) :"
    printf "${MAGENTA}|${NC}  > "
    read USER_MSG

    if [ "$USER_MSG" = "fin" ]; then
        p "${MAGENTA}|${NC}  Connexion fermee."
        p "${MAGENTA}+------------------------------------${NC}"
        p ""
        return
    fi

    if [ -z "$USER_MSG" ]; then
        USER_MSG="Donne-moi une aide generale sur la question sur laquelle je suis bloque."
    fi

    p "${MAGENTA}|${NC}"
    p "${MAGENTA}|${NC}  ${DIM}Connexion a ECHO...${NC}"

    _system="Tu es ECHO, un agent expert Linux qui aide un eleve de Terminale NSI via terminal. TP: Operation MIRAGE. 15 questions: Q1=pwd, Q2=ls, Q3=man ls, Q4=ls -la, Q5=cd, Q6=cat, Q7=cat|grep (intro pipe), Q8=history|grep, Q9=touch, Q10=find, Q11=mkdir+cp, Q12=chmod 600, Q13=chmod u+x, Q14=top+ps|grep, Q15=kill+mv. Progression: $_prog. Aide sans donner la reponse directe. Sois concis (5-8 lignes). Pas de markdown. Français. Ton: professionnel, efficace."

    # Encoder en JSON minimal
    _sys_json=$(printf '%s' "$_system" | python3 -c "import json,sys; print(json.dumps(sys.stdin.read()))" 2>/dev/null)
    _msg_json=$(printf '%s' "$USER_MSG" | python3 -c "import json,sys; print(json.dumps(sys.stdin.read()))" 2>/dev/null)

    if [ -z "$_sys_json" ] || [ -z "$_msg_json" ]; then
        p "${MAGENTA}|${NC}  python3 indisponible. ECHO hors ligne."
        p "${MAGENTA}+------------------------------------${NC}"
        return
    fi

    _response=$(curl -s --max-time 15 \
        -H "Content-Type: application/json" \
        -H "anthropic-version: 2023-06-01" \
        https://api.anthropic.com/v1/messages \
        -d "{\"model\":\"claude-haiku-4-5-20251001\",\"max_tokens\":400,\"system\":${_sys_json},\"messages\":[{\"role\":\"user\",\"content\":${_msg_json}}]}" 2>/dev/null)

    _text=$(printf '%s' "$_response" | python3 -c "
import json,sys
try:
    d=json.load(sys.stdin)
    print(d['content'][0]['text'])
except:
    print('Signal brouille. Consultez MISSION ou vos notes.')
" 2>/dev/null)

    [ -z "$_text" ] && _text="Signal brouille. Verifiez la connexion ou consultez MISSION."

    p ""
    printf '%s\n' "$_text" | while IFS= read -r _line; do
        p "${MAGENTA}|${NC}  $_line"
    done
    p "${MAGENTA}|${NC}"
    p "${MAGENTA}+--[ Fin de transmission ]-----------${NC}"
    p ""
}

# ============================================================
# MISSION
# ============================================================
MISSION() {
    banner
    p "${YELLOW}+============================================================+${NC}"
    p "${YELLOW}|       DOSSIER DE MISSION : OPERATION MIRAGE                |${NC}"
    p "${YELLOW}+============================================================+${NC}"
    p ""
    p "  ${DIM}Bloque ? Tapez ${MAGENTA}AGENT${DIM} pour contacter ECHO.${NC}"
    p ""

    p "${CYAN}${BOLD}[Q1]  Orientation -- Ou etes-vous ?${NC}"
    p "  Affichez le chemin complet de votre repertoire actuel."
    p ""

    p "${CYAN}${BOLD}[Q2]  Exploration -- Premiers pas${NC}"
    p "  Listez le contenu de ${BOLD}~/infiltration_mirage/serveur/${NC}."
    p ""

    p "${CYAN}${BOLD}[Q3]  Documentation -- Le manuel de ls${NC}"
    p "  Consultez ${YELLOW}man ls${NC} et trouvez l'option pour voir les fichiers caches."
    p "  Quittez avec ${YELLOW}q${NC}, puis tapez ${YELLOW}Q3${NC}."
    p ""

    p "${CYAN}${BOLD}[Q4]  Infiltration -- Fichiers caches${NC}"
    p "  Listez ${BOLD}serveur/${NC} avec tous les details et les fichiers caches."
    p "  Indice : combinez ${YELLOW}-l${NC} et ${YELLOW}-a${NC}"
    p ""

    p "${CYAN}${BOLD}[Q5]  Navigation -- Penetrez la base${NC}"
    p "  Deplacez-vous dans ${BOLD}~/infiltration_mirage/serveur/${NC}"
    p ""

    p "${CYAN}${BOLD}[Q6]  Lecture -- Premier contact${NC}"
    p "  Affichez le contenu de ${BOLD}message_secret.txt${NC}"
    p "  (situe dans ~/infiltration_mirage/)"
    p ""

    p "${CYAN}${BOLD}[Q7]  Analyse -- Le pipe | (outil cle)${NC}"
    p "  Le journal ${BOLD}serveur/logs/access.log${NC} contient des traces."
    p "  Filtrez les lignes contenant ${BOLD}Transfert${NC} avec cat et grep."
    p "  ${DIM}Indice : cat fichier | grep mot${NC}"
    p ""

    p "${CYAN}${BOLD}[Q8]  Renseignement -- Traque dans l'historique${NC}"
    p "  Reutilisez le pipe pour chercher ${BOLD}passwd${NC} dans l'historique."
    p "  ${DIM}Meme principe : history | grep ...${NC}"
    p ""

    p "${CYAN}${BOLD}[Q9]  Presence -- Laissez votre empreinte${NC}"
    p "  Creez un fichier vide ${BOLD}agent.log${NC} dans ~/infiltration_mirage/serveur/"
    p ""

    p "${CYAN}${BOLD}[Q10] Localisation -- Rapport confidentiel${NC}"
    p "  Trouvez tous les fichiers ${BOLD}rapport.txt${NC} dans toute l'arborescence."
    p ""

    p "${CYAN}${BOLD}[Q11] Exfiltration -- Copiez les donnees${NC}"
    p "  Creez un dossier ${BOLD}exfiltration/${NC} dans serveur/, puis copiez-y rapport.txt"
    p ""

    p "${CYAN}${BOLD}[Q12] Securisation -- Verrouillez votre butin${NC}"
    p "  Droits ${BOLD}600${NC} sur exfiltration/rapport.txt"
    p "  (lecture/ecriture pour vous seul)"
    p ""

    p "${CYAN}${BOLD}[Q13] Preparation -- Armez le script${NC}"
    p "  Rendez ${BOLD}effacer_traces.sh${NC} executable pour son proprietaire."
    p ""

    p "${CYAN}${BOLD}[Q14] Surveillance -- Repérez l'espion${NC}"
    p "  Lancez ${YELLOW}top${NC}, repérez ${BOLD}espion_mirage${NC}, quittez avec ${YELLOW}q${NC}."
    p "  Puis trouvez son PID : ${YELLOW}ps aux | grep espion_mirage${NC}"
    p "  Tapez ${YELLOW}Q14${NC} quand vous avez le PID."
    p ""

    p "${CYAN}${BOLD}[Q15] Conclusion -- Neutralisez et camouflez${NC}"
    p "  Tuez espion_mirage avec ${YELLOW}kill <PID>${NC}."
    p "  Puis renommez ${BOLD}exfiltration/rapport.txt${NC} en ${BOLD}notes_vacances.txt${NC}."
    p ""
}

# ============================================================
# SETUP
# ============================================================
setup_tp() {
    p "${YELLOW}[SETUP] Initialisation du serveur...${NC}"

    rm -rf "$TP_DIR"
    mkdir -p "$TP_DIR/serveur/confidentiel"
    mkdir -p "$TP_DIR/serveur/public"
    mkdir -p "$TP_DIR/serveur/logs"

    echo "Acces refuse. Identifiez-vous." > "$TP_DIR/serveur/acces.txt"

    cat > "$TP_DIR/serveur/confidentiel/rapport.txt" << 'RAPPORT'
RAPPORT CONFIDENTIEL -- Operation Mirage
Niveau : SECRET DEFENSE
Auteur : Agent X
Coordonnees : 48.8566 N, 2.3522 E
Cle : MIRAGE-2024-ALPHA
Ce fichier ne doit pas quitter le serveur.
RAPPORT

    echo "Serveur public MIRAGE." > "$TP_DIR/serveur/public/index.html"

    cat > "$TP_DIR/serveur/logs/access.log" << 'LOG'
2024-01-15 08:23:11 - Connexion root depuis 192.168.1.1
2024-01-15 09:11:42 - Tentative acces refusee depuis 10.0.0.42
2024-01-15 09:45:00 - Lecture fichier config.sys
2024-01-15 10:00:01 - Transfert fichier rapport.txt vers 10.0.0.99
2024-01-15 10:00:03 - Deconnexion
2024-01-15 11:30:17 - Connexion admin depuis 192.168.1.1
LOG

    cat > "$TP_DIR/serveur/effacer_traces.sh" << 'SCRIPT'
#!/bin/sh
echo "Traces effacees."
SCRIPT
    chmod 644 "$TP_DIR/serveur/effacer_traces.sh"

    cat > "$TP_DIR/serveur/.fichier_cache" << 'CACHE'
ECHO : Bien. Vous savez voir ce que les autres ignorent.
Prochaine etape : penetrez plus profond.
CACHE

    cat > "$TP_DIR/message_secret.txt" << 'MSG'
[TRANSMISSION DECHIFFREE -- AGENT ECHO]
Serveur MIRAGE operationnel depuis 72h.
Cible : dossier confidentiel/
Des traces d'exfiltration recente dans serveur/logs/access.log
Mot de passe : M1r4g3_2024
MSG

    echo "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0" > "$TP_DIR/.progression"

    # Lancer le processus espion (POSIX)
    # Tuer une instance precedente si elle existe
    _old_pid=$(_espion_pid)
    if [ -n "$_old_pid" ]; then
        kill "$_old_pid" 2>/dev/null
        sleep 1
    fi

    # Creer et lancer le script espion
    cat > /tmp/espion_mirage.sh << 'ESPION'
#!/bin/sh
# espion_mirage - surveillance fictive NSI
while true; do sleep 30; done
ESPION
    chmod +x /tmp/espion_mirage.sh

    # Le lancer avec un nom reconnaissable dans ps
    sh /tmp/espion_mirage.sh &
    _espion_launched=$!
    echo "$_espion_launched" > "$TP_DIR/.espion_pid"

    p "${GREEN}[OK] Serveur initialise dans ${TP_DIR}/${NC}"
    p ""
}

# ============================================================
# VERIFICATEURS
# ============================================================

Q1() {
    p "${BOLD}[Q1]  Orientation${NC}"
    p "  Repertoire courant : ${CYAN}${BOLD}$PWD${NC}"
    p "  ${DIM}La commande pwd affiche le chemin absolu.${NC}"
    verif_ok "Commande pwd executee."
    _marquer 1
}

Q2() {
    p "${BOLD}[Q2]  Exploration${NC}"
    if [ -d "$TP_DIR/serveur" ]; then
        verif_ok "Dossier serveur/ accessible."
        p "  ${DIM}Commande : ls ~/infiltration_mirage/serveur/${NC}"
        p "  ${DIM}Fichiers visibles :${NC}"
        ls "$TP_DIR/serveur/" | sed 's/^/    /'
        p "  ${DIM}Note : des fichiers sont caches (Q4 les revelera).${NC}"
        _marquer 2
    else
        verif_err "Dossier serveur/ inaccessible." "Relancez : . ~/tp_infiltration.sh"
    fi
}

Q3() {
    p "${BOLD}[Q3]  Documentation -- man ls${NC}"
    p "  ${DIM}Commande : man ls${NC}"
    p "  ${DIM}Naviguez avec Espace, cherchez avec /motif, quittez avec q.${NC}"
    p ""
    p "  ${CYAN}Reponse :${NC} L'option ${YELLOW}-a${NC} (--all) affiche les fichiers caches"
    p "  (ceux dont le nom commence par un point)."
    verif_ok "Valide. Option -a identifiee."
    _marquer 3
}

Q4() {
    p "${BOLD}[Q4]  Infiltration -- Fichiers caches${NC}"
    if [ -f "$TP_DIR/serveur/.fichier_cache" ]; then
        verif_ok "Fichier cache .fichier_cache present dans serveur/."
        p "  ${DIM}Commande : ls -la ~/infiltration_mirage/serveur/${NC}"
        p ""
        p "  ${CYAN}Message dans le fichier cache :${NC}"
        cat "$TP_DIR/serveur/.fichier_cache" | sed 's/^/    /'
        _marquer 4
    else
        verif_err "Fichier cache absent." "Relancez : . ~/tp_infiltration.sh"
    fi
}

Q5() {
    p "${BOLD}[Q5]  Navigation${NC}"
    if [ "$PWD" = "$TP_DIR/serveur" ]; then
        verif_ok "Vous etes dans ~/infiltration_mirage/serveur/"
        _marquer 5
    else
        verif_err "Mauvais repertoire (actuel : $PWD)" \
                  "Commande : cd ~/infiltration_mirage/serveur/"
    fi
}

Q6() {
    p "${BOLD}[Q6]  Lecture${NC}"
    if [ -f "$TP_DIR/message_secret.txt" ]; then
        verif_ok "message_secret.txt lu."
        p "  ${DIM}Commande : cat ~/infiltration_mirage/message_secret.txt${NC}"
        p ""
        p "  ${CYAN}Contenu :${NC}"
        cat "$TP_DIR/message_secret.txt" | sed 's/^/    /'
        _marquer 6
    else
        verif_err "message_secret.txt introuvable." "Verifiez avec : pwd"
    fi
}

Q7() {
    p "${BOLD}[Q7]  Analyse -- Le pipe |${NC}"
    p ""
    p "  ${CYAN}=== Comprendre le pipe | ===${NC}"
    p "  Le pipe ${YELLOW}|${NC} prend la sortie d'une commande"
    p "  et la donne en entree a la suivante."
    p ""
    p "  Sans pipe : cat access.log     -> affiche TOUT"
    p "  Avec pipe : cat access.log | grep Transfert -> filtre"
    p ""
    p "  ${CYAN}Commande :${NC}"
    p "  ${YELLOW}cat ~/infiltration_mirage/serveur/logs/access.log | grep Transfert${NC}"
    p ""
    p "  ${CYAN}Resultat :${NC}"
    cat "$TP_DIR/serveur/logs/access.log" | grep "Transfert" | sed 's/^/    /'
    p ""
    p "  ${DIM}-> Quelqu'un a exfiltre rapport.txt vers une IP externe !${NC}"
    verif_ok "Valide. Pipe | et grep maitrises."
    _marquer 7
}

Q8() {
    p "${BOLD}[Q8]  Renseignement -- Pipe sur l'historique${NC}"
    p ""
    p "  ${DIM}Meme principe qu'en Q7 : history | grep passwd${NC}"
    p ""
    p "  ${CYAN}Resultat sur votre session :${NC}"
    _hist=$(history | grep passwd 2>/dev/null)
    if [ -n "$_hist" ]; then
        echo "$_hist" | sed 's/^/    /'
    else
        p "    (aucun resultat -- normal si vous n'avez pas tape passwd)"
        p "    Dans un vrai scenario on trouverait :"
        p "    '  42  mysql -u root -pmonpasswd'"
    fi
    p ""
    p "  ${DIM}Le pipe fonctionne avec n'importe quel flux de texte.${NC}"
    verif_ok "Valide. history | grep maitrise."
    _marquer 8
}

Q9() {
    p "${BOLD}[Q9]  Presence -- Empreinte${NC}"
    if [ -f "$TP_DIR/serveur/agent.log" ]; then
        verif_ok "agent.log cree dans serveur/."
        _marquer 9
    else
        verif_err "agent.log absent." \
                  "Commande : touch ~/infiltration_mirage/serveur/agent.log"
    fi
}

Q10() {
    p "${BOLD}[Q10] Localisation -- find${NC}"
    _found=$(find "$TP_DIR" -name "rapport.txt" 2>/dev/null | grep -v "exfiltration")
    if [ -n "$_found" ]; then
        verif_ok "rapport.txt localise :"
        echo "$_found" | sed 's/^/    /'
        p "  ${DIM}Commande : find ~/infiltration_mirage/ -name rapport.txt${NC}"
        p "  ${DIM}find cherche recursivement -- contrairement a ls.${NC}"
        _marquer 10
    else
        verif_err "rapport.txt introuvable." \
                  "Commande : find ~/infiltration_mirage/ -name rapport.txt"
    fi
}

Q11() {
    p "${BOLD}[Q11] Exfiltration -- mkdir + cp${NC}"
    _err=""
    [ ! -d "$TP_DIR/serveur/exfiltration" ] && _err="dossier"
    [ ! -f "$TP_DIR/serveur/exfiltration/rapport.txt" ] && _err="${_err}+fichier"

    if [ -z "$_err" ]; then
        verif_ok "Dossier exfiltration/ cree et rapport.txt copie."
        _marquer 11
    elif [ "$_err" = "dossier+fichier" ]; then
        verif_err "Dossier exfiltration/ manquant." \
                  "Etape 1 : mkdir ~/infiltration_mirage/serveur/exfiltration"
    else
        verif_err "Dossier present mais rapport.txt absent." \
                  "cp ~/infiltration_mirage/serveur/confidentiel/rapport.txt ~/infiltration_mirage/serveur/exfiltration/"
    fi
}

Q12() {
    p "${BOLD}[Q12] Securisation -- chmod 600${NC}"
    _t="$TP_DIR/serveur/exfiltration/rapport.txt"
    if [ ! -f "$_t" ]; then
        verif_err "exfiltration/rapport.txt manquant." "Completez Q11 d'abord."
        return
    fi
    _p=$(_get_perms "$_t")
    if [ "$_p" = "600" ]; then
        p "  ${DIM}600 = rw------- : User(6=rw) Group(0=---) Others(0=---)${NC}"
        verif_ok "Droits 600 appliques. Fichier protege."
        _marquer 12
    else
        verif_err "Droits actuels : ${_p} -- attendu : 600." \
                  "chmod 600 ~/infiltration_mirage/serveur/exfiltration/rapport.txt"
    fi
}

Q13() {
    p "${BOLD}[Q13] Preparation -- chmod u+x${NC}"
    _t="$TP_DIR/serveur/effacer_traces.sh"
    if [ ! -f "$_t" ]; then
        verif_err "effacer_traces.sh introuvable." \
                  "ls ~/infiltration_mirage/serveur/"
        return
    fi
    _p=$(_get_perms "$_t")
    # Extraire le chiffre des centaines (droits user)
    _u=$(echo "$_p" | cut -c1)
    # Bit x = 1 ou 3 ou 5 ou 7 (impair ou >=1 avec x)
    # Plus simple : tester si le fichier est executable par le proprietaire
    if [ -x "$_t" ]; then
        verif_ok "effacer_traces.sh executable (droits : $_p)."
        p "  ${DIM}u+x : ajouter(+) execution(x) au proprietaire(u).${NC}"
        _marquer 13
    else
        verif_err "Pas executable (droits : $_p)." \
                  "chmod u+x ~/infiltration_mirage/serveur/effacer_traces.sh"
    fi
}

Q14() {
    p "${BOLD}[Q14] Surveillance -- top + ps${NC}"
    _pid=$(_espion_pid)
    if [ -n "$_pid" ]; then
        p "  ${DIM}Etape 1 : top  (puis q pour quitter)${NC}"
        p "  ${DIM}Etape 2 : ps aux | grep espion_mirage${NC}"
        p ""
        verif_ok "Processus espion_mirage detecte. PID : ${RED}${BOLD}${_pid}${NC}"
        p "  ${DIM}Note : la ligne 'grep' apparait aussi -- ignorez-la.${NC}"
        _marquer 14
    else
        verif_err "espion_mirage ne tourne pas." \
                  "Relancez le TP : . ~/tp_infiltration.sh"
    fi
}

Q15() {
    p "${BOLD}[Q15] Conclusion -- kill + mv${NC}"
    _espion_ok=0
    _rename_ok=0
    _new="$TP_DIR/serveur/exfiltration/notes_vacances.txt"
    _old="$TP_DIR/serveur/exfiltration/rapport.txt"

    _espion_alive || _espion_ok=1
    [ -f "$_new" ] && _rename_ok=1

    if [ "$_espion_ok" = "1" ] && [ "$_rename_ok" = "1" ]; then
        verif_ok "Espion neutralise + fichier renomme. MISSION ACCOMPLIE !"
        _marquer 15
    else
        if [ "$_espion_ok" = "0" ]; then
            _pid=$(_espion_pid)
            verif_err "Espion toujours actif (PID : $_pid)." \
                      "kill $_pid   (ou : kill -9 $_pid)"
        else
            p "  ${GREEN}OK${NC}  Espion neutralise."
        fi
        if [ "$_rename_ok" = "0" ]; then
            if [ -f "$_old" ]; then
                verif_err "rapport.txt pas encore renomme." \
                          "mv .../exfiltration/rapport.txt .../exfiltration/notes_vacances.txt"
            else
                verif_err "rapport.txt absent d'exfiltration/." "Completez Q11 d'abord."
            fi
        else
            p "  ${GREEN}OK${NC}  Fichier renomme en notes_vacances.txt."
        fi
    fi
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
    if [ ! -f "$_f" ]; then
        p "  Aucune progression."
        return
    fi

    _total=0
    _i=1
    # Labels numerotes pour awk
    while [ "$_i" -le 15 ]; do
        _v=$(_get_field "$(cat "$_f")" "$_i")
        case "$_i" in
            1)  _label="pwd -- Repertoire courant" ;;
            2)  _label="ls -- Lister le serveur" ;;
            3)  _label="man ls -- Documentation" ;;
            4)  _label="ls -la -- Fichiers caches" ;;
            5)  _label="cd -- Navigation" ;;
            6)  _label="cat -- Lecture fichier" ;;
            7)  _label="cat | grep -- Introduction pipe" ;;
            8)  _label="history | grep -- Pipe historique" ;;
            9)  _label="touch -- Fichier vide" ;;
            10) _label="find -- Localisation" ;;
            11) _label="mkdir + cp -- Exfiltration" ;;
            12) _label="chmod 600 -- Droits restrictifs" ;;
            13) _label="chmod u+x -- Script executable" ;;
            14) _label="top + ps -- Reperage PID" ;;
            15) _label="kill + mv -- Conclusion" ;;
        esac
        if [ "$_v" = "1" ]; then
            printf "  ${GREEN}OK${NC}  Q%-2s -- %s\n" "$_i" "$_label"
            _total=$((_total + 1))
        else
            printf "  ${RED}--${NC}  Q%-2s -- %s\n" "$_i" "$_label"
        fi
        _i=$((_i + 1))
    done
    p ""
    p "  Score : ${BOLD}${_total}/${NB_Q}${NC}"
    if [ "$_total" -eq "$NB_Q" ]; then
        p ""
        p "  ${GREEN}${BOLD}MISSION ACCOMPLIE -- Operation MIRAGE terminee.${NC}"
        p "  ${DIM}ECHO : Travail remarquable, agent.${NC}"
    elif [ "$_total" -ge 10 ]; then
        p "  ${YELLOW}ECHO : Bon travail. Plus que $(($NB_Q - $_total)) objectifs.${NC}"
    else
        p "  ${DIM}ECHO : Continuez. Tapez MISSION pour revoir les objectifs.${NC}"
    fi
    p ""
}

# ============================================================
# INIT
# ============================================================
_init_tp() {
    intro
    p "${YELLOW}[SETUP] Preparation...${NC}"
    setup_tp
    p "${GREEN}${BOLD}TP pret !${NC}"
    p "   ${CYAN}${BOLD}MISSION${NC} -> afficher les 15 questions"
    p "   ${CYAN}${BOLD}STATUT${NC}  -> voir votre progression"
    p "   ${MAGENTA}${BOLD}AGENT${NC}   -> contacter ECHO"
    p ""
}

_init_tp
