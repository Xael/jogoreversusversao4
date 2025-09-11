// js/core/network.js
import { getState, updateState } from './state.js';
import { elements as dom } from './dom.js';
import { renderAll, showGameOver, showRoundSummaryModal, showTurnIndicator } from '../ui/ui-renderer.js';
import { renderRoomList, updateLobbyUi } from '../ui/lobby-renderer.js';
import { renderProfile, renderFriendsList, renderSearchResults, addPrivateChatMessage, renderFriendRequests, renderAdminPanel, renderOnlineFriendsForInvite } from '../ui/profile-renderer.js';
import { showSplashScreen } from '../ui/splash-screen.js';
import { updateLog } from './utils.js';
import { updateGameTimer } from '../game-controller.js';
import { showPvpDrawSequence } from '../game-logic/turn-manager.js';
import { t } from './i18n.js';
import { animateCardPlay } from '../ui/animations.js';
import { showCoinRewardNotification } from '../ui/toast-renderer.js';
import { playSoundEffect, announceEffect } from '../core/sound.js';
import * as sound from './sound.js';
import { renderShopAvatars, updateCoinVersusDisplay } from '../ui/shop-renderer.js';

let socket;

/**
 * Sets up the player areas in the UI so the local player is always at the bottom.
 */
function setupPlayerPerspective() {
    const { gameState, playerId } = getState();
    if (!gameState || !playerId || !gameState.playerIdsInGame) return;

    const playerIds = gameState.playerIdsInGame;
    if (!playerIds.includes(playerId)) return;
    
    const myIndex = playerIds.indexOf(playerId);
    
    const orderedPlayerIds = [...playerIds.slice(myIndex), ...playerIds.slice(0, myIndex)];

    const player1Container = document.getElementById('player-1-area-container');
    const opponentsContainer = document.getElementById('opponent-zones-container');
    const createPlayerAreaHTML = (id) => `<div class="player-area" id="player-area-${id}"></div>`;
    
    if(player1Container) player1Container.innerHTML = createPlayerAreaHTML(orderedPlayerIds[0]);
    if(opponentsContainer) opponentsContainer.innerHTML = orderedPlayerIds.slice(1).map(id => createPlayerAreaHTML(id)).join('');
}


