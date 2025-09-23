
// js/ui/torneio-renderer.js
import * as dom from '../core/dom.js';
import { t } from '../core/i18n.js';
import { getState } from '../core/state.js';

function clearViews() {
    dom.tournamentHubView.classList.add('hidden');
    dom.tournamentQueueView.classList.add('hidden');
    dom.tournamentMainView.classList.add('hidden');
    dom.tournamentChampionView.classList.add('hidden');
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
    const queueStatusEl = dom.tournamentQueueView.querySelector('p');
    if (queueStatusEl) {
        queueStatusEl.textContent = t('tournament.searching', { current: state.playerCount, max: 8 });
    }
}

function renderMainView(state) {
    dom.tournamentMainView.classList.remove('hidden');
    renderLeaderboard(state.leaderboard);
    renderMatches(state.schedule, state.currentRound);
}

function renderChampionView(state) {
    dom.tournamentChampionView.classList.remove('hidden');
    if (dom.tournamentChampionText) {
        const champion = state.leaderboard[0];
        const runnerUp = state.leaderboard[1];
        dom.tournamentChampionText.innerHTML = `
            <h2>${t('tournament.champion_title')}</h2>
            <p class="champion-name">🏆 ${champion.username} 🏆</p>
            <p class="prize-info">${t('tournament.prize_champion')}</p>
            <br>
            <h3>${t('tournament.runner_up_title')}</h3>
            <p class="runner-up-name">🥈 ${runnerUp.username} 🥈</p>
            <p class="prize-info">${t('tournament.prize_runner_up')}</p>
        `;
    }
}

function renderLeaderboard(leaderboard) {
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
                ${sortedLeaderboard.map((player, index) => `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${player.username}</td>
                        <td>${player.points}</td>
                        <td>${player.wins}</td>
                        <td>${player.draws}</td>
                        <td>${player.losses}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function renderMatches(schedule, currentRound) {
    if (!dom.tournamentMatchesContainer) return;
    const { userProfile } = getState();

    const roundMatches = schedule.find(round => round.round === currentRound)?.matches || [];

    dom.tournamentMatchesContainer.innerHTML = `
        <h3 class="tournament-section-title">${t('tournament.current_round', { round: currentRound })}</h3>
        <div class="matches-grid">
            ${roundMatches.map(match => {
                const isMyMatch = match.p1.id === userProfile.id || match.p2.id === userProfile.id;
                const isFinished = match.result !== null;
                
                let resultText = '';
                if (isFinished) {
                    if (match.result === 'draw') {
                        resultText = '1 - 1';
                    } else if (match.winnerId === match.p1.id) {
                        resultText = 'V - D';
                    } else {
                        resultText = 'D - V';
                    }
                }

                return `
                    <div class="match-card ${isMyMatch ? 'my-match' : ''} ${isFinished ? 'finished' : ''}">
                        <div class="match-player">${match.p1.username}</div>
                        <div class="match-result">${isFinished ? resultText : 'vs'}</div>
                        <div class="match-player">${match.p2.username}</div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
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
                    return `
                    <tr class="rank-${rank}">
                        <td class="rank-position">${rank}</td>
                        <td><img src="${player.avatar_url}" alt="Avatar" class="rank-avatar"></td>
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
