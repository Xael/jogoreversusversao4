// js/ui/torneio-renderer.js
import { t } from '../core/i18n.js';
import { getState } from '../core/state.js';
import * as dom from '../core/dom.js';

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

/**
 * Renders the tournament ranking table and pagination.
 * @param {object} rankingData - The data containing players and pagination info.
 */
export function renderTournamentRankingTable(rankingData) {
    const { players, currentPage, totalPages } = rankingData;
    const container = dom.tournamentRankingContainer;
    const pagination = dom.tournamentRankingPagination;

    if (!players || !container || !pagination) return;

    if (players.length === 0 && currentPage === 1) {
        container.innerHTML = `<p>${t('ranking.empty')}</p>`;
        pagination.innerHTML = '';
        return;
    }

    const tableHTML = `
        <table>
            <thead>
                <tr>
                    <th>${t('ranking.header_rank')}</th>
                    <th colspan="2">${t('ranking.header_player')}</th>
                    <th>${t('tournament.header_total_points')}</th>
                    <th>${t('tournament.header_tournaments_won')}</th>
                </tr>
            </thead>
            <tbody>
                ${players.map((player, index) => {
                    const rank = (currentPage - 1) * 10 + index + 1;
                    let titleText = player.selected_title_code ? t(`titles.${player.selected_title_code}`) : '';
                    if (titleText.startsWith('titles.')) {
                        titleText = player.selected_title_code; // Fallback to the code itself
                    }
                    const avatarUrl = player.avatar_url ? (player.avatar_url.startsWith('http') ? player.avatar_url : `./${player.avatar_url}`) : './aleatorio1.png';
                    return `
                    <tr class="rank-${rank}">
                        <td class="rank-position">${rank}</td>
                        <td><img src="${avatarUrl}" alt="Avatar" class="rank-avatar"></td>
                        <td>
                            <span class="rank-name clickable" data-google-id="${player.google_id}">${player.username}</span>
                            <span class="rank-player-title">${titleText}</span>
                        </td>
                        <td>${player.total_points || 0}</td>
                        <td>${player.tournaments_won || 0}</td>
                    </tr>
                `}).join('')}
            </tbody>
        </table>
    `;
    container.innerHTML = tableHTML;

    const paginationHTML = `
        <button id="tournament-rank-prev-btn" ${currentPage === 1 ? 'disabled' : ''}>&lt;</button>
        <span>Página ${currentPage} de ${totalPages}</span>
        <button id="tournament-rank-next-btn" ${currentPage >= totalPages ? 'disabled' : ''}>&gt;</button>
    `;
    pagination.innerHTML = paginationHTML;
}