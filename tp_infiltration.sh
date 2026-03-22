#!/bin/bash
# ============================================================
#   TP NSI - INFILTRATION : Opération Mirage  v3.0
#   Terminale NSI - Terminal Linux
#   15 questions progressives + Agent IA distant
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

# ============================================================
# BANNIERE
# ============================================================
banner() {
    clear
    echo -e "${RED}"
    cat << 'EOF'
 ██████╗ ██████╗ ███████╗██████╗  █████╗ ████████╗██╗ ██████╗ ███╗   ██╗
██╔═══██╗██╔══██╗██╔════╝██╔══██╗██╔══██╗╚══██╔══╝██║██╔═══██╗████╗  ██║
██║   ██║██████╔╝█████╗  ██████╔╝███████║   ██║   ██║██║   ██║██╔██╗ ██║
██║   ██║██╔═══╝ ██╔══╝  ██╔══██╗██╔══██║   ██║   ██║██║   ██║██║╚██╗██║
╚██████╔╝██║     ███████╗██║  ██║██║  ██║   ██║   ██║╚██████╔╝██║ ╚████║
 ╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   ╚═╝ ╚═════╝ ╚═╝  ╚═══╝
EOF
    echo -e "${YELLOW}               ~~~ Opération MIRAGE  v3.0 ~~~${NC}"
    echo -e "${DIM}         Terminale NSI — Travaux Pratiques Linux${NC}"
    echo ""
}

# ============================================================
# INTRO
# ============================================================
intro() {
    banner
    echo -e "${CYAN}${BOLD}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}${BOLD}║           [ TRANSMISSION CHIFFREE RECUE ]               ║${NC}"
    echo -e "${CYAN}${BOLD}╚══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "  Agent, vous avez reussi a penetrer le serveur du projet ${RED}${BOLD}MIRAGE${NC}."
    echo -e "  Ce serveur stocke des donnees sensibles que nous devons recuperer."
    echo ""
    echo -e "  Notre analyste ${MAGENTA}${BOLD}ECHO${NC} vous accompagne a distance."
    echo -e "  En cas de blocage, contactez-le avec la commande : ${MAGENTA}${BOLD}AGENT${NC}"
    echo ""
    echo -e "  ${YELLOW}⚠  Rappel legal :${NC} Cette operation est ${BOLD}fictive et locale${NC}."
    echo -e "  Dans la realite, l'acces non autorise a un systeme informatique"
    echo -e "  est un delit reprime par l'article 323-1 du Code Penal."
    echo ""
    echo -e "${DIM}  ──────────────────────────────────────────────────────────${NC}"
    echo ""
    echo -e "  Dossier de mission : ${CYAN}${BOLD}~/infiltration_mirage/${NC}"
    echo ""
    echo -e "  ${BOLD}Commandes disponibles :${NC}"
    printf "  ${GREEN}%-12s${NC} → Afficher toutes les questions\n" "MISSION"
    printf "  ${GREEN}%-12s${NC} → Verifier la question N (ex: Q1, Q7...)\n" "Q1 .. Q15"
    printf "  ${GREEN}%-12s${NC} → Voir votre progression\n" "STATUT"
    printf "  ${MAGENTA}%-12s${NC} → Contacter l'agent ECHO pour de l'aide\n" "AGENT"
    echo ""
}

