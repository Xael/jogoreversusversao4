// js/tournament/tournament-controller.js

import * as dom from '../core/dom.js';
import { getState, updateState } from '../core/state.js';
import { renderAll } from '../ui/ui-renderer.js';
import { updateLog, shuffle } from '../core/utils.js';
import { createDeck } from '../game-logic/deck.js';
import { initiateTournamentMatchStartSequence, endTournamentMatch } from './tournament-turn-manager.js';
import { t } from '../core/i18n.js';
import { INFINITE_CHALLENGE_OPPONENTS } from '../core/config.js';

let currentTournament = null;

/**
 * Traduz nomes de jogadores se forem chaves de tradução.
 * @param {object} player - O objeto do jogador.
 * @returns {string} O nome traduzido ou original.
 */
function getPlayerName(player) {
    if (player.name && (player.name.startsWith('event_chars.') || player.name.startsWith('player_names.') || player.name.startsWith('avatars.'))) {
        return t(player.name);
    }
    return player.name;
}

/**
 * Gera o cronograma de partidas para um torneio de 8 jogadores.
 * @param {Array<object>} players - A lista de 8 jogadores.
 * @returns {Array<object>} O cronograma de partidas.
 */
function generateTournamentSchedule(players) {
    const schedule = [];
    const numPlayers = players.length;
    const rounds = numPlayers - 1;

    for (let round = 0; round < rounds; round++) {
        const matches = [];
        for (let i = 0; i < numPlayers / 2; i++) {
            const p1 = players[i];
            const p2 = players[numPlayers - 1 - i];
            matches.push({ p1, p2, result: null, score: [0, 0], draws: 0, isAIvsAI: p1.isAI && p2.isAI });
        }
        schedule.push({ round: round + 1, matches });
        players.splice(1, 0, players.pop());
    }
    return schedule;
}

/**
 * Simula o resultado de uma partida entre duas IAs.
 * @param {object} match - O objeto da partida a ser simulada.
 */
async function simulateAIMatch(match) {
    // Simples simulação: 45% de chance para p1, 45% para p2, 10% para empate
    const rand = Math.random();
    const winnerId = rand < 0.45 ? match.p1.id : (rand < 0.9 ? match.p2.id : null);
    handleMatchCompletion(winnerId, true); // Pass true for isAIvsAI
}

/**
 * Lida com a conclusão de uma partida, atualiza a tabela e avança o torneio.
 * @param {string|null} winnerId - O ID do jogador vencedor, ou null para empate.
 * @param {boolean} [isAIvsAI=false] - Indica se a partida foi entre duas IAs.
 */
export function handleMatchCompletion(winnerId, isAIvsAI = false) {
    if (!currentTournament) return;

    const currentRoundMatches = currentTournament.schedule[currentTournament.currentRound - 1].matches;
    const matchToUpdate = currentRoundMatches.find(m => {
        if (isAIvsAI) return !m.result; // Encontra a próxima partida AI vs AI não resolvida
        const humanPlayerId = getState().userProfile.id;
        return (m.p1.id === humanPlayerId || m.p2.id === humanPlayerId);
    });

    if (!matchToUpdate) return;

    matchToUpdate.winnerId = winnerId;
    matchToUpdate.result = 'finished';

    const p1Leaderboard = currentTournament.leaderboard.find(p => p.id === matchToUpdate.p1.id);
    const p2Leaderboard = currentTournament.leaderboard.find(p => p.id === matchToUpdate.p2.id);

    if (!winnerId) { // Empate
        p1Leaderboard.points += 1; p1Leaderboard.draws += 1;
        p2Leaderboard.points += 1; p2Leaderboard.draws += 1;
    } else if (winnerId === matchToUpdate.p1.id) {
        p1Leaderboard.points += 3; p1Leaderboard.wins += 1;
        p2Leaderboard.losses += 1;
    } else {
        p2Leaderboard.points += 3; p2Leaderboard.wins += 1;
        p1Leaderboard.losses += 1;
    }

    // Verifica se todas as partidas da rodada terminaram
    const allMatchesFinished = currentRoundMatches.every(m => m.result);
    if (allMatchesFinished) {
        currentTournament.currentRound++;
        if (currentTournament.currentRound > 7) {
            // Fim do torneio, exibir resultados finais no modal
            dom.tournamentModal.classList.remove('hidden');
        } else {
            // Inicia a próxima rodada
            startNextTournamentRound();
        }
    }
}

/**
 * Inicia a próxima rodada de partidas do torneio.
 */
async function startNextTournamentRound() {
    if (!currentTournament) return;

    const nextRound = currentTournament.schedule[currentTournament.currentRound - 1];
    
    // Simula partidas AI vs AI da próxima rodada
    for (const match of nextRound.matches) {
        if (match.isAIvsAI) {
            await simulateAIMatch(match);
        }
    }

    // Inicia a partida do jogador humano
    const humanMatch = nextRound.matches.find(m => !m.p1.isAI || !m.p2.isAI);
    if (humanMatch) {
        await initializeTournamentMatch(humanMatch, currentTournament);
    } else {
        // Se não houver partida humana, continua simulando
        startNextTournamentRound();
    }
}


/**
 * Inicia o torneio offline completo com 8 jogadores.
 */
