// js/game-logic/player-actions.js

import { getState, updateState } from '../core/state.js';
import { updateLog, dealCard } from '../core/utils.js';
import { playSoundEffect, announceEffect } from '../core/sound.js';
import { animateCardPlay, toggleReversusTotalBackground } from '../ui/animations.js';
import * as dom from '../core/dom.js';
import { triggerXaelChallengePopup } from '../story/story-abilities.js';
import { renderAll } from '../ui/ui-renderer.js';

export async function applyEffect(card, targetId, casterId, effectTypeToReverse, options) {
    const { gameState } = getState();
    const target = gameState.players[targetId];
    const caster = gameState.players[casterId];
    if (!target || !caster) return;

    // --- TOURNAMENT MODE LOGIC ---
    if (gameState.isTournamentMatch) {
        const cardName = card.name;
        const allPlayers = Object.values(gameState.players);
        
        // Helper to play sound and announce tournament-specific effects
        const playTournamentEffectSound = (name) => {
            const soundToPlay = name.toLowerCase().replace(/\s/g, '');
            setTimeout(() => playSoundEffect(soundToPlay), 100);
            setTimeout(() => announceEffect(name), 150);
        };

        switch (cardName) {
            case 'Sobe':
            case 'Desce':
                // The last effect played is the one that counts.
                // Clear any effect previously cast by this caster on any player.
                allPlayers.forEach(p => {
                    if (p.tournamentScoreEffect && p.tournamentScoreEffect.casterId === casterId) {
                        p.tournamentScoreEffect = null;
                    }
                });
                // Apply new effect to the target
                target.tournamentScoreEffect = { effect: cardName, casterId };
                updateLog(`${caster.name} usou ${cardName} em ${target.name}.`);
                playTournamentEffectSound(cardName);
                return; // End execution here for these cards in tournament mode

            case 'Pula':
                if (gameState.reversusTotalActive) {
                    updateLog(`Reversus Total está ativo e anulou a carta Pula de ${caster.name}!`);
                    playSoundEffect('reversus');
                    return;
                }
                if (target.tournamentScoreEffect) {
                    const stolenEffect = { ...target.tournamentScoreEffect };
                    target.tournamentScoreEffect = null; // Remove effect from target
                    
                    // Clear any previous effect cast by the caster of Pula
                    allPlayers.forEach(p => {
                        if (p.tournamentScoreEffect && p.tournamentScoreEffect.casterId === casterId) {
                            p.tournamentScoreEffect = null;
                        }
                    });

                    // Give the stolen effect to the caster of Pula
                    caster.tournamentScoreEffect = { effect: stolenEffect.effect, casterId: casterId };
                    updateLog(`${caster.name} usou Pula e roubou o efeito '${stolenEffect.effect}' de ${target.name}!`);
                } else {
                    updateLog(`${caster.name} usou Pula em ${target.name}, mas não havia efeito para roubar.`);
                }
                playTournamentEffectSound(cardName);
                return;

            case 'Reversus':
                if (target.tournamentScoreEffect) {
                    const effectToReverse = target.tournamentScoreEffect;
                    
                    // Special case: reclaim stolen effect
                    if (effectToReverse.casterId !== targetId && casterId === effectToReverse.casterId) {
                        target.tournamentScoreEffect = null; // Remove from target
                        // Clear any previous effect cast by caster
                        allPlayers.forEach(p => {
                            if (p.tournamentScoreEffect && p.tournamentScoreEffect.casterId === casterId) {
                                p.tournamentScoreEffect = null;
                            }
                        });
                        caster.tournamentScoreEffect = { effect: effectToReverse.effect, casterId: casterId }; // Reclaim it
                        updateLog(`${caster.name} usou Reversus e recuperou seu efeito '${effectToReverse.effect}' de ${target.name}!`);
                    } else {
                        // Standard inversion
                        const newEffect = effectToReverse.effect === 'Sobe' ? 'Desce' : 'Sobe';
                        effectToReverse.effect = newEffect;
                        updateLog(`${caster.name} usou Reversus e inverteu o efeito em ${target.name} para '${newEffect}'!`);
                    }
                } else {
                    updateLog(`${caster.name} usou Reversus em ${target.name}, mas não havia efeito para reverter.`);
                }
                playTournamentEffectSound(cardName);
                return;
        }
    }
    // --- END OF TOURNAMENT MODE LOGIC ---

    let effectName;
    // Correctly determine the effect name, especially for locked Reversus Total
    if (card.isLocked) {
        effectName = card.lockedEffect;
    } else {
        effectName = card.name;
    }

    // --- Habilidades de Evento Passivas ---
    // Habilidade do Dragão Dourado: Ignora 1 efeito negativo por turno.
    if (target.isEventBoss && target.aiType === 'dragaodourado' && !target.eventAbilityUsedThisTurn && ['Menos', 'Desce', 'Pula'].includes(effectName)) {
        updateLog(`Dragão Dourado usou sua habilidade e ignorou o efeito de ${effectName}!`);
        target.eventAbilityUsedThisTurn = true;
        return; // Efeito é ignorado
    }

    // Check for field effect immunity AND the player's own immunity buff from Infinite Challenge
    if (((gameState.activeFieldEffects || []).some(fe => fe.name === 'Imunidade' && fe.appliesTo === targetId) || target.isImmuneToNegativeEffects) && (effectName === 'Menos' || effectName === 'Desce')) {
        updateLog(`${target.name} está imune a ${effectName} nesta rodada!`);
        return; // Buff lasts for the whole duel, so we don't consume it here.
    }


    const getInverseEffect = (effect) => {
        const map = { 'Mais': 'Menos', 'Menos': 'Mais', 'Sobe': 'Desce', 'Desce': 'Sobe', 'NECRO X': 'NECRO X Invertido', 'NECRO X Invertido': 'NECRO X' };
        return map[effect] || null;
    };

    if (gameState.reversusTotalActive && effectName !== 'Reversus Total') {
        const inverted = getInverseEffect(effectName);
        if (inverted) {
            updateLog(`Reversus Total inverteu ${card.name} para ${inverted}!`);
            effectName = inverted;
        }
    }
    
    // Play sound and announce effect
    const soundToPlay = effectName.toLowerCase().replace(/\s/g, '');
    const effectsWithSounds = ['mais', 'menos', 'sobe', 'desce', 'pula', 'reversus'];

    if (card.isLocked) {
        announceEffect("REVERSUS INDIVIDUAL!", 'reversus');
        playSoundEffect('reversustotal');
    } else if (effectsWithSounds.includes(soundToPlay)) {
        setTimeout(() => playSoundEffect(soundToPlay), 100);
        setTimeout(() => announceEffect(effectName), 150);
    } else if (card.name !== 'Carta da Versatrix' && card.name !== 'Reversus Total') {
        setTimeout(() => announceEffect(effectName), 150);
    }


    switch (effectName) {
        case 'Mais': case 'Menos': case 'NECRO X': case 'NECRO X Invertido':
            target.effects.score = effectName;
            break;
        case 'Sobe': case 'Desce':
            target.effects.movement = effectName;
            break;
        case 'Pula':
            target.effects.movement = effectName;
            // NEW BUFF LOGIC for pula_draw_effect
            if (caster.hasPulaDrawEffect && casterId === targetId) {
                const newCard = dealCard('effect');
                if (newCard) {
                    caster.hand.push(newCard);
                    updateLog(`${caster.name} usou Pula em si mesmo e comprou uma nova carta de efeito.`);
                }
            }
            break;
        case 'Reversus': {
            const targetScoreEffectCard = target.playedCards.effect.find(c => ['Mais', 'Menos'].includes(c.name) || (c.isLocked && ['Mais', 'Menos'].includes(c.lockedEffect)));
            const targetMoveEffectCard = target.playedCards.effect.find(c => ['Sobe', 'Desce', 'Pula'].includes(c.name) || (c.isLocked && ['Sobe', 'Desce'].includes(c.lockedEffect)));

            if (effectTypeToReverse === 'score' && targetScoreEffectCard?.isLocked) {
                updateLog(`Ação bloqueada! O efeito ${target.effects.score} em ${target.name} está travado por um Reversus Individual e não pode ser revertido!`);
                return; 
            }
             if (effectTypeToReverse === 'movement' && targetMoveEffectCard?.isLocked) {
                updateLog(`Ação bloqueada! O efeito ${target.effects.movement} em ${target.name} está travado por um Reversus Individual e não pode ser revertido!`);
                return; 
            }
            
            if (effectTypeToReverse === 'score') {
                target.effects.score = getInverseEffect(target.effects.score);
                updateLog(`${caster.name} usou ${card.name} em ${target.name} para reverter efeito de pontuação para ${target.effects.score || 'Nenhum'}.`);
            } else if (effectTypeToReverse === 'movement') {
                if (target.effects.movement === 'Pula') {
                    target.effects.movement = null;
                    updateLog(`${caster.name} anulou o efeito 'Pula' de ${target.name} com Reversus!`);
                } else {
                    target.effects.movement = getInverseEffect(target.effects.movement);
                    updateLog(`${caster.name} usou ${card.name} em ${target.name} para reverter efeito de movimento para ${target.effects.movement || 'Nenhum'}.`);
                }
            }
            break;
        }
        case 'Reversus Total': {
            setTimeout(() => {
                announceEffect('Reversus Total!', 'reversus-total');
                playSoundEffect('reversustotal');
            }, 100);
            toggleReversusTotalBackground(true);
            gameState.reversusTotalActive = true;
            dom.appContainerEl.classList.add('reversus-total-active');
            dom.reversusTotalIndicatorEl.classList.remove('hidden');

            if (gameState.isTournamentMatch) {
                Object.values(gameState.players).forEach(p => {
                    if (p.tournamentScoreEffect) {
                        const currentEffect = p.tournamentScoreEffect.effect;
                        if (currentEffect === 'Sobe') {
                            p.tournamentScoreEffect.effect = 'Desce';
                        } else if (currentEffect === 'Desce') {
                            p.tournamentScoreEffect.effect = 'Sobe';
                        }
                    }
                });
            } else {
                Object.values(gameState.players).forEach(p => {
                    const scoreEffectCard = p.playedCards.effect.find(c => ['Mais', 'Menos', 'NECRO X', 'NECRO X Invertido'].includes(c.name) || (c.name === 'Reversus' && c.reversedEffectType === 'score'));
                    if (p.effects.score && !scoreEffectCard?.isLocked) {
                        p.effects.score = getInverseEffect(p.effects.score);
                    }
                    const moveEffectCard = p.playedCards.effect.find(c => ['Sobe', 'Desce', 'Pula'].includes(c.name) || (c.name === 'Reversus' && c.reversedEffectType === 'movement'));
                    if (p.effects.movement && p.effects.movement !== 'Pula' && !moveEffectCard?.isLocked) {
                        p.effects.movement = getInverseEffect(p.effects.movement);
                    }
                });
            }

            updateLog(`${caster.name} ativou o Reversus Total!`);
            
            // XAEL POPUP TRIGGER
            triggerXaelChallengePopup();
            return;
        }
        case 'Carta da Versatrix': {
            // Show info modal
            dom.versatrixCardInfoModal.classList.remove('hidden');
            await new Promise(resolve => {
                const handler = () => {
                    dom.versatrixCardInfoContinueButton.removeEventListener('click', handler);
                    dom.versatrixCardInfoModal.classList.add('hidden');
                    resolve();
                };
                dom.versatrixCardInfoContinueButton.addEventListener('click', handler);
            });

            // Apply the +2 card effect
            for (let i = 0; i < 2; i++) {
                const newCard = dealCard('effect');
                if (newCard) {
                    target.hand.push(newCard);
                }
            }
            updateLog(`${caster.name} usou a ${card.name}, comprando 2 cartas de efeito.`);

            // Set cooldown on the card object itself
            card.cooldown = 3; 
            
            // This card is a one-off effect, it doesn't apply a persistent score/movement effect
            // We remove it from the play zone immediately and put it back in the caster's hand
            const cardIndexInPlay = target.playedCards.effect.findIndex(c => c.id === card.id);
            if (cardIndexInPlay > -1) {
                const [removedCard] = target.playedCards.effect.splice(cardIndexInPlay, 1);
                if(caster) {
                    caster.hand.push(removedCard);
                } else {
                    // Fallback: if caster not found, discard it to prevent card loss
                    gameState.discardPiles.effect.push(removedCard);
                }
            }
            
            renderAll(); // Re-render to show new cards and cooldown
            break;
        }
    }

    if (card.isLocked) {
        updateLog(`${caster.name} usou Reversus Individual para travar o efeito ${effectName} em ${target.name}.`);
    } else if (card.name !== 'Pula' && card.name !== 'Reversus' && card.name !== 'Reversus Total' && card.name !== 'Carta da Versatrix') {
        // This covers Mais, Menos, Sobe, Desce
        updateLog(`${caster.name} usou ${card.name} em ${target.name} para aplicar o efeito ${effectName}.`);
    }
}
/**
 * Handles the entire logic for a player playing a card.
 * @param {object} player - The player object playing the card.
 * @param {object} card - The card object being played.
 * @param {string} targetId - The ID of the target player.
 * @param {string | null} [effectTypeToReverse=null] - For 'Reversus', specifies 'score' or 'movement'.
 * @param {object} [options={}] - Additional options, like for Reversus Total individual lock.
 */