# ============================================================
# AGENT DISTANT — appel API Claude
# ============================================================
AGENT() {
    # Construire le contexte de progression
    local F="$TP_DIR/.progression"
    local PROG_STR="inconnue"
    if [[ -f "$F" ]]; then
        read -ra P < "$F"
        local DONE=()
        local TODO=()
        for i in {0..14}; do
            if [[ "${P[$i]}" == "1" ]]; then DONE+=("Q$((i+1))"); else TODO+=("Q$((i+1))"); fi
        done
        PROG_STR="Questions reussies: ${DONE[*]:-aucune}. Questions restantes: ${TODO[*]}."
    fi

    echo ""
    echo -e "${MAGENTA}${BOLD}┌─[ AGENT ECHO — Ligne securisee ]${NC}"
    echo -e "${MAGENTA}│${NC}"
    echo -e "${MAGENTA}│${NC}  Entrez votre message pour ECHO (ou appuyez Entree pour aide generale) :"
    echo -e "${MAGENTA}│${NC}  ${DIM}(tapez 'fin' pour annuler)${NC}"
    printf "${MAGENTA}│${NC}  ${BOLD}> ${NC}"
    read USER_MSG

    if [[ "$USER_MSG" == "fin" ]]; then
        echo -e "${MAGENTA}│${NC}  Connexion fermee."
        echo -e "${MAGENTA}└─────────────────────────────────${NC}"
        echo ""
        return
    fi

    if [[ -z "$USER_MSG" ]]; then
        USER_MSG="Donne-moi une aide generale sur la question sur laquelle je suis bloque."
    fi

    echo -e "${MAGENTA}│${NC}"
    echo -e "${MAGENTA}│${NC}  ${DIM}Connexion a ECHO en cours...${NC}"

    # Construction du prompt système
    local SYSTEM_PROMPT="Tu es ECHO, un agent de renseignement expert en systèmes Linux qui aide un élève de Terminale NSI via une ligne sécurisée fictive. L'élève suit un TP de terminal Linux appelé Opération MIRAGE. Le contexte est un scénario fictif d'infiltration d'un serveur — purement pédagogique.

Voici les 15 questions du TP dans l'ordre :
Q1: pwd — afficher le répertoire courant
Q2: ls — lister le contenu du dossier infiltration_mirage/serveur/ sans options
Q3: man ls — consulter le manuel pour trouver l'option d'affichage des fichiers cachés (-a)
Q4: ls -la — lister avec fichiers cachés et détails dans serveur/
Q5: cd — se déplacer dans serveur/
Q6: cat — lire le fichier message_secret.txt
Q7: cat + grep (pipe |) — filtrer le fichier access.log pour trouver les lignes contenant 'Transfert'. C'est l'INTRODUCTION DU PIPE : expliquer que | envoie la sortie d'une commande vers une autre.
Q8: history | grep passwd — réutiliser le pipe sur l'historique pour chercher un mot de passe
Q9: touch — créer un fichier vide agent.log dans serveur/
Q10: find — localiser rapport.txt dans toute l'arborescence
Q11: mkdir + cp — créer le dossier exfiltration/ et y copier rapport.txt
Q12: chmod 600 — droits restrictifs sur exfiltration/rapport.txt
Q13: chmod u+x — rendre effacer_traces.sh exécutable
Q14: top puis ps aux | grep — observer les processus, trouver le PID de espion_mirage
Q15: kill + mv — tuer le processus espion et renommer rapport.txt en notes_vacances.txt

Progression actuelle de l'élève : $PROG_STR

Ton rôle : aider l'élève à débloquer, expliquer les concepts de façon claire mais sans donner directement la réponse complète sauf si l'élève est vraiment bloqué. Adopte un ton de professionnel efficace, légèrement mystérieux, comme un agent de terrain — jamais condescendant. Tes réponses sont courtes (5-10 lignes max). Tu peux utiliser des métaphores de l'espionnage. Tu parles en français. N'utilise PAS de formatage markdown (pas de **, pas de #, pas de backticks) car tu parles dans un terminal."

    # Appel API Anthropic
    local RESPONSE
    RESPONSE=$(curl -s https://api.anthropic.com/v1/messages \
        -H "Content-Type: application/json" \
        -H "anthropic-version: 2023-06-01" \
        -d "{
            \"model\": \"claude-haiku-4-5-20251001\",
            \"max_tokens\": 400,
            \"system\": $(echo "$SYSTEM_PROMPT" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))'),
            \"messages\": [{
                \"role\": \"user\",
                \"content\": $(echo "$USER_MSG" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')
            }]
        }" 2>/dev/null)

    # Extraction du texte
    local TEXT
    TEXT=$(echo "$RESPONSE" | python3 -c "
import json,sys
try:
    d = json.load(sys.stdin)
    print(d['content'][0]['text'])
except:
    print('Signal brouille. Reessayez ou consultez vos notes de cours.')
" 2>/dev/null)

    if [[ -z "$TEXT" ]]; then
        TEXT="Signal brouille. Verifiez votre connexion ou consultez la commande MISSION."
    fi

    echo ""
    # Affichage formaté avec marge
    echo "$TEXT" | while IFS= read -r line; do
        echo -e "${MAGENTA}│${NC}  $line"
    done
    echo -e "${MAGENTA}│${NC}"
    echo -e "${MAGENTA}└─[ Fin de transmission ]─────────────${NC}"
    echo ""
}

