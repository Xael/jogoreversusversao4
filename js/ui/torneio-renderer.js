// js/ui/torneio-renderer.js
import * as dom from '../core/dom.js';
import { t } from '../core/i18n.js';
import { getState } from '../core/state.js';

let queueCountdownInterval = null;

function clearViews() {
    dom.tournamentHubView.classList.add('hidden');
    dom.tournamentQueueView.classList.add('hidden');
    dom.tournamentMainView.classList.add('hidden');
    dom.tournamentChampionView.classList.add('hidden');
}

/**
 * Translates player names if they are translation keys.
 * @param {object} player - The player object from the leaderboard or match.
 * @returns {string} The translated or original username.
 */
function getPlayerName(player) {
    if (player && player.username && (player.username.startsWith('event_chars.') || player.username.startsWith('player_names.') || player.username.startsWith('avatars.'))) {
        return t(player.username);
    }
    return player ? player.username : 'Desconhecido';
}


export function renderTournamentView(state) {
    clearViews();
    dom.tournamentModal.classList.remove('hidden');

    switch (state.status) {
        case 'hub':
            renderHubView();
            break;
        case 'queue':
            renderQueueView(state);
            break;
        case 'active':
            renderMainView(state);
            break;
        case 'finished':
            renderChampionView(state);
            break;
        default:
            // Fallback to hub if state is unknown
            renderHubView();
            break;
    }
}

function renderHubView() {
    dom.tournamentHubView.classList.remove('hidden');
}

function renderQueueView(state) {
    dom.tournamentQueueView.classList.remove('hidden');
    const queueStatusEl = document.getElementById('tournament-queue-status-text');
    if (queueStatusEl) {
        queueStatusEl.textContent = t('tournament.searching', { current: state.playerCount, max: state.max || 8 });
    }

    if (queueCountdownInterval) clearInterval(queueCountdownInterval);
    const countdownEl = document.getElementById('tournament-queue-countdown');
    if (countdownEl && state.timeout && state.playerCount > 0) {
        let timeLeft = state.timeout;
        countdownEl.textContent = t('tournament.starting_in', { seconds: timeLeft });
        countdownEl.classList.remove('hidden');

        queueCountdownInterval = setInterval(() => {
            timeLeft--;
            if (timeLeft >= 0) {
                countdownEl.textContent = t('tournament.starting_in', { seconds: timeLeft });
            } else {
                countdownEl.textContent = t('tournament.starting_now');
                clearInterval(queueCountdownInterval);
            }
        }, 1000);
    } else if (countdownEl) {
        countdownEl.classList.add('hidden');
    }
}

function renderMainView(state) {
    dom.tournamentMainView.classList.remove('hidden');
    renderLeaderboard(state.leaderboard, state.players);
    renderMatches(state, state.currentRound);
}

function renderChampionView(state) {
    dom.tournamentChampionView.classList.remove('hidden');
    if (dom.tournamentChampionText) {
        const champion = state.leaderboard[0];
        const runnerUp = state.leaderboard[1];
        const championPlayer = state.players.find(p => p.id === champion.id);
        const runnerUpPlayer = state.players.find(p => p.id === runnerUp.id);
        
        dom.tournamentChampionText.innerHTML = `
            <h2>${t('tournament.champion_title')}</h2>
            <p class="champion-name">🏆 ${getPlayerName(championPlayer)} 🏆</p>
            <p class="prize-info">${t('tournament.prize_champion')}</p>
            <br>
            <h3>${t('tournament.runner_up_title')}</h3>
            <p class="runner-up-name">🥈 ${getPlayerName(runnerUpPlayer)} 🥈</p>
            <p class="prize-info">${t('tournament.prize_runner_up')}</p>
        `;
    }
}

