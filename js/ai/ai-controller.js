// js/ai/ai-controller.js

import { getState } from '../core/state.js';
import { updateLog } from '../core/utils.js';
import { renderAll } from '../ui/ui-renderer.js';
import { playCard } from '../game-logic/player-actions.js';
import { tryToSpeak, triggerNecroX } from '../story/story-abilities.js';
import { playSoundEffect, announceEffect } from '../core/sound.js';
import * as config from '../core/config.js';
import * as network from '../core/network.js';
import { t } from '../core/i18n.js';

/**
 * Helper function to get the inverse of a card effect.
 * @param {string} effect - The effect name ('Mais', 'Menos', 'Sobe', 'Desce').
 * @returns {string|null} The inverse effect name or null if not applicable.
 */
const getInverseEffect = (effect) => {
    const map = { 'Mais': 'Menos', 'Menos': 'Mais', 'Sobe': 'Desce', 'Desce': 'Sobe' };
    return map[effect] || null;
};

/**
 * Determines the AI difficulty based on the current game state.
 * @param {object} gameState - The current game state.
 * @returns {'easy'|'medium'|'hard'} The difficulty level.
 */
function getDifficulty(gameState) {
    if (gameState.isInfiniteChallenge) {
        if (gameState.infiniteChallengeLevel > 20) return 'hard';
        if (gameState.infiniteChallengeLevel > 10) return 'medium';
        return 'easy';
    }

    if (gameState.currentStoryBattle) {
        switch (gameState.currentStoryBattle) {
            case 'necroverso_king':
            case 'necroverso_final':
            case 'narrador':
            case 'xael_challenge':
                return 'hard';
            case 'reversum':
                return 'medium';
            default:
                if (gameState.currentStoryBattle.startsWith('event_')) {
                    return 'hard';
                }
                return 'easy'; // tutorial, contravox, versatrix
        }
    }
    
    // Default for Quick Duel vs AI is Easy
    return 'easy';
}


/**
 * Executes a full turn for an AI player with enhanced strategic logic.
 * This function is designed to be called multiple times via gameState updates during the AI's turn.
 * @param {object} player - The AI player object.
 */
