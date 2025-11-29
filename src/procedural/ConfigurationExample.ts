/**
 * Configuration System Integration Example
 * Demonstrates how to use WorldConfigManager with the procedural generation system
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 11.4
 */

import * as BABYLON from '@babylonjs/core';
import { WorldConfigManager } from './WorldConfig';
import { ChunkManager } from './ChunkManager';
import { RoadGenerator } from './RoadGenerator';
import { BuildingGenerator } from './BuildingGenerator';
import { TrafficGenerator } from './TrafficGenerator';
import { VehicleGenerator } from './VehicleGenerator';
import { PlacementRuleEngine } from './PlacementRuleEngine';

/**
 * Example 1: Using default configuration
 */
export function setupWithDefaultConfig(scene: BABYLON.Scene): ChunkManager {
  // Create configuration manager with defaults
  const configManager = new WorldConfigManager();
  
  // Create chunk manager
  const chunkManager = new ChunkManager();
  chunkManager.initialize(scene, configManager.getChunkConfig());
  
  // Create placement engine
  const placementEngine = new PlacementRuleEngine();
  chunkManager.setPlacementEngine(placementEngine);
  
  // Create and configure generators
  const roadGen = new RoadGenerator();
  roadGen.configure(configManager.getRoadConfig());
  
  const buildingGen = new BuildingGenerator();
  buildingGen.configure(configManager.getBuildingConfig());
  buildingGen.setRoadGenerator(roadGen);
  
  const trafficGen = new TrafficGenerator();
  trafficGen.configure(configManager.getTrafficConfig());
  trafficGen.setRoadGenerator(roadGen);
  trafficGen.setBuildingGenerator(buildingGen);
  
  const vehicleGen = new VehicleGenerator();
  vehicleGen.configure(configManager.getVehicleConfig());
  vehicleGen.setRoadGenerator(roadGen);
  
  // Register generators
  chunkManager.registerGenerator(roadGen);
  chunkManager.registerGenerator(buildingGen);
  chunkManager.registerGenerator(trafficGen);
  chunkManager.registerGenerator(vehicleGen);
  
  return chunkManager;
}

/**
 * Example 2: Using preset configuration
 */
export function setupWithPreset(
  scene: BABYLON.Scene,
  preset: 'urban' | 'suburban' | 'sparse' | 'dense'
): ChunkManager {
  // Create configuration manager with preset
  const configManager = WorldConfigManager.createPreset(preset);
  
  // Create chunk manager
  const chunkManager = new ChunkManager();
  chunkManager.initialize(scene, configManager.getChunkConfig());
  
  // Create placement engine
  const placementEngine = new PlacementRuleEngine();
  chunkManager.setPlacementEngine(placementEngine);
  
  // Create and configure generators
  const roadGen = new RoadGenerator();
  roadGen.configure(configManager.getRoadConfig());
  
  const buildingGen = new BuildingGenerator();
  buildingGen.configure(configManager.getBuildingConfig());
  buildingGen.setRoadGenerator(roadGen);
  
  const trafficGen = new TrafficGenerator();
  trafficGen.configure(configManager.getTrafficConfig());
  trafficGen.setRoadGenerator(roadGen);
  trafficGen.setBuildingGenerator(buildingGen);
  
  const vehicleGen = new VehicleGenerator();
  vehicleGen.configure(configManager.getVehicleConfig());
  vehicleGen.setRoadGenerator(roadGen);
  
  // Register generators
  chunkManager.registerGenerator(roadGen);
  chunkManager.registerGenerator(buildingGen);
  chunkManager.registerGenerator(trafficGen);
  chunkManager.registerGenerator(vehicleGen);
  
  return chunkManager;
}

/**
 * Example 3: Using custom configuration
 */
export function setupWithCustomConfig(scene: BABYLON.Scene): ChunkManager {
  // Create configuration manager
  const configManager = new WorldConfigManager();
  
  // Customize configuration
  const result = configManager.updateConfig({
    chunk: {
      seed: 99999,
      chunkSize: 150,
      activeRadius: 250
    },
    generators: {
      road: {
        gridSpacing: 60,
        mainRoadProbability: 0.4
      },
      building: {
        minHeight: 15,
        maxHeight: 70,
        density: 20
      },
      traffic: {
        intersectionSignProbability: 0.9,
        roadSignDensity: 0.4
      },
      vehicle: {
        density: 0.4,
        minSpacing: 4
      }
    }
  });
  
  // Check validation
  if (!result.valid) {
    console.error('Configuration validation failed:', result.errors);
    throw new Error('Invalid configuration');
  }
  
  if (result.warnings.length > 0) {
    console.warn('Configuration warnings:', result.warnings);
  }
  
  // Create chunk manager
  const chunkManager = new ChunkManager();
  chunkManager.initialize(scene, configManager.getChunkConfig());
  
  // Create placement engine
  const placementEngine = new PlacementRuleEngine();
  chunkManager.setPlacementEngine(placementEngine);
  
  // Create and configure generators
  const roadGen = new RoadGenerator();
  roadGen.configure(configManager.getRoadConfig());
  
  const buildingGen = new BuildingGenerator();
  buildingGen.configure(configManager.getBuildingConfig());
  buildingGen.setRoadGenerator(roadGen);
  
  const trafficGen = new TrafficGenerator();
  trafficGen.configure(configManager.getTrafficConfig());
  trafficGen.setRoadGenerator(roadGen);
  trafficGen.setBuildingGenerator(buildingGen);
  
  const vehicleGen = new VehicleGenerator();
  vehicleGen.configure(configManager.getVehicleConfig());
  vehicleGen.setRoadGenerator(roadGen);
  
  // Register generators
  chunkManager.registerGenerator(roadGen);
  chunkManager.registerGenerator(buildingGen);
  chunkManager.registerGenerator(trafficGen);
  chunkManager.registerGenerator(vehicleGen);
  
  return chunkManager;
}

