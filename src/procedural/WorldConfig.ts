/**
 * WorldConfig - Configuration system for procedural world generation
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 11.4
 * 
 * This module provides a centralized configuration system that allows
 * all generation parameters to be configured without code changes.
 */

import { ChunkConfig } from './ChunkManager';
import { RoadGeneratorConfig } from './RoadGenerator';
import { BuildingGeneratorConfig } from './BuildingGenerator';
import { TrafficGeneratorConfig } from './TrafficGenerator';
import { VehicleGeneratorConfig } from './VehicleGenerator';

/**
 * Complete world generation configuration
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4
 */
export interface WorldConfig {
  // Chunk management configuration (Requirement 7.1)
  chunk: ChunkConfig;
  
  // Generator configurations (Requirements 7.2, 7.3, 7.4)
  generators: {
    road: RoadGeneratorConfig;
    building: BuildingGeneratorConfig;
    traffic: TrafficGeneratorConfig;
    vehicle: VehicleGeneratorConfig;
  };
}

/**
 * Validation result for configuration
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * WorldConfigManager - Manages and validates world configuration
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 11.4
 */
export class WorldConfigManager {
  private config: WorldConfig;
  
  constructor(config?: Partial<WorldConfig>) {
    // Initialize with default configuration
    this.config = this.createDefaultConfig();
    
    // Apply provided configuration
    if (config) {
      this.mergeConfig(config);
    }
  }
  
  /**
   * Create default world configuration
   * Provides sensible defaults for all parameters
   * Validates: Requirement 7.1
   */
  private createDefaultConfig(): WorldConfig {
    return {
      chunk: {
        chunkSize: 100,
        activeRadius: 200,
        unloadDistance: 300,
        seed: 12345,
        generationOrder: [
          'RoadGenerator',
          'BuildingGenerator',
          'TrafficGenerator',
          'VehicleGenerator'
        ]
      },
      generators: {
        road: {
          gridSpacing: 50,
          mainRoadWidth: 12,
          sideRoadWidth: 8,
          mainRoadProbability: 0.3,
          sideRoadDensity: 2,
          centerLineWidth: 0.2,
          edgeLineWidth: 0.15,
          crosswalkWidth: 3,
          dashLength: 2,
          dashGap: 2
        },
        building: {
          minHeight: 10,
          maxHeight: 50,
          minWidth: 8,
          maxWidth: 20,
          minDepth: 8,
          maxDepth: 20,
          density: 15,
          minSpacing: 5,
          roadOffset: 3,
          scaleVariation: 0.05,      // ±5% scale variation (Requirement 9.2)
          rotationVariation: 0.087,  // ±5° rotation variation (Requirement 9.2)
          styles: [
            {
              name: 'modern',
              colorPalette: ['#CCCCCC', '#AAAAAA', '#888888', '#666666'],
              windowPattern: 'grid',
              roofType: 'flat'
            },
            {
              name: 'classic',
              colorPalette: ['#D4A574', '#C19A6B', '#B8860B', '#8B7355'],
              windowPattern: 'rows',
              roofType: 'pitched'
            },
            {
              name: 'industrial',
              colorPalette: ['#4A4A4A', '#5A5A5A', '#6A6A6A', '#7A7A7A'],
              windowPattern: 'sparse',
              roofType: 'flat'
            },
            {
              name: 'residential',
              colorPalette: ['#F5DEB3', '#DEB887', '#D2B48C', '#BC8F8F'],
              windowPattern: 'regular',
              roofType: 'pitched'
            }
          ]
        },
        traffic: {
          intersectionSignProbability: 0.8,
          roadSignDensity: 0.3,
          signHeight: 3,
          signSize: 1,
          types: [0, 1, 2, 3, 4, 5, 6], // All SignType enum values
          minDistanceFromRoad: 6,
          maxDistanceFromRoad: 8,
          minSpacing: 10,
          scaleVariation: 0.02,      // ±2% scale variation (Requirement 9.2)
          rotationVariation: 0.03    // ±1.7° rotation variation (Requirement 9.2)
        },
        vehicle: {
          density: 0.3,
          minSpacing: 5,
          roadsideOffset: 2.5,
          typeDistribution: {
            0: 0.4,  // Sedan
            1: 0.25, // SUV
            2: 0.2,  // Compact
            3: 0.1,  // Truck
            4: 0.05  // Van
          },
          colorPalette: [
            '#FFFFFF', '#000000', '#C0C0C0', '#808080',
            '#FF0000', '#0000FF', '#00FF00', '#FFFF00',
            '#8B4513', '#4169E1', '#DC143C', '#2F4F4F'
          ],
          scaleVariation: 0.03,      // ±3% scale variation (Requirement 9.2)
          rotationVariation: 0.05,   // ±2.9° rotation variation (Requirement 9.2)
          dimensions: {
            0: { width: 1.8, height: 1.5, length: 4.5 }, // Sedan
            1: { width: 2.0, height: 1.8, length: 5.0 }, // SUV
            2: { width: 1.6, height: 1.4, length: 3.5 }, // Compact
            3: { width: 2.2, height: 2.5, length: 6.0 }, // Truck
            4: { width: 2.0, height: 2.2, length: 5.5 }  // Van
          }
        }
      }
    };
  }
  
