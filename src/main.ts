/**
 * Main entry point for the 3D Exploration Game
 */

import { GameManager } from './GameManager';
import { EnvironmentConfig } from './EnvironmentManager';
import abandonedBuildingsConfigRaw from './environments/abandoned-buildings.json';

// Type assertion for the imported JSON
const abandonedBuildingsConfig = abandonedBuildingsConfigRaw as EnvironmentConfig;

console.log('3D Exploration Game - Starting...');

// Get canvas element
const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;

if (!canvas) {
  console.error('Canvas element not found');
  throw new Error('Canvas element with id "renderCanvas" not found');
}

// Initialize game
const gameManager = new GameManager();

try {
  // Initialize the game manager with the canvas
  gameManager.initialize(canvas);

  // Load the abandoned buildings environment
  gameManager.loadEnvironment(abandonedBuildingsConfig);

  // Start the render loop
  gameManager.start();

  // Hide loading indicator once game is ready
  const loadingElement = document.getElementById('loading');
  if (loadingElement) {
    loadingElement.style.display = 'none';
  }

  console.log('Game initialized and running');
  console.log('Controls: WASD to move, Mouse to look around');
  console.log('Click on the canvas to enable mouse look');
} catch (error) {
  console.error('Failed to initialize game:', error);
}

// Make gameManager available globally for debugging
(window as any).gameManager = gameManager;
