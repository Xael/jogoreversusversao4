// js/game-logic/turn-manager.js

import { getState, updateState } from '../core/state.js';
import * as dom from '../core/dom.js';
import * as config from '../core/config.js';
import { renderAll, showTurnIndicator, showRoundSummaryModal, showGameOver } from '../ui/ui-renderer.js';
import { renderCard } from '../ui/card-renderer.js';
import { executeAiTurn } from '../ai/ai-controller.js';
import { triggerFieldEffects, checkAndTriggerPawnLandingAbilities } from '../story/story-abilities.js';
import { updateLog, dealCard, shuffle } from '../core/utils.js';
import { grantAchievement } from '../core/achievements.js';
import { showSplashScreen } from '../ui/splash-screen.js';
import { toggleReversusTotalBackground, resetGameEffects } from '../ui/animations.js';
import { updateLiveScoresAndWinningStatus } from './score.js';
import { rotateAndApplyKingNecroversoBoardEffects } from './board.js';
import { playSoundEffect, announceEffect } from '../core/sound.js';
import { t } from '../core/i18n.js';
import { createDeck } from './deck.js';
import { renderTournamentMatchScore, clearTournamentMatchScore, renderTournamentView } from '../ui/torneio-renderer.js';
import { initializeGame } from '../game-controller.js';


/**
 * Updates the in-game timer display, handling normal and countdown modes.
 */
export const updateGameTimer = () => {
    const { gameStartTime, gameState, gameTimerInterval, infiniteChallengeTimerInterval } = getState();
    if (!gameStartTime || !gameState) return;
    
    const elapsed = Math.floor((Date.now() - gameStartTime) / 1000);
    gameState.elapsedSeconds = elapsed;

    let totalSeconds, remaining, container, warningClass;

    if (gameState.isInfiniteChallenge) {
        totalSeconds = 30 * 60; // 30 minutes
        remaining = totalSeconds - elapsed;
        container = dom.gameTimerContainerEl;
        warningClass = 'countdown-warning';
    } else if (gameState.currentStoryBattle === 'necroverso_final') {
        totalSeconds = 15 * 60; // 15 minutes
        remaining = totalSeconds - elapsed;
        container = dom.gameTimerContainerEl;
        warningClass = 'countdown-warning';
    } else {
        // Normal elapsed time mode
        const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
        const seconds = (elapsed % 60).toString().padStart(2, '0');
        dom.gameTimerContainerEl.textContent = `${minutes}:${seconds}`;
        return;
    }

    if (remaining <= 0) {
        container.textContent = '00:00';
        if (gameState.isInfiniteChallenge) {
            if (infiniteChallengeTimerInterval) clearInterval(infiniteChallengeTimerInterval);
            updateState('infiniteChallengeTimerInterval', null);
            if (gameState.gamePhase !== 'game_over') {
                 document.dispatchEvent(new CustomEvent('infiniteChallengeEnd', { detail: { reason: 'time' } }));
            }
        } else { // Necroverso final
            if(gameTimerInterval) clearInterval(gameTimerInterval);
            updateState('gameTimerInterval', null);
            if (gameState.gamePhase !== 'game_over') {
                document.dispatchEvent(new CustomEvent('storyWinLoss', { detail: { battle: 'necroverso_final', won: false, reason: 'time' } }));
            }
        }
        return;
    }

    if (warningClass) container.classList.add(warningClass);
    const minutes = Math.floor(remaining / 60).toString().padStart(2, '0');
    const seconds = (remaining % 60).toString().padStart(2, '0');
    container.textContent = `${minutes}:${seconds}`;
};


/**
 * Displays a fullscreen announcement for final bosses.
 * @param {string} text - The dialogue text.
 * @param {string} imageSrc - The source URL for the character image.
 */
const showFullscreenAnnounce = async (text, imageSrc) => {
    return new Promise(resolve => {
        dom.fullscreenAnnounceModal.classList.remove('hidden');
        dom.fullscreenAnnounceModal.classList.add('psychedelic-bg');
        dom.fullscreenAnnounceImage.src = imageSrc;
        dom.fullscreenAnnounceText.textContent = text;
        
        setTimeout(() => {
            dom.fullscreenAnnounceModal.classList.add('hidden');
            dom.fullscreenAnnounceModal.classList.remove('psychedelic-bg');
            resolve();
        }, 5000); // Show for 5 seconds
    });
};

/**
 * Initiates the sequence to start a game, beginning with the initial draw.
 */
export async function initiateGameStartSequence() {
    const { gameState } = getState();
    
    // Skip initial draw for the final battle or Xael challenge
    if (gameState.isFinalBoss || gameState.isXaelChallenge) {
        // Set paths once at the start
        const chosenPaths = new Set();
        const playerIdsToAssign = gameState.playerIdsInGame;
        playerIdsToAssign.forEach(id => {
            let availablePaths = gameState.boardPaths.filter(p => !chosenPaths.has(p.id));
            if (availablePaths.length > 0) {
                let chosenPath = availablePaths[0]; // Simplified for predictability
                gameState.players[id].pathId = chosenPath.id;
                chosenPaths.add(chosenPath.id);
            }
        });
        
        await startNewRound(true);
        return;
    }

    dom.drawStartTitle.textContent = "Sorteio Inicial";
    dom.drawStartResultMessage.textContent = "Sorteando cartas para ver quem começa...";
    
    dom.drawStartCardsContainerEl.innerHTML = gameState.playerIdsInGame.map(id => {
        const player = gameState.players[id];
        return `
            <div class="draw-start-player-slot">
                <span class="player-name ${id}">${t(player.name)}</span>
                <div class="card modal-card" style="background-image: url('./verso_valor.png');" id="draw-card-${id}"></div>
            </div>
        `;
    }).join('');

    dom.drawStartModal.classList.remove('hidden');
    await new Promise(res => setTimeout(res, 1500));
    await drawToStart();
};