export function connectToServer() {
    if (getState().isConnectionAttempted) return;
    updateState('isConnectionAttempted', true);
    
    const SERVER_URL = "https://reversus-node.dke42d.easypanel.host";
    socket = io(SERVER_URL, {
        reconnectionAttempts: 3,
        timeout: 10000,
    });
    updateState('socket', socket);

    socket.on('connect', () => {
        const clientId = socket.id;
        console.log('Conectado ao servidor com ID:', clientId);
        updateState('clientId', clientId);
    });
    
    socket.on('connect_error', (err) => {
        console.error("Falha na conexão:", err.message);
        // Optionally show a user-facing error message
    });

    socket.on('loginSuccess', (userProfile) => {
        console.log('Login successful on client:', userProfile);
        updateState('isLoggedIn', true);
        updateState('userProfile', userProfile);
        
        dom.loginButton.classList.add('hidden');
        dom.userProfileDisplay.classList.remove('hidden');
        renderProfile(userProfile);
        dom.rankingButton.classList.remove('hidden'); 
        dom.eventButton.classList.remove('hidden');
        emitGetFriendsList(); 
        emitGetPendingRequests(); 
        emitClaimDailyLoginReward(); 
    });

    socket.on('dailyRewardSuccess', ({ amount }) => {
        showCoinRewardNotification(t('rewards.daily_login_toast', { amount }));
    });
    
    socket.on('challengeRewardSuccess', ({ amount, titleCode }) => {
        const titleName = t(`titles.${titleCode}`);
        showCoinRewardNotification(t('rewards.infinite_challenge_toast', { amount, titleName }));
    });

    socket.on('loginError', (message) => {
        console.error('Login failed:', message);
        alert(`Erro de login: ${message}`);
    });

    socket.on('forceDisconnect', (message) => {
        alert(message);
        window.location.reload();
    });
    
    socket.on('rankingData', (rankingData) => {
        renderPvpRanking(rankingData);
    });

    socket.on('infiniteRankingData', (rankingData) => {
        renderInfiniteRanking(rankingData);
    });

    socket.on('profileData', (profile) => {
        const { userProfile: myProfile } = getState();
        if (myProfile && profile.google_id === myProfile.google_id) {
            updateState('userProfile', profile);
        }
        renderProfile(profile);
    });
    
    socket.on('viewProfileData', (profile) => {
        renderProfile(profile);
        dom.profileModal.classList.remove('hidden');
    });

    socket.on('adminData', (data) => renderAdminPanel(data));
    socket.on('adminActionSuccess', () => emitAdminGetData());

    socket.on('newReport', () => {
        const { userProfile } = getState();
        if (userProfile?.isAdmin && !dom.profileModal.classList.contains('hidden') && document.getElementById('profile-admin-tab-content')?.classList.contains('active')) {
            emitAdminGetData();
        }
    });

    socket.on('reportSuccess', (message) => alert(message));
    socket.on('searchResults', (results) => renderSearchResults(results));
    socket.on('friendsList', (friends) => renderFriendsList(friends));
    socket.on('pendingRequestsData', (requests) => renderFriendRequests(requests));

    socket.on('newFriendRequest', (request) => {
        alert(t('friends.new_request_alert', { username: request.username }));
        dom.friendRequestBadge.classList.remove('hidden');
        if (!dom.profileModal.classList.contains('hidden')) {
            emitGetPendingRequests();
        }
    });

    socket.on('friendRequestResponded', ({ username, action }) => {
        if (action === 'accept') {
            alert(t('friends.request_accepted_alert', { username }));
        }
        emitGetFriendsList();
        emitGetPendingRequests();
    });
    
    socket.on('friendStatusUpdate', () => emitGetFriendsList());
    socket.on('privateMessage', (message) => addPrivateChatMessage(message));
    socket.on('roomList', (rooms) => renderRoomList(rooms));
    
    socket.on('lobbyUpdate', async (roomData) => {
        updateState('currentRoomId', roomData.id);
        const { clientId, userProfile } = getState();
        const myPlayerData = roomData.players.find(p => p.id === clientId);
        if (myPlayerData) {
            updateState('playerId', myPlayerData.playerId);
            if (userProfile) userProfile.playerId = myPlayerData.playerId;
        }
        
        dom.splashScreenEl.classList.add('hidden');
        dom.pvpRoomListModal.classList.add('hidden');
        dom.lobbyInviteNotificationModal.classList.add('hidden');
        dom.pvpLobbyModal.classList.remove('hidden');
        
        updateLobbyUi(roomData);
    });

    socket.on('lobbyChatMessage', ({ speaker, message }) => addLobbyChatMessage(speaker, message));
    socket.on('chatMessage', ({ speaker, message, googleId }) => updateLog({ type: 'dialogue', speaker, message, googleId }));

    socket.on('gameStarted', async (initialGameState) => {
        if (initialGameState.playerSocketMap) {
            const myEntry = Object.entries(initialGameState.playerSocketMap).find(([socketId, pId]) => socketId === getState().clientId);
            if (myEntry) updateState('playerId', myEntry[1]);
        }

        updateState('gameState', initialGameState);
        
        dom.pvpLobbyModal.classList.add('hidden');
        dom.matchmakingStatusModal.classList.add('hidden');
        dom.appContainerEl.classList.remove('hidden');
        sound.stopStoryMusic();
        dom.nextTrackButton.disabled = false;
        
        const state = getState();
        if (state.gameTimerInterval) clearInterval(state.gameTimerInterval);
        updateState('gameStartTime', Date.now());
        updateGameTimer();
        updateState('gameTimerInterval', setInterval(updateGameTimer, 1000));
        
        if (initialGameState.gamePhase === 'initial_draw') {
            await showPvpDrawSequence(initialGameState);
        } else {
            setupPlayerPerspective();
            renderAll();
        }
    });

    socket.on('cardPlayedAnimation', async ({ casterId, targetId, card, targetSlotLabel }) => {
        const startElement = document.querySelector(`#hand-${casterId} [data-card-id="${card.id}"]`);
        await animateCardPlay(card, startElement, targetId, targetSlotLabel);
    
        const soundToPlay = card.name.toLowerCase().replace(/\s/g, '');
        const effectsWithSounds = ['mais', 'menos', 'sobe', 'desce', 'pula', 'reversus'];
    
        if (card.isLocked) {
            announceEffect("REVERSUS INDIVIDUAL!", 'reversus');
            playSoundEffect('reversustotal');
        } else if (card.name === 'Reversus Total') {
            announceEffect('Reversus Total!', 'reversus-total');
            playSoundEffect('reversustotal');
        } else if (effectsWithSounds.includes(soundToPlay)) {
            setTimeout(() => playSoundEffect(soundToPlay), 100);
            setTimeout(() => announceEffect(card.name), 150);
        }
    });

    socket.on('gameStateUpdate', (gameState) => {
        const { gameState: localGameState, playerId } = getState();
        const oldCurrentPlayer = localGameState?.currentPlayer;
        const localUiState = localGameState ? { selectedCard: localGameState.selectedCard } : {};
        const newGameState = { ...gameState, ...localUiState };
        updateState('gameState', newGameState);
        setupPlayerPerspective();
        renderAll();

        const newCurrentPlayer = newGameState.currentPlayer;
        if (newCurrentPlayer === playerId && oldCurrentPlayer !== newCurrentPlayer && newGameState.gamePhase === 'playing') {
            showTurnIndicator();
        }
    });

    socket.on('roundSummary', (summaryData) => showRoundSummaryModal(summaryData));
    socket.on('matchCancelled', (message) => { alert(message); showSplashScreen(); });
    socket.on('gameOver', ({ message }) => showGameOver(message, "Fim de Jogo!", { action: 'menu' }));
    socket.on('error', (message) => alert(`Erro do Servidor: ${message}`));
    socket.on('matchmakingStatus', ({ mode, current, needed }) => {
        if (dom.matchmakingStatusText) {
            dom.matchmakingStatusText.textContent = t('matchmaking.status_update', { mode, current, needed });
        }
    });
    socket.on('matchmakingCancelled', () => {
        updateState('currentQueueMode', null);
        dom.matchmakingStatusModal.classList.add('hidden');
        dom.pvpMatchmakingModal.classList.remove('hidden');
        alert(t('matchmaking.cancel_success'));
    });
    socket.on('onlineFriendsList', (friends) => renderOnlineFriendsForInvite(friends));
    socket.on('lobbyInvite', ({ inviterUsername, roomName, roomId }) => {
        dom.lobbyInviteNotificationText.textContent = t('pvp.invite_notification_text', { username: inviterUsername, roomName });
        dom.lobbyInviteAcceptButton.dataset.roomId = roomId;
        dom.lobbyInviteNotificationModal.classList.remove('hidden');
    });
    socket.on('inviteResponse', ({ status, username }) => {
        const messages = {
            'sent': t('pvp.invite_sent', { username }),
            'declined': t('pvp.invite_declined', { username }),
            'offline': t('pvp.invite_failed_offline', { username }),
            'in_game': t('pvp.invite_failed_ingame', { username }),
            'already_in_lobby': t('pvp.already_in_lobby')
        };
        if (messages[status]) alert(messages[status]);
    });
    socket.on('avatarPurchaseSuccess', ({ updatedProfile }) => {
        const { userProfile } = getState();
        if (userProfile.google_id === updatedProfile.google_id) {
            updateState('userProfile', updatedProfile);
            renderShopAvatars();
            updateCoinVersusDisplay(updatedProfile.coinversus);
            showCoinRewardNotification(t('shop.purchase_success'));
        }
    });
    socket.on('avatarPurchaseError', ({ message }) => {
        alert(t('shop.purchase_error', { error: message }));
        renderShopAvatars();
    });

    socket.on('infiniteChallengePotUpdate', ({ pot }) => {
        if (dom.infiniteChallengePotDisplay) {
            dom.infiniteChallengePotDisplay.textContent = t('infinite_challenge.pot_display', { pot: pot || 0 });
            dom.infiniteChallengePotDisplay.dataset.potValue = pot || 0;
        }
    });
    socket.on('infiniteChallengeStartSuccess', (payload) => {
        if (!payload || !payload.opponentQueue || payload.opponentQueue.length === 0) {
            alert("Ocorreu um erro ao iniciar o desafio. Por favor, tente novamente.");
            document.dispatchEvent(new Event('cleanupInfiniteChallengeUI'));
            return;
        }
        if (payload.updatedProfile) updateState('userProfile', payload.updatedProfile);
        updateState('infiniteChallengeOpponentQueue', payload.opponentQueue);
        document.dispatchEvent(new Event('initiateInfiniteChallengeGame'));
    });
    socket.on('infiniteChallengeStartError', ({ message }) => {
        alert(message);
        document.dispatchEvent(new Event('cleanupInfiniteChallengeUI'));
    });
    socket.on('infiniteChallengeWin', ({ potWon }) => {
        const { gameState } = getState();
        const timeFormatted = formatTime(gameState.elapsedSeconds);
        showGameOver(
            t('game_over.infinite_challenge_win', { time: timeFormatted, pot: potWon }),
            t('game_over.infinite_challenge_title'),
            { action: 'menu' }
        );
    });
}

