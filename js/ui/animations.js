
// js/ui/animations.js
import * as dom from '../core/dom.js';
import * as config from '../core/config.js';
import { getState, updateState } from '../core/state.js';
import { shuffle } from '../core/utils.js';
import { playSoundEffect } from '../core/sound.js';
import { getCardImageUrl } from './card-renderer.js';

/**
 * Aplica efeitos visuais de caos na tela (Inversus).
 * Os efeitos agora duram a rodada inteira e aumentam em probabilidade com o tempo.
 * @param {number} turn - O turno atual do jogo para calcular a intensidade.
 */
export function applyInversusChaos(turn = 1) {
    const container = document.body; // Body para evitar conflito com transform inline do container
    
    // 1. Limpa os efeitos de tela da rodada anterior
    container.classList.remove('screen-flipped', 'screen-inverted', 'screen-mirrored');

    // 2. Calcula a probabilidade baseada no progresso da partida
    const baseProbability = Math.min(0.15 + (turn * 0.05), 0.75);
    
    let effectsAppliedCount = 0;
    const activeEffects = [];

    // Efeito 1: Cores Invertidas
    if (Math.random() < baseProbability) {
        container.classList.add('screen-inverted');
        effectsAppliedCount++;
        activeEffects.push('Inversão de Cores');
    }

    // Efeito 2: Cabeça para Baixo (180 graus)
    if (Math.random() < baseProbability) {
        container.classList.add('screen-flipped');
        effectsAppliedCount++;
        activeEffects.push('Tela Invertida (180°)');
    }

    // Efeito 3: Espelhado (Mirror)
    if (Math.random() < baseProbability) {
        container.classList.add('screen-mirrored');
        effectsAppliedCount++;
        activeEffects.push('Tela Espelhada');
    }

    // 3. Feedback no log se algo foi ativado
    if (effectsAppliedCount > 0) {
        playSoundEffect('confusao');
        console.log(`[INVERSUS CHAOS] Turno ${turn}: ${activeEffects.join(' + ')}`);
    } else {
        console.log(`[INVERSUS CHAOS] Turno ${turn}: Realidade estável.`);
    }
}
/**
 * Executa a cinemática final do Inversus: FIM.mp4 seguido de CLIPE.mp4.
 */
export async function playInversusFinalCinematic() {
    const overlay = document.getElementById('cinematic-overlay');
    const player = document.getElementById('cinematic-video-player');
    
    if (!overlay || !player) return;

    // 1. Preparar cena e silenciar jogo
    dom.appContainerEl.classList.add('hidden');
    overlay.classList.remove('hidden');
    if (dom.musicPlayer) dom.musicPlayer.pause();

    return new Promise(resolve => {
        // Sequência 1: FIM.mp4 (560x560)
        player.src = './FIM.mp4';
        player.style.width = '560px';
        player.style.height = '560px';
        
        const onFimEnded = async () => {
            player.removeEventListener('ended', onFimEnded);
            
            // Sequência 2: CLIPE.mp4 (688x464)
            player.src = './CLIPE.mp4';
            player.style.width = '688px';
            player.style.height = '464px';
            await player.play();

            const onClipeEnded = () => {
                player.removeEventListener('ended', onClipeEnded);
                overlay.classList.add('hidden');
                player.src = '';
                // Retornar ao Splash Screen
                document.dispatchEvent(new Event('showSplashScreen'));
                resolve();
            };
            player.addEventListener('ended', onClipeEnded);
        };

        player.addEventListener('ended', onFimEnded);
        player.play().catch(e => console.error("Erro ao reproduzir FIM.mp4:", e));
    });
}