  /**
   * Merge provided configuration with current configuration
   * Validates: Requirement 7.4
   */
  private mergeConfig(partial: Partial<WorldConfig>): void {
    // Deep merge chunk config
    if (partial.chunk) {
      this.config.chunk = { ...this.config.chunk, ...partial.chunk };
    }
    
    // Deep merge generator configs
    if (partial.generators) {
      if (partial.generators.road) {
        this.config.generators.road = {
          ...this.config.generators.road,
          ...partial.generators.road
        };
      }
      
      if (partial.generators.building) {
        this.config.generators.building = {
          ...this.config.generators.building,
          ...partial.generators.building
        };
      }
      
      if (partial.generators.traffic) {
        this.config.generators.traffic = {
          ...this.config.generators.traffic,
          ...partial.generators.traffic
        };
      }
      
      if (partial.generators.vehicle) {
        this.config.generators.vehicle = {
          ...this.config.generators.vehicle,
          ...partial.generators.vehicle
        };
      }
    }
  }
  
  /**
   * Get current configuration
   * Validates: Requirement 7.1
   */
  public getConfig(): WorldConfig {
    // Return a deep copy to prevent external modification
    return JSON.parse(JSON.stringify(this.config));
  }
  
  /**
   * Get chunk configuration
   * Validates: Requirement 7.1
   */
  public getChunkConfig(): ChunkConfig {
    return { ...this.config.chunk };
  }
  
  /**
   * Get road generator configuration
   * Validates: Requirement 7.2
   */
  public getRoadConfig(): RoadGeneratorConfig {
    return { ...this.config.generators.road };
  }
  
  /**
   * Get building generator configuration
   * Validates: Requirement 7.3
   */
  public getBuildingConfig(): BuildingGeneratorConfig {
    return { ...this.config.generators.building };
  }
  
  /**
   * Get traffic generator configuration
   * Validates: Requirement 7.4
   */
  public getTrafficConfig(): TrafficGeneratorConfig {
    return { ...this.config.generators.traffic };
  }
  
  /**
   * Get vehicle generator configuration
   * Validates: Requirement 7.4
   */
  public getVehicleConfig(): VehicleGeneratorConfig {
    return { ...this.config.generators.vehicle };
  }
  
  /**
   * Update configuration
   * Validates: Requirement 7.4 (configuration changes affect new chunks)
   */
  public updateConfig(partial: Partial<WorldConfig>): ValidationResult {
    // Validate before applying
    const validation = this.validateConfig(partial);
    
    if (!validation.valid) {
      return validation;
    }
    
    // Apply configuration
    this.mergeConfig(partial);
    
    return validation;
  }
  
