// js/ui/animations.js
import * as dom from '../core/dom.js';
import * as config from '../core/config.js';
import { getState, updateState } from '../core/state.js';
import { shuffle } from '../core/utils.js';
import { playSoundEffect } from '../core/sound.js';
import { getCardImageUrl } from './card-renderer.js';

/**
 * Aplica efeitos visuais de caos na tela (Inversus).
 * Agora altera a realidade a cada turno, mantendo a rotação do tabuleiro.
 */
export function applyInversusChaos() {
    // Remove APENAS as distorções de tela, mantendo as classes do tabuleiro (rotação)
    dom.scalableContainer.classList.remove('screen-flipped', 'screen-inverted', 'screen-mirrored');

    const effects = ['screen-flipped', 'screen-inverted', 'screen-mirrored', 'normal'];
    // Sorteia um efeito (25% de chance de normalizar a visão por um turno)
    const chosenEffect = effects[Math.floor(Math.random() * effects.length)];
    
    if (chosenEffect !== 'normal') {
        dom.scalableContainer.classList.add(chosenEffect);
        playSoundEffect('confusao');
    }
}

/**
 * Animates a card moving from a starting element (in hand) or position to a target slot (in a play zone).
 */
export async function animateCardPlay(card, startElement, targetPlayerId, targetSlotLabel, forceHiddenAnimation = false, startRectOverride = null) {
     return new Promise(resolve => {
        const targetArea = document.getElementById(`player-area-${targetPlayerId}`);
        if (!targetArea) {
            resolve();
            return;
        }
        
        const targetSlot = targetArea.querySelector(`.play-zone-slot[data-label="${targetSlotLabel}"]`);
        const startRect = startRectOverride || (startElement ? startElement.getBoundingClientRect() : null);

        if (!targetSlot || !startRect) {
            resolve();
            return;
        }

        const endRect = targetSlot.getBoundingClientRect();

        const clone = document.createElement('div');
        clone.className = 'card card-animation-clone';

        const imageUrl = getCardImageUrl(card, forceHiddenAnimation);
        clone.style.backgroundImage = `url('./${imageUrl}')`;
        
        clone.style.width = `${startRect.width}px`;
        clone.style.height = `${startRect.height}px`;
        clone.style.top = `${startRect.top}px`;
        clone.style.left = `${startRect.left}px`;
        
        document.body.appendChild(clone);
        if(startElement) startElement.style.visibility = 'hidden';

        requestAnimationFrame(() => {
            clone.style.top = `${endRect.top}px`;
            clone.style.left = `${endRect.left}px`;
            clone.style.width = `${endRect.width}px`;
            clone.style.height = `${endRect.height}px`;
        });

        setTimeout(() => {
            clone.remove();
            if (startElement) startElement.style.visibility = 'visible';
            resolve();
        }, 600);
    });
}

/**
 * Creates a reusable starry background effect.
 */
export function createStarryBackground(container, color = '#FFFFFF', starCount = 100) {
    if (!container) return;
    container.innerHTML = ''; 

    for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        star.className = 'story-bg-star';
        star.style.color = color;
        const startX = `${Math.random() * 100}vw`, startY = `${Math.random() * 100}vh`;
        const endX = `${Math.random() * 100}vw`, endY = `${Math.random() * 100}vh`;
        star.style.setProperty('--start-x', startX);
        star.style.setProperty('--start-y', startY);
        star.style.setProperty('--end-x', endX);
        star.style.setProperty('--end-y', endY);
        star.style.top = startY;
        star.style.left = startX;
        star.style.animationDuration = `${Math.random() * 20 + 15}s`;
        star.style.animationDelay = `-${Math.random() * 35}s`;
        container.appendChild(star);
    }
}

/**
 * Creates a spiral starry background effect for the final battle.
 */
export function createSpiralStarryBackground(container, starCount = 150) {
    if (!container) return;
    container.innerHTML = ''; 
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        star.className = 'story-star spiraling';

        const angle = Math.random() * 2 * Math.PI;
        const radius = Math.random() * Math.max(window.innerWidth, window.innerHeight) * 0.7;
        const startX = centerX + radius * Math.cos(angle);
        const startY = centerY + radius * Math.sin(angle);
        
        star.style.setProperty('--tx-from', `${startX}px`);
        star.style.setProperty('--ty-from', `${startY}px`);
        star.style.setProperty('--tx-to', `${centerX}px`);
        star.style.setProperty('--ty-to', `${centerY}px`);
        star.style.animationDelay = `${Math.random() * 3}s`;
        star.style.animationDuration = `${Math.random() * 2 + 2}s`;

        container.appendChild(star);
    }
    container.classList.remove('hidden');
}


