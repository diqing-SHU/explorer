/**
 * Default Configuration and World Generation Tests
 * Task 21: Create default configuration and test world
 * Validates: All Requirements
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as BABYLON from '@babylonjs/core';
import { WorldConfigManager } from './WorldConfig';
import { ChunkManager } from './ChunkManager';
import { RoadGenerator } from './RoadGenerator';
import { BuildingGenerator } from './BuildingGenerator';
import { TrafficGenerator } from './TrafficGenerator';
import { VehicleGenerator } from './VehicleGenerator';
import { PlacementRuleEngine } from './PlacementRuleEngine';
import * as fs from 'fs';
import * as path from 'path';

describe('Default Configuration Tests', () => {
  let engine: BABYLON.NullEngine;
  let scene: BABYLON.Scene;
  
  beforeEach(() => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
  });
  
  describe('Configuration Loading', () => {
    it('should load default configuration from JSON file', () => {
      // Read the default config file
      const configPath = path.join(__dirname, 'default-config.json');
      const configJson = fs.readFileSync(configPath, 'utf-8');
      
      // Load configuration
      const configManager = WorldConfigManager.fromJSON(configJson);
      
      // Verify configuration loaded successfully
      const config = configManager.getConfig();
      expect(config).toBeDefined();
      expect(config.chunk).toBeDefined();
      expect(config.generators).toBeDefined();
    });
    
    it('should have valid chunk configuration', () => {
      const configPath = path.join(__dirname, 'default-config.json');
      const configJson = fs.readFileSync(configPath, 'utf-8');
      const configManager = WorldConfigManager.fromJSON(configJson);
      
      const chunkConfig = configManager.getChunkConfig();
      
      // Verify chunk parameters
      expect(chunkConfig.chunkSize).toBe(100);
      expect(chunkConfig.activeRadius).toBe(200);
      expect(chunkConfig.unloadDistance).toBe(300);
      expect(chunkConfig.seed).toBe(12345);
      expect(chunkConfig.generationOrder).toEqual([
        'RoadGenerator',
        'BuildingGenerator',
        'TrafficGenerator',
        'VehicleGenerator'
      ]);
    });
    
    it('should have valid road configuration', () => {
      const configPath = path.join(__dirname, 'default-config.json');
      const configJson = fs.readFileSync(configPath, 'utf-8');
      const configManager = WorldConfigManager.fromJSON(configJson);
      
      const roadConfig = configManager.getRoadConfig();
      
      // Verify road parameters
      expect(roadConfig.gridSpacing).toBe(50);
      expect(roadConfig.mainRoadWidth).toBe(14);
      expect(roadConfig.sideRoadWidth).toBe(9);
      expect(roadConfig.mainRoadProbability).toBe(0.35);
      expect(roadConfig.sideRoadDensity).toBe(1);
    });
    
    it('should have valid building configuration', () => {
      const configPath = path.join(__dirname, 'default-config.json');
      const configJson = fs.readFileSync(configPath, 'utf-8');
      const configManager = WorldConfigManager.fromJSON(configJson);
      
      const buildingConfig = configManager.getBuildingConfig();
      
      // Verify building parameters
      expect(buildingConfig.minHeight).toBe(12);
      expect(buildingConfig.maxHeight).toBe(60);
      expect(buildingConfig.minWidth).toBe(10);
      expect(buildingConfig.maxWidth).toBe(25);
      expect(buildingConfig.density).toBe(18);
      expect(buildingConfig.styles.length).toBeGreaterThan(0);
    });
    
    it('should have valid traffic configuration', () => {
      const configPath = path.join(__dirname, 'default-config.json');
      const configJson = fs.readFileSync(configPath, 'utf-8');
      const configManager = WorldConfigManager.fromJSON(configJson);
      
      const trafficConfig = configManager.getTrafficConfig();
      
      // Verify traffic parameters
      expect(trafficConfig.intersectionSignProbability).toBe(0.9);
      expect(trafficConfig.roadSignDensity).toBe(0.4);
      expect(trafficConfig.signHeight).toBe(3.5);
      expect(trafficConfig.types.length).toBeGreaterThan(0);
    });
    
    it('should have valid vehicle configuration', () => {
      const configPath = path.join(__dirname, 'default-config.json');
      const configJson = fs.readFileSync(configPath, 'utf-8');
      const configManager = WorldConfigManager.fromJSON(configJson);
      
      const vehicleConfig = configManager.getVehicleConfig();
      
      // Verify vehicle parameters
      expect(vehicleConfig.density).toBe(0.4);
      expect(vehicleConfig.minSpacing).toBe(6);
      expect(vehicleConfig.roadsideOffset).toBe(2.5);
      expect(vehicleConfig.colorPalette.length).toBeGreaterThan(0);
    });
  });
  
  describe('World Generation with Default Configuration', () => {
    it('should initialize chunk manager with default configuration', () => {
      const configPath = path.join(__dirname, 'default-config.json');
      const configJson = fs.readFileSync(configPath, 'utf-8');
      const configManager = WorldConfigManager.fromJSON(configJson);
      
      const chunkManager = new ChunkManager();
      chunkManager.initialize(scene, configManager.getChunkConfig());
      
      // Verify initialization
      expect(chunkManager.getLoadedChunks().length).toBe(0);
    });
    
    it('should setup all generators with default configuration', () => {
      const configPath = path.join(__dirname, 'default-config.json');
      const configJson = fs.readFileSync(configPath, 'utf-8');
      const configManager = WorldConfigManager.fromJSON(configJson);
      
      const chunkManager = new ChunkManager();
      chunkManager.initialize(scene, configManager.getChunkConfig());
      
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
      
      // Verify generators registered
      expect(chunkManager.getGenerator('RoadGenerator')).toBeDefined();
      expect(chunkManager.getGenerator('BuildingGenerator')).toBeDefined();
      expect(chunkManager.getGenerator('TrafficGenerator')).toBeDefined();
      expect(chunkManager.getGenerator('VehicleGenerator')).toBeDefined();
    });
    
    it('should generate chunks with default configuration', () => {
      const configPath = path.join(__dirname, 'default-config.json');
      const configJson = fs.readFileSync(configPath, 'utf-8');
      const configManager = WorldConfigManager.fromJSON(configJson);
      
      const chunkManager = new ChunkManager();
      chunkManager.initialize(scene, configManager.getChunkConfig());
      
      const placementEngine = new PlacementRuleEngine();
      chunkManager.setPlacementEngine(placementEngine);
      
      // Setup generators
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
      
      chunkManager.registerGenerator(roadGen);
      chunkManager.registerGenerator(buildingGen);
      chunkManager.registerGenerator(trafficGen);
      chunkManager.registerGenerator(vehicleGen);
      
      // Generate a chunk
      const chunk = chunkManager.generateChunk(0, 0);
      
      // Verify chunk generated
      expect(chunk).toBeDefined();
      expect(chunk.x).toBe(0);
      expect(chunk.z).toBe(0);
    });
  });
  
  describe('Deterministic Generation', () => {
    it('should generate identical chunks with same seed', () => {
      const configPath = path.join(__dirname, 'default-config.json');
      const configJson = fs.readFileSync(configPath, 'utf-8');
      
      // Create first world
      const configManager1 = WorldConfigManager.fromJSON(configJson);
      const chunkManager1 = new ChunkManager();
      chunkManager1.initialize(scene, configManager1.getChunkConfig());
      
      const placementEngine1 = new PlacementRuleEngine();
      chunkManager1.setPlacementEngine(placementEngine1);
      
      const roadGen1 = new RoadGenerator();
      roadGen1.configure(configManager1.getRoadConfig());
      
      const buildingGen1 = new BuildingGenerator();
      buildingGen1.configure(configManager1.getBuildingConfig());
      buildingGen1.setRoadGenerator(roadGen1);
      
      chunkManager1.registerGenerator(roadGen1);
      chunkManager1.registerGenerator(buildingGen1);
      
      // Generate chunk
      const chunk1 = chunkManager1.generateChunk(0, 0);
      
      // Create second world with same seed
      const configManager2 = WorldConfigManager.fromJSON(configJson);
      const scene2 = new BABYLON.Scene(engine);
      const chunkManager2 = new ChunkManager();
      chunkManager2.initialize(scene2, configManager2.getChunkConfig());
      
      const placementEngine2 = new PlacementRuleEngine();
      chunkManager2.setPlacementEngine(placementEngine2);
      
      const roadGen2 = new RoadGenerator();
      roadGen2.configure(configManager2.getRoadConfig());
      
      const buildingGen2 = new BuildingGenerator();
      buildingGen2.configure(configManager2.getBuildingConfig());
      buildingGen2.setRoadGenerator(roadGen2);
      
      chunkManager2.registerGenerator(roadGen2);
      chunkManager2.registerGenerator(buildingGen2);
      
      // Generate same chunk
      const chunk2 = chunkManager2.generateChunk(0, 0);
      
      // Verify chunks are identical
      expect(chunk1.roads.length).toBe(chunk2.roads.length);
      expect(chunk1.buildings.length).toBe(chunk2.buildings.length);
      
      // Verify road positions match
      for (let i = 0; i < chunk1.roads.length; i++) {
        expect(chunk1.roads[i].segments.length).toBe(chunk2.roads[i].segments.length);
      }
      
      // Verify building positions match
      for (let i = 0; i < chunk1.buildings.length; i++) {
        expect(chunk1.buildings[i].position.x).toBeCloseTo(chunk2.buildings[i].position.x, 5);
        expect(chunk1.buildings[i].position.z).toBeCloseTo(chunk2.buildings[i].position.z, 5);
      }
    });
  });
  
  describe('Chunk Loading and Unloading', () => {
    it('should load chunks when player moves close', () => {
      const configPath = path.join(__dirname, 'default-config.json');
      const configJson = fs.readFileSync(configPath, 'utf-8');
      const configManager = WorldConfigManager.fromJSON(configJson);
      
      const chunkManager = new ChunkManager();
      chunkManager.initialize(scene, configManager.getChunkConfig());
      
      const placementEngine = new PlacementRuleEngine();
      chunkManager.setPlacementEngine(placementEngine);
      
      const roadGen = new RoadGenerator();
      roadGen.configure(configManager.getRoadConfig());
      chunkManager.registerGenerator(roadGen);
      
      // Player at origin - should load nearby chunks
      const playerPos = new BABYLON.Vector3(0, 0, 0);
      chunkManager.update(playerPos);
      
      // Verify chunks loaded
      const loadedChunks = chunkManager.getLoadedChunks();
      expect(loadedChunks.length).toBeGreaterThan(0);
    });
    
    it('should unload chunks when player moves far away', () => {
      const configPath = path.join(__dirname, 'default-config.json');
      const configJson = fs.readFileSync(configPath, 'utf-8');
      const configManager = WorldConfigManager.fromJSON(configJson);
      
      const chunkManager = new ChunkManager();
      chunkManager.initialize(scene, configManager.getChunkConfig());
      
      const placementEngine = new PlacementRuleEngine();
      chunkManager.setPlacementEngine(placementEngine);
      
      const roadGen = new RoadGenerator();
      roadGen.configure(configManager.getRoadConfig());
      chunkManager.registerGenerator(roadGen);
      
      // Player at origin
      chunkManager.update(new BABYLON.Vector3(0, 0, 0));
      const initialCount = chunkManager.getLoadedChunks().length;
      
      // Move player far away (beyond unload distance)
      chunkManager.update(new BABYLON.Vector3(500, 0, 500));
      const afterMoveCount = chunkManager.getLoadedChunks().length;
      
      // Verify some chunks were unloaded
      // (chunks at origin should be unloaded when player is at 500,500)
      expect(chunkManager.isChunkLoaded(0, 0)).toBe(false);
    });
    
    it('should maintain chunks when player is stationary', () => {
      const configPath = path.join(__dirname, 'default-config.json');
      const configJson = fs.readFileSync(configPath, 'utf-8');
      const configManager = WorldConfigManager.fromJSON(configJson);
      
      const chunkManager = new ChunkManager();
      chunkManager.initialize(scene, configManager.getChunkConfig());
      
      const placementEngine = new PlacementRuleEngine();
      chunkManager.setPlacementEngine(placementEngine);
      
      const roadGen = new RoadGenerator();
      roadGen.configure(configManager.getRoadConfig());
      chunkManager.registerGenerator(roadGen);
      
      // Player at origin
      const playerPos = new BABYLON.Vector3(0, 0, 0);
      chunkManager.update(playerPos);
      const count1 = chunkManager.getLoadedChunks().length;
      
      // Update again with same position
      chunkManager.update(playerPos);
      const count2 = chunkManager.getLoadedChunks().length;
      
      // Update once more
      chunkManager.update(playerPos);
      const count3 = chunkManager.getLoadedChunks().length;
      
      // Verify chunk count remains stable
      expect(count1).toBe(count2);
      expect(count2).toBe(count3);
    });
  });
  
  describe('Configuration Validation', () => {
    it('should validate default configuration successfully', () => {
      const configPath = path.join(__dirname, 'default-config.json');
      const configJson = fs.readFileSync(configPath, 'utf-8');
      const configManager = WorldConfigManager.fromJSON(configJson);
      
      const validation = configManager.validateConfig(configManager.getConfig());
      
      expect(validation.valid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });
    
    it('should have reasonable parameter values', () => {
      const configPath = path.join(__dirname, 'default-config.json');
      const configJson = fs.readFileSync(configPath, 'utf-8');
      const configManager = WorldConfigManager.fromJSON(configJson);
      
      const config = configManager.getConfig();
      
      // Verify chunk parameters are reasonable
      expect(config.chunk.chunkSize).toBeGreaterThan(0);
      expect(config.chunk.chunkSize).toBeLessThan(1000);
      expect(config.chunk.activeRadius).toBeGreaterThan(config.chunk.chunkSize);
      expect(config.chunk.unloadDistance).toBeGreaterThan(config.chunk.activeRadius);
      
      // Verify road parameters are reasonable
      expect(config.generators.road.mainRoadWidth).toBeGreaterThan(config.generators.road.sideRoadWidth);
      expect(config.generators.road.mainRoadProbability).toBeGreaterThanOrEqual(0);
      expect(config.generators.road.mainRoadProbability).toBeLessThanOrEqual(1);
      
      // Verify building parameters are reasonable
      expect(config.generators.building.minHeight).toBeGreaterThan(0);
      expect(config.generators.building.maxHeight).toBeGreaterThan(config.generators.building.minHeight);
      expect(config.generators.building.minWidth).toBeGreaterThan(0);
      expect(config.generators.building.maxWidth).toBeGreaterThan(config.generators.building.minWidth);
      
      // Verify traffic parameters are reasonable
      expect(config.generators.traffic.intersectionSignProbability).toBeGreaterThanOrEqual(0);
      expect(config.generators.traffic.intersectionSignProbability).toBeLessThanOrEqual(1);
      
      // Verify vehicle parameters are reasonable
      expect(config.generators.vehicle.density).toBeGreaterThanOrEqual(0);
      expect(config.generators.vehicle.density).toBeLessThanOrEqual(1);
    });
  });
});
