// js/ui/animations.js
import * as dom from '../core/dom.js';
import * as config from '../core/config.js';
import { getState, updateState } from '../core/state.js';
import { shuffle } from '../core/utils.js';
import { playSoundEffect } from '../core/sound.js';
import { getCardImageUrl } from './card-renderer.js';

/**
 * Reseta todos os efeitos de distorção, rotação e caos do jogo.
 * Limpa tanto o body quanto o container principal.
 */
export function resetGameEffects() {
    const body = document.body;
    const container = dom.scalableContainer || document.getElementById('scalable-container');
    
    const chaosClasses = [
        'screen-flipped', 
        'screen-inverted', 
        'screen-mirrored', 
        'screen-shaking'
    ];
    
    // Limpeza profunda
    body.classList.remove(...chaosClasses);
    if (container) {
        container.classList.remove(...chaosClasses);
        container.style.filter = ''; // Limpa filtros inline se houver
    }
    
    if (dom.boardEl) {
        dom.boardEl.classList.remove(
            'board-rotating', 
            'board-rotating-fast', 
            'board-rotating-super-fast', 
            'final-battle-board',
            'inverted'
        );
    }
    
    if (dom.appContainerEl) {
        dom.appContainerEl.classList.remove('effect-monitor', 'reversus-total-active');
    }
}

/**
 * Aplica efeitos visuais de caos na tela (Inversus).
 * O efeito escalona gradualmente.
 */