async function drawToStart() {
    const { gameState } = getState();
    const drawnCards = {};
    const cardPromises = [];

    // Use a robust for...of loop to handle potential dealing errors
    let dealFailed = false;
    for (const id of gameState.playerIdsInGame) {
        const card = dealCard('value');
        if (!card) {
            console.error(`Falha crítica ao sortear carta para ${id}. Abortando início do jogo.`);
            dealFailed = true;
            break; // Exit the loop immediately
        }
        drawnCards[id] = card;
        const cardEl = document.getElementById(`draw-card-${id}`);
        
        const promise = new Promise(res => {
            setTimeout(() => {
                if(cardEl) cardEl.outerHTML = renderCard(card, 'modal', id);
                res();
            }, 500 * (cardPromises.length));
        });
        cardPromises.push(promise);
    }

    if (dealFailed) {
        dom.drawStartResultMessage.textContent = "Erro ao distribuir cartas. Tente novamente.";
        updateLog("Erro crítico no sorteio inicial. O jogo não pode começar.");
        setTimeout(showSplashScreen, 3000);
        return;
    }

    await Promise.all(cardPromises);
    await new Promise(res => setTimeout(res, 1500));

    // Create a copy for sorting to avoid modifying the original turn order array
    const sortedPlayers = [...gameState.playerIdsInGame].sort((a, b) => {
        const cardA = drawnCards[a]?.value || 0;
        const cardB = drawnCards[b]?.value || 0;
        return cardB - cardA;
    });
    
    const logParts = gameState.playerIdsInGame.map(id => `${t(gameState.players[id].name)} sacou ${drawnCards[id].name}`);
    updateLog(`Sorteio: ${logParts.join(', ')}.`);
    
    if (sortedPlayers.length < 2 || (drawnCards[sortedPlayers[0]]?.value > drawnCards[sortedPlayers[1]]?.value)) {
        const winner = gameState.players[sortedPlayers[0]];
        gameState.currentPlayer = winner.id;
        gameState.initialDrawCards = drawnCards;
        dom.drawStartResultMessage.textContent = `${t(winner.name)} tirou a carta mais alta e começa!`;
        
        await new Promise(res => setTimeout(res, 2000));
        dom.drawStartModal.classList.add('hidden');
        
        await finalizeGameStart();
    } else {
        dom.drawStartResultMessage.textContent = "Empate! Sorteando novamente...";
        updateLog("Empate! Sacando novas cartas...");
        Object.values(drawnCards).forEach(card => gameState.discardPiles.value.push(card));
        await initiateGameStartSequence();
    }
};

async function finalizeGameStart() {
    const { gameState } = getState();
    
    if (gameState.initialDrawCards) {
        gameState.playerIdsInGame.forEach(id => {
            gameState.players[id].resto = gameState.initialDrawCards[id];
            updateLog(`Resto inicial de ${t(gameState.players[id].name)} é ${gameState.initialDrawCards[id].name}.`);
        });
    }

    // --- Habilidade de Evento: Cupido do Caos ---
    const eventBoss = Object.values(gameState.players).find(p => p.isEventBoss);
    if (eventBoss && eventBoss.aiType === 'cupidodocaos') {
        const player1 = gameState.players['player-1'];
        const player2 = gameState.players['player-2'];
        if (player1.resto && player2.resto) {
            [player1.resto, player2.resto] = [player2.resto, player1.resto];
            updateLog("Cupido do Caos usou sua habilidade! As cartas de Resto iniciais foram trocadas!");
            playSoundEffect('reversus');
        }
    }
    
    // Add a delay to prevent AI from playing too fast after the draw.
    if (!gameState.isPvp) {
        await new Promise(res => setTimeout(res, 2000));
    }
    await startNewRound(true);
};

/**
 * Displays the initial card draw sequence for a PvP match.
 * @param {object} initialGameState - The game state received from the server.
 */
export async function showPvpDrawSequence(initialGameState) {
    const { gameState } = getState(); // gameState is already set in network.js
    const drawnCards = initialGameState.drawResults;
    const startingPlayerId = initialGameState.currentPlayer;
    const startingPlayer = initialGameState.players[startingPlayerId];

    dom.drawStartTitle.textContent = t('draw.title');
    dom.drawStartResultMessage.textContent = t('draw.message_drawing');

    const translatedPlayerNames = {};
    initialGameState.playerIdsInGame.forEach(id => {
        const player = initialGameState.players[id];
        // Ensure player name is translated if it's a key
        translatedPlayerNames[id] = (player.name.startsWith('avatars.') || player.name.startsWith('player_names.') || player.name.startsWith('event_chars.')) ? t(player.name) : player.name;
    });

    dom.drawStartCardsContainerEl.innerHTML = initialGameState.playerIdsInGame.map(id => `
        <div class="draw-start-player-slot">
            <span class="player-name ${id}">${translatedPlayerNames[id]}</span>
            <div class="card modal-card" style="background-image: url('./verso_valor.png');" id="draw-card-${id}"></div>
        </div>
    `).join('');

    dom.drawStartModal.classList.remove('hidden');
    await new Promise(res => setTimeout(res, 1500));

    const cardPromises = initialGameState.playerIdsInGame.map((id, index) => {
        return new Promise(res => {
            setTimeout(() => {
                const cardEl = document.getElementById(`draw-card-${id}`);
                if (cardEl && drawnCards[id]) {
                    cardEl.outerHTML = renderCard(drawnCards[id], 'modal', id);
                }
                res();
            }, 500 * index);
        });
    });

    await Promise.all(cardPromises);
    await new Promise(res => setTimeout(res, 1500));

    if (startingPlayer) {
        dom.drawStartResultMessage.textContent = t('draw.message_winner', { winnerName: translatedPlayerNames[startingPlayerId] });
    }
    
    // This timeout should align with the server's timeout before it sends the first 'playing' state update
    await new Promise(res => setTimeout(res, 2000));
    dom.drawStartModal.classList.add('hidden');
}


/**
 * Advances the game to the next player's turn or ends the round.
 */