export async function startOfflineTournament() {
    dom.tournamentModal.classList.add('hidden');
    dom.tournamentRulesModal.classList.remove('hidden');

    await new Promise(resolve => {
        const handler = () => {
            dom.tournamentRulesUnderstoodButton.removeEventListener('click', handler);
            dom.tournamentRulesModal.classList.add('hidden');
            resolve();
        };
        dom.tournamentRulesUnderstoodButton.addEventListener('click', handler);
    });

    const humanPlayerProfile = getState().userProfile;
    const aiOpponentsData = shuffle([...INFINITE_CHALLENGE_OPPONENTS]).slice(0, 7);

    const humanPlayer = { id: humanPlayerProfile.id, name: humanPlayerProfile.username, avatar_url: humanPlayerProfile.avatar_url, isAI: false };
    const aiPlayers = aiOpponentsData.map((data, i) => ({
        id: `ai-${i}`, name: t(data.nameKey), avatar_url: data.avatar_url, isAI: true, aiType: data.aiType
    }));

    const allPlayers = [humanPlayer, ...aiPlayers];
    shuffle(allPlayers);

    const tournament = {
        id: `offline-${Date.now()}`,
        players: allPlayers,
        status: 'active',
        currentRound: 1,
        leaderboard: allPlayers.map(p => ({
            id: p.id,
            username: p.name,
            avatar_url: p.avatar_url,
            points: 0, wins: 0, draws: 0, losses: 0
        })),
        schedule: generateTournamentSchedule([...allPlayers]) // Passa uma cópia
    };
    currentTournament = tournament;

    // Simula as partidas AI vs AI da primeira rodada
    for (const match of tournament.schedule[0].matches) {
        if (match.isAIvsAI) {
            await simulateAIMatch(match);
        }
    }

    // Encontra e inicia a partida do jogador humano
    const humanMatch = tournament.schedule[0].matches.find(m => !m.p1.isAI || !m.p2.isAI);
    if (humanMatch) {
        await initializeTournamentMatch(humanMatch, tournament);
    }
}

/**
 * Inicializa uma única partida de torneio com base nos dados fornecidos.
 * @param {object} matchData - Os dados da partida (p1, p2).
 * @param {object} tournament - O objeto completo do torneio.
 */
async function initializeTournamentMatch(matchData, tournament) {
    // FIX: Identifica o jogador humano e o IA para garantir que o humano seja sempre o 'player-1'
    const humanData = matchData.p1.isAI ? matchData.p2 : matchData.p1;
    const aiData = matchData.p1.isAI ? matchData.p1 : matchData.p2;

    const player1 = { ...humanData, playerId: 'player-1', isHuman: true };
    const player2 = { ...aiData, playerId: 'player-2', isHuman: false };
    
    const valueDeck = shuffle(createDeck([{ value: 2, count: 12 }, { value: 4, count: 10 }, { value: 6, count: 8 }, { value: 8, count: 6 }, { value: 10, count: 4 }], 'value'));
    const effectDeck = shuffle(createDeck([{ name: 'Mais', count: 4 }, { name: 'Menos', count: 4 }, { name: 'Sobe', count: 4 }, { name: 'Desce', count: 4 }, { name: 'Pula', count: 4 }, { name: 'Reversus', count: 4 }, { name: 'Reversus Total', count: 1 }], 'effect'));

    const players = {
        'player-1': { ...player1, hand: [], resto: null, nextResto: null, effects: {}, playedCards: { value: [], effect: [] }, liveScore: 0, tournamentScoreEffect: null },
        'player-2': { ...player2, hand: [], resto: null, nextResto: null, effects: {}, playedCards: { value: [], effect: [] }, liveScore: 0, tournamentScoreEffect: null }
    };

    const gameState = {
        players,
        playerIdsInGame: ['player-1', 'player-2'],
        decks: { value: valueDeck, effect: effectDeck },
        discardPiles: { value: [], effect: [] },
        gamePhase: 'setup',
        gameMode: 'tournament',
        isTournamentMatch: true,
        isPvp: false,
        tournamentMatch: matchData,
        tournament: tournament,
        currentPlayer: 'player-1',
        turn: 1,
        selectedCard: null,
        log: [],
        consecutivePasses: 0,
    };
    
    updateState('gameState', gameState);
    
    dom.splashScreenEl.classList.add('hidden');
    dom.appContainerEl.classList.remove('hidden');
    dom.boardEl.classList.add('hidden'); // Oculta o tabuleiro para o torneio

    if(dom.leftScoreBox) dom.leftScoreBox.classList.add('hidden');
    if(dom.rightScoreBox) dom.rightScoreBox.classList.add('hidden');

    const player1Container = document.getElementById('player-1-area-container');
    const opponentsContainer = document.getElementById('opponent-zones-container');
    const createPlayerAreaHTML = (id) => `<div class="player-area" id="player-area-${id}"></div>`;
    player1Container.innerHTML = createPlayerAreaHTML('player-1');
    opponentsContainer.innerHTML = createPlayerAreaHTML('player-2');

    updateLog(`Partida de Torneio: ${getPlayerName(player1)} vs ${getPlayerName(player2)}.`);
    
    renderAll();
    
    await initiateTournamentMatchStartSequence();
}