// js/story/altar-dialogue.js
import { getState } from '../core/state.js';
import { t } from '../core/i18n.js';

export const altarDialogue = {
    'start': {
        character: 'Necroverso Final',
        text: 'altar_dialogue.start_text',
        options: [{ text: 'altar_dialogue.start_option_1', next: 'check_ticket' }]
    },
    'check_ticket': {
        character: 'Necroverso Final',
        text: () => {
            const { userProfile } = getState();
            // Simula a verificação do bilhete. A lógica real de compra seria no servidor.
            // Para este exemplo, vamos assumir que o jogador precisa ter pelo menos 100 CoinVersus.
            if (userProfile && userProfile.coinversus >= 100) {
                return 'altar_dialogue.ticket_ok_text';
            }
            return 'altar_dialogue.ticket_fail_text';
        },
        options: () => {
             const { userProfile } = getState();
             if (userProfile && userProfile.coinversus >= 100) {
                return [{ text: 'altar_dialogue.ticket_ok_option_1', next: 'ask_rules' }];
            }
            return [{ text: 'altar_dialogue.ticket_fail_option_1', next: 'end_dialogue' }];
        }
    },
    'ask_rules': {
        character: 'Necroverso Final',
        text: 'altar_dialogue.ask_rules_text',
        options: [
            { text: 'common.yes', next: 'rules_1' },
            { text: 'common.no', next: 'mode_select_intro' }
        ]
    },
    'rules_1': {
        character: 'Necroverso Final',
        text: 'altar_dialogue.rules_1_text',
        next: 'rules_2',
        isContinue: true
    },
    'rules_2': {
        character: 'Necroverso Final',
        text: 'altar_dialogue.rules_2_text',
        next: 'rules_3',
        isContinue: true
    },
    'rules_3': {
        character: 'Necroverso Final',
        text: 'altar_dialogue.rules_3_text',
        next: 'rules_4',
        isContinue: true
    },
     'rules_4': {
        character: 'Necroverso Final',
        text: 'altar_dialogue.rules_4_text',
        next: 'mode_select_intro',
        isContinue: true
    },
    'mode_select_intro': {
        character: 'Necroverso Final',
        text: 'altar_dialogue.mode_select_intro_text',
        isEndDialogue: true, // Sinaliza para o handler para fechar o diálogo e abrir o setup
    },
    'end_dialogue': {
        isEndDialogue: true, // Sinaliza para o handler para fechar tudo e voltar ao menu
    }
};
