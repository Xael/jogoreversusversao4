// js/tournament/tournament-score.js

import { getState } from '../core/state.js';
import { renderTournamentMatchScore } from '../ui/torneio-renderer.js';

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

    // Renderiza o placar da partida (ex: 1 - 0)
    if (gameState.tournamentMatch) {
        renderTournamentMatchScore(gameState.tournamentMatch.score);
    }
}