# ============================================================
# MISSION — affichage des questions
# ============================================================
MISSION() {
    banner
    echo -e "${YELLOW}${BOLD}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}${BOLD}║              DOSSIER DE MISSION : OPERATION MIRAGE           ║${NC}"
    echo -e "${YELLOW}${BOLD}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "  ${DIM}En cas de blocage : tapez ${MAGENTA}AGENT${DIM} pour contacter ECHO.${NC}"
    echo ""

    echo -e "${CYAN}${BOLD}[Q1]  Orientation — Ou etes-vous ?${NC}"
    echo -e "  Affichez le chemin complet de votre repertoire actuel."
    echo ""

    echo -e "${CYAN}${BOLD}[Q2]  Exploration — Premiers pas${NC}"
    echo -e "  Listez le contenu du dossier ${BOLD}~/infiltration_mirage/serveur/${NC}."
    echo -e "  Commande de base, sans options particulieres."
    echo ""

    echo -e "${CYAN}${BOLD}[Q3]  Documentation — Le manuel, votre meilleur allie${NC}"
    echo -e "  Utilisez ${YELLOW}man${NC} pour consulter la page de manuel de ${BOLD}ls${NC}."
    echo -e "  Trouvez quelle option permet de voir les fichiers caches (commencant par un point)."
    echo -e "  Quittez le manuel avec ${YELLOW}q${NC}, puis tapez ${YELLOW}Q3${NC} pour valider."
    echo ""

    echo -e "${CYAN}${BOLD}[Q4]  Infiltration — Fichiers caches${NC}"
    echo -e "  Maintenant que vous connaissez l'option (trouvee en Q3), listez le contenu de"
    echo -e "  ${BOLD}~/infiltration_mirage/serveur/${NC} avec ${BOLD}tous les details${NC} et les fichiers caches."
    echo ""

    echo -e "${CYAN}${BOLD}[Q5]  Navigation — Penetrez la base${NC}"
    echo -e "  Deplacez-vous dans le dossier ${BOLD}serveur/${NC} situe dans ~/infiltration_mirage/"
    echo ""

    echo -e "${CYAN}${BOLD}[Q6]  Lecture — Premier contact${NC}"
    echo -e "  Affichez le contenu du fichier ${BOLD}message_secret.txt${NC}"
    echo -e "  situe a la racine de ~/infiltration_mirage/"
    echo ""

    echo -e "${CYAN}${BOLD}[Q7]  Analyse — Le pipe | (outil clé)${NC}"
    echo -e "  Le journal ${BOLD}serveur/logs/access.log${NC} contient des traces d'activite."
    echo -e "  Affichez ce fichier avec ${YELLOW}cat${NC}, puis filtrez les lignes contenant"
    echo -e "  le mot ${BOLD}Transfert${NC} grace a ${YELLOW}grep${NC}."
    echo -e "  ${DIM}Indice : combinez les deux avec un pipe : cat fichier | grep mot${NC}"
    echo ""

    echo -e "${CYAN}${BOLD}[Q8]  Renseignement — Traque dans l'historique${NC}"
    echo -e "  Reutilisez le pipe | pour chercher la chaine ${BOLD}passwd${NC}"
    echo -e "  dans l'historique des commandes (${YELLOW}history${NC})."
    echo -e "  ${DIM}Meme principe qu'en Q7 : history | grep ...${NC}"
    echo ""

    echo -e "${CYAN}${BOLD}[Q9]  Presence — Laissez votre empreinte${NC}"
    echo -e "  Creez un fichier vide nomme ${BOLD}agent.log${NC} dans ~/infiltration_mirage/serveur/"
    echo ""

    echo -e "${CYAN}${BOLD}[Q10] Localisation — Trouvez le rapport confidentiel${NC}"
    echo -e "  Trouvez tous les fichiers nommes ${BOLD}rapport.txt${NC} dans toute"
    echo -e "  l'arborescence de ~/infiltration_mirage/"
    echo ""

    echo -e "${CYAN}${BOLD}[Q11] Exfiltration — Copiez les donnees${NC}"
    echo -e "  Creez un dossier ${BOLD}exfiltration/${NC} dans serveur/, puis copiez-y rapport.txt"
    echo ""

    echo -e "${CYAN}${BOLD}[Q12] Securisation — Verrouillez votre butin${NC}"
    echo -e "  Donnez les droits ${BOLD}600${NC} au fichier exfiltration/rapport.txt"
    echo -e "  (lecture/ecriture pour vous seul — rien pour les autres)"
    echo ""

    echo -e "${CYAN}${BOLD}[Q13] Preparation — Armez le script d'effacement${NC}"
    echo -e "  Le fichier ${BOLD}effacer_traces.sh${NC} existe dans serveur/."
    echo -e "  Rendez-le executable pour son proprietaire uniquement."
    echo ""

    echo -e "${CYAN}${BOLD}[Q14] Surveillance — Repérez et identifiez l'espion${NC}"
    echo -e "  Lancez ${YELLOW}top${NC} pour observer les processus. Repérez ${BOLD}espion_mirage${NC}."
    echo -e "  Quittez avec ${YELLOW}q${NC}, puis trouvez son PID avec ${YELLOW}ps aux | grep espion_mirage${NC}."
    echo -e "  Tapez ${YELLOW}Q14${NC} quand vous avez trouve le PID."
    echo ""

    echo -e "${CYAN}${BOLD}[Q15] Conclusion — Neutralisez et camoflez${NC}"
    echo -e "  Tuez le processus espion_mirage avec ${YELLOW}kill <PID>${NC}."
    echo -e "  Puis renommez ${BOLD}exfiltration/rapport.txt${NC} en ${BOLD}notes_vacances.txt${NC}."
    echo ""
}

