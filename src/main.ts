/**
 * Main entry point for the 3D Exploration Game
 */

import { GameManager } from './GameManager';

console.log('3D Exploration Game - Starting...');

// Get canvas element
const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;

if (!canvas) {
  console.error('Canvas element not found');
  throw new Error('Canvas element with id "renderCanvas" not found');
}

// Initialize game
const gameManager = new GameManager();

// Use async IIFE to handle async initialization
(async () => {
  try {
    // Initialize the game manager with the canvas
    // This shows the loading indicator
    gameManager.updateLoadingMessage('Initializing game engine...');
    console.log('Initializing game engine...');
    gameManager.initialize(canvas);

    // Setup basic environment (lighting and skybox)
    gameManager.updateLoadingMessage('Setting up environment...');
    console.log('Setting up environment...');
    gameManager.setupBasicEnvironment();

    // Enable procedural world generation
    // This will generate roads, buildings, vehicles, and traffic dynamically as you explore
    // The loading indicator stays visible during this async operation
    gameManager.updateLoadingMessage('Setting up procedural world generation...');
    console.log('Setting up procedural world generation...');
    await gameManager.enableProceduralGeneration();
    console.log('Procedural generation ready!');

    // Start the render loop
    gameManager.updateLoadingMessage('Starting game...');
    console.log('Starting game...');
    gameManager.start();

    // Hide loading indicator once game is fully ready
    // Validates: Requirement 7.2
    gameManager.hideLoading();

    console.log('Game initialized and running');
    console.log('Controls: WASD to move, Mouse to look around, Space to jump');
    console.log('Click on the canvas to enable mouse look');
    console.log('The world will generate dynamically as you explore!');
  } catch (error) {
    console.error('Failed to initialize game:', error);
    // Error display is handled by GameManager.handleError
  }
})();

// Make gameManager available globally for debugging
(window as any).gameManager = gameManager;
