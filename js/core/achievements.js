// js/core/achievements.js

import * as dom from './dom.js';
import * as config from './config.js';
import { getState, updateState } from './state.js';
import { playSoundEffect } from './sound.js';
import { showAchievementNotification } from '../ui/toast-renderer.js';
import * as network from '../core/network.js';

const ACHIEVEMENTS_KEY = 'reversus-achievements';

/**
 * Checks for special features to unlock based on achievements.
 */
export function checkAndShowSpecialFeatures() {
    const { achievements } = getState();

    // Unlock BAND button if any boss is defeated
    const bandBosses = ['contravox_win', 'versatrix_win', 'reversum_win', 'true_end_final', 'inversus_win', '120%_unlocked'];
    const hasAnyBossDefeated = bandBosses.some(id => achievements.has(id));
    if (dom.bandButton) {
        dom.bandButton.classList.toggle('hidden', !hasAnyBossDefeated);
    }

    // Unlock INVERSUS mode after beating the true final boss
    dom.inversusModeButton.classList.toggle('hidden', !achievements.has('true_end_final'));

    // Unlock Narrador secret battle (glitching logo) after beating Inversus (100%)
    if (achievements.has('inversus_win')) {
        dom.splashLogo.classList.add('effect-glitch');
    } else {
        dom.splashLogo.classList.remove('effect-glitch');
    }
}

/**
 * Loads unlocked achievements from localStorage.
 */
export function loadAchievements() {
    try {
        const saved = localStorage.getItem(ACHIEVEMENTS_KEY);
        if (saved) {
            const unlockedData = JSON.parse(saved);
            if (!Array.isArray(unlockedData)) {
                throw new Error('Saved achievements data is not an array.');
            }
            
            const unlockedIds = new Set(unlockedData);
            updateState('achievements', unlockedIds);
            checkAndShowSpecialFeatures();
        } else {
            updateState('achievements', new Set());
        }
    } catch (e) {
        console.error("Failed to load or parse achievements", e);
        localStorage.removeItem(ACHIEVEMENTS_KEY);
        updateState('achievements', new Set());
    }
}

/**
 * Saves achievements to local storage.
 */
function saveAchievements() {
    const { achievements } = getState();
    try {
        localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(Array.from(achievements)));
    } catch (e) {
        console.error("Failed to save achievements", e);
    }
}

function checkAllAchievementsUnlocked() {
    const { achievements } = getState();
    const achievementKeys = Object.keys(config.ACHIEVEMENTS).filter(id => id !== '120%_unlocked');
    return achievementKeys.every(id => achievements.has(id));
}

/**
 * Grants an achievement to the player.
 */
export function grantAchievement(id) {
    const { achievements: currentAchievements, gameState, isLoggedIn } = getState();

    if (id === 'speed_run' && gameState?.currentStoryBattle === 'tutorial_necroverso') {
        return;
    }

    if (!currentAchievements.has(id) && config.ACHIEVEMENTS[id]) {
        currentAchievements.add(id);
        const achievementData = config.ACHIEVEMENTS[id];
        
        playSoundEffect('conquista');
        showAchievementNotification(achievementData);
        
        if (isLoggedIn) {
            network.emitGrantAchievement(id);
        }

        if (['xael_win', 'inversus_win', '120%_unlocked'].includes(id)) {
            let amount = 1000;
            let titleCode = null;
            if (id === 'inversus_win') {
                amount = 2500;
                titleCode = 'master_of_inversus';
            }
            if (id === '120%_unlocked') amount = 5000;
            if (isLoggedIn) {
                network.emitClaimChallengeReward({ challengeId: id, amount: amount, titleCode: titleCode });
            }
        }

        saveAchievements();
        checkAndShowSpecialFeatures();

        if (checkAllAchievementsUnlocked()) {
            grantAchievement('120%_unlocked');
        }
    }
}