export async function executeAiTurn(player) {
    const { gameState } = getState();
    const isServerGame = gameState.isPvp; // This is true for tournaments

    // Abort if it's not the AI's turn or the game is paused/over.
    if (gameState.gamePhase !== 'playing' || gameState.currentPlayer !== player.id) {
        return;
    }
    
    // Pause for UX and to simulate thinking
    await new Promise(res => setTimeout(res, 1000));
    await tryToSpeak(player);

    const difficulty = getDifficulty(gameState);

    // --- Decision 1: Play a value card if required ---
    const valueCards = player.hand.filter(c => c.type === 'value');
    if (valueCards.length > 1 && !player.playedValueCardThisTurn) {
        let cardToPlay;
        const sortedValueCards = [...valueCards].sort((a, b) => a.value - b.value);

        if (difficulty === 'hard') {
            if (sortedValueCards.length >= 3) {
                cardToPlay = sortedValueCards[Math.floor(sortedValueCards.length / 2)];
            } else { // 2 cards
                cardToPlay = sortedValueCards[0];
            }
        } else { // Easy and Medium Logic
            cardToPlay = sortedValueCards[0]; // Simplest strategy
        }
        
        if (cardToPlay) {
            if (isServerGame) {
                network.emitPlayCard({ cardId: cardToPlay.id, targetId: player.id });
            } else {
                await playCard(player, cardToPlay, player.id);
                // After playing a card, re-evaluate the turn after a delay.
                // This allows animations and re-renders to complete.
                setTimeout(() => executeAiTurn(gameState.players[player.id]), 1200);
            }
            return;
        }
    }

    // --- Decision 2: Consider playing one effect card ---
    // The AI will only play one effect card per turn for simplicity.
    const hasPlayedEffectThisTurn = player.playedCards.effect.length > 0;
    if (!hasPlayedEffectThisTurn) {
        let bestEffectMove = { score: -1 };

        // (This is the full evaluation logic from your original code)
        const effectCards = player.hand.filter(c => c.type === 'effect');
        const isReversusTotalActive = difficulty === 'hard' && gameState.reversusTotalActive;
        const selfBuffCards = isReversusTotalActive ? ['Menos', 'Desce'] : ['Mais', 'Sobe'];
        const opponentDebuffCards = isReversusTotalActive ? ['Mais', 'Sobe', 'Pula'] : ['Menos', 'Desce', 'Pula'];
        const selfDefenseReversusCondition = (p) => isReversusTotalActive ? (p.effects.score === 'Mais' || p.effects.movement === 'Sobe') : (p.effects.score === 'Menos' || p.effects.movement === 'Desce');
        const opponentOffenseReversusCondition = (p) => isReversusTotalActive ? (p.effects.score === 'Menos' || p.effects.movement === 'Desce') : (p.effects.score === 'Mais' || p.effects.movement === 'Sobe');
        const opponents = Object.values(gameState.players).filter(p => p.id !== player.id && !p.isEliminated);
        const leader = opponents.length > 0 ? [...opponents].sort((a, b) => b.liveScore - a.liveScore)[0] : null;

        for (const card of effectCards) {
            const evaluateMove = (target, score, reason, effectType = null) => {
                if (score > bestEffectMove.score) {
                    bestEffectMove = { card, target: target.id, score, reason, effectType };
                }
            };
            if (card.name === 'Reversus Total') {
                evaluateMove(player, 100, "para causar o caos total");
            } else if (card.name === 'Reversus') {
                if (leader && opponentOffenseReversusCondition(leader)) {
                    const effectType = isReversusTotalActive ? (leader.effects.score === 'Menos' ? 'score' : 'movement') : (leader.effects.score === 'Mais' ? 'score' : 'movement');
                    evaluateMove(leader, 85, "para anular a vantagem do oponente", effectType);
                } else if (selfDefenseReversusCondition(player)) {
                    const effectType = isReversusTotalActive ? (player.effects.score === 'Mais' ? 'score' : 'movement') : (player.effects.score === 'Menos' ? 'score' : 'movement');
                    evaluateMove(player, 60, "para se defender", effectType);
                }
            } else if (card.name === 'Pula' && leader) {
                const availablePaths = gameState.boardPaths.filter(p => !Object.values(gameState.players).map(pl => pl.pathId).includes(p.id));
                if (availablePaths.length > 0) evaluateMove(leader, 75, "para reposicionar o oponente");
            } else if (opponentDebuffCards.includes(card.name) && leader) {
                evaluateMove(leader, 70, "para atacar o oponente");
            } else if (selfBuffCards.includes(card.name)) {
                evaluateMove(player, 50, "para se fortalecer");
            }
        }
        
        if (bestEffectMove.score > -1) {
            const { card, target, effectType } = bestEffectMove;
            let options = { effectType };

            if (card.name === 'Pula') {
                const availablePaths = gameState.boardPaths.filter(p => !Object.values(gameState.players).map(pl => pl.pathId).includes(p.id));
                if (availablePaths.length > 0) {
                    options.pulaPath = availablePaths[0].id;
                } else {
                    bestEffectMove.score = -1; // Invalidate move if no path available
                }
            }

            if (bestEffectMove.score > -1) {
                if (isServerGame) {
                    network.emitPlayCard({ cardId: card.id, targetId: target, options });
                } else {
                    await playCard(player, card, target, effectType, options);
                    setTimeout(() => executeAiTurn(gameState.players[player.id]), 1200);
                }
                return;
            }
        }
    }

    // --- Final Decision: If no more actions, end the turn. ---
    if (isServerGame) {
        network.emitEndTurn();
    } else {
        const playedACard = player.playedValueCardThisTurn || player.playedCards.effect.length > 0;
        gameState.consecutivePasses = playedACard ? 0 : gameState.consecutivePasses + 1;
        gameState.gamePhase = 'playing';
        document.dispatchEvent(new Event('aiTurnEnded'));
    }
}
