/**
 * Example of enabling procedural world generation in the game
 * This demonstrates how to integrate the ChunkManager with the existing game systems
 */

import { GameManager } from './GameManager';
import { WorldConfigManager } from './procedural';

// Example 1: Enable procedural generation with default configuration
export async function enableProceduralGenerationDefault(gameManager: GameManager): Promise<void> {
  console.log('Enabling procedural generation with default configuration...');
  
  // Simply call enableProceduralGeneration without parameters
  // This will use the default world configuration
  await gameManager.enableProceduralGeneration();
  
  console.log('Procedural generation enabled!');
  console.log('The world will now generate dynamically as the player explores.');
}

// Example 2: Enable procedural generation with custom configuration
export async function enableProceduralGenerationCustom(gameManager: GameManager): Promise<void> {
  console.log('Enabling procedural generation with custom configuration...');
  
  // Create a custom world configuration
  const worldConfig = new WorldConfigManager({
    chunk: {
      chunkSize: 150,           // Larger chunks
      activeRadius: 300,        // Load chunks within 300 units
      unloadDistance: 450,      // Unload chunks beyond 450 units
      seed: 42,                 // Custom seed for reproducible worlds
      generationOrder: [
        'TerrainGenerator',
        'RoadGenerator',
        'BuildingGenerator',
        'TrafficGenerator',
        'VehicleGenerator'
      ]
    },
    // Note: Only specify the properties you want to override
    // The rest will use default values
  } as any); // Type assertion to allow partial config
  
  // Alternatively, update specific generator configs after creation
  const config = worldConfig.getConfig();
  worldConfig.updateConfig({
    generators: {
      road: {
        ...config.generators.road,
        gridSpacing: 60,
        mainRoadWidth: 14,
        sideRoadWidth: 10,
        mainRoadProbability: 0.4,
        sideRoadDensity: 3
      },
      building: {
        ...config.generators.building,
        minHeight: 15,
        maxHeight: 60,
        density: 20,
        minSpacing: 4
      },
      traffic: {
        ...config.generators.traffic,
        intersectionSignProbability: 0.9,
        roadSignDensity: 0.4
      },
      vehicle: {
        ...config.generators.vehicle,
        density: 0.4,
        minSpacing: 4
      }
    }
  });
  
  // Enable procedural generation with custom config
  await gameManager.enableProceduralGeneration(worldConfig);
  
  console.log('Procedural generation enabled with custom configuration!');
}

// Example 3: Use preset configurations
export async function enableProceduralGenerationPreset(
  gameManager: GameManager,
  preset: 'urban' | 'suburban' | 'sparse' | 'dense'
): Promise<void> {
  console.log(`Enabling procedural generation with ${preset} preset...`);
  
  // Create a preset configuration
  const worldConfig = WorldConfigManager.createPreset(preset);
  
  // Enable procedural generation with preset
  await gameManager.enableProceduralGeneration(worldConfig);
  
  console.log(`Procedural generation enabled with ${preset} preset!`);
}

// Example 4: Disable procedural generation
export function disableProceduralGeneration(gameManager: GameManager): void {
  console.log('Disabling procedural generation...');
  
  gameManager.disableProceduralGeneration();
  
  console.log('Procedural generation disabled.');
}

// Example 5: Check procedural generation status
export function checkProceduralGenerationStatus(gameManager: GameManager): void {
  const isEnabled = gameManager.isProceduralGenerationEnabled();
  
  console.log(`Procedural generation is ${isEnabled ? 'ENABLED' : 'DISABLED'}`);
  
  if (isEnabled) {
    const chunkManager = gameManager.getChunkManager();
    const stats = chunkManager.getPerformanceStats();
    
    console.log('Performance Statistics:');
    console.log(`  - Loaded chunks: ${stats.loadedChunksCount}`);
    console.log(`  - Total chunks generated: ${stats.totalChunksGenerated}`);
    console.log(`  - Average generation time: ${stats.averageGenerationTime.toFixed(2)}ms`);
    console.log(`  - Min generation time: ${stats.minGenerationTime.toFixed(2)}ms`);
    console.log(`  - Max generation time: ${stats.maxGenerationTime.toFixed(2)}ms`);
    console.log(`  - Last generation time: ${stats.lastGenerationTime.toFixed(2)}ms`);
  }
}

// Example 6: Complete integration example
export async function completeIntegrationExample(): Promise<void> {
  console.log('=== Complete Procedural Generation Integration Example ===\n');
  
  // Get canvas element
  const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas not found!');
    return;
  }
  
  // Create and initialize game manager
  const gameManager = new GameManager();
  gameManager.initialize(canvas);
  
  // Enable procedural generation with urban preset
  await enableProceduralGenerationPreset(gameManager, 'urban');
  
  // Start the game
  gameManager.start();
  
  console.log('\nGame started with procedural generation!');
  console.log('Controls:');
  console.log('  - WASD: Move');
  console.log('  - Mouse: Look around');
  console.log('  - Space: Jump');
  console.log('\nThe world will generate dynamically as you explore!');
  
  // Check status after a delay
  setTimeout(() => {
    checkProceduralGenerationStatus(gameManager);
  }, 5000);
}

// Export for use in main.ts or other files
export {
  GameManager,
  WorldConfigManager
};