export function applyInversusChaos(turn = 1) {
    const container = dom.scalableContainer || document.getElementById('scalable-container');
    const body = document.body;
    
    // Limpeza inicial
    const chaosClasses = ['screen-flipped', 'screen-inverted', 'screen-mirrored', 'screen-shaking'];
    body.classList.remove(...chaosClasses);
    if (container) container.classList.remove(...chaosClasses);

    // Escalonamento de probabilidade
    let probability = 0;
    if (turn >= 3 && turn <= 5) probability = 0.3;
    else if (turn >= 6 && turn <= 9) probability = 0.7;
    else if (turn >= 10) probability = 1.0;

    if (Math.random() < probability) {
        const activeEffects = [];
        
        if (Math.random() < probability) activeEffects.push('screen-inverted');
        
        if (turn >= 6 && Math.random() < probability) {
            activeEffects.push(Math.random() > 0.5 ? 'screen-flipped' : 'screen-mirrored');
        }

        if (turn >= 10) activeEffects.push('screen-shaking');

        activeEffects.forEach(effect => {
            body.classList.add(effect);
            if (container) container.classList.add(effect);
        });

        if (activeEffects.length > 0) {
            playSoundEffect('confusao');
            console.log(`[INVERSUS CHAOS] Turno ${turn}: ${activeEffects.join(' + ')}`);
        }
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

    // 1. Limpeza total antes de começar
    resetGameEffects();
    dom.appContainerEl.classList.add('hidden');
    overlay.classList.remove('hidden');
    
    if (dom.musicPlayer) {
        dom.musicPlayer.pause();
        dom.musicPlayer.src = ''; // Para o áudio completamente
    }

    return new Promise(resolve => {
        // Sequência 1: FIM.mp4 (560x560)
        player.src = './FIM.mp4';
        player.style.width = '560px';
        player.style.height = '560px';
        player.style.transform = 'none';

        const onFimEnded = async () => {
            player.removeEventListener('ended', onFimEnded);
            console.log("[DEBUG] FIM.mp4 terminou. Iniciando CLIPE.mp4");
            
            // Sequência 2: CLIPE.mp4 (688x464)
            player.src = './CLIPE.mp4';
            player.style.width = '688px';
            player.style.height = '464px';
            
            try {
                await player.play();
            } catch (e) {
                console.error("[ERRO] Erro ao dar play no segundo vídeo:", e);
            }

            const onClipeEnded = () => {
                console.log("[DEBUG] Sequência completa.");
                player.removeEventListener('ended', onClipeEnded);
                overlay.classList.add('hidden');
                player.src = '';
                // Dispara evento para voltar ao menu limpando tudo
                document.dispatchEvent(new Event('showSplashScreen'));
                resolve();
            };
            player.addEventListener('ended', onClipeEnded);
        };

        player.addEventListener('ended', onFimEnded);
        player.play().catch(e => {
            console.error("[ERRO] Erro ao reproduzir FIM.mp4:", e);
            overlay.classList.add('hidden');
            document.dispatchEvent(new Event('showSplashScreen'));
            resolve();
        });
    });
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
    container.innerHTML = ''; // Clear previous stars

    for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        const startX = `${Math.random() * 100}vw`, startY = `${Math.random() * 100}vh`;
        const endX = `${Math.random() * 100}vw`, endY = `${Math.random() * 100}vh`;
        
        star.className = 'story-bg-star';
        star.style.color = color;
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

    if (state.versatrixCardInterval) {
        clearInterval(state.versatrixCardInterval);
        updateState('versatrixCardInterval', null);
    }
    
    const oldCard = document.getElementById('secret-versatrix-card');
    if (oldCard) oldCard.remove();

    const hasWin = state.achievements && state.achievements.has('versatrix_win');
    const hasCollected = state.achievements && state.achievements.has('versatrix_card_collected');
    
    if (!hasWin || hasCollected) {
        return;
    }

    const createFallingCard = () => {
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

        const container = dom.scalableContainer || document.getElementById('scalable-container') || document.body;
        
        const cardEl = document.createElement('div');
        cardEl.id = 'secret-versatrix-card';
        const size = 150;
        
        cardEl.style.position = 'absolute';
        cardEl.style.width = `${size}px`;
        cardEl.style.height = `${size * 1.4}px`;
        cardEl.style.zIndex = '9999';
        cardEl.style.cursor = 'pointer';
        
        const containerWidth = container.clientWidth || window.innerWidth;
        cardEl.style.left = `${Math.random() * (containerWidth - size)}px`;
        cardEl.style.top = `-200px`;

        cardEl.classList.add('card'); 
        cardEl.style.backgroundImage = "url('./verso_dourado.png')";

        const fallDuration = 10;
        cardEl.style.animation = `secret-fall ${fallDuration}s linear forwards, versatrix-pulse-glow 2s infinite ease-in-out`;

        cardEl.addEventListener('click', () => {
             console.log("Carta Dourada Clicada!");
             document.dispatchEvent(new CustomEvent('versatrixCardClicked'));
             cardEl.remove();
        });

        if (container) {
            container.appendChild(cardEl);
        }

        setTimeout(() => { 
            if (cardEl.parentElement) cardEl.remove(); 
        }, fallDuration * 1000);
    };

    createFallingCard();
    const intervalId = setInterval(createFallingCard, 15000);
    updateState('versatrixCardInterval', intervalId);
};

/**
 * Creates a spiral starry background effect for the final battle.
 */
export function createSpiralStarryBackground(container, starCount = 150) {
    if (!container) return;
    container.innerHTML = ''; 
    
    const centerX = 1920 / 2;
    const centerY = 1080 / 2;

    for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        star.className = 'story-star spiraling';

        const angle = Math.random() * 2 * Math.PI;
        const radius = Math.random() * 1000;
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

    if (overlay) {
        if (casterImg && gameState) {
             casterImg.classList.toggle('final-boss-glow', gameState.isFinalBoss);
        }
        overlay.classList.remove('hidden');
        setTimeout(() => overlay.classList.add('hidden'), 2500);
    }
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
 * Cria o efeito de despedaçar (shatter) para uma imagem OU vídeo.
 * Converte o elemento atual (seja img ou video) em um canvas estático
 * para poder recortar os pedaços e explodir.
 * * @param {HTMLElement} element - O elemento (img ou video) para despedaçar.
 */
export async function shatterImage(element) {
    // Verifica se o elemento existe e está no DOM
    if (!element || !element.parentNode) return;
    
    // Toca o som (já existente)
    playSoundEffect('destruido');

    return new Promise(resolve => {
        requestAnimationFrame(() => {
            // 1. Criar um "Snapshot" do elemento atual (Frame do vídeo ou Imagem)
            const rect = element.getBoundingClientRect();
            
            // Segurança contra elementos invisíveis
            if (rect.width === 0 || rect.height === 0) {
                console.warn('Shatter animation skipped: element has no dimensions.', element);
                setTimeout(resolve, 500);
                return;
            }

            // Canvas temporário para capturar a imagem/frame
            const canvas = document.createElement('canvas');
            canvas.width = rect.width;
            canvas.height = rect.height;
            const ctx = canvas.getContext('2d');
            
            try {
                // drawImage funciona para Video e Img nativamente
                ctx.drawImage(element, 0, 0, rect.width, rect.height);
            } catch (e) {
                console.error("Erro ao capturar frame para shatter:", e);
                resolve(); // Evita travar se der erro de CORS ou carregamento
                return;
            }

            // Converte o canvas para uma URL de imagem (base64)
            const snapshotUrl = canvas.toDataURL();

            // 2. Ocultar o elemento original imediatamente
            element.style.opacity = '0';

            // 3. Criar container da explosão
            const container = document.createElement('div');
            container.className = 'shatter-container';
            container.style.position = 'absolute';
            container.style.zIndex = '3000';
            
            // Posiciona no corpo para garantir que fique por cima de tudo
            document.body.appendChild(container);

            container.style.left = `${rect.left}px`;
            container.style.top = `${rect.top}px`;
            container.style.width = `${rect.width}px`;
            container.style.height = `${rect.height}px`;

            // 4. Criar partículas usando o Snapshot como background
            const particles = [];
            const rows = 10, cols = 10;

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const particle = document.createElement('div');
                    particle.className = 'shatter-particle';
                    
                    // AQUI ESTÁ O TRUQUE: Usamos o snapshot gerado como background
                    particle.style.backgroundImage = `url(${snapshotUrl})`;
                    particle.style.backgroundSize = `${rect.width}px ${rect.height}px`; // Garante a escala correta
                    particle.style.backgroundPosition = `${-c * (rect.width / cols)}px ${-r * (rect.height / rows)}px`;
                    
                    container.appendChild(particle);
                    particles.push(particle);
                }
            }

            // 5. Animar a explosão
            requestAnimationFrame(() => {
                particles.forEach(p => {
                    const x = (Math.random() - 0.5) * window.innerWidth * 1.5;
                    const y = (Math.random() - 0.5) * window.innerHeight * 1.5;
                    const rot = (Math.random() - 0.5) * 720;
                    p.style.transform = `translate(${x}px, ${y}px) rotate(${rot}deg)`;
                    p.style.opacity = '0';
                });
            });

            // 6. Limpeza
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
