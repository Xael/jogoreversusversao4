// ui-handlers.js
import * as dom from './js/core/dom.js';
import { getState, updateState } from './js/core/state.js';
import { initializeGame, restartLastDuel, startNextInfiniteChallengeDuel } from './js/game-controller.js';
import { renderAchievementsModal } from './js/ui/achievements-renderer.js';
import { renderAll, showGameOver } from './js/ui/ui-renderer.js';
import * as sound from './js/core/sound.js';
import { startStoryMode, renderStoryNode, playEndgameSequence } from './js/story/story-controller.js';
import * as saveLoad from './js/core/save-load.js';
import * as achievements from './js/core/achievements.js';
import { updateLog, formatTime, dealCard, shuffle } from './js/core/utils.js';
import * as config from './js/core/config.js';
import { AVATAR_CATALOG } from './js/core/config.js';
import * as network from './js/core/network.js';
import { shatterImage } from './js/ui/animations.js';
import { announceEffect } from './js/core/sound.js';
import { playCard } from './js/game-logic/player-actions.js';
import { advanceToNextPlayer } from './js/game-logic/turn-manager.js';
import { setLanguage, t } from './js/core/i18n.js';
import { showSplashScreen } from './js/ui/splash-screen.js';
import { renderProfile, renderFriendsList, renderSearchResults, addPrivateChatMessage, updateFriendStatusIndicator, renderFriendRequests, renderAdminPanel, renderOnlineFriendsForInvite } from './js/ui/profile-renderer.js';
import { openChatWindow, initializeChatHandlers } from './js/ui/chat-handler.js';
import { renderShopAvatars } from './js/ui/shop-renderer.js';

let currentEventData = null;
let infiniteChallengeIntroHandler = null;
let introImageInterval = null;

/**
 * Hides the game UI, shows the story modal, and renders the next story node.
 * @param {string} nodeId - The ID of the story node to render.
 */
function continueStory(nodeId) {
    setTimeout(() => {
        dom.appContainerEl.classList.add('hidden');
        dom.storyModeModalEl.classList.remove('hidden');
        renderStoryNode(nodeId);
    }, 1000);
}

/**
 * Gets the ID of the local human player.
 * @returns {string | null} The player ID or null if not found.
 */
function getLocalPlayerId() {
    const { gameState, playerId } = getState();
    if (!gameState) return null;
    if (gameState.isPvp) return playerId;
    const humanPlayer = Object.values(gameState.players).find(p => p.isHuman);
    return humanPlayer ? humanPlayer.id : null;
}

/**
 * Resets the game state after a player cancels an action modal.
 */
function cancelPlayerAction() {
    const { gameState } = getState();
    dom.targetModal.classList.add('hidden');
    dom.reversusTargetModal.classList.add('hidden');
    dom.reversusTotalChoiceModal.classList.add('hidden');
    dom.reversusIndividualEffectChoiceModal.classList.add('hidden');
    dom.pulaModal.classList.add('hidden');
    if (gameState) {
        gameState.gamePhase = 'playing';
        gameState.selectedCard = null;
        gameState.reversusTarget = null;
        gameState.pulaTarget = null;
        updateState('reversusTotalIndividualFlow', false);
    }
    renderAll();
}

/**
 * Handles clicks on cards, either selecting them or showing a viewer.
 * @param {Event} e - The click event.
 */
