
// Declare all variables first
export let appContainerEl, boardEl, playButton, endTurnButton, logEl, teamScoresContainer, 
reversusTotalIndicatorEl, gameTimerContainerEl, splashScreenEl, splashAnimationContainerEl, 
quickStartButton, storyModeButton, pvpModeButton, infoButton, infoModal, closeInfoButton, 
gameSetupModal, solo2pButton, solo3pButton, solo4pButton, duoModeButton, closeSetupButton, 
oneVOneSetupModal, oneVOneRandomButton, oneVOneDefaultButton, oneVOneBackButton, 
randomOpponentSpinnerModal, opponentSpinnerImage, opponentSpinnerName, gameOverModal, 
gameOverTitle, gameOverMessage, restartButton, targetModal, targetModalCardName, 
targetPlayerButtonsEl, targetCancelButton, reversusTargetModal, reversusTargetScoreButton, 
reversusTargetMovementButton, reversusTargetCancelButton, reversusTotalChoiceModal, 
reversusTotalGlobalButton, reversusTotalIndividualButton, reversusTotalChoiceCancel, 
reversusIndividualEffectChoiceModal, reversusIndividualEffectButtons, 
reversusIndividualCancelButton, drawStartModal, drawStartTitle, drawStartCardsContainerEl, 
drawStartResultMessage, fieldEffectModal, fieldEffectTitle, fieldEffectCardEl, fieldEffectNameEl, 
fieldEffectDescriptionEl, fieldEffectContinueButton, versatrixFieldModal, 
versatrixFieldContinueButton, fieldEffectInfoModal, fieldEffectInfoTitle, fieldEffectInfoName, 
fieldEffectInfoDescription, fieldEffectInfoCloseButton, versatrixCardInfoModal, 
versatrixCardInfoContinueButton, pulaModal, pulaModalTitle, pulaModalText, pulaPathButtonsEl, 
pulaCancelButton, pathSelectionModal, pathSelectionModalTitle, pathSelectionModalText, 
pathSelectionButtonsEl, roundSummaryModal, roundSummaryTitle, roundSummaryWinnerText, 
roundSummaryScoresEl, nextRoundButton, turnAnnounceModal, effectAnnouncerEl, cardViewerModalEl, 
cardViewerImageEl, cardViewerCloseButton, reversusTotalBgAnimationEl, pvpRoomListModal, 
pvpRoomGridEl, pvpRoomListCloseButton, pvpPasswordModal, pvpPasswordInput, pvpPasswordSubmit, 
pvpPasswordCancel, pvpLobbyModal, lobbyTitle, pvpLobbyCloseButton, lobbyGameModeEl, 
lobbyStartGameButton, lobbyChatHistoryEl, lobbyChatInput, lobbyChatSendButton, storyModeModalEl, 
storyStarsBackgroundEl, storyScene1El, storySceneDialogueEl, storyScreenFlashEl, 
storyCharacterImageEl, storyDialogueBoxEl, storyDialogueTextEl, storyDialogueOptionsEl, 
musicPlayer, sfxPlayer, popupSfxPlayer, muteButton, nextTrackButton, volumeSlider, 
scalableContainer, debugButton, gameMenuModal, gameMenuCloseButton, menuSaveGameButton, 
menuExitGameButton, saveGameConfirmModal, saveGameYesButton, saveGameNoButton, 
exitGameConfirmModal, exitGameYesButton, exitGameNoButton, leftScoreBox, rightScoreBox, 
leftScoreValue, rightScoreValue, leftScoreStatus, rightScoreStatus, cosmicGlowOverlay, xaelPopup, 
xaelStarPowerButton, xaelPowerConfirmModal, xaelPowerConfirmYes, xaelPowerConfirmNo, 
endgameSequenceModal, endgameCharacterContainer, endgameDialogueText, endgameDialogueOptions, 
creditsRollModal, creditsContent, achievementUnlockedToast, toastText, dailyRewardToast, 
rewardToastText, achievementsModal, achievementsGrid, closeAchievementsButton, 
fullscreenAnnounceModal, fullscreenAnnounceImage, fullscreenAnnounceText, 
storyStartOptionsModal, storyNewGameButton, storyContinueGameButton, storyOptionsCloseButton, 
eventModal, eventCharacterImage, eventCharacterName, eventAbilityDescription, 
eventProgressMarkers, eventRewardText, eventStatusText, challengeEventButton, 
closeEventButton, rankingModal, closeRankingButton, rankingContainer, infiniteRankingContainer, 
profileModal, profileDataContainer, closeProfileButton, userProfileDisplay, userAvatar, 
userName, userLevel, xpBarFill, xpBarText, userCoinBalanceHeader, loginButton, shopButton, 
shopModal, shopAvatarsGrid, closeShopButton, pvpShowCreateRoomButton, pvpCreateRoomModal, 
roomNameInput, roomPasswordInput, pvpCreateRoomConfirmButton, pvpCreateRoomCancelButton, 
friendRequestBadge, profileFriendsTabContent, friendsSearchInput, friendsSearchButton, 
friendRequestsListContainer, profileAdminTabContent, inviteFriendsModal, inviteFriendsList, 
inviteFriendsCloseButton, lobbyInviteNotificationModal, lobbyInviteNotificationText, 
lobbyInviteAcceptButton, lobbyInviteDeclineButton, chatInput, chatSendButton, chatToggleBtn, 
chatFilterBtn, chatContainerEl, privateChatPanel, splashLogo, fieldEffectTargetModal, 
fieldEffectTargetTitle, fieldEffectTargetText, fieldEffectTargetButtons, pvpPotContainer, 
turnCountdownTimer, quickStartModal, quickStartAiButton, quickStartPvpButton, 
quickStartCloseButton, pvpMatchmakingModal, pvpMatchmakingButtons, 
pvpMatchmakingCloseButton, matchmakingStatusModal, matchmakingStatusText, 
matchmakingCancelButton, eventButton, fullscreenButton, inversusModeButton, 
infiniteChallengeButton, infiniteChallengeIntroModal, infiniteChallengeIntroImage, 
infiniteChallengeIntroText, infiniteChallengeIntroOptions, infiniteChallengePotDisplay, 
roundAnnounceModal, infiniteBuffSelectionModal, infiniteBuffOptions, roundSummaryPotTextEl, 
fieldEffectTargetCancelButton;