# ============================================================
# SETUP
# ============================================================
setup_tp() {
    echo -e "${YELLOW}[SETUP] Initialisation du serveur infiltre...${NC}"

    rm -rf "$TP_DIR"
    mkdir -p "$TP_DIR"
    mkdir -p "$TP_DIR/serveur/confidentiel"
    mkdir -p "$TP_DIR/serveur/public"
    mkdir -p "$TP_DIR/serveur/logs"

    echo "Acces refuse. Identifiez-vous." > "$TP_DIR/serveur/acces.txt"

    cat > "$TP_DIR/serveur/confidentiel/rapport.txt" << 'RAPPORT'
RAPPORT CONFIDENTIEL — Operation Mirage
Niveau : SECRET DEFENSE
Auteur : Agent X
Contenu : Les coordonnees du serveur principal sont 48.8566 N, 2.3522 E.
Cle de chiffrement : MIRAGE-2024-ALPHA
Ce fichier ne doit pas quitter le serveur.
RAPPORT

    echo "Bienvenue sur le serveur public du projet MIRAGE." \
        > "$TP_DIR/serveur/public/index.html"

    # Log avec une ligne contenant "Transfert" pour Q7
    cat > "$TP_DIR/serveur/logs/access.log" << 'LOG'
2024-01-15 08:23:11 - Connexion root depuis 192.168.1.1
2024-01-15 09:11:42 - Tentative acces refusee depuis 10.0.0.42
2024-01-15 09:45:00 - Lecture fichier config.sys
2024-01-15 10:00:01 - Transfert fichier rapport.txt vers 10.0.0.99
2024-01-15 10:00:03 - Deconnexion
2024-01-15 11:30:17 - Connexion admin depuis 192.168.1.1
LOG

    cat > "$TP_DIR/serveur/effacer_traces.sh" << 'SCRIPT'
#!/bin/bash
echo "Traces effacees. Bonne chance pour les retrouver."
SCRIPT
    chmod 644 "$TP_DIR/serveur/effacer_traces.sh"

    # Fichier cache — recompense pour Q4
    cat > "$TP_DIR/serveur/.fichier_cache" << 'CACHE'
AGENT ECHO : Excellent. Vous savez maintenant lire ce que les autres ne voient pas.
Prochaine etape : penetrez plus profond dans le systeme.
CACHE

    # Message secret pour Q6
    cat > "$TP_DIR/message_secret.txt" << 'MSG'
[TRANSMISSION DECHIFFREE — AGENT ECHO]
Le serveur MIRAGE est operationnel depuis 72h.
Votre cible principale : le dossier confidentiel/
Des traces d'une exfiltration recente figurent dans serveur/logs/access.log
Analysez ce journal. Mot de passe de secours : M1r4g3_2024
MSG

    echo "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0" > "$TP_DIR/.progression"

    # Processus espion inoffensif
    pkill -f "espion_mirage" 2>/dev/null
    sleep 1
    cat > /tmp/espion_mirage << 'ESPION'
#!/bin/bash
# espion_mirage - processus de surveillance fictif NSI
while true; do sleep 30; done
ESPION
    chmod +x /tmp/espion_mirage
    /tmp/espion_mirage &
    echo $! > "$TP_DIR/.espion_pid"

    echo -e "${GREEN}[OK] Serveur initialise dans ${TP_DIR}/${NC}"
    echo ""
}

