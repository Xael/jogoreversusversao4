// js/tournament/tournament-turn-manager.js

import { getState, updateState } from '../core/state.js';
import * as dom from '../core/dom.js';
import { renderAll, showTurnIndicator, showGameOver } from '../ui/ui-renderer.js';
import { renderCard } from '../ui/card-renderer.js';
import { executeAiTurn } from '../ai/ai-controller.js';
import { updateLog, dealCard, shuffle } from '../core/utils.js';
import { updateTournamentLiveScores } from './tournament-score.js';
import { t } from '../core/i18n.js';

/**
 * Inicia a sequência de início de uma partida de torneio com o sorteio de cartas.
 */
export async function initiateTournamentMatchStartSequence() {
    const { gameState } = getState();

    dom.drawStartTitle.textContent = t('draw.title');
    dom.drawStartResultMessage.textContent = t('draw.message_drawing');
    
    dom.drawStartCardsContainerEl.innerHTML = gameState.playerIdsInGame.map(id => {
        const player = gameState.players[id];
        return `
            <div class="draw-start-player-slot">
                <span class="player-name ${id}">${player.name}</span>
                <div class="card modal-card" style="background-image: url('./verso_valor.png');" id="draw-card-${id}"></div>
            </div>
        `;
    }).join('');

    dom.drawStartModal.classList.remove('hidden');
    await new Promise(res => setTimeout(res, 1500));
    await drawToStartTournament();
}

async function drawToStartTournament() {
    const { gameState } = getState();
    const drawnCards = {};
    const cardPromises = [];

    for (const id of gameState.playerIdsInGame) {
        const card = dealCard('value');
        drawnCards[id] = card;
        const cardEl = document.getElementById(`draw-card-${id}`);
        
        const promise = new Promise(res => {
            setTimeout(() => {
                if(cardEl) cardEl.outerHTML = renderCard(card, 'modal');
                res();
            }, 500 * cardPromises.length);
        });
        cardPromises.push(promise);
    }

    await Promise.all(cardPromises);
    await new Promise(res => setTimeout(res, 1500));

    const sortedPlayers = [...gameState.playerIdsInGame].sort((a, b) => drawnCards[b].value - drawnCards[a].value);
    
    if (drawnCards[sortedPlayers[0]].value > drawnCards[sortedPlayers[1]].value) {
        const winner = gameState.players[sortedPlayers[0]];
        gameState.currentPlayer = winner.id;
        dom.drawStartResultMessage.textContent = `${winner.name} tirou a carta mais alta e começa!`;
        
        await new Promise(res => setTimeout(res, 2000));
        dom.drawStartModal.classList.add('hidden');
        
        gameState.playerIdsInGame.forEach(id => {
            gameState.players[id].resto = drawnCards[id];
        });
        
        await startTournamentNewRound(true);
    } else {
        dom.drawStartResultMessage.textContent = "Empate! Sorteando novamente...";
        Object.values(drawnCards).forEach(card => gameState.discardPiles.value.push(card));
        await initiateTournamentMatchStartSequence();
    }
}

/**
 * Avança para o próximo jogador ou termina a rodada no torneio.
 */
export async function advanceToNextPlayer() {
    const { gameState } = getState();
    if (gameState.gamePhase !== 'playing') return;

    if (gameState.consecutivePasses >= gameState.playerIdsInGame.length) {
        await endTournamentRound();
        return;
    }
    
    const currentIndex = gameState.playerIdsInGame.indexOf(gameState.currentPlayer);
    const nextIndex = (currentIndex + 1) % gameState.playerIdsInGame.length;
    gameState.currentPlayer = gameState.playerIdsInGame[nextIndex];
    
    const nextPlayer = gameState.players[gameState.currentPlayer];
    nextPlayer.playedValueCardThisTurn = false;

    updateLog(`É a vez de ${nextPlayer.name}.`);
    renderAll();

    if (nextPlayer.isHuman) {
        await showTurnIndicator();
    } else {
        executeAiTurn(nextPlayer);
    }
}

async function endTournamentRound() {
    const { gameState } = getState();
    if (gameState.gamePhase !== 'playing') return;
    
    gameState.gamePhase = 'resolution';
    renderAll();
    updateLog('Todos os jogadores passaram. Resolvendo a rodada...');
    await calculateScoresAndEndTournamentRound();
}

