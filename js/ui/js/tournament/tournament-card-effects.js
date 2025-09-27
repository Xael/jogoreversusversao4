// js/tournament/tournament-card-effects.js

import { getState } from '../core/state.js';
import { updateLog } from '../core/utils.js';
import { playSoundEffect, announceEffect } from '../core/sound.js';

/**
 * Aplica um efeito de carta com a lógica específica para o modo Torneio.
 * @param {object} card - A carta sendo jogada.
 * @param {string} targetId - O ID do jogador alvo.
 * @param {string} casterId - O ID do jogador que jogou a carta.
 */
export async function applyTournamentEffect(card, targetId, casterId) {
    const { gameState } = getState();
    const target = gameState.players[targetId];
    const caster = gameState.players[casterId];
    if (!target || !caster) return;

    const cardName = card.name;
    const allPlayers = Object.values(gameState.players);
    
    const playTournamentEffectSound = (name) => {
        const soundToPlay = name.toLowerCase().replace(/\s/g, '');
        setTimeout(() => playSoundEffect(soundToPlay), 100);
        setTimeout(() => announceEffect(name), 150);
    };

    switch (cardName) {
        case 'Sobe':
        case 'Desce':
            // O último efeito jogado é o que conta.
            // Limpa qualquer efeito que o lançador tenha jogado em qualquer jogador.
            allPlayers.forEach(p => {
                if (p.tournamentScoreEffect && p.tournamentScoreEffect.casterId === casterId) {
                    p.tournamentScoreEffect = null;
                }
            });
            // Aplica o novo efeito ao alvo
            target.tournamentScoreEffect = { effect: cardName, casterId };
            updateLog(`${caster.name} usou ${cardName} em ${target.name}.`);
            playTournamentEffectSound(cardName);
            break;

        case 'Pula':
            if (target.tournamentScoreEffect) {
                const stolenEffect = { ...target.tournamentScoreEffect };
                target.tournamentScoreEffect = null; // Remove o efeito do alvo
                
                // Limpa qualquer efeito anterior lançado pelo jogador de Pula
                allPlayers.forEach(p => {
                    if (p.tournamentScoreEffect && p.tournamentScoreEffect.casterId === casterId) {
                        p.tournamentScoreEffect = null;
                    }
                });

                // Dá o efeito roubado ao jogador de Pula
                caster.tournamentScoreEffect = { effect: stolenEffect.effect, casterId: casterId };
                updateLog(`${caster.name} usou Pula e roubou o efeito '${stolenEffect.effect}' de ${target.name}!`);
            } else {
                updateLog(`${caster.name} usou Pula em ${target.name}, mas não havia efeito para roubar.`);
            }
            playTournamentEffectSound(cardName);
            break;

        case 'Reversus':
            if (target.tournamentScoreEffect) {
                const effectToReverse = target.tournamentScoreEffect;
                
                // Caso especial: recuperar efeito roubado
                if (effectToReverse.casterId !== targetId && casterId === effectToReverse.casterId) {
                    target.tournamentScoreEffect = null; // Remove do alvo
                    // Limpa qualquer efeito anterior lançado pelo lançador
                    allPlayers.forEach(p => {
                        if (p.tournamentScoreEffect && p.tournamentScoreEffect.casterId === casterId) {
                            p.tournamentScoreEffect = null;
                        }
                    });
                    caster.tournamentScoreEffect = { effect: effectToReverse.effect, casterId: casterId }; // Recupera
                    updateLog(`${caster.name} usou Reversus e recuperou seu efeito '${effectToReverse.effect}' de ${target.name}!`);
                } else {
                    // Inversão padrão
                    const newEffect = effectToReverse.effect === 'Sobe' ? 'Desce' : 'Sobe';
                    effectToReverse.effect = newEffect;
                    updateLog(`${caster.name} usou Reversus e inverteu o efeito em ${target.name} para '${newEffect}'!`);
                }
            } else {
                updateLog(`${caster.name} usou Reversus em ${target.name}, mas não havia efeito para reverter.`);
            }
            playTournamentEffectSound(cardName);
            break;
        
        case 'Mais':
        case 'Menos':
        case 'Reversus Total':
            updateLog(`A carta ${cardName} não tem efeito especial no modo Torneio.`);
            // A carta ainda precisa ser descartada da mão, o que acontece fora desta função.
            break;
    }
}