# ============================================================
# HELPERS
# ============================================================
verif_ok() {
    echo -e "  ${GREEN}✔  SUCCES :${NC} $1"
}
verif_err() {
    echo -e "  ${RED}✘  ECHEC  :${NC} $1"
    echo -e "  ${YELLOW}   Indice :${NC} $2"
    echo -e "  ${DIM}   Besoin d'aide ? Tapez : ${MAGENTA}AGENT${NC}"
}

_marquer() {
    local Q=$1
    local F="$TP_DIR/.progression"
    [[ ! -f "$F" ]] && echo "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0" > "$F"
    local P; read -ra P < "$F"
    P[$((Q-1))]=1
    echo "${P[@]}" > "$F"
}

_deja_fait() {
    local Q=$1
    local F="$TP_DIR/.progression"
    [[ ! -f "$F" ]] && return 1
    local P; read -ra P < "$F"
    [[ "${P[$((Q-1))]}" == "1" ]]
}

# ============================================================
# VERIFICATEURS
# ============================================================

Q1() {
    echo -e "${BOLD}[Q1]  Orientation${NC}"
    echo -e "  Votre repertoire courant : ${CYAN}${BOLD}$PWD${NC}"
    echo -e "  ${DIM}La commande pwd affiche le chemin absolu du repertoire courant.${NC}"
    verif_ok "Commande pwd executee."
    _marquer 1
}

Q2() {
    echo -e "${BOLD}[Q2]  Exploration — Premiers pas${NC}"
    if ls "$TP_DIR/serveur/" > /dev/null 2>&1; then
        verif_ok "Le dossier serveur/ est accessible et lisible."
        echo -e "  ${DIM}Commande : ls ~/infiltration_mirage/serveur/${NC}"
        echo -e "  ${DIM}Fichiers visibles :${NC}"
        ls "$TP_DIR/serveur/" | sed 's/^/    /'
        echo -e "  ${DIM}Note : certains fichiers sont caches (Q4 vous les revelera).${NC}"
        _marquer 2
    else
        verif_err "Le dossier serveur/ est inaccessible." \
                  "Relancez le TP : source ~/tp_infiltration.sh"
    fi
}

Q3() {
    echo -e "${BOLD}[Q3]  Documentation — Manuel de ls${NC}"
    echo -e "  ${DIM}Commande : man ls${NC}"
    echo -e "  ${DIM}Navigation : Espace pour avancer, q pour quitter.${NC}"
    echo ""
    echo -e "  ${CYAN}Reponse :${NC} L'option ${YELLOW}-a${NC} (ou ${YELLOW}--all${NC}) affiche tous les fichiers,"
    echo -e "  y compris ceux commencant par un point (les fichiers dits \"caches\")."
    echo ""
    echo -e "  ${DIM}Astuce dans man : appuyez sur ${YELLOW}/${NC}${DIM} puis tapez un mot pour chercher dedans.${NC}"
    verif_ok "Valide. Option -a identifiee dans le manuel de ls."
    _marquer 3
}

Q4() {
    echo -e "${BOLD}[Q4]  Infiltration — Fichiers caches${NC}"
    if [[ -f "$TP_DIR/serveur/.fichier_cache" ]]; then
        verif_ok "Le fichier cache .fichier_cache est bien present dans serveur/."
        echo -e "  ${DIM}Commande : ls -la ~/infiltration_mirage/serveur/${NC}"
        echo ""
        echo -e "  ${CYAN}Message de ECHO dans le fichier cache :${NC}"
        cat "$TP_DIR/serveur/.fichier_cache" | sed 's/^/    /'
        _marquer 4
    else
        verif_err "Fichier cache introuvable." \
                  "Relancez le TP : source ~/tp_infiltration.sh"
    fi
}

Q5() {
    echo -e "${BOLD}[Q5]  Navigation — Penetrez la base${NC}"
    if [[ "$PWD" == "$TP_DIR/serveur" ]]; then
        verif_ok "Vous etes bien dans ~/infiltration_mirage/serveur/"
        _marquer 5
    else
        verif_err "Vous n'etes pas dans serveur/ (position actuelle : $PWD)" \
                  "Commande : cd ~/infiltration_mirage/serveur/"
    fi
}