export async function advanceToNextPlayer() {
    const { gameState } = getState();
    if (gameState.gamePhase !== 'playing') return;

    const activePlayers = gameState.playerIdsInGame.filter(id => !gameState.players[id].isEliminated);
    
    // If all active players have passed consecutively, end the round.
    if (activePlayers.length > 0 && gameState.consecutivePasses >= activePlayers.length) {
        await endRound();
        return;
    }

    // --- Find next active player (robustly) ---
    let currentIndex = gameState.playerIdsInGame.indexOf(gameState.currentPlayer);
    let nextIndex = currentIndex;
    let attempts = 0;
    
    // This loop will find the next player who is NOT eliminated.
    // The attempts check prevents an infinite loop if all players are somehow eliminated.
    do {
        nextIndex = (nextIndex + 1) % gameState.playerIdsInGame.length;
        if (++attempts > gameState.playerIdsInGame.length * 2) { // Increased safeguard
            // This should not happen if game end is checked properly, but it's a fail-safe.
            updateLog("Nenhum jogador ativo encontrado. Forçando o fim da rodada.");
            await endRound();
            return;
        }
    } while (gameState.players[gameState.playerIdsInGame[nextIndex]].isEliminated);
    
    gameState.currentPlayer = gameState.playerIdsInGame[nextIndex];
    // --- End of finding next player ---

    const nextPlayer = gameState.players[gameState.currentPlayer];
    nextPlayer.playedValueCardThisTurn = false; // Reset for the new turn

    if (nextPlayer.id === 'player-1' && nextPlayer.hasXaelStarPower) {
        // Decrease Xael Star Power cooldown
        if (nextPlayer.xaelStarPowerCooldown > 0) {
            nextPlayer.xaelStarPowerCooldown--;
            if (nextPlayer.xaelStarPowerCooldown > 0) {
                updateLog(`Recarga do Poder Estelar: ${nextPlayer.xaelStarPowerCooldown} turnos restantes.`);
            } else {
                updateLog(`Poder Estelar está pronto!`);
            }
        }
    }

    updateLog(`É a vez de ${t(nextPlayer.name)}.`);
    renderAll();

    if (nextPlayer.isHuman) {
        await showTurnIndicator();
    } else {
        // FIX: Add a delay before the AI plays to prevent it feeling instant and causing race conditions.
        setTimeout(() => executeAiTurn(nextPlayer), 500);
    }
}

async function endRound() {
    const { gameState } = getState();
    if (gameState.gamePhase !== 'playing') return;
    
    // For PvP, the server handles round end. Client does nothing.
    if (gameState.isPvp) {
        console.log("Client skipping endRound logic for PvP match.");
        return;
    }
    
    gameState.gamePhase = 'resolution';
    renderAll(); // Update UI to show "Fim da rodada!"
    updateLog('Todos os jogadores passaram. Resolvendo a rodada...');
    await calculateScoresAndEndRound();
}


export async function startNewRound(isFirstRound = false, autoStartTurn = true) {
    const { gameState } = getState();
    if (!isFirstRound) {
        gameState.turn++;
    }
    updateLog(`--- ${t('log.new_round', { turn: gameState.isInfiniteChallenge ? gameState.infiniteChallengeLevel : gameState.turn })} ---`);
    if(autoStartTurn) {
        announceEffect(t('log.new_round_announcement', { turn: gameState.isInfiniteChallenge ? gameState.infiniteChallengeLevel : gameState.turn }), 'default', 2000);
    }


    // Reset round-specific states for each player
    gameState.playerIdsInGame.forEach(id => {
        const player = gameState.players[id];
        if (player.isEliminated) return;
        
        // Discard played cards
        gameState.discardPiles.value.push(...player.playedCards.value);
        gameState.discardPiles.effect.push(...player.playedCards.effect);
        player.playedCards = { value: [], effect: [] };

        // Update resto
        if (player.nextResto) {
            player.resto = player.nextResto;
            player.nextResto = null;
        }
        
        // --- Habilidade de Evento: Guardião da Aurora ---
        if (player.isEventBoss && player.aiType === 'guardiaodaaurora' && player.resto) {
            const restoCardIndex = gameState.discardPiles.value.findIndex(c => c.id === player.resto.id);
            if (restoCardIndex > -1) {
                const [revivedCard] = gameState.discardPiles.value.splice(restoCardIndex, 1);
                player.hand.push(revivedCard);
                updateLog(`Guardião da Aurora usou sua habilidade e reviveu sua carta de Resto (${revivedCard.name})!`);
            }
        }

        // Revert Necro X curse
        if (player.replacedCardByNecroX) {
            const curseCardIndex = player.hand.findIndex(c => c.name === 'NECRO_X_CURSE');
            if (curseCardIndex > -1) {
                player.hand.splice(curseCardIndex, 1);
            }
            player.hand.push(player.replacedCardByNecroX);
            updateLog(`A maldição de Necro X em ${player.name} se desfez.`);
            player.replacedCardByNecroX = null;
        }


        player.effects = { score: null, movement: null };
        player.playedValueCardThisTurn = false;
        player.targetPathForPula = null;
        player.tournamentScoreEffect = null; // Reset tournament effect

        // Decrease Versatrix Card cooldown per round
        const versatrixCard = player.hand.find(c => c.name === 'Carta da Versatrix');
        if (versatrixCard && versatrixCard.cooldown > 0) {
            versatrixCard.cooldown--;
             if (versatrixCard.cooldown > 0) {
                updateLog(`Recarga da Carta da Versatrix: ${versatrixCard.cooldown} rodadas restantes.`);
            } else {
                updateLog(`A Carta da Versatrix está pronta!`);
            }
        }
    });
    
    // Reset global round states
    gameState.selectedCard = null;
    gameState.reversusTotalActive = false;
    gameState.consecutivePasses = 0;
    gameState.activeFieldEffects = [];
    gameState.revealedHands = [];
    gameState.reversumAbilityUsedThisRound = false;
    gameState.necroXUsedThisRound = false;
    gameState.eventBossAbilityUsedThisRound = false;
    gameState.versatrixSwapActive = false;
    
    toggleReversusTotalBackground(false);
    dom.appContainerEl.classList.remove('reversus-total-active');
    dom.reversusTotalIndicatorEl.classList.add('hidden');

    // Draw cards to replenish hands
    gameState.playerIdsInGame.forEach(id => {
        const player = gameState.players[id];
        if (player.isEliminated) return;
        while (player.hand.filter(c => c.type === 'value').length < config.MAX_VALUE_CARDS_IN_HAND) {
            const newCard = dealCard('value');
            if (newCard) player.hand.push(newCard); else break;
        }
        // Versatrix card doesn't count towards the effect card limit
        while (player.hand.filter(c => c.type === 'effect' && c.name !== 'Carta da Versatrix').length < config.MAX_EFFECT_CARDS_IN_HAND) {
            const newCard = dealCard('effect');
            if (newCard) player.hand.push(newCard); else break;
        }
    });

    // Special Logic for King Necro Battle
    if (gameState.isKingNecroBattle) {
        await rotateAndApplyKingNecroversoBoardEffects(!isFirstRound);
        if (checkGameEnd()) return; // Stop if board effects ended the game
    }

    if (!isFirstRound) {
        // PvP check: The server now handles field effects for PvP.
        if (!gameState.isPvp) {
            await triggerFieldEffects();
        }
        if (checkGameEnd()) return;
    }
    
    gameState.gamePhase = 'playing';
    const currentPlayer = gameState.players[gameState.currentPlayer];
    currentPlayer.playedValueCardThisTurn = false; // Reset for the first player of the round

    if (autoStartTurn) {
        updateLog(`É a vez de ${t(currentPlayer.name)}.`);
        renderAll();

        if (currentPlayer.isHuman) {
            await showTurnIndicator();
        } else {
            executeAiTurn(currentPlayer);
        }
    }
}

