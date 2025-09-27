// js/tournament/tournament-player-actions.js

import { getState } from '../core/state.js';
import { updateLog } from '../core/utils.js';
import { renderAll } from '../ui/ui-renderer.js';
import { playSoundEffect } from '../core/sound.js';
import { updateTournamentLiveScores } from './tournament-score.js';
import { applyTournamentEffect } from './tournament-card-effects.js';
import { animateCardPlay } from '../ui/animations.js';

/**
 * Lida com a lógica completa de um jogador jogando uma carta no modo Torneio.
 * @param {object} player - O jogador que está jogando a carta.
 * @param {object} card - A carta sendo jogada.
 * @param {string} targetId - O ID do jogador alvo.
 * @param {string | null} [effectTypeToReverse=null] - Para 'Reversus', especifica o tipo de efeito.
 */
export async function playTournamentCard(player, card, targetId, effectTypeToReverse = null) {
    const { gameState } = getState();
    playSoundEffect('jogarcarta');
    
    gameState.consecutivePasses = 0;
    
    const animationTargetPlayerId = card.type === 'value' ? player.id : targetId;
    const cardDestinationPlayer = gameState.players[animationTargetPlayerId];

    let targetSlotLabel;
    if (card.type === 'value') {
        targetSlotLabel = player.playedCards.value.length === 0 ? 'Valor 1' : 'Valor 2';
    } else {
        targetSlotLabel = ['Sobe', 'Desce', 'Pula'].includes(card.name) ? 'Movimento' : 'Pontuação';
        if(card.name === 'Reversus') {
            targetSlotLabel = effectTypeToReverse === 'score' ? 'Pontuação' : 'Movimento';
        }
    }

    const startElement = document.querySelector(`#hand-${player.id} [data-card-id="${card.id}"]`);
    const startRect = gameState.animationStartRect; 
    
    if (startElement || startRect) {
        await animateCardPlay(card, startElement, animationTargetPlayerId, targetSlotLabel, false, startRect);
    }
    gameState.animationStartRect = null;
    
    const cardIndexInHand = player.hand.findIndex(c => c.id === card.id);
    if (cardIndexInHand > -1) {
        player.hand.splice(cardIndexInHand, 1);
    }

    if (card.type === 'effect') {
        const categoryMap = { 'Sobe': 'movement', 'Desce': 'movement', 'Pula': 'movement' };
        const category = categoryMap[card.name] || 'score';
        if (card.name === 'Reversus') {
            const cardToReplaceIndex = cardDestinationPlayer.playedCards.effect.findIndex(c => c.name === 'Sobe' || c.name === 'Desce');
            if (cardToReplaceIndex > -1) {
                const [removedCard] = cardDestinationPlayer.playedCards.effect.splice(cardToReplaceIndex, 1);
                gameState.discardPiles.effect.push(removedCard);
            }
        }
    }
    
    if (card.type === 'value') {
        player.playedCards.value.push(card);
        player.playedValueCardThisTurn = true;
        player.nextResto = card;
    } else {
        card.targetId = targetId;
        cardDestinationPlayer.playedCards.effect.push(card);
    }

    if (card.type === 'effect') {
        await applyTournamentEffect(card, targetId, player.id);
    }
    
    gameState.selectedCard = null;
    gameState.reversusTarget = null;
    
    updateTournamentLiveScores();
    renderAll();
}
