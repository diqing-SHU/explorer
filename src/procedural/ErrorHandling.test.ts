/**
 * Tests for Error Handling and Logging Utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  Logger,
  LogLevel,
  ConfigurationError,
  GenerationError,
  ValidationError,
  ResourceError,
  GracefulDegradation,
  Validator,
  PerformanceMonitor
} from './ErrorHandling';

describe('ErrorHandling', () => {
  describe('Logger', () => {
    let logger: Logger;
    let consoleLogSpy: any;
    let consoleWarnSpy: any;
    let consoleErrorSpy: any;

    beforeEach(() => {
      logger = new Logger('TestContext');
      consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      Logger.setLogLevel(LogLevel.DEBUG);
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
      consoleWarnSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should log debug messages when level is DEBUG', () => {
      Logger.setLogLevel(LogLevel.DEBUG);
      logger.debug('test message');
      expect(consoleLogSpy).toHaveBeenCalledWith('[DEBUG][TestContext] test message');
    });

    it('should not log debug messages when level is INFO', () => {
      Logger.setLogLevel(LogLevel.INFO);
      logger.debug('test message');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should log info messages when level is INFO', () => {
      Logger.setLogLevel(LogLevel.INFO);
      logger.info('test message');
      expect(consoleLogSpy).toHaveBeenCalledWith('[INFO][TestContext] test message');
    });

    it('should log warning messages', () => {
      Logger.setLogLevel(LogLevel.WARN);
      logger.warn('test warning');
      expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN][TestContext] test warning');
    });

    it('should log error messages', () => {
      Logger.setLogLevel(LogLevel.ERROR);
      logger.error('test error');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR][TestContext] test error');
    });

    it('should not log anything when level is NONE', () => {
      Logger.setLogLevel(LogLevel.NONE);
      logger.debug('debug');
      logger.info('info');
      logger.warn('warn');
      logger.error('error');
      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('Custom Error Types', () => {
    it('should create ConfigurationError', () => {
      const error = new ConfigurationError('Invalid config');
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('ConfigurationError');
      expect(error.message).toBe('Invalid config');
    });

    it('should create GenerationError with chunk coordinates', () => {
      const error = new GenerationError('Generation failed', 1, 2, 'TestGenerator');
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('GenerationError');
      expect(error.message).toBe('Generation failed');
      expect(error.chunkX).toBe(1);
      expect(error.chunkZ).toBe(2);
      expect(error.generatorName).toBe('TestGenerator');
    });

    it('should create ValidationError with errors array', () => {
      const errors = ['error1', 'error2'];
      const error = new ValidationError('Validation failed', errors);
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('ValidationError');
      expect(error.errors).toEqual(errors);
    });

    it('should create ResourceError', () => {
      const error = new ResourceError('Resource disposal failed');
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('ResourceError');
    });
  });

  describe('GracefulDegradation', () => {
    it('should handle generation failure and call fallback', () => {
      const error = new Error('Test error');
      const fallback = vi.fn(() => 'fallback result');
      
      const result = GracefulDegradation.handleGenerationFailure(
        error,
        'test context',
        fallback
      );

      expect(result).toBe('fallback result');
      expect(fallback).toHaveBeenCalled();
    });

    it('should return null if no fallback provided', () => {
      const error = new Error('Test error');
      
      const result = GracefulDegradation.handleGenerationFailure(
        error,
        'test context'
      );

      expect(result).toBeNull();
    });

    it('should return null if fallback also fails', () => {
      const error = new Error('Test error');
      const fallback = vi.fn(() => {
        throw new Error('Fallback error');
      });
      
      const result = GracefulDegradation.handleGenerationFailure(
        error,
        'test context',
        fallback
      );

      expect(result).toBeNull();
    });
  });

  describe('Validator', () => {
    it('should validate finite numbers', () => {
      expect(() => Validator.isFiniteNumber(42, 'value')).not.toThrow();
      expect(() => Validator.isFiniteNumber(Infinity, 'value')).toThrow(ValidationError);
      expect(() => Validator.isFiniteNumber(NaN, 'value')).toThrow(ValidationError);
      expect(() => Validator.isFiniteNumber('not a number' as any, 'value')).toThrow(ValidationError);
    });

    it('should validate range', () => {
      expect(() => Validator.isInRange(5, 0, 10, 'value')).not.toThrow();
      expect(() => Validator.isInRange(0, 0, 10, 'value')).not.toThrow();
      expect(() => Validator.isInRange(10, 0, 10, 'value')).not.toThrow();
      expect(() => Validator.isInRange(-1, 0, 10, 'value')).toThrow(ValidationError);
      expect(() => Validator.isInRange(11, 0, 10, 'value')).toThrow(ValidationError);
    });

    it('should validate positive numbers', () => {
      expect(() => Validator.isPositive(1, 'value')).not.toThrow();
      expect(() => Validator.isPositive(0.1, 'value')).not.toThrow();
      expect(() => Validator.isPositive(0, 'value')).toThrow(ValidationError);
      expect(() => Validator.isPositive(-1, 'value')).toThrow(ValidationError);
    });

    it('should validate non-negative numbers', () => {
      expect(() => Validator.isNonNegative(0, 'value')).not.toThrow();
      expect(() => Validator.isNonNegative(1, 'value')).not.toThrow();
      expect(() => Validator.isNonNegative(-1, 'value')).toThrow(ValidationError);
    });

    it('should validate non-empty arrays', () => {
      expect(() => Validator.isNonEmptyArray([1, 2, 3], 'value')).not.toThrow();
      expect(() => Validator.isNonEmptyArray([], 'value')).toThrow(ValidationError);
      expect(() => Validator.isNonEmptyArray('not an array' as any, 'value')).toThrow(ValidationError);
    });

    it('should validate not null', () => {
      expect(() => Validator.isNotNull(42, 'value')).not.toThrow();
      expect(() => Validator.isNotNull('string', 'value')).not.toThrow();
      expect(() => Validator.isNotNull(null, 'value')).toThrow(ValidationError);
      expect(() => Validator.isNotNull(undefined, 'value')).toThrow(ValidationError);
    });
  });

  describe('PerformanceMonitor', () => {
    beforeEach(() => {
      PerformanceMonitor.clear();
    });

    it('should measure operation duration', () => {
      const end = PerformanceMonitor.start('test-operation');
      const duration = end();
      
      expect(duration).toBeGreaterThanOrEqual(0);
      
      const stats = PerformanceMonitor.getStats('test-operation');
      expect(stats).not.toBeNull();
      expect(stats!.count).toBe(1);
      expect(stats!.last).toBe(duration);
    });

    it('should track multiple measurements', () => {
      const end1 = PerformanceMonitor.start('test-operation');
      end1();
      
      const end2 = PerformanceMonitor.start('test-operation');
      end2();
      
      const stats = PerformanceMonitor.getStats('test-operation');
      expect(stats).not.toBeNull();
      expect(stats!.count).toBe(2);
    });

    it('should calculate statistics correctly', () => {
      // Manually add measurements
      for (let i = 0; i < 5; i++) {
        const end = PerformanceMonitor.start('test-operation');
        end();
      }
      
      const stats = PerformanceMonitor.getStats('test-operation');
      expect(stats).not.toBeNull();
      expect(stats!.count).toBe(5);
      expect(stats!.average).toBeGreaterThanOrEqual(0);
      expect(stats!.min).toBeLessThanOrEqual(stats!.max);
    });

    it('should return null for unknown operation', () => {
      const stats = PerformanceMonitor.getStats('unknown-operation');
      expect(stats).toBeNull();
    });

    it('should clear all measurements', () => {
      const end = PerformanceMonitor.start('test-operation');
      end();
      
      PerformanceMonitor.clear();
      
      const stats = PerformanceMonitor.getStats('test-operation');
      expect(stats).toBeNull();
    });

    it('should keep only last 100 measurements', () => {
      for (let i = 0; i < 150; i++) {
        const end = PerformanceMonitor.start('test-operation');
        end();
      }
      
      const stats = PerformanceMonitor.getStats('test-operation');
      expect(stats).not.toBeNull();
      expect(stats!.count).toBe(100);
    });
  });
});
