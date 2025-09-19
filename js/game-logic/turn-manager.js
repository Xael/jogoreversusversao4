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


/**
 * Displays the initial draw sequence for a PvP match based on server results.
 * @param {object} gameState - The initial game state from the server.
 */
export async function showPvpDrawSequence(gameState) {
    const { drawResults, currentPlayer: startingPlayerId } = gameState;

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

    const cardPromises = [];
    for (const id of gameState.playerIdsInGame) {
        const card = drawResults[id];
        const cardEl = document.getElementById(`draw-card-${id}`);
        const promise = new Promise(res => {
            setTimeout(() => {
                if (cardEl) cardEl.outerHTML = renderCard(card, 'modal');
                res();
            }, 500 * (cardPromises.length));
        });
        cardPromises.push(promise);
    }
    
    await Promise.all(cardPromises);
    await new Promise(res => setTimeout(res, 1500));

    const winner = gameState.players[startingPlayerId];
    dom.drawStartResultMessage.textContent = t('draw.message_winner', { winnerName: winner.name });

    await new Promise(res => setTimeout(res, 2000));
    dom.drawStartModal.classList.add('hidden');
}


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
                <span class="player-name ${id}">${player.name}</span>
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
                if(cardEl) cardEl.outerHTML = renderCard(card, 'modal');
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
    
    const logParts = gameState.playerIdsInGame.map(id => `${gameState.players[id].name} sacou ${drawnCards[id].name}`);
    updateLog(`Sorteio: ${logParts.join(', ')}.`);
    
    if (sortedPlayers.length < 2 || (drawnCards[sortedPlayers[0]]?.value > drawnCards[sortedPlayers[1]]?.value)) {
        const winner = gameState.players[sortedPlayers[0]];
        gameState.currentPlayer = winner.id;
        gameState.initialDrawCards = drawnCards;
        dom.drawStartResultMessage.textContent = `${winner.name} tirou a carta mais alta e começa!`;
        
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
            updateLog(`Resto inicial de ${gameState.players[id].name} é ${gameState.initialDrawCards[id].name}.`);
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
    
    await startNewRound(true);
};

/**
 * Advances the game to the next player's turn or ends the round.
 */
export async function advanceToNextPlayer() {
    const { gameState } = getState();
    if (gameState.gamePhase !== 'playing') return;
    
    if (gameState.isAltarDefense) {
        if (gameState.gameMode === 'altar-duo' && gameState.currentPlayer === 'player-1') {
            // It's the human's turn in duo, advance to the AI ally
            const allyId = gameState.playerIdsInGame.find(id => id !== 'player-1' && !gameState.players[id].name.includes('Necroverso'));
            gameState.currentPlayer = allyId;
            const nextPlayer = gameState.players[gameState.currentPlayer];
            updateLog(`É a vez de ${nextPlayer.name}.`);
            renderAll();
            executeAiTurn(nextPlayer);
            return;
        }
        // If it's solo mode, OR it's the AI ally's turn in duo mode, the round ends.
        await endRound();
        return;
    }

    const activePlayers = gameState.playerIdsInGame.filter(id => !gameState.players[id].isEliminated);
    const endRoundPassCount = activePlayers.length * 2;

    if (activePlayers.length > 0 && gameState.consecutivePasses >= endRoundPassCount) {
        await endRound();
        return;
    }
    
    if (activePlayers.length > 0 && gameState.consecutivePasses === activePlayers.length) {
        updateLog("ÚLTIMA CHAMADA! Todos os jogadores passaram. A rodada terminará se todos passarem novamente.");
    }

    let currentIndex = gameState.playerIdsInGame.indexOf(gameState.currentPlayer);
    let nextIndex = currentIndex;
    let attempts = 0;
    
    do {
        nextIndex = (nextIndex + 1) % gameState.playerIdsInGame.length;
        if (++attempts > gameState.playerIdsInGame.length * 2) { 
            updateLog("Nenhum jogador ativo encontrado. Forçando o fim da rodada.");
            await endRound();
            return;
        }
    } while (gameState.players[gameState.playerIdsInGame[nextIndex]].isEliminated);
    
    gameState.currentPlayer = gameState.playerIdsInGame[nextIndex];

    const nextPlayer = gameState.players[gameState.currentPlayer];
    nextPlayer.playedValueCardThisTurn = false;

    if (nextPlayer.id === 'player-1' && nextPlayer.hasXaelStarPower) {
        if (nextPlayer.xaelStarPowerCooldown > 0) {
            nextPlayer.xaelStarPowerCooldown--;
            if (nextPlayer.xaelStarPowerCooldown > 0) {
                updateLog(`Recarga do Poder Estelar: ${nextPlayer.xaelStarPowerCooldown} turnos restantes.`);
            } else {
                updateLog(`Poder Estelar está pronto!`);
            }
        }
    }

    updateLog(`É a vez de ${nextPlayer.name}.`);
    renderAll();

    if (nextPlayer.isHuman) {
        await showTurnIndicator();
    } else {
        executeAiTurn(nextPlayer);
    }
}

