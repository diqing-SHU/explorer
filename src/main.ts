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

try {
  // Initialize the game manager with the canvas
  gameManager.initialize(canvas);

  // Add some temporary test objects to visualize the scene
  const scene = gameManager.getScene();
  const BABYLON = await import('@babylonjs/core');

  // Create a ground plane
  const ground = BABYLON.MeshBuilder.CreateGround('ground', { width: 50, height: 50 }, scene);
  const groundMaterial = new BABYLON.StandardMaterial('groundMat', scene);
  groundMaterial.diffuseColor = new BABYLON.Color3(0.3, 0.5, 0.3);
  ground.material = groundMaterial;
  
  // Add physics to ground for collision
  ground.physicsImpostor = new BABYLON.PhysicsImpostor(
    ground,
    BABYLON.PhysicsImpostor.BoxImpostor,
    { mass: 0, friction: 0.5, restitution: 0.2 },
    scene
  );
  
  // Make ground pickable for ground detection
  ground.isPickable = true;

  // Create some test boxes to help visualize movement
  for (let i = 0; i < 5; i++) {
    const box = BABYLON.MeshBuilder.CreateBox(`box${i}`, { size: 2 }, scene);
    box.position.x = (i - 2) * 5;
    box.position.y = 1;
    box.position.z = 5;
    
    const boxMaterial = new BABYLON.StandardMaterial(`boxMat${i}`, scene);
    boxMaterial.diffuseColor = new BABYLON.Color3(Math.random(), Math.random(), Math.random());
    box.material = boxMaterial;
    
    // Add physics to boxes for collision
    box.physicsImpostor = new BABYLON.PhysicsImpostor(
      box,
      BABYLON.PhysicsImpostor.BoxImpostor,
      { mass: 0, friction: 0.5, restitution: 0.2 },
      scene
    );
    
    // Make boxes pickable for ground detection
    box.isPickable = true;
  }

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