function checkGameEnd() {
    const { gameState } = getState();
    
    // In tournament matches, the game does not end based on board position.
    // The win condition is handled in calculateScoresAndEndRound.
    if (gameState.isTournamentMatch) {
        return false;
    }

    // Specific win/loss condition for heart-based battles
    if (gameState.currentStoryBattle === 'necroverso_final') {
        if (gameState.teamB_hearts <= 0) { // Necro's team
            gameState.gamePhase = 'game_over';
            document.dispatchEvent(new CustomEvent('storyWinLoss', { detail: { battle: 'necroverso_final', won: true } }));
            return true;
        }
        if (gameState.teamA_hearts <= 0) { // Player's team
            gameState.gamePhase = 'game_over';
            document.dispatchEvent(new CustomEvent('storyWinLoss', { detail: { battle: 'necroverso_final', won: false } }));
            return true;
        }
    }
    
    if (gameState.isKingNecroBattle || (gameState.isInversusMode && !gameState.isInfiniteChallenge)) {
        const activePlayers = gameState.playerIdsInGame.filter(id => !gameState.players[id].isEliminated);
        if (activePlayers.length <= 1) {
            gameState.gamePhase = 'game_over';
            const player1Victorious = activePlayers.length === 1 && activePlayers[0] === 'player-1';
            
            document.dispatchEvent(new CustomEvent('storyWinLoss', { detail: { battle: gameState.currentStoryBattle || 'inversus', won: player1Victorious } }));
            return true;
        }
    }

    // CRITICAL FIX: In heart-based battles, the game should NOT end by reaching position 10.
    if (gameState.currentStoryBattle === 'necroverso_final' || gameState.isKingNecroBattle || gameState.isInversusMode) {
        return false; // Only heart-based win/loss applies.
    }

    // Standard win condition for all other modes (reaching position 10)
    const gameWinners = gameState.playerIdsInGame.filter(id => !gameState.players[id].isEliminated && gameState.players[id].position >= config.WINNING_POSITION);

    if (gameWinners.length > 0) {
        let actualWinners = [...gameWinners];
        
        if (gameState.isXaelChallenge) {
            const player1 = gameState.players['player-1'];
            const xael = gameState.players['player-2'];
            
            const player1Won = gameWinners.includes('player-1');
            const xaelWon = gameWinners.includes('player-2');

            if (player1Won && xaelWon) {
                // Tie-breaker: most stars. Xael wins ties.
                actualWinners = (player1.stars > xael.stars) ? ['player-1'] : ['player-2'];
            } else if (player1Won) {
                actualWinners = ['player-1'];
            } else if (xaelWon) {
                actualWinners = ['player-2'];
            } else {
                 actualWinners = []; // Should not happen if gameWinners has items
            }
        }
        
        if(actualWinners.length > 0) {
            gameState.gamePhase = 'game_over';
            if (gameState.isStoryMode) {
                 const player1Victorious = gameState.gameMode === 'duo'
                    ? actualWinners.some(id => (gameState.currentStoryBattle === 'necroverso_final' ? ['player-1', 'player-4'] : config.TEAM_A).includes(id))
                    : actualWinners.includes('player-1');
                document.dispatchEvent(new CustomEvent('storyWinLoss', { detail: { battle: gameState.currentStoryBattle, won: player1Victorious } }));
            } else {
                const winnerNames = actualWinners.map(id => gameState.players[id].name).join(' e ');
                showGameOver(`${winnerNames} venceu o jogo!`);
                grantAchievement('first_win');
            }
            return true; // Game has ended
        }
    }
    return false; // Game continues
}


async function processTournamentMatchResult_client(tournament, match, winnerId) {
    match.result = winnerId;
    match.winnerId = winnerId;

    const p1Leaderboard = tournament.leaderboard.find(p => p.id === match.p1.id);
    const p2Leaderboard = tournament.leaderboard.find(p => p.id === match.p2.id);

    if (winnerId === 'draw') {
        if (p1Leaderboard) { p1Leaderboard.points += 1; p1Leaderboard.draws += 1; }
        if (p2Leaderboard) { p2Leaderboard.points += 1; p2Leaderboard.draws += 1; }
    } else if (winnerId === match.p1.id) {
        if (p1Leaderboard) { p1Leaderboard.points += 3; p1Leaderboard.wins += 1; }
        if (p2Leaderboard) { p2Leaderboard.losses += 1; }
    } else {
        if (p2Leaderboard) { p2Leaderboard.points += 3; p2Leaderboard.wins += 1; }
        if (p1Leaderboard) { p1Leaderboard.losses += 1; }
    }
    updateState('currentTournamentState', tournament);
}