Q6() {
    echo -e "${BOLD}[Q6]  Lecture — Premier contact${NC}"
    if [[ -f "$TP_DIR/message_secret.txt" ]]; then
        verif_ok "Fichier message_secret.txt lu avec succes."
        echo -e "  ${DIM}Commande : cat ~/infiltration_mirage/message_secret.txt${NC}"
        echo ""
        echo -e "  ${CYAN}Contenu :${NC}"
        cat "$TP_DIR/message_secret.txt" | sed 's/^/    /'
        _marquer 6
    else
        verif_err "Fichier message_secret.txt introuvable." \
                  "Verifiez votre position avec pwd"
    fi
}

Q7() {
    echo -e "${BOLD}[Q7]  Analyse — Le pipe |${NC}"
    echo ""
    echo -e "  ${CYAN}${BOLD}=== Comprendre le pipe | ===${NC}"
    echo -e "  Le pipe ${YELLOW}|${NC} est un operateur fondamental du terminal Linux."
    echo -e "  Il prend la ${BOLD}sortie${NC} d'une commande et la donne en ${BOLD}entree${NC} a la suivante."
    echo ""
    echo -e "  ${DIM}Sans pipe : cat access.log  →  affiche TOUT le fichier${NC}"
    echo -e "  ${DIM}Avec pipe : cat access.log | grep Transfert  →  affiche UNIQUEMENT les lignes avec 'Transfert'${NC}"
    echo ""
    echo -e "  ${CYAN}Commande a executer :${NC}"
    echo -e "  ${YELLOW}cat ~/infiltration_mirage/serveur/logs/access.log | grep Transfert${NC}"
    echo ""
    echo -e "  ${CYAN}Resultat attendu :${NC}"
    cat "$TP_DIR/serveur/logs/access.log" | grep "Transfert" | sed 's/^/    /'
    echo ""
    echo -e "  ${DIM}On voit que quelqu'un a transfere rapport.txt vers une IP externe !${NC}"
    verif_ok "Valide. Vous maitrisez maintenant le pipe | et grep."
    _marquer 7
}

Q8() {
    echo -e "${BOLD}[Q8]  Renseignement — Traque dans l'historique${NC}"
    echo ""
    echo -e "  ${DIM}Meme principe qu'en Q7 : on pipe la sortie de history vers grep.${NC}"
    echo -e "  ${DIM}Commande : history | grep passwd${NC}"
    echo ""
    echo -e "  ${CYAN}Resultat de history | grep passwd sur votre session :${NC}"
    local HIST_RESULT
    HIST_RESULT=$(history | grep passwd 2>/dev/null)
    if [[ -n "$HIST_RESULT" ]]; then
        echo "$HIST_RESULT" | sed 's/^/    /'
    else
        echo "    (aucun resultat — vous n'avez pas encore tape de commande contenant 'passwd')"
        echo "    C'est normal ! Dans un vrai scenario, on cherche des commandes comme :"
        echo "    '  123  passwd monmotdepasse'  ou  '  45  mysql -u root -p monpasswd'"
    fi
    echo ""
    echo -e "  ${DIM}Le pipe permet de filtrer n'importe quel flux de texte.${NC}"
    verif_ok "Valide. Technique history | grep maitrisee."
    _marquer 8
}

Q9() {
    echo -e "${BOLD}[Q9]  Presence — Empreinte agent${NC}"
    if [[ -f "$TP_DIR/serveur/agent.log" ]]; then
        verif_ok "Fichier agent.log cree dans serveur/."
        _marquer 9
    else
        verif_err "Le fichier agent.log est absent de serveur/." \
                  "Commande : touch ~/infiltration_mirage/serveur/agent.log"
    fi
}

Q10() {
    echo -e "${BOLD}[Q10] Localisation — Rapport confidentiel${NC}"
    local FOUND
    FOUND=$(find "$TP_DIR" -name "rapport.txt" 2>/dev/null | grep -v "exfiltration")
    if [[ -n "$FOUND" ]]; then
        verif_ok "Le fichier rapport.txt a ete localise :"
        echo "$FOUND" | sed 's/^/    /'
        echo -e "  ${DIM}Commande : find ~/infiltration_mirage/ -name \"rapport.txt\"${NC}"
        echo -e "  ${DIM}find explore recursivement toute l'arborescence, contrairement a ls.${NC}"
        _marquer 10
    else
        verif_err "rapport.txt introuvable dans l'arborescence." \
                  "Commande : find ~/infiltration_mirage/ -name \"rapport.txt\""
    fi
}