/**
 * Example 4: Loading configuration from JSON
 */
export function setupFromJSON(scene: BABYLON.Scene, jsonConfig: string): ChunkManager {
  // Load configuration from JSON
  const configManager = WorldConfigManager.fromJSON(jsonConfig);
  
  // Validate configuration
  const validation = configManager.validateConfig(configManager.getConfig());
  if (!validation.valid) {
    console.error('Configuration validation failed:', validation.errors);
    throw new Error('Invalid configuration');
  }
  
  // Create chunk manager
  const chunkManager = new ChunkManager();
  chunkManager.initialize(scene, configManager.getChunkConfig());
  
  // Create placement engine
  const placementEngine = new PlacementRuleEngine();
  chunkManager.setPlacementEngine(placementEngine);
  
  // Create and configure generators
  const roadGen = new RoadGenerator();
  roadGen.configure(configManager.getRoadConfig());
  
  const buildingGen = new BuildingGenerator();
  buildingGen.configure(configManager.getBuildingConfig());
  buildingGen.setRoadGenerator(roadGen);
  
  const trafficGen = new TrafficGenerator();
  trafficGen.configure(configManager.getTrafficConfig());
  trafficGen.setRoadGenerator(roadGen);
  trafficGen.setBuildingGenerator(buildingGen);
  
  const vehicleGen = new VehicleGenerator();
  vehicleGen.configure(configManager.getVehicleConfig());
  vehicleGen.setRoadGenerator(roadGen);
  
  // Register generators
  chunkManager.registerGenerator(roadGen);
  chunkManager.registerGenerator(buildingGen);
  chunkManager.registerGenerator(trafficGen);
  chunkManager.registerGenerator(vehicleGen);
  
  return chunkManager;
}

/**
 * Example 5: Runtime configuration changes
 * Demonstrates how configuration changes affect newly generated chunks
 */
export function demonstrateRuntimeConfigChanges(
  scene: BABYLON.Scene,
  chunkManager: ChunkManager
): void {
  // Get references to generators
  const roadGen = chunkManager.getGenerator('RoadGenerator') as RoadGenerator;
  const buildingGen = chunkManager.getGenerator('BuildingGenerator') as BuildingGenerator;
  const trafficGen = chunkManager.getGenerator('TrafficGenerator') as TrafficGenerator;
  const vehicleGen = chunkManager.getGenerator('VehicleGenerator') as VehicleGenerator;
  
  // Create configuration manager
  const configManager = new WorldConfigManager();
  
  // Change configuration at runtime
  configManager.updateConfig({
    generators: {
      building: {
        maxHeight: 100,  // Make buildings taller
        density: 25      // Add more buildings
      },
      vehicle: {
        density: 0.5     // Add more vehicles
      }
    }
  });
  
  // Apply new configuration to generators
  // New chunks will use this configuration
  if (buildingGen) {
    buildingGen.configure(configManager.getBuildingConfig());
  }
  if (vehicleGen) {
    vehicleGen.configure(configManager.getVehicleConfig());
  }
  
  console.log('Configuration updated - new chunks will use updated settings');
}

/**
 * Example 6: Exporting and saving configuration
 */
export function exportConfiguration(configManager: WorldConfigManager): string {
  // Export configuration to JSON
  const json = configManager.toJSON();
  
  // In a real application, you might save this to a file or localStorage
  console.log('Configuration exported:', json);
  
  return json;
}

/**
 * Example 7: Creating multiple worlds with different configurations
 */
export function createMultipleWorlds(scene: BABYLON.Scene): {
  urban: ChunkManager;
  suburban: ChunkManager;
  sparse: ChunkManager;
} {
  // Create three different worlds with different presets
  // Each uses a different seed for variety
  
  const urbanConfig = WorldConfigManager.createPreset('urban');
  urbanConfig.updateConfig({ chunk: { seed: 11111 } });
  const urbanWorld = setupWithPreset(scene, 'urban');
  
  const suburbanConfig = WorldConfigManager.createPreset('suburban');
  suburbanConfig.updateConfig({ chunk: { seed: 22222 } });
  const suburbanWorld = setupWithPreset(scene, 'suburban');
  
  const sparseConfig = WorldConfigManager.createPreset('sparse');
  sparseConfig.updateConfig({ chunk: { seed: 33333 } });
  const sparseWorld = setupWithPreset(scene, 'sparse');
  
  return {
    urban: urbanWorld,
    suburban: suburbanWorld,
    sparse: sparseWorld
  };
}