/**
 * Creates the cosmic glow overlay for the Xael challenge.
 */
export function createCosmicGlowOverlay() {
    const container = dom.cosmicGlowOverlay;
    if (!container) return;
    container.innerHTML = ''; 
    const colors = ['#e63946', '#00b4d8', '#52b788', '#fca311', '#9b5de5', '#f1faee'];
    
    for (let i = 0; i < 70; i++) {
        const particle = document.createElement('div');
        particle.className = 'star-particle';
        const size = Math.random() * 3 + 1;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.top = `${Math.random() * 100}%`;
        particle.style.left = `${Math.random() * 100}%`;
        const color = colors[Math.floor(Math.random() * colors.length)];
        particle.style.setProperty('--primary-color', color);
        particle.style.animationDelay = `${Math.random() * 4}s`;
        particle.style.animationDuration = `${Math.random() * 2 + 2}s`;
        container.appendChild(particle);
    }
    container.classList.remove('hidden');
}

/**
 * Triggers the animation for the Necro X ability.
 */
export const animateNecroX = () => {
    const { gameState } = getState();
    const overlay = document.getElementById('necro-x-animation-overlay');
    const casterImg = document.getElementById('necro-x-caster-img');
    const cardImg = document.getElementById('necro-x-card-img');

    if (overlay && casterImg && cardImg) {
        casterImg.classList.toggle('final-boss-glow', gameState.isFinalBoss);
        overlay.classList.remove('hidden');
        setTimeout(() => overlay.classList.add('hidden'), 2500);
    }
};

/**
 * Creates and starts the falling animation for the secret Versatrix card.
 */
export const startVersatrixCardAnimation = () => {
    const state = getState();

    if (state.versatrixCardInterval) {
        clearInterval(state.versatrixCardInterval);
        updateState('versatrixCardInterval', null);
    }
    const existingCard = document.getElementById('secret-versatrix-card');
    if (existingCard) {
        existingCard.remove();
    }

    const shouldAnimate = state.achievements.has('versatrix_win') && !state.achievements.has('versatrix_card_collected');
    
    if (!shouldAnimate) {
        return; 
    }

    const createFallingCard = () => {
        if (getState().achievements.has('versatrix_card_collected')) {
            const { versatrixCardInterval } = getState();
            if (versatrixCardInterval) {
                clearInterval(versatrixCardInterval);
                updateState('versatrixCardInterval', null);
            }
            return;
        }

        const oldCard = document.getElementById('secret-versatrix-card');
        if (oldCard) oldCard.remove();

        const cardEl = document.createElement('div');
        cardEl.id = 'secret-versatrix-card';
        
        const size = 150;
        cardEl.style.width = `${size}px`;
        cardEl.style.height = `${size * 1.4}px`;
        const leftPos = Math.random() * (1920 - size);
        cardEl.style.left = `${leftPos}px`; 
        
        const fallDuration = 10000;
        cardEl.style.animation = `secret-fall ${fallDuration / 1000}s linear, versatrix-pulse-glow 2s infinite ease-in-out`;

        dom.scalableContainer.appendChild(cardEl);

        setTimeout(() => {
            if (cardEl.parentElement) {
                cardEl.remove();
            }
        }, fallDuration);
    };

    const fallInterval = 15000;
    createFallingCard(); 
    const intervalId = setInterval(createFallingCard, fallInterval);
    updateState('versatrixCardInterval', intervalId);
};


/**
 * Creates and starts the floating items animation.
 */