function createOfflineTournamentMatch(tournament, match) {
    const { userProfile } = getState();
    const myPlayerConfig = match.p1.id === userProfile.id ? match.p1 : match.p2;
    const opponentConfig = match.p1.id === userProfile.id ? match.p2 : match.p1;
    
    const gameOptions = {
        tournamentMatch: {
            player1: { ...myPlayerConfig, playerId: 'player-1', isHuman: true },
            player2: { ...opponentConfig, playerId: 'player-2', isHuman: false }
        },
        playerIds: ['player-1', 'player-2']
    };
    
    initializeGame('tournament', gameOptions);
}

function endOfflineTournament(tournament) {
    tournament.status = 'finished';
    tournament.leaderboard.sort((a, b) => b.points - a.points || b.wins - a.wins);
    updateState('currentTournamentState', tournament);
    renderTournamentView(tournament); // Show final champion screen
}

async function advanceToNextOfflineMatch(tournament) {
    const myProfile = getState().userProfile;

    // Check if all matches in the current round are finished
    const currentRound = tournament.schedule.find(r => r.round === tournament.currentRound);
    if (currentRound && currentRound.matches.every(m => m.result !== null)) {
        if (tournament.currentRound < 7) { // 7 rounds total in an 8-player tourney
            tournament.currentRound++;
            
            const nextRound = tournament.schedule.find(r => r.round === tournament.currentRound);
            if (nextRound) {
                for (const match of nextRound.matches) {
                    if (match.p1.isAI && match.p2.isAI && match.result === null) {
                        const rand = Math.random();
                        const winnerId = rand < 0.45 ? match.p1.id : rand < 0.9 ? match.p2.id : 'draw';
                        await processTournamentMatchResult_client(tournament, match, winnerId);
                    }
                }
            }
        } else {
            endOfflineTournament(tournament);
            return;
        }
    }

    // Find the next UNPLAYED match for the human player
    const roundForNextMatch = tournament.schedule.find(r => r.round === tournament.currentRound);
    const myNextMatch = roundForNextMatch ? roundForNextMatch.matches.find(m => 
        (m.p1.id === myProfile.id || m.p2.id === myProfile.id) && m.result === null
    ) : null;

    if (myNextMatch) {
        createOfflineTournamentMatch(tournament, myNextMatch);
    } else {
        if (tournament.status !== 'finished') {
            endOfflineTournament(tournament);
        }
    }
}


/**
 * Calculates final scores, determines winner, moves pawns, and checks for game over.
 */
