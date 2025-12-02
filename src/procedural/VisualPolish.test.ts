/**
 * Visual Polish Tests
 * Tests for visual improvements to procedural generation
 * Validates: Task 23 - Polish and visual improvements
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as BABYLON from '@babylonjs/core';
import { ChunkManager } from './ChunkManager';
import { BuildingGenerator } from './BuildingGenerator';
import defaultConfig from './default-config.json';

describe('Visual Polish Tests', () => {
  let engine: BABYLON.NullEngine;
  let scene: BABYLON.Scene;
  let chunkManager: ChunkManager;

  beforeEach(() => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    
    chunkManager = new ChunkManager();
    chunkManager.initialize(scene, defaultConfig.chunk);
  });

  describe('Building Style Variety', () => {
    it('should have at least 8 building styles available', () => {
      const buildingGen = new BuildingGenerator();
      buildingGen.configure(defaultConfig.generators.building);
      
      // Check that we have the new styles
      const styles = defaultConfig.generators.building.styles;
      expect(styles.length).toBeGreaterThanOrEqual(8);
      
      // Verify new styles exist
      const styleNames = styles.map((s: any) => s.name);
      expect(styleNames).toContain('glass-tower');
      expect(styleNames).toContain('brick');
      expect(styleNames).toContain('concrete');
      expect(styleNames).toContain('colorful');
    });

    it('should have building styles with varied properties', () => {
      const styles = defaultConfig.generators.building.styles;
      
      // Check that styles have different roof types
      const roofTypes = new Set(styles.map((s: any) => s.roofType));
      expect(roofTypes.size).toBeGreaterThan(1);
      
      // Check that styles have different window patterns
      const windowPatterns = new Set(styles.map((s: any) => s.windowPattern));
      expect(windowPatterns.size).toBeGreaterThan(1);
    });
  });

  describe('Material Quality', () => {
    it('should have enhanced building material configuration', () => {
      // Verify building styles have proper color palettes
      const styles = defaultConfig.generators.building.styles;
      
      for (const style of styles) {
        expect(style.colorPalette).toBeDefined();
        expect(style.colorPalette.length).toBeGreaterThan(0);
        
        // Each color should be a valid hex color
        for (const color of style.colorPalette) {
          expect(color).toMatch(/^#[0-9A-F]{6}$/i);
        }
      }
    });

    it('should have enhanced road configuration', () => {
      const roadConfig = defaultConfig.generators.road;
      
      // Check that road widths are improved
      expect(roadConfig.mainRoadWidth).toBeGreaterThanOrEqual(12);
      expect(roadConfig.sideRoadWidth).toBeGreaterThanOrEqual(8);
      
      // Check that lane markings are configured
      expect(roadConfig.centerLineWidth).toBeGreaterThan(0);
      expect(roadConfig.edgeLineWidth).toBeGreaterThan(0);
    });

    it('should have enhanced vehicle configuration', () => {
      const vehicleConfig = defaultConfig.generators.vehicle;
      
      // Check vehicle dimensions are defined for all types
      expect(vehicleConfig.dimensions).toBeDefined();
      expect(Object.keys(vehicleConfig.dimensions).length).toBeGreaterThanOrEqual(5);
      
      // Check color palette is expanded
      expect(vehicleConfig.colorPalette.length).toBeGreaterThanOrEqual(12);
    });

    it('should have enhanced traffic sign configuration', () => {
      const trafficConfig = defaultConfig.generators.traffic;
      
      // Check sign dimensions are improved
      expect(trafficConfig.signHeight).toBeGreaterThanOrEqual(3);
      expect(trafficConfig.signSize).toBeGreaterThanOrEqual(1);
      
      // Check variety in sign types
      expect(trafficConfig.types.length).toBeGreaterThanOrEqual(7);
    });
  });

  describe('Visual Parameters', () => {
    it('should use improved generation parameters', () => {
      // Check road parameters
      expect(defaultConfig.generators.road.mainRoadWidth).toBeGreaterThanOrEqual(14);
      expect(defaultConfig.generators.road.sideRoadWidth).toBeGreaterThanOrEqual(9);
      
      // Check building parameters
      expect(defaultConfig.generators.building.maxHeight).toBeGreaterThanOrEqual(60);
      expect(defaultConfig.generators.building.density).toBeGreaterThanOrEqual(18);
      
      // Check traffic parameters
      expect(defaultConfig.generators.traffic.signHeight).toBeGreaterThanOrEqual(3.5);
      expect(defaultConfig.generators.traffic.signSize).toBeGreaterThanOrEqual(1.2);
      
      // Check vehicle parameters
      expect(defaultConfig.generators.vehicle.density).toBeGreaterThanOrEqual(0.4);
    });
  });

  describe('Cross-Area Consistency', () => {
    it('should have consistent configuration across all generators', () => {
      // Verify all generators have proper configuration
      expect(defaultConfig.generators.road).toBeDefined();
      expect(defaultConfig.generators.building).toBeDefined();
      expect(defaultConfig.generators.traffic).toBeDefined();
      expect(defaultConfig.generators.vehicle).toBeDefined();
      
      // Verify variation parameters are set
      expect(defaultConfig.generators.building.scaleVariation).toBeGreaterThan(0);
      expect(defaultConfig.generators.building.rotationVariation).toBeGreaterThan(0);
      expect(defaultConfig.generators.traffic.scaleVariation).toBeGreaterThan(0);
      expect(defaultConfig.generators.vehicle.scaleVariation).toBeGreaterThan(0);
    });
  });

  describe('Color Variety', () => {
    it('should have expanded vehicle color palette', () => {
      const colorPalette = defaultConfig.generators.vehicle.colorPalette;
      
      // Should have at least 16 colors
      expect(colorPalette.length).toBeGreaterThanOrEqual(16);
      
      // Should include new vibrant colors
      expect(colorPalette).toContain('#FF6B6B');
      expect(colorPalette).toContain('#4ECDC4');
      expect(colorPalette).toContain('#95E1D3');
      expect(colorPalette).toContain('#F38181');
    });

    it('should have varied building colors across styles', () => {
      const styles = defaultConfig.generators.building.styles;
      
      // Collect all unique colors
      const allColors = new Set<string>();
      for (const style of styles) {
        for (const color of style.colorPalette) {
          allColors.add(color);
        }
      }
      
      // Should have significant color variety
      expect(allColors.size).toBeGreaterThan(20);
    });
  });
});
