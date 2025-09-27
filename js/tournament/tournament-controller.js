// js/tournament/tournament-controller.js

import * as dom from '../core/dom.js';
import { getState, updateState } from '../core/state.js';
import { renderAll } from '../ui/ui-renderer.js';
import { updateLog, shuffle } from '../core/utils.js';
import { createDeck } from '../game-logic/deck.js';
import { initiateTournamentMatchStartSequence } from './tournament-turn-manager.js';
import { t } from '../core/i18n.js';
import { INFINITE_CHALLENGE_OPPONENTS } from '../core/config.js';

/**
 * Inicia uma partida de torneio offline contra um oponente de IA.
 */
export async function startOfflineTournament() {
    dom.tournamentModal.classList.add('hidden');
    dom.tournamentRulesModal.classList.remove('hidden');

    // Aguarda o jogador entender as regras
    await new Promise(resolve => {
        const handler = () => {
            dom.tournamentRulesUnderstoodButton.removeEventListener('click', handler);
            dom.tournamentRulesModal.classList.add('hidden');
            resolve();
        };
        dom.tournamentRulesUnderstoodButton.addEventListener('click', handler);
    });

    const humanPlayer = getState().userProfile;
    const aiOpponentData = shuffle([...INFINITE_CHALLENGE_OPPONENTS])[0];

    const player1 = {
        id: 'player-1',
        playerId: 'player-1',
        name: humanPlayer.username,
        avatar_url: humanPlayer.avatar_url,
        isHuman: true,
        aiType: null
    };

    const player2 = {
        id: 'player-2',
        playerId: 'player-2',
        name: t(aiOpponentData.nameKey),
        avatar_url: aiOpponentData.avatar_url,
        isHuman: false,
        aiType: aiOpponentData.aiType
    };

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
        tournamentMatch: {
            player1: player1,
            player2: player2,
            score: [0, 0],
            draws: 0,
        },
        currentPlayer: 'player-1',
        turn: 1,
        selectedCard: null,
        log: [],
        consecutivePasses: 0,
    };
    
    updateState('gameState', gameState);
    
    dom.splashScreenEl.classList.add('hidden');
    dom.appContainerEl.classList.remove('hidden');

    if(dom.leftScoreBox) dom.leftScoreBox.classList.add('hidden');
    if(dom.rightScoreBox) dom.rightScoreBox.classList.add('hidden');

    const player1Container = document.getElementById('player-1-area-container');
    const opponentsContainer = document.getElementById('opponent-zones-container');
    const createPlayerAreaHTML = (id) => `<div class="player-area" id="player-area-${id}"></div>`;
    player1Container.innerHTML = createPlayerAreaHTML('player-1');
    opponentsContainer.innerHTML = createPlayerAreaHTML('player-2');

    updateLog(`Bem-vindo ao Torneio Offline! Partida: ${player1.name} vs ${player2.name}.`);
    
    renderAll();
    
    await initiateTournamentMatchStartSequence();
}