async function calculateScoresAndEndRound() {
    const { gameState } = getState();
    
    // The server is the source of truth for all PvP matches, including tournaments.
    // The client should not run this logic for those games.
    if (gameState.isPvp) return;
    
    const finalScores = {};

    // 0. Reset Contravox flag before checking for new triggers
    gameState.player1CardsObscured = false;

    // 1. Calculate final scores including all effects
    gameState.playerIdsInGame.forEach(id => {
        const p = gameState.players[id];
        if (p.isEliminated) return;

        let score = p.playedCards.value.reduce((sum, card) => sum + card.value, 0);
        let restoValue = p.resto?.value || 0;

        // Check for field effects on resto
        if (gameState.activeFieldEffects.some(fe => fe.name === 'Resto Maior' && fe.appliesTo === id)) restoValue = 10;
        if (gameState.activeFieldEffects.some(fe => fe.name === 'Resto Menor' && fe.appliesTo === id)) restoValue = 2;

        if (p.effects.score === 'Mais') score += restoValue;

        let scoreModifier = 1;
        // Check for Super Exposto before applying Menos
        if (gameState.activeFieldEffects.some(fe => fe.name === 'Super Exposto' && fe.appliesTo === id)) {
            scoreModifier = 2;
             updateLog(`Efeito 'Super Exposto' dobrou o efeito negativo em ${p.name}!`);
        }
        
        if (p.effects.score === 'Menos') score -= (restoValue * scoreModifier);
        if (p.effects.score === 'NECRO X') score += 10;
        if (p.effects.score === 'NECRO X Invertido') score -= 10;
        
        // Apply tournament score effects
        if (gameState.isTournamentMatch && p.tournamentScoreEffect) {
            if (p.tournamentScoreEffect.effect === 'Sobe') score += 5;
            if (p.tournamentScoreEffect.effect === 'Desce') score -= 5;
        }

        finalScores[id] = score;
        p.liveScore = score;
    });

    // 2. Determine winner(s)
    let winners = [];
    if (gameState.playerIdsInGame.filter(pId => !gameState.players[pId].isEliminated).length > 0) {
        let highestScore = -Infinity;
        gameState.playerIdsInGame.forEach(id => {
            const p = gameState.players[id];
            if (p.isEliminated) return;
            if (finalScores[id] > highestScore) {
                highestScore = finalScores[id];
                winners = [id];
            } else if (finalScores[id] === highestScore) {
                winners.push(id);
            }
        });
    }

    // 3. Handle tie logic
    if (winners.length > 1) { // A tie exists
        if (gameState.gameMode === 'duo') {
            const teamA_Ids = gameState.currentStoryBattle === 'necroverso_final' ? ['player-1', 'player-4'] : config.TEAM_A;
            const teamB_Ids = gameState.currentStoryBattle === 'necroverso_final' ? ['player-2', 'player-3'] : config.TEAM_B;

            const firstWinnerTeam = teamA_Ids.includes(winners[0]) ? 'A' : 'B';
            const allWinnersOnSameTeam = winners.every(id => 
                (firstWinnerTeam === 'A' && teamA_Ids.includes(id)) || 
                (firstWinnerTeam === 'B' && teamB_Ids.includes(id))
            );
            if (!allWinnersOnSameTeam) {
                winners = []; // Tie between teams
            }
        } else { // Solo mode tie
            winners = []; 
        }
    }
    
    // 4. Log winner and show summary modal
    const winnerNames = winners.map(id => t(gameState.players[id].name)).join(' e ');
    updateLog(winners.length > 0 ? `Vencedor(es) da rodada: ${winnerNames}.` : "A rodada terminou em empate. Ninguém avança por pontuação.");

    // Show summary modal or announcement, with special handling for tournaments
    if (gameState.isTournamentMatch) {
        const winnerAnnounceText = winners.length > 0 ? t('round_summary.winner_text', { winnerNames }) : t('round_summary.tie_text');
        announceEffect(winnerAnnounceText, 'default', 2500);
    } else if (!gameState.isInfiniteChallenge) {
        await showRoundSummaryModal({ winners, finalScores, potWon: 0 });
    }
    
    if (gameState.isTournamentMatch) {
        await new Promise(res => setTimeout(res, 3000));
        
        const tournament = getState().currentTournamentState;
        const myProfile = getState().userProfile;
        const currentRoundSchedule = tournament.schedule.find(r => r.round === tournament.currentRound);
        const opponent = Object.values(gameState.players).find(p => !p.isHuman);
        const match = currentRoundSchedule.matches.find(m => (m.p1.id === myProfile.id && m.p2.username === opponent.name) || (m.p2.id === myProfile.id && m.p1.username === opponent.name));

        if (!match) {
            console.error("Could not find current offline tournament match!");
            return;
        }

        const myPlayerIdInGameState = Object.values(gameState.players).find(p => p.isHuman).id;
        
        if (winners.length === 1) {
            if (winners[0] === myPlayerIdInGameState) {
                match.score[0]++; // Human is always player 1 in the score array for offline
            } else {
                match.score[1]++; // AI is player 2
            }
        } else {
            match.draws++;
        }
        
        renderTournamentMatchScore(match.score);

        const [p1Score, p2Score] = match.score;
        const matchOver = (p1Score >= 2 || p2Score >= 2 || ((p1Score || 0) + (p2Score || 0) + (match.draws || 0)) >= 3);


        if (matchOver) {
            let matchWinnerId;
            if (p1Score > p2Score) {
                matchWinnerId = match.p1.id;
            } else if (p2Score > p1Score) {
                matchWinnerId = match.p2.id;
            } else {
                matchWinnerId = 'draw';
            }
            
            await processTournamentMatchResult_client(tournament, match, matchWinnerId);

            const winnerPlayer = matchWinnerId === 'draw' ? null : (matchWinnerId === match.p1.id ? match.p1 : match.p2);
            const winnerName = winnerPlayer ? (t(winnerPlayer.username) || winnerPlayer.username) : null;
            const announcement = winnerName ? `${winnerName} venceu a partida!` : 'A partida terminou em empate!';
            
            announceEffect(announcement, 'default', 4000);
            await new Promise(res => setTimeout(res, 4500)); 
            
            dom.appContainerEl.classList.add('hidden');
            clearTournamentMatchScore();
            updateState('gameState', null);
            
            await advanceToNextOfflineMatch(tournament);
            return;
        } else {
            if (winners.length > 0) {
                gameState.currentPlayer = winners[0];
            }
            await startNewRound();
        }
        return;
    }
    
    // Handle INVERSUS heart loss & Infinite Challenge duel end
    if (gameState.isInversusMode) {
        const player1Won = winners.includes('player-1');
        const opponentWon = winners.includes('player-2');
        const player1 = gameState.players['player-1'];
        const opponent = gameState.players['player-2'];

        if (opponentWon && player1) {
            player1.hearts = Math.max(0, player1.hearts - 1);
            updateLog(`Você perdeu a rodada e 1 coração! Restam: ${player1.hearts}.`);
            playSoundEffect('coracao');
            announceEffect('💔', 'heartbreak', 1500);
            if (player1.hearts <= 0) player1.isEliminated = true;
        } else if (player1Won && opponent) {
            opponent.hearts = Math.max(0, opponent.hearts - 1);
            updateLog(`O oponente perdeu a rodada e 1 coração! Restam: ${opponent.hearts}.`);
            playSoundEffect('coracao');
            announceEffect('💔', 'heartbreak', 1500);
            if (opponent.hearts <= 0) opponent.isEliminated = true;
        }

        if (gameState.isInfiniteChallenge) {
            if (opponent.isEliminated) {
                gameState.infiniteChallengeLevel++;
                const opponentQueue = getState().infiniteChallengeOpponentQueue;
                opponentQueue.shift();
                if (opponentQueue.length === 0) {
                    document.dispatchEvent(new CustomEvent('infiniteChallengeEnd', { detail: { reason: 'win' } }));
                } else {
                    document.dispatchEvent(new Event('showBuffSelection'));
                }
                return; 
            }
            if (player1.isEliminated) {
                document.dispatchEvent(new CustomEvent('infiniteChallengeEnd', { detail: { reason: 'loss' } }));
                return;
            }
        } else {
            if (checkGameEnd()) return;
        }
    }
    
    if (gameState.isKingNecroBattle) {
        const activePlayers = gameState.playerIdsInGame.filter(id => !gameState.players[id].isEliminated);
        if (activePlayers.length > 1) {
            let lowestScore = Infinity;
            activePlayers.forEach(id => {
                if (finalScores[id] < lowestScore) {
                    lowestScore = finalScores[id];
                }
            });
            
            const losers = activePlayers.filter(id => finalScores[id] === lowestScore);
            
            if (losers.length > 0) {
                const loserNames = losers.map(id => gameState.players[id].name).join(', ');
                updateLog(`${loserNames} tiveram a menor pontuação e perdem 1 coração cada!`);
                
                for (const loserId of losers) {
                    const loserPlayer = gameState.players[loserId];
                    loserPlayer.hearts--;
                    playSoundEffect('coracao');
                    announceEffect('💔', 'heartbreak', 1500);
                    updateLog(`Corações de ${loserPlayer.name}: ${loserPlayer.hearts}`);
                    
                    if (loserPlayer.hearts <= 0) {
                        loserPlayer.hearts = 0; // Prevent negative hearts
                        loserPlayer.isEliminated = true;
                        updateLog(`${loserPlayer.name} foi eliminado da batalha!`);
                    }
                }
            }
        }
        if (checkGameEnd()) return; // Stop if game ended due to heart loss
    }
    
    if (gameState.currentStoryBattle === 'necroverso_final' && winners.length > 0) {
        const winningTeamIsA = (gameState.currentStoryBattle === 'necroverso_final' ? ['player-1', 'player-4'] : config.TEAM_A).includes(winners[0]);
        if (winningTeamIsA) {
            gameState.teamB_hearts--;
            updateLog(`A equipe do Necroverso perdeu a rodada e 1 coração! Restam: ${gameState.teamB_hearts}`);
        } else {
            gameState.teamA_hearts--;
            updateLog(`Sua equipe perdeu a rodada e 1 coração! Restam: ${gameState.teamA_hearts}`);
        }
        playSoundEffect('coracao');
        announceEffect('💔', 'heartbreak', 1500);
        if (checkGameEnd()) return; // Stop if game ended due to heart loss
    }
    
    if (!gameState.isInversusMode && !gameState.isKingNecroBattle) {
        for (const id of gameState.playerIdsInGame) {
            const p = gameState.players[id];
            if (p.isEliminated) continue;

            if (p.effects.movement === 'Pula' && p.targetPathForPula !== null) {
                p.pathId = p.targetPathForPula;
                updateLog(`${p.name} foi forçado a pular para o caminho ${p.targetPathForPula + 1}.`);
            }

            let netMovement = 0;
            const isWinner = winners.includes(id);
            const isLoser = !isWinner && winners.length > 0;

            if (p.effects.movement === 'Sobe') netMovement++;
            if (p.effects.movement === 'Desce') {
                let movementModifier = gameState.activeFieldEffects.some(fe => fe.name === 'Super Exposto' && fe.appliesTo === id) ? 2 : 1;
                netMovement -= (1 * movementModifier);
            }

            if (isWinner) {
                if (gameState.activeFieldEffects.some(fe => fe.name === 'Parada' && fe.appliesTo === id)) {
                    updateLog(`Efeito 'Parada' impede ${p.name} de avançar.`);
                } else {
                    let advanceAmount = 1;
                    if (gameState.activeFieldEffects.some(fe => fe.name === 'Desafio' && fe.appliesTo === id) && p.effects.score !== 'Mais' && p.effects.movement !== 'Sobe') {
                        advanceAmount = 3;
                        updateLog(`Efeito 'Desafio' completo! ${p.name} ganha um bônus de avanço!`);
                    }
                    netMovement += advanceAmount;
                }
            } else if (isLoser) {
                if (gameState.activeFieldEffects.some(fe => fe.name === 'Castigo' && fe.appliesTo === id)) {
                    netMovement -= 3;
                    updateLog(`Efeito 'Castigo' ativado para ${p.name}.`);
                }
                if (gameState.activeFieldEffects.some(fe => fe.name === 'Impulso' && fe.appliesTo === id)) {
                    netMovement += 1;
                    updateLog(`Efeito 'Impulso' ativado para ${p.name}.`);
                }
            }

            if (netMovement !== 0) {
                const oldPosition = p.position;
                p.position = Math.min(config.WINNING_POSITION, Math.max(1, p.position + netMovement));
                updateLog(`${p.name} ${netMovement > 0 ? 'avançou' : 'voltou'} de ${oldPosition} para ${p.position}.`);
            }
        }
    }
    
    if (checkGameEnd()) {
        return;
    }

    for (const id of gameState.playerIdsInGame) {
        if (!gameState.players[id].isEliminated) {
            await checkAndTriggerPawnLandingAbilities(gameState.players[id]);
        }
    }
    
    if (checkGameEnd()) {
        return;
    }

    if (winners.length > 0) {
        const winnerTurnOrder = gameState.playerIdsInGame.filter(pId => winners.includes(pId));
        if (winnerTurnOrder.length > 0) {
            gameState.currentPlayer = winnerTurnOrder[0];
        }
    }
    
    await startNewRound();
}