/**
 * Animates a card moving from a starting element (in hand) or position to a target slot (in a play zone).
 * @param {object} card - The card object being played.
 * @param {HTMLElement | null} startElement - The card element in the player's hand (can be null if override is used).
 * @param {string} targetPlayerId - The ID of the player whose play zone is the destination.
 * @param {string} targetSlotLabel - The data-label of the target slot (e.g., 'Valor 1').
 * @param {boolean} [forceHiddenAnimation=false] - If true, the animation will show the card back.
 * @param {DOMRect | null} [startRectOverride=null] - An optional override for the starting position and size.
 * @returns {Promise<void>} A promise that resolves when the animation is complete.
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

        // Correctly get the card image URL using the helper function. This handles all card types and visibility states.
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
        }, 600); // Duration must match the transition time in index.css
    });
}

/**
 * Creates a reusable starry background effect.
 * @param {HTMLElement} container - The element to add the stars to.
 * @param {string} [color='#FFFFFF'] - The color of the stars.
 * @param {number} [starCount=100] - The number of stars to generate.
 */
export function createStarryBackground(container, color = '#FFFFFF', starCount = 100) {
    if (!container) return;
    container.innerHTML = ''; // Clear previous stars

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
 * Gerencia a animação da carta secreta da Versatrix no Splash Screen.
 */
export const startVersatrixCardAnimation = () => {
    const state = getState();

    // Limpa estado anterior se houver
    if (state.versatrixCardInterval) {
        clearInterval(state.versatrixCardInterval);
        updateState('versatrixCardInterval', null);
    }
    
    // Remove carta remanescente para evitar duplicatas
    const oldCard = document.getElementById('secret-versatrix-card');
    if (oldCard) oldCard.remove();

    // Verifica se o jogador venceu a Versatrix e ainda não coletou a carta
    const hasWin = state.achievements && state.achievements.has('versatrix_win');
    const hasCollected = state.achievements && state.achievements.has('versatrix_card_collected');
    
    // DEBUG: Descomente a linha abaixo para ver no console se as condições são atendidas
    // console.log(`Versatrix Spawn Check -> Win: ${hasWin}, Collected: ${hasCollected}`);

    if (!hasWin || hasCollected) {
        return;
    }

    const createFallingCard = () => {
        // Re-checagem de estado para garantir que não coletou no meio do intervalo
        const currentState = getState();
        if (currentState.achievements.has('versatrix_card_collected')) {
            if (currentState.versatrixCardInterval) {
                clearInterval(currentState.versatrixCardInterval);
                updateState('versatrixCardInterval', null);
            }
            const card = document.getElementById('secret-versatrix-card');
            if (card) card.remove();
            return;
        }

        const existing = document.getElementById('secret-versatrix-card');
        if (existing) existing.remove();

        // Garante o container correto
        const container = dom.scalableContainer || document.getElementById('scalable-container') || document.body;
        
        const cardEl = document.createElement('div');
        cardEl.id = 'secret-versatrix-card';
        const size = 150;
        
        // --- CORREÇÃO 1: Estilização Essencial ---
        cardEl.style.position = 'absolute';
        cardEl.style.width = `${size}px`;
        cardEl.style.height = `${size * 1.4}px`;
        cardEl.style.zIndex = '9999'; // Garante que fique acima de tudo
        cardEl.style.cursor = 'pointer'; // Indica que é clicável
        
        // --- CORREÇÃO 2: Responsividade ---
        // Usa a largura real do container em vez de fixo 1920
        const containerWidth = container.clientWidth || window.innerWidth;
        cardEl.style.left = `${Math.random() * (containerWidth - size)}px`;
        cardEl.style.top = `-200px`; // Começa fora da tela (acima)

        // Adiciona classe visual se necessário (assumindo que você tem CSS para a imagem da carta)
        // cardEl.classList.add('versatrix-gold-card'); 
        // OU defina a imagem diretamente se não for via CSS ID:
        // cardEl.style.backgroundImage = "url('./assets/images/versatrix_gold.png')"; 

        const fallDuration = 10;
        cardEl.style.animation = `secret-fall ${fallDuration}s linear forwards, versatrix-pulse-glow 2s infinite ease-in-out`;

        // --- CORREÇÃO 3: Evento de Clique ---
        // Adicione o listener de clique aqui ou garanta que ele exista no módulo de input
        cardEl.addEventListener('click', () => {
             console.log("Carta Dourada Clicada!");
             // Dispara evento global para o sistema capturar
             document.dispatchEvent(new CustomEvent('versatrixCardClicked'));
             cardEl.remove();
        });

        if (container) {
            container.appendChild(cardEl);
        }

        // Remove após a animação acabar se não for clicada
        setTimeout(() => { 
            if (cardEl.parentElement) cardEl.remove(); 
        }, fallDuration * 1000);
    };

    // Cria a primeira imediatamente
    createFallingCard();
    
    // Configura o intervalo
    const intervalId = setInterval(createFallingCard, 15000);
    updateState('versatrixCardInterval', intervalId);
};
/**
 * Creates a spiral starry background effect for the final battle.
 * @param {HTMLElement} container - The element to add the stars to.
 * @param {number} [starCount=150] - The number of stars to generate.
 */
export function createSpiralStarryBackground(container, starCount = 150) {
    if (!container) return;
    container.innerHTML = ''; // Clear previous stars
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
    container.innerHTML = ''; // Clear previous particles
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
 * Creates and starts the floating items animation for the splash screen or other effects.
 * @param {HTMLElement} containerEl - The container element to fill with animated items.
 * @param {string} [context='splash'] - The context ('splash' or 'credits').
 */
export const initializeFloatingItemsAnimation = (containerEl, context = 'splash') => {
    if (!containerEl) return;
    containerEl.innerHTML = '';
    const { achievements } = getState();
    
    let imagePool = [];
    let bossPool = [];

    if (context === 'credits') {
        imagePool = [...config.BASE_CARD_IMAGES, ...config.BOSS_CARD_IMAGES, ...config.AVATAR_IMAGES];
    } else { // 'splash' context
        imagePool = [...config.BASE_CARD_IMAGES];
        if (achievements.has('contravox_win')) bossPool.push({ image: 'cartacontravox.png', direction: 'up' });
        if (achievements.has('versatrix_win')) bossPool.push({ image: 'cartaversatrix.png', direction: 'up' });
        if (achievements.has('reversum_win')) bossPool.push({ image: 'cartarei.png', direction: 'up' });
        if (achievements.has('true_end_final')) bossPool.push({ image: 'cartanecroverso.png', direction: 'down' });
    }
    
    const effectNamePool = config.EFFECT_DECK_CONFIG.map(item => item.name);
    const itemsToCreate = [];
    const totalItems = context === 'credits' ? 12 : 30; // Reduced for credits
    const numCards = context === 'credits' ? totalItems : 15;

    for (let i = 0; i < totalItems; i++) {
        itemsToCreate.push({ type: i < numCards ? 'card' : 'text' });
    }
    shuffle(itemsToCreate);

    const createItem = (config) => {
        const item = document.createElement('div');
        item.classList.add('animated-item');
        item.classList.add(config.direction === 'down' ? 'drift-down' : 'drift'); // default to 'drift' (up)

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

    // Create boss card animations
    bossPool.forEach(boss => createItem(boss));

    // Create regular floating items
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
 * @param {boolean} isActive - Whether to activate or deactivate the effect.
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
 * @param {HTMLElement} imageEl - The image element to shatter.
 * @returns {Promise<void>} A promise that resolves when the animation is complete.
 */
export async function shatterImage(imageEl) {
    if (!imageEl || !imageEl.parentNode) return;
    
    playSoundEffect('destruido');

    return new Promise(resolve => {
        requestAnimationFrame(() => {
            const parent = imageEl.parentNode;
            const rect = imageEl.getBoundingClientRect();

            if (rect.width === 0 || rect.height === 0) {
                console.warn('Shatter animation skipped: image has no dimensions.', imageEl);
                setTimeout(resolve, 500);
                return;
            }

            const container = document.createElement('div');
            container.className = 'shatter-container';
            container.style.position = 'absolute';
            container.style.zIndex = '3000'; // FIX: Ensure shatter effect is on top of everything
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
 */
export function resetGameEffects() {
    dom.scalableContainer.classList.remove('screen-flipped', 'screen-inverted', 'screen-mirrored');
    if (dom.boardEl) {
        dom.boardEl.classList.remove('board-rotating', 'board-rotating-fast', 'board-rotating-super-fast');
    }
}