export async function playCard(player, card, targetId, effectTypeToReverse = null, options = {}) {
    const { gameState } = getState();
    playSoundEffect('jogarcarta');
    
    // An action was taken, so the consecutive pass counter resets to 0.
    gameState.consecutivePasses = 0;
    
    // --- Determine animation target and logical destination ---
    let animationTargetPlayerId;
    let cardDestinationPlayer;

    if (card.type === 'value') {
        // Value cards always target the caster, both visually and logically.
        animationTargetPlayerId = player.id;
        cardDestinationPlayer = player;
    } else {
        // Effect cards logically target the 'targetId'. The animation also targets the 'targetId' by default.
        cardDestinationPlayer = gameState.players[targetId];
        animationTargetPlayerId = targetId;

        // Special Case: Global Reversus Total animates to the caster's board,
        // and the card is placed in the caster's play zone.
        if (card.name === 'Reversus Total' && !options.isIndividualLock) {
            animationTargetPlayerId = player.id;
            cardDestinationPlayer = player;
        }
    }
    
    // Apply Reversus Total individual lock properties to the card object
    if (options.isIndividualLock) {
        card.isLocked = true;
        card.lockedEffect = options.effectNameToApply;
    }

    // --- Determine target slot for animation ---
    let targetSlotLabel;
    if (card.type === 'value') {
        targetSlotLabel = player.playedCards.value.length === 0 ? 'Valor 1' : 'Valor 2';
    } else {
        const effectNameToApply = options.isIndividualLock ? options.effectNameToApply : card.name;
        
        if (['Mais', 'Menos', 'NECRO X', 'NECRO X Invertido'].includes(effectNameToApply) || (card.name === 'Reversus' && effectTypeToReverse === 'score')) {
            targetSlotLabel = 'Pontuação';
        } else if (['Sobe', 'Desce', 'Pula'].includes(effectNameToApply) || (card.name === 'Reversus' && effectTypeToReverse === 'movement')) {
            targetSlotLabel = 'Movimento';
        } else if (card.name === 'Carta da Versatrix') {
            targetSlotLabel = 'Pontuação';
        } else { // This will now correctly be for Global Reversus Total only
            targetSlotLabel = 'Reversus T.';
        }
    }

    // --- Animate and move card from hand to play zone ---
    const startElement = document.querySelector(`#hand-${player.id} [data-card-id="${card.id}"]`);
    const startRect = gameState.animationStartRect; // Read rect from state

    if (startElement || startRect) {
        const shouldAnimateHidden = player.aiType === 'oespectro';
        await animateCardPlay(card, startElement, animationTargetPlayerId, targetSlotLabel, shouldAnimateHidden, startRect);
    }
    // Clean up the temporary state after the animation is triggered
    gameState.animationStartRect = null;
    
    const cardIndexInHand = player.hand.findIndex(c => c.id === card.id);
    if (cardIndexInHand > -1) {
        // Special check for event abilities that force a discard from another player's hand
        if (card.isForcedDiscard) {
            const targetPlayer = gameState.players[targetId];
            const forcedCardIndex = targetPlayer.hand.findIndex(c => c.id === card.id);
            if (forcedCardIndex > -1) {
                const [discardedCard] = targetPlayer.hand.splice(forcedCardIndex, 1);
                gameState.discardPiles.value.push(discardedCard);
                updateLog(`${player.name} forçou ${targetPlayer.name} a descartar ${discardedCard.name}.`);
            }
        } else if (card.name !== 'Carta da Versatrix') {
            player.hand.splice(cardIndexInHand, 1);
        }
    }

    // --- Handle replacing existing effect cards ---
    if (card.type === 'effect') {
        const isIndividualLock = options.isIndividualLock && card.name === 'Reversus Total';
        const effectNameToApply = isIndividualLock ? options.effectNameToApply : card.name;
        
        const scoreEffectCategory = ['Mais', 'Menos', 'NECRO X', 'NECRO X Invertido'];
        const moveEffectCategory = ['Sobe', 'Desce', 'Pula'];
        
        let isScoreEffect = scoreEffectCategory.includes(effectNameToApply);
        let isMoveEffect = moveEffectCategory.includes(effectNameToApply);

        if (card.name === 'Reversus') {
            isScoreEffect = effectTypeToReverse === 'score';
            isMoveEffect = effectTypeToReverse === 'movement';
            card.reversedEffectType = effectTypeToReverse;
        }

        const categoryToCheck = isScoreEffect ? scoreEffectCategory : (isMoveEffect ? moveEffectCategory : null);
        
        if (categoryToCheck && cardDestinationPlayer) {
            const cardToReplaceIndex = cardDestinationPlayer.playedCards.effect.findIndex(c =>
                categoryToCheck.includes(c.name) ||
                (c.isLocked && categoryToCheck.includes(c.lockedEffect)) ||
                (c.name === 'Reversus' && (c.reversedEffectType === (isScoreEffect ? 'score' : 'movement')))
            );
            
            if (cardToReplaceIndex > -1) {
                const cardToReplace = cardDestinationPlayer.playedCards.effect[cardToReplaceIndex];
                if (cardToReplace.isLocked) {
                    // The slot is locked. The played card fizzles.
                    updateLog(`O efeito ${cardToReplace.lockedEffect} em ${cardDestinationPlayer.name} está travado! A carta ${card.name} não teve efeito.`);
                    gameState.discardPiles.effect.push(card); // Discard the card that was played.
                    // Reset state and render, ending the function here.
                    gameState.selectedCard = null;
                    updateLiveScoresAndWinningStatus();
                    renderAll();
                    return;
                } else {
                    // Not locked, so replace it.
                    const [removedCard] = cardDestinationPlayer.playedCards.effect.splice(cardToReplaceIndex, 1);
                    gameState.discardPiles.effect.push(removedCard);
                }
            }
        }
    }

    // --- Update player and game state ---
    if (card.type === 'value') {
        player.playedCards.value.push(card);
        player.playedValueCardThisTurn = true;
        player.nextResto = card;
    } else {
         if (card.name !== 'Carta da Versatrix') {
            card.targetId = targetId;
            cardDestinationPlayer.playedCards.effect.push(card);
         }
    }

    if (card.type === 'effect') {
        applyEffect(card, targetId, player.id, effectTypeToReverse, options);
    }
    
    gameState.selectedCard = null;
    gameState.reversusTarget = null;
    gameState.pulaTarget = null;
    
    updateLiveScoresAndWinningStatus();
    renderAll();
}