export async function startNextInfiniteChallengeDuel() {
    const { gameState, infiniteChallengeOpponentQueue } = getState();
    if (!gameState || !gameState.isInfiniteChallenge || infiniteChallengeOpponentQueue.length === 0) {
        return;
    }

    // Capture the final 'resto' from the previous duel for both players
    const player1 = gameState.players['player-1'];
    const previousOpponent = gameState.players['player-2'];
    const player1FinalResto = player1.nextResto || player1.resto;
    const opponentFinalResto = previousOpponent ? (previousOpponent.nextResto || previousOpponent.resto) : null;


    // 1. Reset player states, preserving player 1's hand/resto and setting up the new opponent.
    Object.values(gameState.players).forEach(p => {
        if (p.id === 'player-1') {
            // Player 1 (Human) Partial Reset
            p.position = 1;
            p.resto = player1FinalResto; // Carry over the final resto
            // hand is preserved
            p.nextResto = null;
            p.effects = { score: null, movement: null };
            p.playedCards = { value: [], effect: [] };
            p.playedValueCardThisTurn = false;
            p.liveScore = 0;
            p.status = 'neutral';
            p.isEliminated = false; 
            p.forceResto10 = false; // Buff-related flags should be reset unless re-applied
            p.isImmuneToNegativeEffects = false;
            p.isImmuneToDefeat = false;
        } else if (p.id === 'player-2') {
            // Player 2 (New Opponent) Full Reset
            p.position = 1;
            p.hand = [];
            p.resto = opponentFinalResto; // Inherit previous opponent's final resto
            p.nextResto = null;
            p.effects = { score: null, movement: null };
            p.playedCards = { value: [], effect: [] };
            p.playedValueCardThisTurn = false;
            p.liveScore = 0;
            p.status = 'neutral';
            p.hearts = 1;
            p.isEliminated = false;
            // Clear any special AI properties
            p.isEventBoss = false;
            p.eventAbilityUsedThisMatch = false;
            p.narratorAbilities = undefined;
            p.stars = 0;
            p.forceResto10 = false;
            p.isImmuneToNegativeEffects = false;
            p.isImmuneToDefeat = false;
        }
    });

    // 2. Set up the new opponent for the next duel.
    const nextOpponentData = infiniteChallengeOpponentQueue[0];
    const opponent = gameState.players['player-2'];
    opponent.name = nextOpponentData.name || (nextOpponentData.nameKey ? t(nextOpponentData.nameKey) : 'Opponent');
    opponent.aiType = nextOpponentData.aiType;
    opponent.avatar_url = nextOpponentData.avatar_url;

    // Reset decks for a fresh match BEFORE applying buffs that draw cards.
    gameState.decks.value = shuffle(createDeck(config.VALUE_DECK_CONFIG, 'value'));
    gameState.decks.effect = shuffle(createDeck(config.EFFECT_DECK_CONFIG, 'effect'));
    gameState.discardPiles = { value: [], effect: [] };

    // 3. Replenish hand to base size, but don't start the turn yet.
    await startNewRound(true, false);

    // 4. Apply the chosen buff for the human player.
    // Re-fetch state because `await` allows other code to run.
    const { gameState: updatedGameState, activeBuff } = getState();
    const player1Updated = updatedGameState.players['player-1'];
    
    if (activeBuff) {
        updateLog(`Bônus ativado: ${t(`buffs.${activeBuff}_name`)}`);
        switch (activeBuff) {
            case 'resto_10':
                player1Updated.forceResto10 = true;
                break;
            case 'immunity_negative':
                player1Updated.isImmuneToNegativeEffects = true;
                break;
            case 'discard_low_draw_value':
                const lowValueCard = player1Updated.hand.filter(c => c.type === 'value').sort((a,b) => a.value - b.value)[0];
                if (lowValueCard) {
                    const idx = player1Updated.hand.findIndex(c => c.id === lowValueCard.id);
                    player1Updated.hand.splice(idx, 1);
                    const newCard = dealCard('value');
                    if(newCard) player1Updated.hand.push(newCard);
                }
                break;
            case 'discard_effect_draw_effect':
                 const effectCard = player1Updated.hand.find(c => c.type === 'effect');
                 if (effectCard) {
                    const idx = player1Updated.hand.findIndex(c => c.id === effectCard.id);
                    player1Updated.hand.splice(idx, 1);
                    const newCard = dealCard('effect');
                    if(newCard) player1Updated.hand.push(newCard);
                 }
                break;
            case 'draw_10_discard_one':
                const lowCard = player1Updated.hand.filter(c => c.type === 'value').sort((a,b) => a.value - b.value)[0];
                if (lowCard) {
                    const idx = player1Updated.hand.findIndex(c => c.id === lowCard.id);
                    player1Updated.hand.splice(idx, 1);
                }
                player1Updated.hand.push({ id: Date.now(), type: 'value', name: 10, value: 10 });
                break;
             case 'draw_reversus_total':
                 const effectCardToDiscard = player1Updated.hand.find(c => c.type === 'effect');
                 if (effectCardToDiscard) {
                    const idx = player1Updated.hand.findIndex(c => c.id === effectCardToDiscard.id);
                    player1Updated.hand.splice(idx, 1);
                 }
                 player1Updated.hand.push({ id: Date.now(), type: 'effect', name: 'Reversus Total' });
                 break;
            case 'reveal_opponent_hand':
                updatedGameState.revealedHands.push('player-2');
                break;
            case 'draw_two_effect':
                for(let i=0; i<2; i++) {
                    const newCard = dealCard('effect');
                    if (newCard) player1Updated.hand.push(newCard);
                }
                break;
            case 'draw_two_value':
                 for(let i=0; i<2; i++) {
                    const newCard = dealCard('value');
                    if (newCard) player1Updated.hand.push(newCard);
                }
                break;
            case 'immunity_defeat':
                player1Updated.isImmuneToDefeat = true;
                break;
            case 'versatrix_card':
                for (let i = 0; i < 4; i++) {
                    const newCard = dealCard('effect');
                    if (newCard) player1Updated.hand.push(newCard);
                }
                for (let i = 0; i < 4; i++) {
                    const newCard = dealCard('value');
                    if (newCard) player1Updated.hand.push(newCard);
                }
                break;
            case 'contravox_card':
                const opp = updatedGameState.players['player-2'];
                for (let i = 0; i < 2; i++) {
                    const effectCardIndex = opp.hand.findIndex(c => c.type === 'effect');
                    if (effectCardIndex > -1) {
                        const [removedCard] = opp.hand.splice(effectCardIndex, 1);
                        updatedGameState.discardPiles.effect.push(removedCard);
                    }
                }
                break;
            case 'necroverso_card': {
                const opp = updatedGameState.players['player-2'];
                const valueCards = opp.hand.filter(c => c.type === 'value').sort((a, b) => b.value - a.value);
                if (valueCards.length > 0) {
                    const highestCard = valueCards[0];
                    const cardInHand = opp.hand.find(c => c.id === highestCard.id);
                    if (cardInHand) {
                        cardInHand.isFrozen = true;
                    }
                }
                break;
            }
            case 'rei_reversum_card': {
                const effectToDiscard = player1Updated.hand.find(c => c.type === 'effect');
                if (effectToDiscard) {
                    const idx = player1Updated.hand.findIndex(c => c.id === effectToDiscard.id);
                    player1Updated.hand.splice(idx, 1);
                }
                player1Updated.hand.push({ id: Date.now(), type: 'effect', name: 'Reversus Total' });
                break;
            }
        }
        updateState('activeBuff', null);
    }
    
    // 5. Manually start the first turn now that buffs are applied.
    const currentPlayer = updatedGameState.players[updatedGameState.currentPlayer];
    announceEffect(t('log.new_round_announcement', { turn: updatedGameState.isInfiniteChallenge ? updatedGameState.infiniteChallengeLevel : updatedGameState.turn }), 'default', 2000);
    updateLog(`É a vez de ${t(currentPlayer.name)}.`);
    renderAll(); // Re-render to show buffed hand

    if (currentPlayer.isHuman) {
        await showTurnIndicator();
    } else {
        executeAiTurn(currentPlayer);
    }
}