Q11() {
    echo -e "${BOLD}[Q11] Exfiltration — Copie du rapport${NC}"
    local ERR=""
    [[ ! -d "$TP_DIR/serveur/exfiltration" ]] && ERR="dossier"
    [[ ! -f "$TP_DIR/serveur/exfiltration/rapport.txt" ]] && ERR="${ERR}+fichier"

    if [[ -z "$ERR" ]]; then
        verif_ok "Dossier exfiltration/ cree et rapport.txt copie."
        _marquer 11
    elif [[ "$ERR" == "dossier+fichier" ]]; then
        verif_err "Le dossier exfiltration/ n'existe pas encore." \
                  "Etape 1 : mkdir ~/infiltration_mirage/serveur/exfiltration"
    else
        verif_err "Le dossier existe mais rapport.txt n'y est pas." \
                  "Commande : cp ~/infiltration_mirage/serveur/confidentiel/rapport.txt ~/infiltration_mirage/serveur/exfiltration/"
    fi
}

Q12() {
    echo -e "${BOLD}[Q12] Securisation — Droits 600${NC}"
    local T="$TP_DIR/serveur/exfiltration/rapport.txt"
    if [[ ! -f "$T" ]]; then
        verif_err "exfiltration/rapport.txt n'existe pas encore." "Completez d'abord Q11."
        return
    fi
    local P; P=$(stat -c "%a" "$T" 2>/dev/null)
    if [[ "$P" == "600" ]]; then
        echo -e "  ${DIM}Rappel : 600 = rw------- = User(6=rw) Group(0=---) Others(0=---)${NC}"
        verif_ok "Droits 600 appliques. Seul vous pouvez lire ce fichier."
        _marquer 12
    else
        verif_err "Droits actuels : $P — attendu : 600." \
                  "Commande : chmod 600 ~/infiltration_mirage/serveur/exfiltration/rapport.txt"
    fi
}

