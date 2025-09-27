// js/tournament/tournament-score.js

import { getState } from '../core/state.js';
import { renderAll } from '../ui/ui-renderer.js';

/**
 * Calcula as pontuações ao vivo para os jogadores em uma partida de torneio e atualiza a UI.
 */
export function updateTournamentLiveScores() {
    const { gameState } = getState();
    if (!gameState || !gameState.isTournamentMatch) return;

    // Calcula pontuações ao vivo para todos os jogadores na partida
    gameState.playerIdsInGame.forEach(id => {
        const player = gameState.players[id];
        if (!player) return;

        let score = player.playedCards.value.reduce((sum, card) => sum + card.value, 0);

        // Aplica os efeitos de pontuação do torneio (+5/-5)
        if (player.tournamentScoreEffect) {
            if (player.tournamentScoreEffect.effect === 'Sobe') {
                score += 5;
            } else if (player.tournamentScoreEffect.effect === 'Desce') {
                score -= 5;
            }
        }
        
        // Aplica os efeitos normais de Mais/Menos
        const effect = player.effects.score;
        let restoValue = player.resto ? player.resto.value : 0;
        if (effect === 'Mais') score += restoValue;
        if (effect === 'Menos') score -= restoValue;

        player.liveScore = score;
    });

    // A renderização é chamada externamente, não aqui.
}