  /**
   * Validate configuration
   * Ensures all parameters are within acceptable ranges
   * Validates: Requirement 7.1
   */
  public validateConfig(partial: Partial<WorldConfig>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Validate chunk configuration
    if (partial.chunk) {
      const chunk = partial.chunk;
      
      if (chunk.chunkSize !== undefined) {
        if (chunk.chunkSize <= 0) {
          errors.push('chunkSize must be positive');
        } else if (chunk.chunkSize < 50) {
          warnings.push('chunkSize < 50 may cause performance issues');
        } else if (chunk.chunkSize > 500) {
          warnings.push('chunkSize > 500 may cause generation delays');
        }
      }
      
      if (chunk.activeRadius !== undefined) {
        if (chunk.activeRadius <= 0) {
          errors.push('activeRadius must be positive');
        }
      }
      
      if (chunk.unloadDistance !== undefined) {
        if (chunk.unloadDistance <= 0) {
          errors.push('unloadDistance must be positive');
        }
        if (chunk.activeRadius !== undefined && chunk.unloadDistance <= chunk.activeRadius) {
          errors.push('unloadDistance must be greater than activeRadius');
        }
      }
      
      if (chunk.seed !== undefined) {
        if (!Number.isInteger(chunk.seed)) {
          errors.push('seed must be an integer');
        }
      }
      
      if (chunk.generationOrder !== undefined) {
        if (!Array.isArray(chunk.generationOrder)) {
          errors.push('generationOrder must be an array');
        } else if (chunk.generationOrder.length === 0) {
          warnings.push('generationOrder is empty, no generators will run');
        }
      }
    }
    
    // Validate road configuration
    if (partial.generators?.road) {
      const road = partial.generators.road;
      
      if (road.gridSpacing !== undefined && road.gridSpacing <= 0) {
        errors.push('road.gridSpacing must be positive');
      }
      
      if (road.mainRoadWidth !== undefined && road.mainRoadWidth <= 0) {
        errors.push('road.mainRoadWidth must be positive');
      }
      
      if (road.sideRoadWidth !== undefined && road.sideRoadWidth <= 0) {
        errors.push('road.sideRoadWidth must be positive');
      }
      
      if (road.mainRoadProbability !== undefined) {
        if (road.mainRoadProbability < 0 || road.mainRoadProbability > 1) {
          errors.push('road.mainRoadProbability must be between 0 and 1');
        }
      }
      
      if (road.sideRoadDensity !== undefined && road.sideRoadDensity < 0) {
        errors.push('road.sideRoadDensity must be non-negative');
      }
    }
    
    // Validate building configuration
    if (partial.generators?.building) {
      const building = partial.generators.building;
      
      if (building.minHeight !== undefined && building.minHeight <= 0) {
        errors.push('building.minHeight must be positive');
      }
      
      if (building.maxHeight !== undefined && building.maxHeight <= 0) {
        errors.push('building.maxHeight must be positive');
      }
      
      if (building.minHeight !== undefined && building.maxHeight !== undefined) {
        if (building.minHeight > building.maxHeight) {
          errors.push('building.minHeight must be <= building.maxHeight');
        }
      }
      
      if (building.minWidth !== undefined && building.minWidth <= 0) {
        errors.push('building.minWidth must be positive');
      }
      
      if (building.maxWidth !== undefined && building.maxWidth <= 0) {
        errors.push('building.maxWidth must be positive');
      }
      
      if (building.minDepth !== undefined && building.minDepth <= 0) {
        errors.push('building.minDepth must be positive');
      }
      
      if (building.maxDepth !== undefined && building.maxDepth <= 0) {
        errors.push('building.maxDepth must be positive');
      }
      
      if (building.density !== undefined && building.density < 0) {
        errors.push('building.density must be non-negative');
      }
      
      if (building.minSpacing !== undefined && building.minSpacing < 0) {
        errors.push('building.minSpacing must be non-negative');
      }
      
      if (building.roadOffset !== undefined && building.roadOffset < 0) {
        errors.push('building.roadOffset must be non-negative');
      }
    }
    
    // Validate traffic configuration
    if (partial.generators?.traffic) {
      const traffic = partial.generators.traffic;
      
      if (traffic.intersectionSignProbability !== undefined) {
        if (traffic.intersectionSignProbability < 0 || traffic.intersectionSignProbability > 1) {
          errors.push('traffic.intersectionSignProbability must be between 0 and 1');
        }
      }
      
      if (traffic.roadSignDensity !== undefined && traffic.roadSignDensity < 0) {
        errors.push('traffic.roadSignDensity must be non-negative');
      }
      
      if (traffic.signHeight !== undefined && traffic.signHeight <= 0) {
        errors.push('traffic.signHeight must be positive');
      }
      
      if (traffic.signSize !== undefined && traffic.signSize <= 0) {
        errors.push('traffic.signSize must be positive');
      }
      
      if (traffic.minDistanceFromRoad !== undefined && traffic.minDistanceFromRoad < 0) {
        errors.push('traffic.minDistanceFromRoad must be non-negative');
      }
      
      if (traffic.maxDistanceFromRoad !== undefined && traffic.maxDistanceFromRoad < 0) {
        errors.push('traffic.maxDistanceFromRoad must be non-negative');
      }
      
      if (traffic.minSpacing !== undefined && traffic.minSpacing < 0) {
        errors.push('traffic.minSpacing must be non-negative');
      }
    }
    
    // Validate vehicle configuration
    if (partial.generators?.vehicle) {
      const vehicle = partial.generators.vehicle;
      
      if (vehicle.density !== undefined && vehicle.density < 0) {
        errors.push('vehicle.density must be non-negative');
      }
      
      if (vehicle.minSpacing !== undefined && vehicle.minSpacing < 0) {
        errors.push('vehicle.minSpacing must be non-negative');
      }
      
      if (vehicle.roadsideOffset !== undefined && vehicle.roadsideOffset < 0) {
        errors.push('vehicle.roadsideOffset must be non-negative');
      }
      
      if (vehicle.typeDistribution !== undefined) {
        const sum = Object.values(vehicle.typeDistribution).reduce((a, b) => a + b, 0);
        if (Math.abs(sum - 1.0) > 0.01) {
          warnings.push('vehicle.typeDistribution probabilities should sum to 1.0');
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * Load configuration from JSON
   * Validates: Requirement 7.4
   */
  public static fromJSON(json: string): WorldConfigManager {
    try {
      const parsed = JSON.parse(json);
      return new WorldConfigManager(parsed);
    } catch (error) {
      throw new Error(`Failed to parse configuration JSON: ${error}`);
    }
  }
  
  /**
   * Export configuration to JSON
   * Validates: Requirement 7.4
   */
  public toJSON(): string {
    return JSON.stringify(this.config, null, 2);
  }
  
  /**
   * Create preset configurations for common scenarios
   */
  public static createPreset(preset: 'urban' | 'suburban' | 'sparse' | 'dense'): WorldConfigManager {
    const manager = new WorldConfigManager();
    
    switch (preset) {
      case 'urban':
        // Dense urban environment with tall buildings and busy roads
        manager.updateConfig({
          generators: {
            road: {
              gridSpacing: 40,
              mainRoadProbability: 0.5,
              sideRoadDensity: 3
            },
            building: {
              minHeight: 20,
              maxHeight: 80,
              density: 25,
              minSpacing: 3
            },
            traffic: {
              intersectionSignProbability: 0.9,
              roadSignDensity: 0.5
            },
            vehicle: {
              density: 0.5,
              minSpacing: 4
            }
          }
        });
        break;
        
      case 'suburban':
        // Moderate density with medium buildings
        manager.updateConfig({
          generators: {
            road: {
              gridSpacing: 60,
              mainRoadProbability: 0.3,
              sideRoadDensity: 2
            },
            building: {
              minHeight: 8,
              maxHeight: 30,
              density: 15,
              minSpacing: 5
            },
            traffic: {
              intersectionSignProbability: 0.7,
              roadSignDensity: 0.3
            },
            vehicle: {
              density: 0.3,
              minSpacing: 5
            }
          }
        });
        break;
        
      case 'sparse':
        // Low density with few buildings and roads
        manager.updateConfig({
          generators: {
            road: {
              gridSpacing: 80,
              mainRoadProbability: 0.2,
              sideRoadDensity: 1
            },
            building: {
              minHeight: 5,
              maxHeight: 20,
              density: 8,
              minSpacing: 8
            },
            traffic: {
              intersectionSignProbability: 0.5,
              roadSignDensity: 0.2
            },
            vehicle: {
              density: 0.15,
              minSpacing: 8
            }
          }
        });
        break;
        
      case 'dense':
        // Very dense urban environment
        manager.updateConfig({
          generators: {
            road: {
              gridSpacing: 30,
              mainRoadProbability: 0.6,
              sideRoadDensity: 4
            },
            building: {
              minHeight: 30,
              maxHeight: 100,
              density: 30,
              minSpacing: 2
            },
            traffic: {
              intersectionSignProbability: 1.0,
              roadSignDensity: 0.6
            },
            vehicle: {
              density: 0.6,
              minSpacing: 3
            }
          }
        });
        break;
    }
    
    return manager;
  }
}
