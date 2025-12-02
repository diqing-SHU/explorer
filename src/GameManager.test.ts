import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as BABYLON from '@babylonjs/core';
import { GameManager } from './GameManager';

describe('GameManager Integration with Procedural Generation', () => {
  let gameManager: GameManager;
  let canvas: HTMLCanvasElement;
  let testEngine: BABYLON.NullEngine;

  beforeEach(() => {
    // Create test engine
    testEngine = new BABYLON.NullEngine();
    
    // Create a mock canvas
    canvas = document.createElement('canvas');
    canvas.id = 'renderCanvas';
    document.body.appendChild(canvas);

    // Create loading and error elements
    const loading = document.createElement('div');
    loading.id = 'loading';
    loading.style.display = 'none';
    document.body.appendChild(loading);

    const error = document.createElement('div');
    error.id = 'error';
    error.style.display = 'none';
    document.body.appendChild(error);

    const errorMessage = document.createElement('div');
    errorMessage.id = 'errorMessage';
    error.appendChild(errorMessage);

    // Create game manager
    gameManager = new GameManager();
  });

  afterEach(() => {
    if (gameManager) {
      gameManager.dispose();
    }
    if (testEngine) {
      testEngine.dispose();
    }
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  describe('ChunkManager Integration', () => {
    it('should initialize ChunkManager when procedural generation is enabled', async () => {
      // Initialize game
      gameManager.initialize(canvas, testEngine);

      // Enable procedural generation
      await gameManager.enableProceduralGeneration();

      // Verify ChunkManager is initialized
      const chunkManager = gameManager.getChunkManager();
      expect(chunkManager).toBeDefined();
      expect(chunkManager).not.toBeNull();
    });

    it('should throw error when accessing ChunkManager before initialization', () => {
      gameManager.initialize(canvas, testEngine);

      expect(() => gameManager.getChunkManager()).toThrow('ChunkManager not initialized');
    });

    it('should dispose ChunkManager when procedural generation is disabled', async () => {
      gameManager.initialize(canvas, testEngine);
      await gameManager.enableProceduralGeneration();

      const chunkManager = gameManager.getChunkManager();
      const disposeSpy = vi.spyOn(chunkManager, 'dispose');

      gameManager.disableProceduralGeneration();

      expect(disposeSpy).toHaveBeenCalled();
      expect(gameManager.isProceduralGenerationEnabled()).toBe(false);
    });

    it('should update ChunkManager in game loop when enabled', async () => {
      gameManager.initialize(canvas, testEngine);
      await gameManager.enableProceduralGeneration();

      const chunkManager = gameManager.getChunkManager();
      const updateSpy = vi.spyOn(chunkManager, 'update');

      gameManager.start();

      // Trigger a render frame
      const scene = gameManager.getScene();
      scene.render();

      expect(updateSpy).toHaveBeenCalled();

      gameManager.stop();
    });

    it('should not update ChunkManager when procedural generation is disabled', async () => {
      gameManager.initialize(canvas, testEngine);
      await gameManager.enableProceduralGeneration();
      const chunkManager = gameManager.getChunkManager();
      const updateSpy = vi.spyOn(chunkManager, 'update');

      gameManager.disableProceduralGeneration();
      gameManager.start();

      // Trigger a render frame
      const scene = gameManager.getScene();
      scene.render();

      expect(updateSpy).not.toHaveBeenCalled();

      gameManager.stop();
    });
  });

  describe('PlayerController Integration', () => {
    it('should pass player position to ChunkManager update', async () => {
      gameManager.initialize(canvas, testEngine);
      await gameManager.enableProceduralGeneration();

      const chunkManager = gameManager.getChunkManager();
      const playerController = gameManager.getPlayerController();
      const updateSpy = vi.spyOn(chunkManager, 'update');

      gameManager.start();

      // Trigger a render frame
      const scene = gameManager.getScene();
      scene.render();

      // Verify update was called with player position
      expect(updateSpy).toHaveBeenCalled();
      const callArgs = updateSpy.mock.calls[0];
      expect(callArgs[0]).toBeInstanceOf(BABYLON.Vector3);

      // Verify position matches player camera position
      const playerPosition = playerController.getCamera().position;
      expect(callArgs[0].x).toBe(playerPosition.x);
      expect(callArgs[0].y).toBe(playerPosition.y);
      expect(callArgs[0].z).toBe(playerPosition.z);

      gameManager.stop();
    });
  });

  describe('EnvironmentManager Compatibility', () => {
    it('should work alongside EnvironmentManager without conflicts', async () => {
      gameManager.initialize(canvas, testEngine);

      // Load static environment
      const envConfig = {
        terrain: {
          width: 100,
          depth: 100
        },
        buildings: [],
        lighting: {
          ambient: {
            color: '#FFFFFF',
            intensity: 0.5
          },
          directional: {
            color: '#FFFFFF',
            intensity: 0.8,
            direction: [0, -1, 0] as [number, number, number]
          }
        }
      };
      gameManager.loadEnvironment(envConfig);

      // Enable procedural generation
      await gameManager.enableProceduralGeneration();

      // Verify both managers are initialized
      const environmentManager = gameManager.getEnvironmentManager();
      const chunkManager = gameManager.getChunkManager();

      expect(environmentManager).toBeDefined();
      expect(chunkManager).toBeDefined();

      // Verify terrain from EnvironmentManager exists
      const terrain = environmentManager.getTerrain();
      expect(terrain).not.toBeNull();
    });

    it('should dispose both managers correctly', async () => {
      gameManager.initialize(canvas, testEngine);

      const envConfig = {
        terrain: { width: 100, depth: 100 },
        buildings: [],
        lighting: {
          ambient: { color: '#FFFFFF', intensity: 0.5 },
          directional: { color: '#FFFFFF', intensity: 0.8, direction: [0, -1, 0] as [number, number, number] }
        }
      };
      gameManager.loadEnvironment(envConfig);
      await gameManager.enableProceduralGeneration();

      const environmentManager = gameManager.getEnvironmentManager();
      const chunkManager = gameManager.getChunkManager();

      const envDisposeSpy = vi.spyOn(environmentManager, 'dispose');
      const chunkDisposeSpy = vi.spyOn(chunkManager, 'dispose');

      gameManager.dispose();

      expect(envDisposeSpy).toHaveBeenCalled();
      expect(chunkDisposeSpy).toHaveBeenCalled();
    });
  });

  describe('Physics Compatibility', () => {
    it('should maintain physics engine compatibility', async () => {
      gameManager.initialize(canvas, testEngine);
      await gameManager.enableProceduralGeneration();

      const scene = gameManager.getScene();

      // Verify physics is enabled
      expect(scene.isPhysicsEnabled()).toBe(true);

      // Verify physics plugin is set
      const physicsEngine = scene.getPhysicsEngine();
      expect(physicsEngine).toBeDefined();
      expect(physicsEngine).not.toBeNull();
    });
  });

  describe('Scene Graph Integration', () => {
    it('should add generated objects to scene graph', async () => {
      gameManager.initialize(canvas, testEngine);
      await gameManager.enableProceduralGeneration();

      const scene = gameManager.getScene();
      const chunkManager = gameManager.getChunkManager();

      // Force generate a chunk
      const chunk = chunkManager.generateChunk(0, 0);

      // Verify chunk has meshes
      expect(chunk.meshes.length).toBeGreaterThan(0);

      // Verify meshes are in scene
      for (const mesh of chunk.meshes) {
        expect(scene.meshes).toContain(mesh);
      }
    });
  });

  describe('WorldConfigManager Integration', () => {
    it('should use default config when none provided', async () => {
      gameManager.initialize(canvas, testEngine);
      await gameManager.enableProceduralGeneration();

      const worldConfigManager = gameManager.getWorldConfigManager();
      expect(worldConfigManager).toBeDefined();

      const config = worldConfigManager.getConfig();
      expect(config.chunk.chunkSize).toBe(100);
      expect(config.chunk.seed).toBe(12345);
    });

    it('should use custom config when provided', async () => {
      gameManager.initialize(canvas, testEngine);

      // Import WorldConfigManager
      const { WorldConfigManager } = await import('./procedural');
      const customConfig = new WorldConfigManager({
        chunk: {
          chunkSize: 200,
          activeRadius: 400,
          unloadDistance: 600,
          seed: 99999,
          generationOrder: ['RoadGenerator']
        }
      });

      await gameManager.enableProceduralGeneration(customConfig);

      const worldConfigManager = gameManager.getWorldConfigManager();
      const config = worldConfigManager.getConfig();

      expect(config.chunk.chunkSize).toBe(200);
      expect(config.chunk.seed).toBe(99999);
    });
  });
});
