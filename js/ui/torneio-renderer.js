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
    if (!player) return "Jogador";
    const nameToTranslate = player.username || player.name;
    if (nameToTranslate && (nameToTranslate.startsWith('event_chars.') || nameToTranslate.startsWith('player_names.') || nameToTranslate.startsWith('avatars.'))) {
        return t(nameToTranslate);
    }
    return nameToTranslate;
}

/**
 * Renders the main tournament modal view based on the current state.
 * @param {object} tournamentState - The current state of the tournament.
 */
export function renderTournamentView(tournamentState) {
    const { status } = tournamentState;

    // Hide all views first
    dom.tournamentHubView.classList.add('hidden');
    dom.tournamentQueueView.classList.add('hidden');
    dom.tournamentMainView.classList.add('hidden');
    dom.tournamentChampionView.classList.add('hidden');

    if (status === 'hub') {
        dom.tournamentHubView.classList.remove('hidden');
    } else if (status === 'queue') {
        const queueStatusText = document.getElementById('tournament-queue-status-text');
        const countdownEl = document.getElementById('tournament-queue-countdown');
        if (queueStatusText) {
            queueStatusText.textContent = t('tournament.searching', { current: tournamentState.playerCount, max: tournamentState.max });
        }
        if (countdownEl && tournamentState.timeout) {
            let seconds = tournamentState.timeout / 1000;
            countdownEl.textContent = t('tournament.starting_in', { seconds });
            const interval = setInterval(() => {
                seconds--;
                if (seconds > 0) {
                    countdownEl.textContent = t('tournament.starting_in', { seconds });
                } else {
                    countdownEl.textContent = t('tournament.starting_now');
                    clearInterval(interval);
                }
            }, 1000);
        } else if(countdownEl) {
             countdownEl.textContent = '';
        }

        dom.tournamentQueueView.classList.remove('hidden');
    } else if (status === 'active') {
        const { leaderboard, schedule, currentRound } = tournamentState;
        const sortedLeaderboard = [...leaderboard].sort((a, b) => b.points - a.points || b.wins - a.wins);

        dom.tournamentLeaderboardContainer.innerHTML = `
            <h3 class="tournament-section-title">${t('tournament.leaderboard')}</h3>
            <table class="tournament-table">
                <thead>
                    <tr>
                        <th>${t('tournament.header_pos')}</th>
                        <th colspan="2">${t('tournament.header_name')}</th>
                        <th>${t('tournament.header_points')}</th>
                        <th>${t('tournament.header_wins')}</th>
                        <th>${t('tournament.header_draws')}</th>
                        <th>${t('tournament.header_losses')}</th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedLeaderboard.map((player, index) => {
                        const avatarUrl = player.avatar_url ? (player.avatar_url.startsWith('http') ? player.avatar_url : `./${player.avatar_url}`) : './aleatorio1.png';
                        return `
                        <tr>
                            <td>${index + 1}</td>
                            <td><img src="${avatarUrl}" class="tournament-player-avatar" alt="Avatar"></td>
                            <td>${getPlayerName(player)}</td>
                            <td>${player.points}</td>
                            <td>${player.wins}</td>
                            <td>${player.draws}</td>
                            <td>${player.losses}</td>
                        </tr>
                    `}).join('')}
                </tbody>
            </table>
        `;

        const currentRoundMatches = schedule[currentRound - 1].matches;
        dom.tournamentMatchesContainer.innerHTML = `
            <h3 class="tournament-section-title">${t('tournament.current_round', { round: currentRound })}</h3>
            <div class="matches-grid">
                ${currentRoundMatches.map(match => {
                    const myProfile = getState().userProfile;
                    const isMyMatch = myProfile && (match.p1.id === myProfile.id || match.p2.id === myProfile.id);
                    const isFinished = match.result !== null;
                    return `
                    <div class="match-card ${isMyMatch && !isFinished ? 'my-match' : ''} ${isFinished ? 'finished' : ''}">
                        <div class="match-player">
                            <img src="${match.p1.avatar_url || './aleatorio1.png'}" class="match-player-avatar">
                            <span>${getPlayerName(match.p1)}</span>
                        </div>
                        <span class="match-result">${isFinished ? (match.winnerId === match.p1.id ? 'V - D' : (match.winnerId === match.p2.id ? 'D - V' : 'E - E')) : 'vs'}</span>
                        <div class="match-player">
                             <img src="${match.p2.avatar_url || './aleatorio1.png'}" class="match-player-avatar">
                            <span>${getPlayerName(match.p2)}</span>
                        </div>
                    </div>
                `}).join('')}
            </div>
        `;
        
        dom.tournamentMainView.classList.remove('hidden');

    } else if (status === 'finished') {
        const sortedLeaderboard = [...tournamentState.leaderboard].sort((a, b) => b.points - a.points || b.wins - a.wins);
        const champion = sortedLeaderboard[0];
        const runnerUp = sortedLeaderboard[1];
        dom.tournamentChampionText.innerHTML = `
            <h2>${t('tournament.champion_title')}</h2>
            <p class="champion-name">${getPlayerName(champion)}</p>
            <p class="prize-info">${t('tournament.prize_champion')}</p>
            <br>
            <h3>${t('tournament.runner_up_title')}</h3>
            <p class="runner-up-name">${getPlayerName(runnerUp)}</p>
            <p class="prize-info">${t('tournament.prize_runner_up')}</p>
        `;
        dom.tournamentChampionView.classList.remove('hidden');
    }

    dom.tournamentModal.classList.remove('hidden');
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