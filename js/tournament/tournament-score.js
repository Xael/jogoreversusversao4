// js/tournament/tournament-score.js

import { getState } from '../core/state.js';

/**
 * Calcula as pontuações ao vivo para os jogadores em uma partida de torneio e atualiza a UI.
 */
export function updateTournamentLiveScores() {
    const { gameState } = getState();
    if (!gameState || !gameState.isTournamentMatch) return;

    // Calcula pontuações ao vivo para todos os jogadores na partida
    gameState.playerIdsInGame.forEach(id => {
        const player = gameState.players[id];
        let score = player.playedCards.value.reduce((sum, card) => sum + card.value, 0);

        if (player.tournamentScoreEffect) {
            if (player.tournamentScoreEffect.effect === 'Sobe') {
                score += 5;
            } else if (player.tournamentScoreEffect.effect === 'Desce') {
                score -= 5;
            }
        }
        
        player.liveScore = score;
    });

    // A renderização do placar foi movida para ui-renderer.js para mostrar a tabela de classificação.
}