// New function to initialize the DOM elements after the page loads.
export function initDom() {
    appContainerEl = document.getElementById('app-container');
    boardEl = document.getElementById('game-board');
    playButton = document.getElementById('play-button');
    endTurnButton = document.getElementById('end-turn-button');
    logEl = document.getElementById('game-log');
    teamScoresContainer = document.getElementById('team-scores-container');
    reversusTotalIndicatorEl = document.getElementById('reversus-total-indicator');
    gameTimerContainerEl = document.getElementById('game-timer-container');
    splashScreenEl = document.getElementById('splash-screen');
    splashAnimationContainerEl = document.getElementById('splash-animation-container');
    quickStartButton = document.getElementById('quick-start-button');
    storyModeButton = document.getElementById('story-mode-button');
    pvpModeButton = document.getElementById('pvp-mode-button');
    infoButton = document.getElementById('info-button');
    infoModal = document.getElementById('info-modal');
    closeInfoButton = document.getElementById('close-info-button');
    gameSetupModal = document.getElementById('game-setup-modal');
    solo2pButton = document.getElementById('solo-2p-button');
    solo3pButton = document.getElementById('solo-3p-button');
    solo4pButton = document.getElementById('solo-4p-button');
    duoModeButton = document.getElementById('duo-mode-button');
    closeSetupButton = document.getElementById('close-setup-button');
    oneVOneSetupModal = document.getElementById('one-v-one-setup-modal');
    oneVOneRandomButton = document.getElementById('one-v-one-random-button');
    oneVOneDefaultButton = document.getElementById('one-v-one-default-button');
    oneVOneBackButton = document.getElementById('one-v-one-back-button');
    randomOpponentSpinnerModal = document.getElementById('random-opponent-spinner-modal');
    opponentSpinnerImage = document.getElementById('opponent-spinner-image');
    opponentSpinnerName = document.getElementById('opponent-spinner-name');
    gameOverModal = document.getElementById('game-over-modal');
    gameOverTitle = document.getElementById('game-over-title');
    gameOverMessage = document.getElementById('game-over-message');
    restartButton = document.getElementById('restart-button');
    targetModal = document.getElementById('target-modal');
    targetModalCardName = document.getElementById('target-modal-card-name');
    targetPlayerButtonsEl = document.getElementById('target-player-buttons');
    targetCancelButton = document.getElementById('target-cancel-button');
    reversusTargetModal = document.getElementById('reversus-target-modal');
    reversusTargetScoreButton = document.getElementById('reversus-target-score');
    reversusTargetMovementButton = document.getElementById('reversus-target-movement');
    reversusTargetCancelButton = document.getElementById('reversus-target-cancel');
    reversusTotalChoiceModal = document.getElementById('reversus-total-choice-modal');
    reversusTotalGlobalButton = document.getElementById('reversus-total-global-button');
    reversusTotalIndividualButton = document.getElementById('reversus-total-individual-button');
    reversusTotalChoiceCancel = document.getElementById('reversus-total-choice-cancel');
    reversusIndividualEffectChoiceModal = document.getElementById('reversus-individual-effect-choice-modal');
    reversusIndividualEffectButtons = document.getElementById('reversus-individual-effect-buttons');
    reversusIndividualCancelButton = document.getElementById('reversus-individual-cancel-button');
    drawStartModal = document.getElementById('draw-start-modal');
    drawStartTitle = document.getElementById('draw-start-title');
    drawStartCardsContainerEl = document.getElementById('draw-start-cards-container');
    drawStartResultMessage = document.getElementById('draw-start-result-message');
    fieldEffectModal = document.getElementById('field-effect-modal');
    fieldEffectTitle = document.getElementById('field-effect-title');
    fieldEffectCardEl = fieldEffectModal.querySelector('.field-effect-card');
    fieldEffectNameEl = document.getElementById('field-effect-name');
    fieldEffectDescriptionEl = document.getElementById('field-effect-description');
    fieldEffectContinueButton = document.getElementById('field-effect-continue-button');
    versatrixFieldModal = document.getElementById('versatrix-field-modal');
    versatrixFieldContinueButton = document.getElementById('versatrix-field-continue-button');
    fieldEffectInfoModal = document.getElementById('field-effect-info-modal');
    fieldEffectInfoTitle = document.getElementById('field-effect-info-title');
    fieldEffectInfoName = document.getElementById('field-effect-info-name');
    fieldEffectInfoDescription = document.getElementById('field-effect-info-description');
    fieldEffectInfoCloseButton = document.getElementById('field-effect-info-close-button');
    versatrixCardInfoModal = document.getElementById('versatrix-card-info-modal');
    versatrixCardInfoContinueButton = document.getElementById('versatrix-card-info-continue-button');
    pulaModal = document.getElementById('pula-modal');
    pulaModalTitle = document.getElementById('pula-modal-title');
    pulaModalText = document.getElementById('pula-modal-text');
    pulaPathButtonsEl = document.getElementById('pula-path-buttons');
    pulaCancelButton = document.getElementById('pula-cancel-button');
    pathSelectionModal = document.getElementById('path-selection-modal');
    pathSelectionModalTitle = document.getElementById('path-selection-modal-title');
    pathSelectionModalText = document.getElementById('path-selection-modal-text');
    pathSelectionButtonsEl = document.getElementById('path-selection-buttons');
    roundSummaryModal = document.getElementById('round-summary-modal');
    roundSummaryTitle = document.getElementById('round-summary-title');
    roundSummaryWinnerText = document.getElementById('round-summary-winner-text');
    roundSummaryScoresEl = document.getElementById('round-summary-scores');
    nextRoundButton = document.getElementById('next-round-button');
    turnAnnounceModal = document.getElementById('turn-announce-modal');
    effectAnnouncerEl = document.getElementById('effect-announcer');
    cardViewerModalEl = document.getElementById('card-viewer-modal');
    cardViewerImageEl = document.getElementById('card-viewer-image');
    cardViewerCloseButton = document.getElementById('card-viewer-close');
    reversusTotalBgAnimationEl = document.getElementById('reversus-total-bg-animation');
    pvpRoomListModal = document.getElementById('pvp-room-list-modal');
    pvpRoomGridEl = document.querySelector('.room-grid');
    pvpRoomListCloseButton = document.getElementById('pvp-room-list-close-button');
    pvpPasswordModal = document.getElementById('pvp-password-modal');
    pvpPasswordInput = document.getElementById('pvp-password-input');
    pvpPasswordSubmit = document.getElementById('pvp-password-submit');
    pvpPasswordCancel = document.getElementById('pvp-password-cancel');
    pvpLobbyModal = document.getElementById('pvp-lobby-modal');
    lobbyTitle = document.getElementById('lobby-title');
    pvpLobbyCloseButton = document.getElementById('pvp-lobby-close-button');
    lobbyGameModeEl = document.getElementById('lobby-game-mode');
    lobbyStartGameButton = document.getElementById('lobby-start-game-button');
    lobbyChatHistoryEl = document.getElementById('lobby-chat-history');
    lobbyChatInput = document.getElementById('lobby-chat-input');
    lobbyChatSendButton = document.getElementById('lobby-chat-send-button');
    storyModeModalEl = document.getElementById('story-mode-modal');
    storyStarsBackgroundEl = document.getElementById('story-stars-background');
    storyScene1El = document.getElementById('story-scene-1');
    storySceneDialogueEl = document.getElementById('story-scene-dialogue');
    storyScreenFlashEl = document.getElementById('story-screen-flash');
    storyCharacterImageEl = document.getElementById('story-character-image');
    storyDialogueBoxEl = document.getElementById('story-dialogue-box');
    storyDialogueTextEl = document.getElementById('story-dialogue-text');
    storyDialogueOptionsEl = document.getElementById('story-dialogue-options');
    musicPlayer = document.getElementById('music-player');
    sfxPlayer = document.getElementById('sfx-player');
    popupSfxPlayer = document.getElementById('popup-sfx-player');
    muteButton = document.getElementById('mute-button');
    nextTrackButton = document.getElementById('next-track-button');
    volumeSlider = document.getElementById('volume-slider');
    scalableContainer = document.getElementById('scalable-container');
    debugButton = document.getElementById('debug-button');
    gameMenuModal = document.getElementById('game-menu-modal');
    gameMenuCloseButton = document.getElementById('game-menu-close-button');
    menuSaveGameButton = document.getElementById('menu-save-game-button');
    menuExitGameButton = document.getElementById('menu-exit-game-button');
    saveGameConfirmModal = document.getElementById('save-game-confirm-modal');
    saveGameYesButton = document.getElementById('save-game-yes-button');
    saveGameNoButton = document.getElementById('save-game-no-button');
    exitGameConfirmModal = document.getElementById('exit-game-confirm-modal');
    exitGameYesButton = document.getElementById('exit-game-yes-button');
    exitGameNoButton = document.getElementById('exit-game-no-button');
    leftScoreBox = document.getElementById('left-score-box');
    rightScoreBox = document.getElementById('right-score-box');
    leftScoreValue = document.getElementById('left-score-value');
    rightScoreValue = document.getElementById('right-score-value');
    leftScoreStatus = document.getElementById('left-score-status');
    rightScoreStatus = document.getElementById('right-score-status');
    cosmicGlowOverlay = document.getElementById('cosmic-glow-overlay');
    xaelPopup = document.getElementById('xael-popup');
    xaelStarPowerButton = document.getElementById('xael-star-power');
    xaelPowerConfirmModal = document.getElementById('xael-power-confirm-modal');
    xaelPowerConfirmYes = document.getElementById('xael-power-confirm-yes');
    xaelPowerConfirmNo = document.getElementById('xael-power-confirm-no');
    endgameSequenceModal = document.getElementById('endgame-sequence-modal');
    endgameCharacterContainer = document.getElementById('endgame-character-container');
    endgameDialogueText = document.getElementById('endgame-dialogue-text');
    endgameDialogueOptions = document.getElementById('endgame-dialogue-options');
    creditsRollModal = document.getElementById('credits-roll-modal');
    creditsContent = document.getElementById('credits-content');
    achievementUnlockedToast = document.getElementById('achievement-unlocked-toast');
    toastText = document.getElementById('toast-text');
    dailyRewardToast = document.getElementById('daily-reward-toast');
    rewardToastText = document.getElementById('reward-toast-text');
    achievementsModal = document.getElementById('achievements-modal');
    achievementsGrid = document.getElementById('achievements-grid');
    closeAchievementsButton = document.getElementById('close-achievements-button');
    fullscreenAnnounceModal = document.getElementById('fullscreen-announce-modal');
    fullscreenAnnounceImage = document.getElementById('fullscreen-announce-image');
    fullscreenAnnounceText = document.getElementById('fullscreen-announce-text');
    storyStartOptionsModal = document.getElementById('story-start-options-modal');
    storyNewGameButton = document.getElementById('story-new-game-button');
    storyContinueGameButton = document.getElementById('story-continue-game-button');
    storyOptionsCloseButton = document.getElementById('story-options-close-button');
    eventModal = document.getElementById('event-modal');
    eventCharacterImage = document.getElementById('event-character-image');
    eventCharacterName = document.getElementById('event-character-name');
    eventAbilityDescription = document.getElementById('event-ability-description');
    eventProgressMarkers = document.getElementById('event-progress-markers');
    eventRewardText = document.getElementById('event-reward-text');
    eventStatusText = document.getElementById('event-status-text');
    challengeEventButton = document.getElementById('challenge-event-button');
    closeEventButton = document.getElementById('close-event-button');
    rankingModal = document.getElementById('ranking-modal');
    closeRankingButton = document.getElementById('close-ranking-button');
    rankingContainer = document.getElementById('ranking-container');
    infiniteRankingContainer = document.getElementById('infinite-ranking-container');
    profileModal = document.getElementById('profile-modal');
    profileDataContainer = document.getElementById('profile-data-container');
    closeProfileButton = document.getElementById('close-profile-button');
    userProfileDisplay = document.getElementById('user-profile-display');
    userAvatar = document.getElementById('user-avatar');
    userName = document.getElementById('user-name');
    userLevel = document.getElementById('user-level');
    xpBarFill = document.getElementById('xp-bar-fill');
    xpBarText = document.getElementById('xp-bar-text');
    userCoinBalanceHeader = document.getElementById('user-coin-balance-header');
    loginButton = document.getElementById('login-button');
    shopButton = document.getElementById('shop-button');
    shopModal = document.getElementById('shop-modal');
    shopAvatarsGrid = document.getElementById('shop-avatars-grid');
    closeShopButton = document.getElementById('close-shop-button');
    pvpShowCreateRoomButton = document.getElementById('pvp-show-create-room-button');
    pvpCreateRoomModal = document.getElementById('pvp-create-room-modal');
    roomNameInput = document.getElementById('room-name-input');
    roomPasswordInput = document.getElementById('room-password-input');
    pvpCreateRoomConfirmButton = document.getElementById('pvp-create-room-confirm-button');
    pvpCreateRoomCancelButton = document.getElementById('pvp-create-room-cancel-button');
    friendRequestBadge = document.getElementById('friend-request-badge');
    profileFriendsTabContent = document.getElementById('profile-friends-tab-content');
    friendsSearchInput = document.getElementById('friends-search-input');
    friendsSearchButton = document.getElementById('friends-search-button');
    friendRequestsListContainer = document.getElementById('friend-requests-list-container');
    profileAdminTabContent = document.getElementById('profile-admin-tab-content');
    inviteFriendsModal = document.getElementById('invite-friends-modal');
    inviteFriendsList = document.getElementById('invite-friends-list');
    inviteFriendsCloseButton = document.getElementById('invite-friends-close-button');
    lobbyInviteNotificationModal = document.getElementById('lobby-invite-notification-modal');
    lobbyInviteNotificationText = document.getElementById('lobby-invite-notification-text');
    lobbyInviteAcceptButton = document.getElementById('lobby-invite-accept-button');
    lobbyInviteDeclineButton = document.getElementById('lobby-invite-decline-button');
    chatInput = document.getElementById('chat-input');
    chatSendButton = document.getElementById('chat-send-button');
    chatToggleBtn = document.getElementById('chat-toggle-btn');
    chatFilterBtn = document.getElementById('chat-filter-btn');
    chatContainerEl = document.querySelector('.chat-container');
    privateChatPanel = document.getElementById('private-chat-panel');
    splashLogo = document.getElementById('splash-logo');
    fieldEffectTargetModal = document.getElementById('field-effect-target-modal');
    fieldEffectTargetTitle = document.getElementById('field-effect-target-title');
    fieldEffectTargetText = document.getElementById('field-effect-target-text');
    fieldEffectTargetButtons = document.getElementById('field-effect-target-buttons');
    pvpPotContainer = document.getElementById('pvp-pot-container');
    turnCountdownTimer = document.getElementById('turn-countdown-timer');
    quickStartModal = document.getElementById('quick-start-modal');
    quickStartAiButton = document.getElementById('quick-start-ai-button');
    quickStartPvpButton = document.getElementById('quick-start-pvp-button');
    quickStartCloseButton = document.getElementById('quick-start-close-button');
    pvpMatchmakingModal = document.getElementById('pvp-matchmaking-modal');
    pvpMatchmakingButtons = document.getElementById('pvp-matchmaking-buttons');
    pvpMatchmakingCloseButton = document.getElementById('pvp-matchmaking-close-button');
    matchmakingStatusModal = document.getElementById('matchmaking-status-modal');
    matchmakingStatusText = document.getElementById('matchmaking-status-text');
    matchmakingCancelButton = document.getElementById('matchmaking-cancel-button');
    eventButton = document.getElementById('event-button');
    fullscreenButton = document.getElementById('fullscreen-button');
    inversusModeButton = document.getElementById('inversus-mode-button');
    infiniteChallengeButton = document.getElementById('infinite-challenge-button');
    infiniteChallengeIntroModal = document.getElementById('infinite-challenge-intro-modal');
    infiniteChallengeIntroImage = document.getElementById('infinite-challenge-intro-image');
    infiniteChallengeIntroText = document.getElementById('infinite-challenge-intro-text');
    infiniteChallengeIntroOptions = document.getElementById('infinite-challenge-intro-options');
    infiniteChallengePotDisplay = document.getElementById('infinite-challenge-pot-display');
    roundAnnounceModal = document.getElementById('round-announce-modal');
    infiniteBuffSelectionModal = document.getElementById('infinite-buff-selection-modal');
    infiniteBuffOptions = document.getElementById('infinite-buff-options');
    roundSummaryPotTextEl = document.getElementById('round-summary-pot-text');
    fieldEffectTargetCancelButton = document.getElementById('field-effect-target-cancel-button');
}