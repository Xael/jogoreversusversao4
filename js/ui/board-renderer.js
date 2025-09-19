import * as dom from '../core/dom.js';
import * as config from '../core/config.js';
import { getState } from '../core/state.js';

/**
 * Renders the game board, including paths, spaces, and player pawns.
 */
export const renderBoard = () => {
    const { gameState } = getState();
    if (!gameState || !gameState.boardPaths) return;
    
    dom.boardEl.innerHTML = ''; // Clear previous board state
    dom.boardEl.classList.toggle('altar-defense', gameState.isAltarDefense);

    const centerPawnsContainer = document.createElement('div');
    centerPawnsContainer.className = 'board-center-pawns';

    gameState.boardPaths.forEach((path, index) => {
        const pathEl = document.createElement('div');
        pathEl.className = 'player-path';
        pathEl.style.transform = `translateX(-50%) rotate(${index * (360 / config.NUM_PATHS)}deg)`;
        
        path.spaces.forEach(space => {
            const spaceEl = document.createElement('div');
            spaceEl.className = `board-space space-${space.color}`;
            if(space.isUsed) spaceEl.classList.add('used');
            
            // Create a dedicated span for the number to ensure it's rendered correctly.
            const numberEl = document.createElement('span');
            numberEl.className = 'space-number';

            if (space.color === 'star') {
                numberEl.innerHTML = '⭐';
                numberEl.classList.add('star-icon');
            } else {
                numberEl.textContent = space.id;
            }
            spaceEl.appendChild(numberEl);

            if (space.hasHeart) {
                const heartEl = document.createElement('div');
                heartEl.className = 'space-heart';
                heartEl.textContent = '❤';
                spaceEl.appendChild(heartEl);
            }
            
            pathEl.appendChild(spaceEl);
        });
        dom.boardEl.appendChild(pathEl);
    });
    
    // Position pawns after the board structure is fully built.
    const pawnContainerParent = document.createElement('div');
    pawnContainerParent.className = 'board-pawns-overlay';

    // Render Player Pawns
    gameState.playerIdsInGame.forEach(id => {
        const player = gameState.players[id];
        if (player.isEliminated) return;
        
        const pawnEl = document.createElement('div');
        pawnEl.className = `pawn ${id}`;
        if(player.aiType === 'necroverso_final' || player.aiType === 'necroverso_king' || player.aiType === 'necroverso_tutorial') pawnEl.classList.add('necro');
        if(player.aiType === 'xael') pawnEl.classList.add('xael');

        if (player.position >= config.WINNING_POSITION) {
            centerPawnsContainer.appendChild(pawnEl);
        } else if (player.pathId !== -1 && player.position > 0) {
            const pathEl = dom.boardEl.children[player.pathId];
            if(pathEl){
                const spaceEl = pathEl.children[player.position - 1];
                if (spaceEl) {
                    spaceEl.appendChild(pawnEl);
                }
            }
        }
    });

    // Render Necro-Pawns for Altar Defense
    if (gameState.isAltarDefense && gameState.necroPawns) {
        gameState.necroPawns.forEach(necro => {
            if (necro.position >= config.WINNING_POSITION) {
                // This is a loss condition, handled elsewhere, but we can place the pawn in the center
                const pawnEl = document.createElement('div');
                pawnEl.className = 'pawn necro';
                centerPawnsContainer.appendChild(pawnEl);
            } else if (necro.pathId !== -1 && necro.position > 0) {
                const pathEl = dom.boardEl.children[necro.pathId];
                if (pathEl) {
                    const spaceEl = pathEl.children[necro.position - 1];
                    if (spaceEl) {
                        const pawnEl = document.createElement('div');
                        pawnEl.className = 'pawn necro';
                        pawnEl.dataset.necroId = necro.id; // Add ID for targeting
                        spaceEl.appendChild(pawnEl);
                    }
                }
            }
        });
    }


    dom.boardEl.appendChild(centerPawnsContainer);
};