import { getState } from './state.js';
import * as config from './config.js';
import { renderAll, showGameOver } from '../ui/ui-renderer.js';
import { updateLog } from './utils.js';

document.addEventListener('keydown', (event) => {
    // Atalho de auto-win reativado para testes
    if (event.key === '4') {
        const { gameState } = getState();

        // Ensure there is an active game running
        if (!gameState || gameState.gamePhase === 'game_over') {
            console.log('Shortcut "4" ignored: No active game.');
            return;
        }

        updateLog('Atalho de vitória ativado!');

        // Set player 1's position to the winning position
        const player1 = gameState.players['player-1'];
        if (player1) {
            player1.position = config.WINNING_POSITION;
        }

        // End the game
        gameState.gamePhase = 'game_over';

        // Trigger the appropriate win condition
        if (gameState.isStoryMode) {
            document.dispatchEvent(new CustomEvent('storyWinLoss', { detail: { battle: gameState.currentStoryBattle, won: true } }));
        } else {
            showGameOver(`${player1.name} venceu o jogo via atalho!`);
        }
        
        // Update the UI to reflect the changes
        renderAll();
    }
});

export {}; // Keep as module