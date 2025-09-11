// js/core/index.js
import { initializeUiHandlers } from '../ui/ui-handlers.js';
import { showSplashScreen } from '../ui/splash-screen.js';
import { setupPvpRooms } from '../game-controller.js';
import { checkForSavedGame } from './save-load.js';
import { loadAchievements } from './achievements.js';
import { initializeGoogleSignIn } from './auth.js';
import { connectToServer } from './network.js';
import { initI18n } from './i18n.js';
import { initDom } from './dom.js';

// This is the main entry point of the application.
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize DOM elements first to prevent race conditions.
    initDom();

    // Initializes Google Sign-In functionality - MUST be before UI Handlers
    initializeGoogleSignIn();

    // Initialize internationalization.
    await initI18n();

    // Establish connection with the server for PvP functionalities.
    connectToServer();

    // Sets up all the button clicks and other user interactions.
    initializeUiHandlers();

    // Initializes the PvP rooms data structure (now obsolete but kept for safety).
    setupPvpRooms();

    // Load any existing achievements from local storage.
    loadAchievements();

    // Checks if a saved game exists to enable the 'Continue' button.
    checkForSavedGame();
    
    // Displays the initial splash screen.
    showSplashScreen();
});