function handleCardClick(e) {
    const cardEl = e.target.closest('.card');
    if (!cardEl) return;
    
    const cardId = cardEl.dataset.cardId;
    const { gameState, isDiscardingForBuff, buffToResolve } = getState();
    if (!gameState) return;
    
    const myPlayerId = getLocalPlayerId();
    if (!myPlayerId) return;

    const player = gameState.players[myPlayerId];
    if (!player) return;

    const card = player.hand.find(c => String(c.id) === cardId);
    if (!card) return;

    if (e.target.classList.contains('card-maximize-button')) {
        const isHidden = cardEl.style.backgroundImage.includes('verso');
        if (isHidden) return;
        dom.cardViewerImageEl.src = cardEl.style.backgroundImage.slice(5, -2);
        dom.cardViewerModalEl.classList.remove('hidden');
        return;
    }

    // --- Handle Discarding for Buff ---
    if (isDiscardingForBuff) {
        const isValidDiscard = 
            (buffToResolve.id === 'discard_low_draw_value' && card.type === 'value') ||
            (buffToResolve.id === 'discard_effect_draw_effect' && card.type === 'effect') ||
            (buffToResolve.id === 'draw_10_discard_one') || // any card
            (buffToResolve.id === 'draw_reversus_total' && card.type === 'effect');

        if (!isValidDiscard) {
            updateLog("Tipo de carta inválido para o descarte do bônus.");
            return;
        }

        // Remove card from hand and add to discard
        const cardIndex = player.hand.findIndex(c => c.id === card.id);
        if (cardIndex > -1) {
            const [discardedCard] = player.hand.splice(cardIndex, 1);
            gameState.discardPiles[discardedCard.type].push(discardedCard);
            updateLog(`Você descartou ${discardedCard.name} para o efeito do bônus.`);
        }

        // Fulfill the rest of the buff effect
        switch (buffToResolve.id) {
            case 'discard_low_draw_value':
                player.hand.push(dealCard('value'));
                break;
            case 'discard_effect_draw_effect':
                player.hand.push(dealCard('effect'));
                break;
        }

        // Reset discard state and proceed
        updateState('isDiscardingForBuff', false);
        updateState('buffToResolve', null);
        renderAll();
        document.dispatchEvent(new Event('buffAppliedAndContinue'));
        return;
    }


    if (gameState.currentPlayer !== myPlayerId || cardEl.classList.contains('disabled')) {
        return;
    }

    if (gameState.selectedCard?.id === card.id) {
        gameState.selectedCard = null;
    } else {
        gameState.selectedCard = card;
    }
    
    renderAll();
}

/**
 * Handles the logic when the "Jogar Carta" button is clicked.
 */
async function handlePlayButtonClick() {
    const { gameState } = getState();
    if (!gameState) return;
    
    const myPlayerId = getLocalPlayerId();
    if (!myPlayerId) return;

    const player = gameState.players[myPlayerId];
    const card = gameState.selectedCard;

    if (!player || !card) return;

    // Immediately disable buttons for better UX
    dom.playButton.disabled = true;
    dom.endTurnButton.disabled = true;

    if (gameState.isPvp) {
        // In PvP, we just send the event and wait for the server's gameStateUpdate
        // The modal logic for complex cards is handled below before sending the event
    } else {
        gameState.gamePhase = 'paused';
    }
    
    if (card.type === 'value') {
        if (gameState.isPvp) {
            network.emitPlayCard({ cardId: card.id, targetId: player.id });
        } else {
            await playCard(player, card, player.id);
            gameState.gamePhase = 'playing';
            renderAll();
        }
        return;
    }

    const targetableCards = ['Mais', 'Menos', 'Sobe', 'Desce', 'Pula', 'Reversus'];

    if (targetableCards.includes(card.name)) {
        const allPlayers = gameState.playerIdsInGame.filter(id => !gameState.players[id].isEliminated);
        if (allPlayers.length === 0) {
            updateLog(`Não há jogadores para usar a carta '${card.name}'.`);
            cancelPlayerAction();
            return;
        }
        dom.targetModalCardName.textContent = card.name;
        dom.targetPlayerButtonsEl.innerHTML = allPlayers.map(id => `<button class="control-button target-player-${id.split('-')[1]}" data-player-id="${id}">${gameState.players[id].name}</button>`).join('');
        dom.targetModal.classList.remove('hidden');
    } else if (card.name === 'Reversus Total') {
        dom.reversusTotalChoiceModal.classList.remove('hidden');
    } else if (card.name === 'Carta da Versatrix') {
        if (gameState.isPvp) {
             network.emitPlayCard({ cardId: card.id, targetId: player.id });
        } else {
             await playCard(player, card, player.id);
             gameState.gamePhase = 'playing';
             renderAll();
        }
    } else {
        console.warn(`Unhandled effect card in handlePlayButtonClick: ${card.name}`);
        cancelPlayerAction();
    }
}


/**
 * Handles the logic for ending a player's turn.
 */