export const initializeFloatingItemsAnimation = (containerEl, context = 'splash') => {
    if (!containerEl) return;
    containerEl.innerHTML = '';
    const { achievements } = getState();
    
    let imagePool = [];
    let bossPool = [];

    if (context === 'credits') {
        imagePool = [...config.BASE_CARD_IMAGES, ...config.BOSS_CARD_IMAGES, ...config.AVATAR_IMAGES];
    } else { 
        imagePool = [...config.BASE_CARD_IMAGES];
        if (achievements.has('contravox_win')) bossPool.push({ image: 'cartacontravox.png', direction: 'up' });
        if (achievements.has('versatrix_win')) bossPool.push({ image: 'cartaversatrix.png', direction: 'up' });
        if (achievements.has('reversum_win')) bossPool.push({ image: 'cartarei.png', direction: 'up' });
        if (achievements.has('true_end_final')) bossPool.push({ image: 'cartanecroverso.png', direction: 'down' });
    }
    
    const effectNamePool = config.EFFECT_DECK_CONFIG.map(item => item.name);
    const itemsToCreate = [];
    const totalItems = context === 'credits' ? 12 : 30;
    const numCards = context === 'credits' ? totalItems : 15;

    for (let i = 0; i < totalItems; i++) {
        itemsToCreate.push({ type: i < numCards ? 'card' : 'text' });
    }
    shuffle(itemsToCreate);

    const createItem = (config) => {
        const item = document.createElement('div');
        item.classList.add('animated-item');
        item.classList.add(config.direction === 'down' ? 'drift-down' : 'drift');

        item.classList.add('card-shape');
        item.style.backgroundImage = `url('./${config.image}')`;
        const size = Math.random() * 60 + 70;
        item.style.width = `${size}px`;
        item.style.height = `${size * 1.4}px`;
        
        item.style.left = `${Math.random() * 100}vw`;
        const duration = Math.random() * 25 + 15;
        item.style.animationDuration = `${duration}s`;
        item.style.animationDelay = `-${Math.random() * duration}s`;
        
        containerEl.appendChild(item);
    };

    bossPool.forEach(boss => createItem(boss));

    for (const itemConfig of itemsToCreate) {
        const item = document.createElement('div');
        item.classList.add('animated-item');
        
        if (itemConfig.type === 'card') {
            item.classList.add('card-shape');
            const imageUrl = imagePool[Math.floor(Math.random() * imagePool.length)];
            item.style.backgroundImage = `url('./${imageUrl}')`;
            const size = Math.random() * 60 + 50;
            item.style.width = `${size}px`;
            item.style.height = `${size * 1.4}px`;
        } else {
            item.classList.add('text-shape');
            const effectName = effectNamePool[Math.floor(Math.random() * effectNamePool.length)];
            item.textContent = effectName;
            const fontSize = Math.random() * 1.5 + 1;
            item.style.fontSize = `${fontSize}rem`;
            switch (effectName) {
                case 'Mais': case 'Sobe': item.classList.add('positive'); break;
                case 'Menos': case 'Desce': item.classList.add('negative'); break;
                case 'Pula': item.classList.add('pula'); break;
                case 'Reversus': item.classList.add('reversus'); break;
                case 'Reversus Total': item.classList.add('reversus-total'); break;
            }
        }
        item.style.left = `${Math.random() * 100}vw`;
        const duration = Math.random() * 25 + 15;
        item.style.animationDuration = `${duration}s`;
        item.style.animationDelay = `-${Math.random() * duration}s`;
        containerEl.appendChild(item);
    }
};

/**
 * Toggles the visibility and animation of the Reversus Total background effect.
 */
export const toggleReversusTotalBackground = (isActive) => {
    if (isActive) {
        initializeFloatingItemsAnimation(dom.reversusTotalBgAnimationEl);
        dom.reversusTotalBgAnimationEl.classList.remove('hidden');
    } else {
        dom.reversusTotalBgAnimationEl.classList.add('hidden');
        dom.reversusTotalBgAnimationEl.innerHTML = '';
    }
};

/**
 * Creates a shattering effect for an image element.
 */
export async function shatterImage(imageEl) {
    if (!imageEl || !imageEl.parentNode) return;
    
    playSoundEffect('destruido');

    return new Promise(resolve => {
        requestAnimationFrame(() => {
            const parent = imageEl.parentNode;
            const rect = imageEl.getBoundingClientRect();

            if (rect.width === 0 || rect.height === 0) {
                setTimeout(resolve, 500);
                return;
            }

            const container = document.createElement('div');
            container.className = 'shatter-container';
            container.style.position = 'absolute';
            container.style.zIndex = '3000';
            const parentRect = parent.getBoundingClientRect();
            container.style.left = `${rect.left - parentRect.left}px`;
            container.style.top = `${rect.top - parentRect.top}px`;
            container.style.width = `${rect.width}px`;
            container.style.height = `${rect.height}px`;

            parent.appendChild(container);
            imageEl.style.opacity = '0';

            const particles = [];
            const rows = 10, cols = 10;

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const particle = document.createElement('div');
                    particle.className = 'shatter-particle';
                    particle.style.backgroundImage = `url(${imageEl.src})`;
                    particle.style.backgroundPosition = `${c * 100 / (cols - 1)}% ${r * 100 / (rows - 1)}%`;
                    container.appendChild(particle);
                    particles.push(particle);
                }
            }

            requestAnimationFrame(() => {
                particles.forEach(p => {
                    const x = (Math.random() - 0.5) * window.innerWidth * 1.5;
                    const y = (Math.random() - 0.5) * window.innerHeight * 1.5;
                    const rot = (Math.random() - 0.5) * 720;
                    p.style.transform = `translate(${x}px, ${y}px) rotate(${rot}deg)`;
                    p.style.opacity = '0';
                });
            });

            setTimeout(() => {
                if (container.parentNode) {
                    container.remove();
                }
                resolve();
            }, 1500);
        });
    });
}


