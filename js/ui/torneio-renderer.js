// js/ui/torneio-renderer.js
import { t } from '../core/i18n.js';
import { getState } from '../core/state.js';

/**
 * Traduz nomes de jogadores se forem chaves de tradução.
 * @param {object} player - O objeto do jogador.
 * @returns {string} O nome traduzido ou original.
 */
function getPlayerName(player) {
    if (player.username && (player.username.startsWith('event_chars.') || player.username.startsWith('player_names.') || player.username.startsWith('avatars.'))) {
        return t(player.username);
    }
    return player.username || player.name;
}

/**
 * Renders the current round's matches in the central game area.
 * @returns {string} The HTML string for the tournament bracket.
 */
export function renderTournamentBracket() {
    const { gameState } = getState();
    if (!gameState || !gameState.tournament) return '';

    const currentRoundMatches = gameState.tournament.schedule[gameState.tournament.currentRound - 1].matches;

    const bracketHTML = `
        <div class="tournament-bracket-container">
            <h3>${t('tournament.current_round', { round: gameState.tournament.currentRound })}</h3>
            ${currentRoundMatches.map(match => {
                const isFinished = match.result !== null;
                let resultText = '<span class="vs">vs</span>';
                if (isFinished) {
                    if (match.winnerId === null) resultText = '<span class="result">1-1</span>';
                    else if (match.winnerId === match.p1.id) resultText = '<span class="result">V-D</span>';
                    else resultText = '<span class="result">D-V</span>';
                }
                return `
                    <div class="bracket-match ${isFinished ? 'finished' : ''}">
                        <span>${getPlayerName(match.p1)}</span>
                        ${resultText}
                        <span>${getPlayerName(match.p2)}</span>
                    </div>
                `;
            }).join('')}
        </div>
    `;
    
    return bracketHTML;
}

/**
 * Renders the score of the current "best of 3" match.
 * @returns {string} The HTML string for the match score.
 */
export function renderCurrentMatchScore() {
    const { gameState } = getState();
    if (!gameState || !gameState.tournamentMatch) return '';

    const match = gameState.tournamentMatch;
    
    return `
        <div class="current-match-score" title="${t('tournament.best_of_3_score')}">
            <span>(${match.score[0]} - ${match.score[1]})</span>
        </div>
    `;
}