function handleEndTurnButtonClick() {
    const { gameState } = getState();
    const myPlayerId = getLocalPlayerId();
    if (!myPlayerId) return;

    const player = gameState.players[myPlayerId];

    if (!player || gameState.currentPlayer !== myPlayerId) return;

    const valueCardsInHandCount = player.hand.filter(c => c.type === 'value').length;
    if (valueCardsInHandCount > 1 && !player.playedValueCardThisTurn) {
        updateLog("Você deve jogar uma carta de valor antes de passar o turno.");
        return;
    }
    
    // Immediately disable buttons for better UX
    dom.playButton.disabled = true;
    dom.endTurnButton.disabled = true;

    if (gameState.isPvp) {
        network.emitEndTurn();
    } else {
        updateLog(`${player.name} passou o turno.`);
        gameState.consecutivePasses++;
        advanceToNextPlayer();
    }
}

/**
 * Shows an info modal for a field effect when its indicator is clicked.
 * @param {Event} e The click event from the indicator.
 */
function handleFieldEffectIndicatorClick(e) {
    const indicator = e.target.closest('.field-effect-indicator');
    if (!indicator) return;

    const playerId = indicator.dataset.playerId;
    const { gameState } = getState();
    const activeEffect = gameState.activeFieldEffects.find(fe => fe.appliesTo === playerId);
    
    if (activeEffect) {
        dom.fieldEffectInfoTitle.textContent = t('field_effect.info_title');
        const isPositive = activeEffect.type === 'positive';
        dom.fieldEffectInfoModal.querySelector('.field-effect-card').className = `field-effect-card ${isPositive ? 'positive' : 'negative'}`;
        dom.fieldEffectInfoName.textContent = activeEffect.name;
        
        // Correctly get and translate the description
        const effectConfig = isPositive ? config.POSITIVE_EFFECTS[activeEffect.name] : config.NEGATIVE_EFFECTS[activeEffect.name];
        dom.fieldEffectInfoDescription.textContent = effectConfig ? t(effectConfig.descriptionKey) : 'Descrição não encontrada.';
        
        dom.fieldEffectInfoModal.classList.remove('hidden');
    }
}

/**
 * Cleans up all UI elements and state related to the Infinite Challenge intro.
 */
function cleanupInfiniteChallengeIntro() {
    if (introImageInterval) {
        clearInterval(introImageInterval);
        introImageInterval = null;
    }
    sound.stopStoryMusic();
    dom.infiniteChallengeIntroModal.classList.add('hidden');
    dom.infiniteChallengeIntroModal.classList.remove('fullscreen-modal');
    if (infiniteChallengeIntroHandler) {
        dom.infiniteChallengeIntroOptions.removeEventListener('click', infiniteChallengeIntroHandler);
        infiniteChallengeIntroHandler = null;
    }
}


/**
 * Manages the multi-step introduction for the Infinite Challenge.
 */
async function startInfiniteChallengeIntro() {
    const { isLoggedIn } = getState();
    if (!isLoggedIn) {
        alert(t('common.login_required', { feature: t('splash.infinite_challenge') }));
        return;
    }
    
    sound.initializeMusic();
    sound.playStoryMusic('salamandra.ogg');
    
    dom.infiniteChallengeIntroModal.classList.add('fullscreen-modal');
    dom.infiniteChallengeIntroModal.classList.remove('hidden');

    const inversusImages = ['inversum1.png', 'inversum2.png', 'inversum3.png'];
    let imageIndex = 0;
    dom.infiniteChallengeIntroImage.src = `./${inversusImages[0]}`;
    if (introImageInterval) clearInterval(introImageInterval);
    introImageInterval = setInterval(() => {
        imageIndex = (imageIndex + 1) % inversusImages.length;
        dom.infiniteChallengeIntroImage.src = `./${inversusImages[imageIndex]}`;
    }, 2000);

    let introStep = 1;
    let potValue = '...';

    const updateIntro = () => {
        switch (introStep) {
            case 1:
                dom.infiniteChallengeIntroText.textContent = t('infinite_challenge.intro_1');
                dom.infiniteChallengeIntroOptions.innerHTML = `<button class="control-button">${t('common.continue')}</button>`;
                break;
            case 2:
                dom.infiniteChallengeIntroText.textContent = t('infinite_challenge.intro_2');
                dom.infiniteChallengeIntroOptions.innerHTML = `<button class="control-button">${t('common.continue')}</button>`;
                break;
            case 3:
                dom.infiniteChallengeIntroText.textContent = t('infinite_challenge.intro_3', { pot: potValue });
                dom.infiniteChallengeIntroOptions.innerHTML = `
                    <button id="start-infinite-challenge-yes" class="control-button">${t('common.yes')}</button>
                    <button id="start-infinite-challenge-no" class="control-button cancel">${t('common.no')}</button>`;
                break;
        }
    };

    if (infiniteChallengeIntroHandler) {
        dom.infiniteChallengeIntroOptions.removeEventListener('click', infiniteChallengeIntroHandler);
    }

    infiniteChallengeIntroHandler = (e) => {
        const button = e.target.closest('button');
        if (!button) return;

        if (button.id === 'start-infinite-challenge-yes') {
            // Provide immediate feedback while waiting for the server
            dom.infiniteChallengeIntroText.textContent = t('infinite_challenge.validating_entry');
            dom.infiniteChallengeIntroOptions.innerHTML = `<div class="spinner"></div>`;
            network.emitStartInfiniteChallenge();
        } else if (button.id === 'start-infinite-challenge-no') {
            cleanupInfiniteChallengeIntro();
        } else {
            introStep++;
            updateIntro();
        }
    };

    dom.infiniteChallengeIntroOptions.addEventListener('click', infiniteChallengeIntroHandler);

    updateIntro();
    
    network.emitGetInfiniteChallengePot((pot) => {
        potValue = pot;
        if (introStep === 3) {
            updateIntro();
        }
    });
}