function renderLeaderboard(leaderboard, allPlayers) {
    if (!dom.tournamentLeaderboardContainer) return;

    const sortedLeaderboard = [...leaderboard].sort((a, b) => b.points - a.points || b.wins - a.wins);

    dom.tournamentLeaderboardContainer.innerHTML = `
        <h3 class="tournament-section-title">${t('tournament.leaderboard')}</h3>
        <table class="tournament-table">
            <thead>
                <tr>
                    <th>${t('tournament.header_pos')}</th>
                    <th>${t('tournament.header_name')}</th>
                    <th>${t('tournament.header_points')}</th>
                    <th>${t('tournament.header_wins')}</th>
                    <th>${t('tournament.header_draws')}</th>
                    <th>${t('tournament.header_losses')}</th>
                </tr>
            </thead>
            <tbody>
                ${sortedLeaderboard.map((playerEntry, index) => {
                    const fullPlayer = allPlayers.find(p => p.id === playerEntry.id);
                    const avatarUrl = fullPlayer?.avatar_url ? (fullPlayer.avatar_url.startsWith('http') ? fullPlayer.avatar_url : `./${fullPlayer.avatar_url}`) : './aleatorio1.png';
                    
                    return `
                    <tr>
                        <td>${index + 1}</td>
                        <td class="tournament-player-cell">
                            <img src="${avatarUrl}" alt="Avatar" class="tournament-player-avatar">
                            <span>${getPlayerName(fullPlayer)}</span>
                        </td>
                        <td>${playerEntry.points}</td>
                        <td>${playerEntry.wins}</td>
                        <td>${playerEntry.draws}</td>
                        <td>${playerEntry.losses}</td>
                    </tr>
                `}).join('')}
            </tbody>
        </table>
    `;
}

function renderMatches(state, currentRound) {
    if (!dom.tournamentMatchesContainer) return;
    const { userProfile } = getState();
    const allPlayers = state.players;

    const roundMatches = state.schedule.find(round => round.round === currentRound)?.matches || [];
    const continueBtn = document.getElementById('tournament-continue-btn');

    let isMyTurnToPlay = false;

    dom.tournamentMatchesContainer.innerHTML = `
        <h3 class="tournament-section-title">${t('tournament.current_round', { round: currentRound })}</h3>
        <div class="matches-grid">
            ${roundMatches.map(match => {
                const player1 = allPlayers.find(p => p.id === match.p1.id);
                const player2 = allPlayers.find(p => p.id === match.p2.id);

                const isMyMatch = player1.id === userProfile.id || player2.id === userProfile.id;
                const isFinished = match.result !== null;

                if (isMyMatch && !isFinished) {
                    isMyTurnToPlay = true;
                    if(continueBtn) continueBtn.dataset.matchId = match.matchId;
                }
                
                let resultText = '';
                if (isFinished) {
                    if (match.result === 'draw') {
                        resultText = '1 - 1';
                    } else if (match.winnerId === player1.id) {
                        resultText = 'V - D';
                    } else {
                        resultText = 'D - V';
                    }
                }

                return `
                    <div class="match-card ${isMyMatch ? 'my-match' : ''} ${isFinished ? 'finished' : ''}">
                        <div class="match-player">
                             <img src="${player1.avatar_url ? (player1.avatar_url.startsWith('http') ? player1.avatar_url : `./${player1.avatar_url}`) : './aleatorio1.png'}" class="match-player-avatar">
                            <span>${getPlayerName(player1)}</span>
                        </div>
                        <div class="match-result">${isFinished ? resultText : 'vs'}</div>
                        <div class="match-player">
                             <img src="${player2.avatar_url ? (player2.avatar_url.startsWith('http') ? player2.avatar_url : `./${player2.avatar_url}`) : './aleatorio1.png'}" class="match-player-avatar">
                            <span>${getPlayerName(player2)}</span>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;

    if (continueBtn) {
        continueBtn.classList.toggle('hidden', !isMyTurnToPlay);
    }
}

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
                        <td>${player.total_points}</td>
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

export function renderTournamentMatchScore(score) {
    if (!dom.centerPanelHeader) return;
    
    // Remove existing score container to prevent duplicates
    clearTournamentMatchScore();

    const container = document.createElement('div');
    container.id = 'tournament-match-score-container'; // Use a consistent ID
    
    container.innerHTML = `
        <span class="tournament-match-score">${t('tournament.best_of_3_score')}: ${score[0]} - ${score[1]}</span>
    `;
    dom.centerPanelHeader.appendChild(container);
}

export function clearTournamentMatchScore() {
    const existingContainer = document.getElementById('tournament-match-score-container');
    if (existingContainer) {
        existingContainer.remove();
    }
}