/**
 * Inicia uma nova rodada em uma partida de torneio.
 * @param {boolean} isFirstRound - Indica se é a primeira rodada da partida.
 */
export async function startTournamentNewRound(isFirstRound = false) {
    const { gameState } = getState();
    if (!isFirstRound) {
        gameState.turn++;
    }
    updateLog(`--- Iniciando Rodada ${gameState.turn} ---`);

    gameState.playerIdsInGame.forEach(id => {
        const player = gameState.players[id];
        gameState.discardPiles.value.push(...player.playedCards.value);
        gameState.discardPiles.effect.push(...player.playedCards.effect);
        player.playedCards = { value: [], effect: [] };
        if (player.nextResto) player.resto = player.nextResto;
        player.nextResto = null;
        player.effects = {};
        player.playedValueCardThisTurn = false;
        player.tournamentScoreEffect = null;
    });

    gameState.consecutivePasses = 0;

    gameState.playerIdsInGame.forEach(id => {
        const player = gameState.players[id];
        while (player.hand.filter(c => c.type === 'value').length < 3) {
            const newCard = dealCard('value');
            if (newCard) player.hand.push(newCard); else break;
        }
        while (player.hand.filter(c => c.type === 'effect').length < 2) {
            const newCard = dealCard('effect');
            if (newCard) player.hand.push(newCard); else break;
        }
    });
    
    gameState.gamePhase = 'playing';
    const currentPlayer = gameState.players[gameState.currentPlayer];
    updateLog(`É a vez de ${currentPlayer.name}.`);
    renderAll();

    if (currentPlayer.isHuman) {
        await showTurnIndicator();
    } else {
        executeAiTurn(currentPlayer);
    }
}

/**
 * Verifica se a partida do torneio terminou.
 * @returns {boolean} True se a partida terminou.
 */
function checkTournamentMatchEnd() {
    const { gameState } = getState();
    const match = gameState.tournamentMatch;
    if (!match) return false;

    const [p1Score, p2Score] = match.score;
    return p1Score >= 2 || p2Score >= 2 || (p1Score + p2Score + match.draws >= 3);
}

/**
 * Calcula os resultados da rodada do torneio e avança a partida.
 */
async function calculateScoresAndEndTournamentRound() {
    const { gameState } = getState();
    const finalScores = {};

    gameState.playerIdsInGame.forEach(id => {
        const p = gameState.players[id];
        let score = p.playedCards.value.reduce((sum, card) => sum + card.value, 0);
        if (p.tournamentScoreEffect) {
            if (p.tournamentScoreEffect.effect === 'Sobe') score += 5;
            if (p.tournamentScoreEffect.effect === 'Desce') score -= 5;
        }
        finalScores[id] = score;
    });

    let winners = [];
    let highestScore = -Infinity;
    gameState.playerIdsInGame.forEach(id => {
        if (finalScores[id] > highestScore) {
            highestScore = finalScores[id];
            winners = [id];
        } else if (finalScores[id] === highestScore) {
            winners.push(id);
        }
    });

    if (winners.length > 1) winners = [];

    const match = gameState.tournamentMatch;
    if (winners.length === 1) {
        const winnerId = winners[0];
        updateLog(`Vencedor da rodada: ${gameState.players[winnerId].name}.`);
        if (winnerId === match.player1.playerId) match.score[0]++;
        else match.score[1]++;
    } else {
        updateLog("A rodada terminou em empate.");
        match.draws++;
    }

    updateTournamentLiveScores(); // Atualiza a UI com o placar da partida
    await new Promise(res => setTimeout(res, 3000));

    if (checkTournamentMatchEnd()) {
        const [p1Score, p2Score] = match.score;
        let message;
        if (p1Score > p2Score) {
            message = `${match.player1.name} venceu a partida contra ${match.player2.name}!`;
        } else if (p2Score > p1Score) {
            message = `${match.player2.name} venceu a partida contra ${match.player1.name}!`;
        } else {
            message = 'A partida terminou em empate!';
        }
        showGameOver(message, "Fim da Partida", { action: 'menu', text: t('game_over.back_to_menu') });
    } else {
        await startTournamentNewRound();
    }
}