async function endRound() {
    const { gameState } = getState();
    if (gameState.gamePhase !== 'playing') return;
    
    gameState.gamePhase = 'resolution';
    renderAll(); 
    updateLog('Resolvendo a rodada...');
    await calculateScoresAndEndRound();
}


export async function startNewRound(isFirstRound = false, autoStartTurn = true) {
    const { gameState } = getState();
    if (!isFirstRound && !gameState.isAltarDefense) {
        gameState.turn++;
    }

    if (gameState.isAltarDefense) {
        updateLog(`--- ONDA ${gameState.wave} - RODADA ${gameState.round} de ${gameState.targetRounds} ---`);
    } else {
        updateLog(`--- ${t('log.new_round', { turn: gameState.isInfiniteChallenge ? gameState.infiniteChallengeLevel : gameState.turn })} ---`);
        if(autoStartTurn) {
            announceEffect(t('log.new_round_announcement', { turn: gameState.isInfiniteChallenge ? gameState.infiniteChallengeLevel : gameState.turn }), 'default', 2000);
        }
    }


    // Reset round-specific states for each player
    gameState.playerIdsInGame.forEach(id => {
        const player = gameState.players[id];
        if (player.isEliminated) return;
        
        gameState.discardPiles.value.push(...player.playedCards.value);
        gameState.discardPiles.effect.push(...player.playedCards.effect);
        player.playedCards = { value: [], effect: [] };

        if (player.nextResto) {
            player.resto = player.nextResto;
            player.nextResto = null;
        }
        
        if (player.isEventBoss && player.aiType === 'guardiaodaaurora' && player.resto) {
            const restoCardIndex = gameState.discardPiles.value.findIndex(c => c.id === player.resto.id);
            if (restoCardIndex > -1) {
                const [revivedCard] = gameState.discardPiles.value.splice(restoCardIndex, 1);
                player.hand.push(revivedCard);
                updateLog(`Guardião da Aurora usou sua habilidade e reviveu sua carta de Resto (${revivedCard.name})!`);
            }
        }

        if (player.replacedCardByNecroX) {
            const curseCardIndex = player.hand.findIndex(c => c.name === 'NECRO_X_CURSE');
            if (curseCardIndex > -1) player.hand.splice(curseCardIndex, 1);
            player.hand.push(player.replacedCardByNecroX);
            updateLog(`A maldição de Necro X em ${player.name} se desfez.`);
            player.replacedCardByNecroX = null;
        }


        player.effects = { score: null, movement: null };
        player.playedValueCardThisTurn = false;
        player.targetPathForPula = null;

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

    gameState.playerIdsInGame.forEach(id => {
        const player = gameState.players[id];
        if (player.isEliminated) return;
        while (player.hand.filter(c => c.type === 'value').length < config.MAX_VALUE_CARDS_IN_HAND) {
            const newCard = dealCard('value');
            if (newCard) player.hand.push(newCard); else break;
        }
        while (player.hand.filter(c => c.type === 'effect' && c.name !== 'Carta da Versatrix').length < config.MAX_EFFECT_CARDS_IN_HAND) {
            const newCard = dealCard('effect');
            if (newCard) player.hand.push(newCard); else break;
        }
    });

    if (gameState.isKingNecroBattle) {
        await rotateAndApplyKingNecroversoBoardEffects(!isFirstRound);
        if (checkGameEnd()) return;
    }

    if (!isFirstRound && !gameState.isAltarDefense) {
        if (!gameState.isPvp) {
            await triggerFieldEffects();
        }
        if (checkGameEnd()) return;
    }
    
    gameState.gamePhase = 'playing';
    const currentPlayer = gameState.players[gameState.currentPlayer];
    currentPlayer.playedValueCardThisTurn = false;

    if (autoStartTurn) {
        updateLog(`É a vez de ${currentPlayer.name}.`);
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
    
    if (gameState.isAltarDefense) {
        // Altar defense has no standard game end, it's handled in its own logic
        return false;
    }

    if (gameState.currentStoryBattle === 'necroverso_final') {
        if (gameState.teamB_hearts <= 0) {
            gameState.gamePhase = 'game_over';
            document.dispatchEvent(new CustomEvent('storyWinLoss', { detail: { battle: 'necroverso_final', won: true } }));
            return true;
        }
        if (gameState.teamA_hearts <= 0) {
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

    if (gameState.currentStoryBattle === 'necroverso_final' || gameState.isKingNecroBattle || gameState.isInversusMode) {
        return false; 
    }

    const gameWinners = gameState.playerIdsInGame.filter(id => !gameState.players[id].isEliminated && gameState.players[id].position >= config.WINNING_POSITION);

    if (gameWinners.length > 0) {
        let actualWinners = [...gameWinners];
        
        if (gameState.isXaelChallenge) {
            const player1 = gameState.players['player-1'];
            const xael = gameState.players['player-2'];
            
            const player1Won = gameWinners.includes('player-1');
            const xaelWon = gameWinners.includes('player-2');

            if (player1Won && xaelWon) {
                actualWinners = (player1.stars > xael.stars) ? ['player-1'] : ['player-2'];
            } else if (player1Won) {
                actualWinners = ['player-1'];
            } else if (xaelWon) {
                actualWinners = ['player-2'];
            } else {
                 actualWinners = [];
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
            return true;
        }
    }
    return false;
}


/**
 * Calculates final scores, determines winner, moves pawns, and checks for game over.
 */
async function calculateScoresAndEndRound() {
    const { gameState } = getState();

    // Special logic for Altar Defense mode
    if (gameState.isAltarDefense) {
        await handleAltarDefenseRoundEnd();
        return;
    }
    
    const finalScores = {};
    gameState.player1CardsObscured = false;

    gameState.playerIdsInGame.forEach(id => {
        const p = gameState.players[id];
        if (p.isEliminated) return;

        let score = p.playedCards.value.reduce((sum, card) => sum + card.value, 0);
        let restoValue = p.resto?.value || 0;

        if (gameState.activeFieldEffects.some(fe => fe.name === 'Resto Maior' && fe.appliesTo === id)) restoValue = 10;
        if (gameState.activeFieldEffects.some(fe => fe.name === 'Resto Menor' && fe.appliesTo === id)) restoValue = 2;

        if (p.effects.score === 'Mais') score += restoValue;

        let scoreModifier = 1;
        if (gameState.activeFieldEffects.some(fe => fe.name === 'Super Exposto' && fe.appliesTo === id)) {
            scoreModifier = 2;
             updateLog(`Efeito 'Super Exposto' dobrou o efeito negativo em ${p.name}!`);
        }
        
        if (p.effects.score === 'Menos') score -= (restoValue * scoreModifier);
        if (p.effects.score === 'NECRO X') score += 10;
        if (p.effects.score === 'NECRO X Invertido') score -= 10;

        finalScores[id] = score;
        p.liveScore = score;
    });

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

    if (winners.length > 1) { 
        if (gameState.gameMode === 'duo') {
            const teamA_Ids = gameState.currentStoryBattle === 'necroverso_final' ? ['player-1', 'player-4'] : config.TEAM_A;
            const teamB_Ids = gameState.currentStoryBattle === 'necroverso_final' ? ['player-2', 'player-3'] : config.TEAM_B;
            const firstWinnerTeam = teamA_Ids.includes(winners[0]) ? 'A' : 'B';
            const allWinnersOnSameTeam = winners.every(id => 
                (firstWinnerTeam === 'A' && teamA_Ids.includes(id)) || 
                (firstWinnerTeam === 'B' && teamB_Ids.includes(id))
            );
            if (!allWinnersOnSameTeam) winners = [];
        } else {
            winners = []; 
        }
    }
    
    if (winners.length > 0) {
        const winnerNames = winners.map(id => gameState.players[id].name).join(' e ');
        updateLog(`Vencedor(es) da rodada: ${winnerNames}.`);
    } else {
        updateLog("A rodada terminou em empate. Ninguém avança por pontuação.");
    }
    
    if (!gameState.isInfiniteChallenge) {
        await showRoundSummaryModal({ winners, finalScores, potWon: 0 });
    }

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
            activePlayers.forEach(id => { if (finalScores[id] < lowestScore) lowestScore = finalScores[id]; });
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
                        loserPlayer.hearts = 0;
                        loserPlayer.isEliminated = true;
                        updateLog(`${loserPlayer.name} foi eliminado da batalha!`);
                    }
                }
            }
        }
        if (checkGameEnd()) return;
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
        if (checkGameEnd()) return;
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
    
    if (checkGameEnd()) return;

    for (const id of gameState.playerIdsInGame) {
        if (!gameState.players[id].isEliminated) {
            await checkAndTriggerPawnLandingAbilities(gameState.players[id]);
        }
    }
    
    if (checkGameEnd()) return;

    if (winners.length > 0) {
        const winnerTurnOrder = gameState.playerIdsInGame.filter(pId => winners.includes(pId));
        if (winnerTurnOrder.length > 0) {
            gameState.currentPlayer = winnerTurnOrder[0];
        }
    }
    
    await startNewRound();
}

/**
 * Handles the end of a round in Altar Defense mode.
 */
async function handleAltarDefenseRoundEnd() {
    const { gameState } = getState();
    
    let playerScore, necroScore;
    if (gameState.gameMode === 'altar-duo') {
        const playerTeamIds = ['player-1', 'player-3'];
        const necroTeamIds = ['player-2', 'player-4'];
        playerScore = playerTeamIds.reduce((sum, id) => sum + (gameState.players[id]?.liveScore || 0), 0);
        necroScore = necroTeamIds.reduce((sum, id) => sum + (gameState.players[id]?.liveScore || 0), 0);
    } else { // solo
        const player = gameState.players['player-1'];
        const necroAIs = gameState.playerIdsInGame.filter(id => !gameState.players[id].isHuman);
        playerScore = player.liveScore;
        necroScore = necroAIs.reduce((sum, id) => sum + gameState.players[id].liveScore, 0);
    }
    
    // 2. Determine round winner and apply pushback
    if (playerScore > necroScore) {
        updateLog(`Você venceu a rodada (${playerScore} vs ${necroScore})! Escolha um Necro-peão para empurrar.`);
        
        // Let player choose which pawn to push
        dom.altarPushButtons.innerHTML = gameState.necroPawns.map((pawn, index) => 
            `<button class="control-button" data-necro-id="${pawn.id}">Necro-peão ${index + 1} (Caminho ${pawn.pathId + 1})</button>`
        ).join('');
        dom.altarPushModal.classList.remove('hidden');

        const chosenPawnId = await new Promise(resolve => {
            const handler = (e) => {
                if (e.target.matches('.control-button')) {
                    dom.altarPushButtons.removeEventListener('click', handler);
                    resolve(e.target.dataset.necroId);
                }
            };
            dom.altarPushButtons.addEventListener('click', handler);
        });

        dom.altarPushModal.classList.add('hidden');
        const pawnToPush = gameState.necroPawns.find(p => p.id === chosenPawnId);
        if (pawnToPush) {
            pawnToPush.position = Math.max(1, pawnToPush.position - 1);
            updateLog(`Você empurrou um Necro-peão para a casa ${pawnToPush.position}.`);
        }
    } else {
        updateLog(`Você perdeu ou empatou a rodada (${playerScore} vs ${necroScore}). Nenhum peão foi empurrado.`);
    }

    // 3. Advance all necro pawns
    updateLog("Os Necro-peões avançam!");
    gameState.necroPawns.forEach(pawn => {
        pawn.position++;
    });
    renderAll();
    await new Promise(res => setTimeout(res, 1000));

    // 4. Check for loss condition
    const pawnAtAltar = gameState.necroPawns.find(pawn => pawn.position >= config.WINNING_POSITION);
    if (pawnAtAltar) {
        gameState.gamePhase = 'game_over';
        showGameOver(
            `Um Necro-peão alcançou o Altar! Você sobreviveu até a Onda ${gameState.wave}, Rodada ${gameState.round}.`,
            'Derrota!',
            { action: 'menu', text: t('game_over.back_to_menu') }
        );
        return;
    }

    // 5. Check for wave completion
    gameState.round++;
    if (gameState.round > gameState.targetRounds) {
        gameState.wave++;
        
        // Define next wave targets
        const waveTargets = { 2: 15, 3: 20 };

        if (gameState.wave > 3) { // VICTORY!
            gameState.gamePhase = 'game_over';
            // TODO: Add reward logic (Title, CoinVersus)
            showGameOver(
                'Você defendeu o Altar com sucesso e repeliu a invasão do Necroverso!',
                'VITÓRIA!',
                 { action: 'menu', text: t('game_over.back_to_menu') }
            );
            return;
        }

        updateLog(`Onda ${gameState.wave - 1} completa! A próxima onda está começando.`);
        gameState.round = 1;
        gameState.targetRounds = waveTargets[gameState.wave];

        // Reset necro pawns to the middle for the new wave
        gameState.necroPawns.forEach(pawn => pawn.position = 5);
        
        // TODO: Add buff selection modal here for between waves
        await new Promise(res => setTimeout(res, 2000));
    }

    // 6. Start the next round
    await startNewRound();
}



export async function startNextInfiniteChallengeDuel() {
    const { gameState, infiniteChallengeOpponentQueue } = getState();
    if (!gameState || !gameState.isInfiniteChallenge || infiniteChallengeOpponentQueue.length === 0) {
        return;
    }

    const player1 = gameState.players['player-1'];
    const previousOpponent = gameState.players['player-2'];
    const player1FinalResto = player1.nextResto || player1.resto;
    const opponentFinalResto = previousOpponent ? (previousOpponent.nextResto || previousOpponent.resto) : null;


    Object.values(gameState.players).forEach(p => {
        if (p.id === 'player-1') {
            p.position = 1;
            p.resto = player1FinalResto;
            p.nextResto = null;
            p.effects = { score: null, movement: null };
            p.playedCards = { value: [], effect: [] };
            p.playedValueCardThisTurn = false;
            p.liveScore = 0;
            p.status = 'neutral';
            p.isEliminated = false; 
            p.forceResto10 = false;
            p.isImmuneToNegativeEffects = false;
            p.isImmuneToDefeat = false;
        } else if (p.id === 'player-2') {
            p.position = 1;
            p.hand = [];
            p.resto = opponentFinalResto;
            p.nextResto = null;
            p.effects = { score: null, movement: null };
            p.playedCards = { value: [], effect: [] };
            p.playedValueCardThisTurn = false;
            p.liveScore = 0;
            p.status = 'neutral';
            p.hearts = 1;
            p.isEliminated = false;
            p.isEventBoss = false;
            p.eventAbilityUsedThisMatch = false;
            p.narratorAbilities = undefined;
            p.stars = 0;
            p.forceResto10 = false;
            p.isImmuneToNegativeEffects = false;
            p.isImmuneToDefeat = false;
        }
    });

    const nextOpponentData = infiniteChallengeOpponentQueue[0];
    const opponent = gameState.players['player-2'];
    opponent.name = nextOpponentData.name || (nextOpponentData.nameKey ? t(nextOpponentData.nameKey) : 'Opponent');
    opponent.aiType = nextOpponentData.aiType;
    opponent.avatar_url = nextOpponentData.avatar_url;

    gameState.decks.value = shuffle(createDeck(config.VALUE_DECK_CONFIG, 'value'));
    gameState.decks.effect = shuffle(createDeck(config.EFFECT_DECK_CONFIG, 'effect'));
    gameState.discardPiles = { value: [], effect: [] };

    await startNewRound(true, false);

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
    
    const currentPlayer = updatedGameState.players[updatedGameState.currentPlayer];
    announceEffect(t('log.new_round_announcement', { turn: updatedGameState.isInfiniteChallenge ? updatedGameState.infiniteChallengeLevel : updatedGameState.turn }), 'default', 2000);
    updateLog(`É a vez de ${currentPlayer.name}.`);
    renderAll();

    if (currentPlayer.isHuman) {
        await showTurnIndicator();
    } else {
        executeAiTurn(currentPlayer);
    }
}