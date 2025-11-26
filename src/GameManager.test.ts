import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GameManager } from './GameManager';
import * as BABYLON from '@babylonjs/core';

describe('GameManager', () => {
  let gameManager: GameManager;
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    // Create error and loading elements
    const errorDiv = document.createElement('div');
    errorDiv.id = 'error';
    errorDiv.style.display = 'none';
    const errorMessage = document.createElement('p');
    errorMessage.id = 'errorMessage';
    errorDiv.appendChild(errorMessage);
    document.body.appendChild(errorDiv);

    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loading';
    document.body.appendChild(loadingDiv);

    // Create a canvas element
    canvas = document.createElement('canvas');
    canvas.id = 'renderCanvas';
    document.body.appendChild(canvas);

    gameManager = new GameManager();
  });

  afterEach(() => {
    if (gameManager) {
      try {
        gameManager.dispose();
      } catch (e) {
        // Ignore disposal errors in tests
      }
    }
    document.body.innerHTML = '';
  });

  // Tests that don't require WebGL
  it('should throw error if starting before initialization', () => {
    expect(() => gameManager.start()).toThrow('GameManager must be initialized before starting');
  });

  it('should throw error if getting scene before initialization', () => {
    expect(() => gameManager.getScene()).toThrow('Scene not initialized');
  });

  it('should throw error if getting engine before initialization', () => {
    expect(() => gameManager.getEngine()).toThrow('Engine not initialized');
  });

  it('should display error message when WebGL is not supported', () => {
    // In jsdom, WebGL is not supported, so initialization should fail gracefully
    try {
      gameManager.initialize(canvas);
    } catch (error) {
      // Expected to throw
    }

    const errorElement = document.getElementById('error');
    const errorMessageElement = document.getElementById('errorMessage');

    expect(errorElement?.style.display).toBe('block');
    expect(errorMessageElement?.textContent).toContain('WebGL');
  });

  it('should hide loading indicator on error', () => {
    const loadingElement = document.getElementById('loading');
    expect(loadingElement).toBeTruthy();

    try {
      gameManager.initialize(canvas);
    } catch (error) {
      // Expected to throw
    }

    expect(loadingElement?.style.display).toBe('none');
  });
});