export function initializeUiHandlers() {
    document.addEventListener('aiTurnEnded', advanceToNextPlayer);
    
    initializeChatHandlers();

    document.addEventListener('startNextInfiniteDuel', () => {
        startNextInfiniteChallengeDuel();
    });

    document.addEventListener('infiniteChallengeEnd', (e) => {
        const { reason } = e.detail;
        const { gameState } = getState();
        const level = gameState.infiniteChallengeLevel;
        const time = gameState.elapsedSeconds;
        const didWin = reason === 'victory';
    
        network.emitSubmitInfiniteResult({ level, time, didWin });
    
        // The win message is handled by the `infiniteChallengeWin` network event
        if (!didWin) {
            let message;
            if (reason === 'loss') {
                message = t('game_over.infinite_challenge_lose', { level, time: formatTime(time) });
            } else { // 'time'
                message = t('game_over.infinite_challenge_timeout', { level });
            }
            showGameOver(message, t('game_over.infinite_challenge_title'), { action: 'menu' });
        }
    });

    // Listener for server success response to start the challenge
    document.addEventListener('initiateInfiniteChallengeGame', () => {
        cleanupInfiniteChallengeIntro();
        const { infiniteChallengeOpponentQueue } = getState();
        initializeGame('infinite_challenge', {
            numPlayers: 2,
            overrides: {
                'player-2': {
                    name: t(infiniteChallengeOpponentQueue[0].nameKey),
                    aiType: infiniteChallengeOpponentQueue[0].aiType,
                    story_image_url: infiniteChallengeOpponentQueue[0].image
                }
            }
        });
    });

    // Listener for server error response or user cancellation
    document.addEventListener('cleanupInfiniteChallengeUI', () => {
        cleanupInfiniteChallengeIntro();
    });

    document.body.addEventListener('click', (e) => {
        if (e.target.closest('.player-hand')) handleCardClick(e);
        if (e.target.closest('.field-effect-indicator')) handleFieldEffectIndicatorClick(e);
        if (e.target.matches('.report-button')) {
            const button = e.target;
            const googleId = button.dataset.googleId;
            const username = button.dataset.username;
            const message = button.dataset.message;
            if (confirm(t('confirm.report_player', { username }))) {
                network.emitReportPlayer(googleId, message);
            }
        }
    });

    dom.playButton.addEventListener('click', handlePlayButtonClick);
    dom.endTurnButton.addEventListener('click', handleEndTurnButtonClick);
    dom.cardViewerCloseButton.addEventListener('click', () => dom.cardViewerModalEl.classList.add('hidden'));
    
    // --- NEW LOGIN & QUICK START FLOW ---
    dom.loginButton.addEventListener('click', () => {
        sound.initializeMusic();
        if (typeof google !== 'undefined' && google.accounts) {
            google.accounts.id.prompt();
        } else {
            console.error("Google Auth not ready.");
            alert("Serviço de login não está pronto. Tente novamente em um momento.");
        }
    });

    dom.quickStartButton.addEventListener('click', () => {
        sound.initializeMusic();
        dom.splashScreenEl.classList.add('hidden');
        dom.quickStartModal.classList.remove('hidden');
    });

    dom.quickStartAiButton.addEventListener('click', () => {
        dom.quickStartModal.classList.add('hidden');
        dom.gameSetupModal.classList.remove('hidden');
    });

    dom.quickStartPvpButton.addEventListener('click', () => {
        const { isLoggedIn } = getState();
        if (!isLoggedIn) {
            alert(t('common.login_required', { feature: 'PVP Matchmaking' }));
            return;
        }
        dom.quickStartModal.classList.add('hidden');
        dom.pvpMatchmakingModal.classList.remove('hidden');
    });

    dom.quickStartCloseButton.addEventListener('click', () => {
        dom.quickStartModal.classList.add('hidden');
        showSplashScreen();
    });

    dom.pvpMatchmakingButtons.addEventListener('click', (e) => {
        const button = e.target.closest('button[data-mode]');
        if (!button) return;

        const mode = button.dataset.mode;
        network.emitJoinMatchmaking({ mode });
        dom.pvpMatchmakingModal.classList.add('hidden');
        dom.matchmakingStatusModal.classList.remove('hidden');
        dom.matchmakingStatusText.textContent = t('matchmaking.searching_text');
    });

    dom.pvpMatchmakingCloseButton.addEventListener('click', () => {
        dom.pvpMatchmakingModal.classList.add('hidden');
        dom.quickStartModal.classList.remove('hidden');
    });

    dom.matchmakingCancelButton.addEventListener('click', () => {
        network.emitCancelMatchmaking();
    });

    // --- END NEW QUICK START FLOW ---
    
    dom.storyModeButton.addEventListener('click', () => {
        sound.initializeMusic();
        const hasSave = saveLoad.checkForSavedGame();
        dom.storyContinueGameButton.disabled = !hasSave;
        dom.storyStartOptionsModal.classList.remove('hidden');
    });

    dom.pvpModeButton.addEventListener('click', () => {
        const { isLoggedIn } = getState();
        if (!isLoggedIn) {
            alert(t('common.login_required', { feature: 'PVP Online' }));
            return;
        }
        network.emitListRooms();
        dom.splashScreenEl.classList.add('hidden');
        dom.pvpRoomListModal.classList.remove('hidden');
    });

    dom.eventButton.addEventListener('click', () => {
        const currentMonth = new Date().getMonth();
        currentEventData = config.MONTHLY_EVENTS[currentMonth];
    
        if (currentEventData) {
            sound.playStoryMusic(`${currentEventData.ai}.ogg`);
            dom.eventCharacterImage.src = `./${currentEventData.image}`;
            dom.eventCharacterName.textContent = t(currentEventData.characterNameKey);
            dom.eventAbilityDescription.textContent = t(currentEventData.abilityKey);
            dom.eventRewardText.textContent = t('event.reward_text_placeholder', { rewardName: t(currentEventData.rewardTitleKey) });
    
            const progressKey = `reversus-event-progress-${currentMonth}`;
            const wins = parseInt(localStorage.getItem(progressKey) || '0', 10);
    
            const today = new Date().toISOString().split('T')[0];
            const lastAttemptDate = localStorage.getItem('reversus-event-attempt-date');
            const hasAttemptedToday = lastAttemptDate === today;
    
            if (wins >= 3) {
                dom.challengeEventButton.disabled = false; // Can re-challenge for fun
                dom.eventStatusText.textContent = t('event.status_completed');
            } else {
                dom.challengeEventButton.disabled = hasAttemptedToday;
                dom.eventStatusText.textContent = hasAttemptedToday ? t('event.status_wait') : '';
            }
    
            // Render progress markers
            dom.eventProgressMarkers.innerHTML = ''; // Clear previous markers
            for (let i = 0; i < 3; i++) {
                const marker = document.createElement('div');
                marker.className = 'progress-marker';
                if (i < wins) {
                    marker.classList.add('completed');
                }
                dom.eventProgressMarkers.appendChild(marker);
            }
    
        } else {
            sound.playStoryMusic('tela.ogg');
            dom.eventCharacterImage.src = '';
            dom.eventCharacterName.textContent = 'Nenhum Evento Ativo';
            dom.eventAbilityDescription.textContent = 'Volte mais tarde para novos desafios.';
            dom.challengeEventButton.disabled = true;
            dom.eventStatusText.textContent = '';
            currentEventData = null;
        }
        dom.eventModal.classList.remove('hidden');
    });

    dom.challengeEventButton.addEventListener('click', () => {
        if (dom.challengeEventButton.disabled || !currentEventData) return;

        const today = new Date().toISOString().split('T')[0];
        localStorage.setItem('reversus-event-attempt-date', today);

        const gameOptions = {
            story: {
                battle: `event_${currentEventData.ai}`,
                eventData: { name: t(currentEventData.nameKey), ai: currentEventData.ai },
                playerIds: ['player-1', 'player-2'],
                overrides: {
                    'player-2': {
                        name: t(currentEventData.characterNameKey),
                        aiType: currentEventData.ai,
                    }
                }
            }
        };
        document.dispatchEvent(new CustomEvent('startStoryGame', { detail: { mode: 'solo', options: gameOptions } }));
    });
    
    dom.closeEventButton.addEventListener('click', () => {
        dom.eventModal.classList.add('hidden');
        sound.stopStoryMusic();
    });

    dom.rankingButton.addEventListener('click', () => {
        // Automatically request the first page of the default (PVP) ranking
        network.emitGetRanking(1);
        dom.rankingModal.classList.remove('hidden');
    
        // Reset tabs to default state
        dom.rankingModal.querySelectorAll('.info-tab-button').forEach(btn => btn.classList.remove('active'));
        dom.rankingModal.querySelectorAll('.info-tab-content').forEach(content => content.classList.remove('active'));
        dom.rankingModal.querySelector('[data-tab="ranking-pvp"]').classList.add('active');
        document.getElementById('ranking-pvp-tab-content').classList.add('active');
    });
    
    dom.rankingModal.addEventListener('click', (e) => {
        // Tab switching
        const tabButton = e.target.closest('.info-tab-button');
        if (tabButton && !tabButton.classList.contains('active')) {
            const tabId = tabButton.dataset.tab;
            dom.rankingModal.querySelectorAll('.info-tab-button').forEach(btn => btn.classList.remove('active'));
            dom.rankingModal.querySelectorAll('.info-tab-content').forEach(content => content.classList.remove('active'));
            tabButton.classList.add('active');
            document.getElementById(`${tabId}-tab-content`).classList.add('active');
    
            // Fetch data for the newly activated tab
            if (tabId === 'ranking-pvp') {
                network.emitGetRanking(1);
            } else if (tabId === 'ranking-infinite') {
                network.emitGetInfiniteRanking(1);
            }
        }
    
        // PVP Pagination
        const pvpPrevBtn = e.target.closest('#rank-prev-btn');
        const pvpNextBtn = e.target.closest('#rank-next-btn');
        if (pvpPrevBtn || pvpNextBtn) {
            const currentPage = parseInt(document.getElementById('ranking-pagination').querySelector('span')?.textContent.match(/(\d+)/)?.[0] || '1', 10);
            const newPage = pvpNextBtn ? currentPage + 1 : currentPage - 1;
            network.emitGetRanking(newPage);
        }
    
        // Infinite Challenge Pagination
        const infinitePrevBtn = e.target.closest('#infinite-rank-prev-btn');
        const infiniteNextBtn = e.target.closest('#infinite-rank-next-btn');
        if (infinitePrevBtn || infiniteNextBtn) {
            const currentPage = parseInt(document.getElementById('infinite-ranking-pagination').querySelector('span')?.textContent.match(/(\d+)/)?.[0] || '1', 10);
            const newPage = infiniteNextBtn ? currentPage + 1 : currentPage - 1;
            network.emitGetInfiniteRanking(newPage);
        }
    });

    if (dom.rankingContainer) {
        dom.rankingContainer.addEventListener('click', (e) => {
            const target = e.target.closest('.rank-name.clickable');
            if (target) {
                const googleId = target.dataset.google