/**
 * Shows a special victory animation for defeating Inversus.
 */
export function showInversusVictoryAnimation() {
    dom.appContainerEl.classList.add('hidden');
    dom.debugButton.classList.add('hidden');
    dom.gameOverModal.classList.add('hidden');

    const containerEl = dom.splashAnimationContainerEl;
    dom.splashScreenEl.classList.remove('hidden');
    containerEl.innerHTML = '';
    
    const splashContent = dom.splashScreenEl.querySelector('.splash-content');
    if(splashContent) splashContent.classList.add('hidden');
    
    createStarryBackground(containerEl, '#FFFFFF', 150);

    const victoryCards = config.BOSS_CARD_IMAGES;
    const victoryText = ['OÃSUFNOC', 'CAMPO VERSÁTIL', 'REVERSUS TOTAL', 'NECRO X'];
    const itemsToCreate = [];
    const totalItems = 25;

    for (let i = 0; i < totalItems; i++) {
        itemsToCreate.push({ type: Math.random() > 0.4 ? 'card' : 'text' });
    }
    shuffle(itemsToCreate);

    for (const itemConfig of itemsToCreate) {
        const item = document.createElement('div');
        item.classList.add('animated-item');

        if (itemConfig.type === 'card') {
            item.classList.add('card-shape');
            const imageUrl = victoryCards[Math.floor(Math.random() * victoryCards.length)];
            item.style.backgroundImage = `url('./${imageUrl}')`;
            const size = Math.random() * 80 + 70;
            item.style.width = `${size}px`;
            item.style.height = `${size * 1.4}px`;
        } else {
            item.classList.add('text-shape');
            const effectName = victoryText[Math.floor(Math.random() * victoryText.length)];
            item.textContent = effectName;
            item.style.fontSize = `${Math.random() * 2 + 1.5}rem`;
            item.classList.add('reversus-total');
        }

        item.style.left = `${Math.random() * 100}vw`;
        const duration = Math.random() * 20 + 10;
        item.style.animationDuration = `${duration}s`;
        item.style.animationDelay = `-${Math.random() * duration}s`;
        containerEl.appendChild(item);
    }

    setTimeout(() => {
        if(splashContent) splashContent.classList.remove('hidden');
        document.dispatchEvent(new Event('showSplashScreen'));
    }, 15000);
}

/**
 * Clears all reality-warping screen effects from the Inversus battle.
 * Ensures the rotation persists during the specific boss battle.
 */
export function resetGameEffects() {
    const { gameState } = getState();
    
    // 1. Sempre limpa os efeitos visuais de distorção de tela anteriores
    dom.scalableContainer.classList.remove('screen-flipped', 'screen-inverted', 'screen-mirrored');
    
    if (dom.boardEl) {
        // Verifica se é a batalha específica do Boss Inversus (e não o modo infinito genérico)
        const isSpecialBossInversus = gameState && gameState.isInversusMode && !gameState.isInfiniteChallenge;
        const isGameOver = gameState && gameState.gamePhase === 'game_over';

        // 2. Remove velocidades temporárias (usadas em outros momentos do jogo)
        dom.boardEl.classList.remove('board-rotating', 'board-rotating-fast', 'board-rotating-super-fast');

        // 3. Lógica da Rotação Permanente (Proteção)
        if (isSpecialBossInversus && !isGameOver) {
            // SE for o Boss e o jogo NÃO acabou:
            // Garante que a rotação permanente está lá (failsafe caso tenha sido removida)
            if (!dom.boardEl.classList.contains('board-rotating-permanent')) {
                dom.boardEl.classList.add('board-rotating-permanent');
            }
        } else {
            // SE NÃO for o Boss OU se for Game Over:
            // Limpa a rotação permanente
            dom.boardEl.classList.remove('board-rotating-permanent');
        }
    }
}