Q13() {
    echo -e "${BOLD}[Q13] Preparation — Script executable${NC}"
    local T="$TP_DIR/serveur/effacer_traces.sh"
    if [[ ! -f "$T" ]]; then
        verif_err "effacer_traces.sh introuvable." \
                  "Verifiez : ls ~/infiltration_mirage/serveur/"
        return
    fi
    local P; P=$(stat -c "%a" "$T" 2>/dev/null)
    local UX=$(( (8#$P >> 6) & 1 ))
    if [[ "$UX" -eq 1 ]]; then
        verif_ok "effacer_traces.sh est executable par son proprietaire (droits : $P)."
        echo -e "  ${DIM}u+x signifie : ajouter (+) le droit d'execution (x) au proprietaire (u=user).${NC}"
        _marquer 13
    else
        verif_err "Pas executable par le proprietaire (droits : $P)." \
                  "Commande : chmod u+x ~/infiltration_mirage/serveur/effacer_traces.sh"
    fi
}

Q14() {
    echo -e "${BOLD}[Q14] Surveillance — Reperage de l'espion${NC}"
    if pgrep -f "espion_mirage" > /dev/null 2>&1; then
        local PID
        PID=$(pgrep -f "espion_mirage")
        echo -e "  ${DIM}Commandes a executer :${NC}"
        echo -e "  ${DIM}1. top  (puis q pour quitter)${NC}"
        echo -e "  ${DIM}2. ps aux | grep espion_mirage${NC}"
        echo ""
        verif_ok "Processus espion_mirage detecte. Son PID est : ${BOLD}${RED}$PID${NC}"
        echo -e "  ${DIM}Note : ps aux | grep cree aussi une ligne 'grep' — ignorez-la.${NC}"
        echo -e "  ${DIM}Pour ne voir que l'espion : pgrep -f espion_mirage${NC}"
        _marquer 14
    else
        verif_err "Le processus espion_mirage ne tourne pas." \
                  "Relancez le TP : source ~/tp_infiltration.sh"
    fi
}

Q15() {
    echo -e "${BOLD}[Q15] Conclusion — Neutralisation et camouflage${NC}"
    local ESPION_OK=false
    local RENAME_OK=false
    local NEW="$TP_DIR/serveur/exfiltration/notes_vacances.txt"
    local OLD="$TP_DIR/serveur/exfiltration/rapport.txt"

    pgrep -f "espion_mirage" > /dev/null 2>&1 || ESPION_OK=true
    [[ -f "$NEW" ]] && RENAME_OK=true

    if $ESPION_OK && $RENAME_OK; then
        verif_ok "Espion neutralise et fichier renomme. Mission accomplie !"
        _marquer 15
    else
        if ! $ESPION_OK; then
            local PID; PID=$(pgrep -f "espion_mirage" 2>/dev/null)
            verif_err "Le processus espion_mirage tourne encore (PID : $PID)." \
                      "Commande : kill $PID"
        else
            echo -e "  ${GREEN}✔${NC}  Espion neutralise."
        fi
        if ! $RENAME_OK; then
            if [[ -f "$OLD" ]]; then
                verif_err "rapport.txt n'a pas encore ete renomme." \
                          "Commande : mv ~/infiltration_mirage/serveur/exfiltration/rapport.txt ~/infiltration_mirage/serveur/exfiltration/notes_vacances.txt"
            else
                verif_err "Fichier rapport.txt introuvable dans exfiltration/." \
                          "Completez Q11 d'abord."
            fi
        else
            echo -e "  ${GREEN}✔${NC}  Fichier renomme en notes_vacances.txt."
        fi
    fi
}

# ============================================================
# STATUT
# ============================================================
STATUT() {
    echo -e "${BOLD}╔══════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}║       PROGRESSION — OPERATION MIRAGE         ║${NC}"
    echo -e "${BOLD}╚══════════════════════════════════════════════╝${NC}"
    echo ""
    local F="$TP_DIR/.progression"
    if [[ ! -f "$F" ]]; then echo "  Aucune progression."; return; fi
    read -ra P < "$F"
    local TOTAL=0
    local LABELS=(
        "pwd — Repertoire courant"
        "ls — Lister le serveur"
        "man ls — Lire la documentation"
        "ls -la — Fichiers caches"
        "cd — Navigation"
        "cat — Lecture message secret"
        "cat | grep — Introduction du pipe"
        "history | grep — Pipe sur l'historique"
        "touch — Creation fichier vide"
        "find — Localisation rapport"
        "mkdir + cp — Exfiltration"
        "chmod 600 — Droits restrictifs"
        "chmod u+x — Script executable"
        "top + ps | grep — Reperage PID"
        "kill + mv — Neutralisation et camouflage"
    )
    for i in {0..14}; do
        if [[ "${P[$i]}" == "1" ]]; then
            echo -e "  ${GREEN}✔${NC}  Q$((i+1))  — ${LABELS[$i]}"
            ((TOTAL++))
        else
            echo -e "  ${RED}✘${NC}  Q$((i+1))  — ${LABELS[$i]}"
        fi
    done
    echo ""
    echo -e "  Score : ${BOLD}${TOTAL}/${NB_Q}${NC}"
    if [[ $TOTAL -eq $NB_Q ]]; then
        echo ""
        echo -e "  ${GREEN}${BOLD}  MISSION ACCOMPLIE — Operation MIRAGE terminee.${NC}"
        echo -e "  ${DIM}  ECHO : Travail remarquable, agent. Vous etes pret.${NC}"
    elif [[ $TOTAL -ge 10 ]]; then
        echo -e "  ${YELLOW}  ECHO : Bon travail. Plus que $((NB_Q - TOTAL)) objectifs.${NC}"
    else
        echo -e "  ${DIM}  ECHO : Continuez. Tapez MISSION pour revoir les objectifs.${NC}"
    fi
    echo ""
}

# ============================================================
# INIT
# ============================================================
_init_tp() {
    intro
    echo -e "${YELLOW}[SETUP] Preparation de l'environnement...${NC}"
    setup_tp
    echo -e "${GREEN}${BOLD}TP pret !${NC}"
    echo -e "   Tapez ${CYAN}${BOLD}MISSION${NC} pour afficher les 15 questions."
    echo -e "   Tapez ${CYAN}${BOLD}STATUT${NC}  pour voir votre progression."
    echo -e "   Tapez ${MAGENTA}${BOLD}AGENT${NC}   pour contacter ECHO en cas de blocage."
    echo ""
}

_init_tp
