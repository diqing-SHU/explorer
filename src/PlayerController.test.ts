import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PlayerController } from './PlayerController';
import * as BABYLON from '@babylonjs/core';
import * as CANNON from 'cannon';

describe('PlayerController', () => {
  let playerController: PlayerController;
  let canvas: HTMLCanvasElement;
  let engine: BABYLON.Engine;
  let scene: BABYLON.Scene;

  beforeEach(() => {
    // Create a canvas element
    canvas = document.createElement('canvas');
    canvas.id = 'testCanvas';
    document.body.appendChild(canvas);

    // Create engine and scene
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);

    // Enable physics for tests
    const gravityVector = new BABYLON.Vector3(0, -9.81, 0);
    const physicsPlugin = new BABYLON.CannonJSPlugin(true, 10, CANNON);
    scene.enablePhysics(gravityVector, physicsPlugin);
  });

  afterEach(() => {
    if (playerController) {
      try {
        playerController.dispose();
      } catch (e) {
        // Ignore disposal errors in tests
      }
    }
    if (scene) {
      scene.dispose();
    }
    if (engine) {
      engine.dispose();
    }
    document.body.innerHTML = '';
  });

  it('should throw error if getting camera before initialization', () => {
    playerController = new PlayerController();
    expect(() => playerController.getCamera()).toThrow('PlayerController not initialized');
  });

  it('should initialize with UniversalCamera at specified position', () => {
    playerController = new PlayerController();
    const startPosition = new BABYLON.Vector3(5, 10, -15);
    
    playerController.initialize(scene, startPosition);
    
    const camera = playerController.getCamera();
    expect(camera).toBeInstanceOf(BABYLON.UniversalCamera);
    expect(camera.position.x).toBe(5);
    expect(camera.position.y).toBe(10);
    expect(camera.position.z).toBe(-15);
  });

  it('should configure camera with correct FOV', () => {
    playerController = new PlayerController();
    const startPosition = new BABYLON.Vector3(0, 2, -10);
    
    playerController.initialize(scene, startPosition);
    
    const camera = playerController.getCamera();
    expect(camera.fov).toBeCloseTo(Math.PI / 3, 5); // 60 degrees
  });

  it('should configure camera with correct near and far planes', () => {
    playerController = new PlayerController();
    const startPosition = new BABYLON.Vector3(0, 2, -10);
    
    playerController.initialize(scene, startPosition);
    
    const camera = playerController.getCamera();
    expect(camera.minZ).toBe(0.1);
    expect(camera.maxZ).toBe(1000);
  });

  it('should configure camera with movement speed', () => {
    playerController = new PlayerController();
    const startPosition = new BABYLON.Vector3(0, 2, -10);
    
    playerController.initialize(scene, startPosition);
    
    const camera = playerController.getCamera();
    expect(camera.speed).toBe(0.5);
  });

  it('should configure WASD keyboard controls', () => {
    playerController = new PlayerController();
    const startPosition = new BABYLON.Vector3(0, 2, -10);
    
    playerController.initialize(scene, startPosition);
    
    const camera = playerController.getCamera();
    expect(camera.keysUp).toContain(87); // W key
    expect(camera.keysDown).toContain(83); // S key
    expect(camera.keysLeft).toContain(65); // A key
    expect(camera.keysRight).toContain(68); // D key
  });

  it('should set camera as active camera in scene', () => {
    playerController = new PlayerController();
    const startPosition = new BABYLON.Vector3(0, 2, -10);
    
    playerController.initialize(scene, startPosition);
    
    const camera = playerController.getCamera();
    expect(scene.activeCamera).toBe(camera);
  });

  it('should configure angular sensitivity for mouse look', () => {
    playerController = new PlayerController();
    const startPosition = new BABYLON.Vector3(0, 2, -10);
    
    playerController.initialize(scene, startPosition);
    
    const camera = playerController.getCamera();
    expect(camera.angularSensibility).toBe(1000);
  });

  it('should return false for isGrounded before physics implementation', () => {
    playerController = new PlayerController();
    const startPosition = new BABYLON.Vector3(0, 2, -10);
    
    playerController.initialize(scene, startPosition);
    
    expect(playerController.isGrounded()).toBe(false);
  });

  it('should handle update calls without errors', () => {
    playerController = new PlayerController();
    const startPosition = new BABYLON.Vector3(0, 2, -10);
    
    playerController.initialize(scene, startPosition);
    
    expect(() => playerController.update(0.016)).not.toThrow();
  });

  it('should handle jump calls without errors', () => {
    playerController = new PlayerController();
    const startPosition = new BABYLON.Vector3(0, 2, -10);
    
    playerController.initialize(scene, startPosition);
    
    expect(() => playerController.jump()).not.toThrow();
  });

  it('should dispose camera properly', () => {
    playerController = new PlayerController();
    const startPosition = new BABYLON.Vector3(0, 2, -10);
    
    playerController.initialize(scene, startPosition);
    
    expect(() => playerController.dispose()).not.toThrow();
    expect(() => playerController.getCamera()).toThrow('PlayerController not initialized');
  });

  it('should create physics imposter for player', () => {
    playerController = new PlayerController();
    const startPosition = new BABYLON.Vector3(0, 2, -10);
    
    playerController.initialize(scene, startPosition);
    
    const physicsImpostor = playerController.getPhysicsImpostor();
    expect(physicsImpostor).toBeDefined();
    expect(physicsImpostor.type).toBe(BABYLON.PhysicsImpostor.SphereImpostor);
  });

  it('should configure physics imposter with correct properties', () => {
    playerController = new PlayerController();
    const startPosition = new BABYLON.Vector3(0, 2, -10);
    
    playerController.initialize(scene, startPosition);
    
    const physicsImpostor = playerController.getPhysicsImpostor();
    expect(physicsImpostor.mass).toBe(1);
    expect(physicsImpostor.friction).toBe(0.5);
    expect(physicsImpostor.restitution).toBe(0.0);
  });
});