// --- EMITTERS ---
export function emitGetRanking(page = 1) { if (socket) socket.emit('getRanking', { page }); }
export function emitGetInfiniteRanking(page = 1) { if (socket) socket.emit('getInfiniteRanking', { page }); }
export function emitGetInfiniteChallengePot(callback) { if (socket) socket.emit('getInfiniteChallengePot', callback); }
export function emitStartInfiniteChallenge() { if (socket) socket.emit('startInfiniteChallenge'); }
export function emitSubmitInfiniteResult(result) { if (socket) socket.emit('submitInfiniteResult', result); }
export function emitGetProfile() { if (socket) socket.emit('getProfile'); }
export function emitViewProfile({ googleId }) { if (socket) socket.emit('viewProfile', { googleId }); }
export function emitSetSelectedTitle(titleCode) { if (socket) socket.emit('setSelectedTitle', { titleCode }); }
export function emitSetSelectedAvatar({ avatarCode }) { if (socket) socket.emit('setSelectedAvatar', { avatarCode }); }
export function emitListRooms() { if (socket) socket.emit('listRooms'); }
export function emitCreateRoom({ name, password, betAmount }) { if (socket) socket.emit('createRoom', { name, password, betAmount }); }
export function emitJoinRoom({ roomId, password }) { if (socket) socket.emit('joinRoom', { roomId, password }); }
export function emitLobbyChat(message) { if (socket) socket.emit('lobbyChatMessage', message); }
export function emitChatMessage(message) { if (socket) socket.emit('chatMessage', message); }
export function emitChangeMode(mode) { if (socket) socket.emit('changeMode', mode); }
export function emitStartGame() { if (socket) socket.emit('startGame'); }
export function emitPlayCard({ cardId, targetId, options = {} }) { if (socket) socket.emit('playCard', { cardId, targetId, options }); }
export function emitSearchUsers(query) { if (socket) socket.emit('searchUsers', { query }); }
export function emitSendFriendRequest(targetUserId, callback) { if (socket) socket.emit('sendFriendRequest', { targetUserId }, callback); }
export function emitRespondToRequest(requestId, action) { if (socket) socket.emit('respondToRequest', { requestId, action }); }
export function emitGetPendingRequests() { if (socket) socket.emit('getPendingRequests'); }
export function emitRemoveFriend(targetUserId) { if (socket) socket.emit('removeFriend', { targetUserId }); }
export function emitGetFriendsList() { if (socket) socket.emit('getFriendsList'); }
export function emitSendPrivateMessage(recipientId, content) { if (socket) socket.emit('sendPrivateMessage', { recipientId, content }); }
export function emitReportPlayer(reportedGoogleId, message) { if (socket) socket.emit('reportPlayer', { reportedGoogleId, message }); }
export function emitClaimDailyLoginReward() { if (socket) socket.emit('claimDailyLoginReward'); }
export function emitClaimChallengeReward(data) { if (socket) socket.emit('claimChallengeReward', data); }
export function emitGrantAchievement(achievementId) { if (socket) socket.emit('grantAchievement', { achievementId }); }
export function emitBuyAvatar({ avatarCode }) { if (socket) socket.emit('buyAvatar', { avatarCode }); }
export function emitJoinMatchmaking({ mode }) { if (socket) { updateState('currentQueueMode', mode); socket.emit('joinMatchmaking', { mode }); } }
export function emitCancelMatchmaking() { if (socket) socket.emit('cancelMatchmaking'); }
export function emitGetOnlineFriends() { if (socket) socket.emit('getOnlineFriends'); }
export function emitInviteFriendToLobby(targetUserId) { const { currentRoomId } = getState(); if (socket && currentRoomId) socket.emit('inviteFriendToLobby', { targetUserId, roomId: currentRoomId }); }
export function emitAcceptInvite({ roomId }) { if (socket) socket.emit('acceptInvite', { roomId }); }
export function emitDeclineInvite({ roomId }) { if (socket) socket.emit('declineInvite', { roomId }); }
export function emitKickPlayer(targetClientId) { const { currentRoomId } = getState(); if (socket && currentRoomId) socket.emit('kickPlayer', { targetClientId, roomId: currentRoomId }); }
export function emitLeaveRoom() { const { currentRoomId } = getState(); if (socket && currentRoomId) { socket.emit('leaveRoom'); updateState('currentRoomId', null); updateState('gameState', null); dom.pvpLobbyModal.classList.add('hidden'); dom.appContainerEl.classList.add('hidden'); showSplashScreen(); } }
export function emitEndTurn() { const { gameState, playerId } = getState(); if (!socket || !gameState || gameState.currentPlayer !== playerId) return; const player = gameState.players[playerId]; if(!player) return; const valueCardsInHandCount = player.hand.filter(c => c.type === 'value').length; if (valueCardsInHandCount > 1 && !player.playedValueCardThisTurn) { alert("Você precisa jogar uma carta de valor neste turno!"); return; } socket.emit('endTurn'); }
export function emitAdminGetData() { if (socket) socket.emit('admin:getData'); }
export function emitAdminBanUser(userId) { if (socket) socket.emit('admin:banUser', { userId }); }
export function emitAdminUnbanUser(userId) { if (socket) socket.emit('admin:unbanUser', { userId }); }
export function emitAdminResolveReport(reportId) { if (socket) socket.emit('admin:resolveReport', { reportId }); }
export function emitAdminRollbackUser(userId) { if (socket) socket.emit('admin:rollbackUser', { userId }); }
