/**
 * Error Handling and Logging Utilities
 * Provides centralized error handling and logging for procedural generation
 * Validates: Requirement - Add logging for debugging
 */

/**
 * Log levels for filtering output
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

/**
 * Logger class for procedural generation system
 * Provides structured logging with levels and context
 */
export class Logger {
  private static currentLevel: LogLevel = LogLevel.INFO;
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  /**
   * Set global log level
   */
  public static setLogLevel(level: LogLevel): void {
    Logger.currentLevel = level;
  }

  /**
   * Get current log level
   */
  public static getLogLevel(): LogLevel {
    return Logger.currentLevel;
  }

  /**
   * Log debug message
   */
  public debug(message: string, ...args: any[]): void {
    if (Logger.currentLevel <= LogLevel.DEBUG) {
      console.log(`[DEBUG][${this.context}] ${message}`, ...args);
    }
  }

  /**
   * Log info message
   */
  public info(message: string, ...args: any[]): void {
    if (Logger.currentLevel <= LogLevel.INFO) {
      console.log(`[INFO][${this.context}] ${message}`, ...args);
    }
  }

  /**
   * Log warning message
   */
  public warn(message: string, ...args: any[]): void {
    if (Logger.currentLevel <= LogLevel.WARN) {
      console.warn(`[WARN][${this.context}] ${message}`, ...args);
    }
  }

  /**
   * Log error message
   */
  public error(message: string, ...args: any[]): void {
    if (Logger.currentLevel <= LogLevel.ERROR) {
      console.error(`[ERROR][${this.context}] ${message}`, ...args);
    }
  }
}

/**
 * Custom error types for procedural generation
 */

/**
 * Error thrown when configuration is invalid
 */
export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

/**
 * Error thrown when generation fails
 */
export class GenerationError extends Error {
  public readonly chunkX?: number;
  public readonly chunkZ?: number;
  public readonly generatorName?: string;

  constructor(message: string, chunkX?: number, chunkZ?: number, generatorName?: string) {
    super(message);
    this.name = 'GenerationError';
    this.chunkX = chunkX;
    this.chunkZ = chunkZ;
    this.generatorName = generatorName;
  }
}

/**
 * Error thrown when validation fails
 */
export class ValidationError extends Error {
  public readonly errors: string[];

  constructor(message: string, errors: string[]) {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

/**
 * Error thrown when resource disposal fails
 */
export class ResourceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ResourceError';
  }
}

/**
 * Graceful degradation handler
 * Provides fallback behavior when generation fails
 */
export class GracefulDegradation {
  private static logger = new Logger('GracefulDegradation');

  /**
   * Handle generation failure with fallback
   * @param error - The error that occurred
   * @param context - Context information
   * @param fallback - Fallback function to execute
   * @returns Result from fallback or null
   */
  public static handleGenerationFailure<T>(
    error: Error,
    context: string,
    fallback?: () => T
  ): T | null {
    this.logger.error(`Generation failure in ${context}:`, error);

    if (fallback) {
      try {
        this.logger.info(`Attempting fallback for ${context}`);
        return fallback();
      } catch (fallbackError) {
        this.logger.error(`Fallback also failed for ${context}:`, fallbackError);
        return null;
      }
    }

    return null;
  }

  /**
   * Retry operation with exponential backoff
   * @param operation - Operation to retry
   * @param maxRetries - Maximum number of retries
   * @param context - Context for logging
   * @returns Result of operation or throws after max retries
   */
  public static async retryWithBackoff<T>(
    operation: () => Promise<T> | T,
    maxRetries: number = 3,
    context: string = 'operation'
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        this.logger.debug(`Attempt ${attempt + 1}/${maxRetries + 1} for ${context}`);
        return await operation();
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(`Attempt ${attempt + 1} failed for ${context}:`, error);

        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 100; // Exponential backoff
          this.logger.debug(`Waiting ${delay}ms before retry`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`${context} failed after ${maxRetries + 1} attempts: ${lastError?.message}`);
  }
}

/**
 * Input validation utilities
 */
export class Validator {
  /**
   * Validate that a number is finite
   */
  public static isFiniteNumber(value: any, name: string): void {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new ValidationError(
        `${name} must be a finite number`,
        [`${name} = ${value} is not a finite number`]
      );
    }
  }

  /**
   * Validate that a number is in range
   */
  public static isInRange(value: number, min: number, max: number, name: string): void {
    this.isFiniteNumber(value, name);
    if (value < min || value > max) {
      throw new ValidationError(
        `${name} must be between ${min} and ${max}`,
        [`${name} = ${value} is outside range [${min}, ${max}]`]
      );
    }
  }

  /**
   * Validate that a number is positive
   */
  public static isPositive(value: number, name: string): void {
    this.isFiniteNumber(value, name);
    if (value <= 0) {
      throw new ValidationError(
        `${name} must be positive`,
        [`${name} = ${value} is not positive`]
      );
    }
  }

  /**
   * Validate that a number is non-negative
   */
  public static isNonNegative(value: number, name: string): void {
    this.isFiniteNumber(value, name);
    if (value < 0) {
      throw new ValidationError(
        `${name} must be non-negative`,
        [`${name} = ${value} is negative`]
      );
    }
  }

  /**
   * Validate that an array is not empty
   */
  public static isNonEmptyArray<T>(value: any, name: string): asserts value is T[] {
    if (!Array.isArray(value)) {
      throw new ValidationError(
        `${name} must be an array`,
        [`${name} is not an array`]
      );
    }
    if (value.length === 0) {
      throw new ValidationError(
        `${name} cannot be empty`,
        [`${name} is an empty array`]
      );
    }
  }

  /**
   * Validate that a value is not null or undefined
   */
  public static isNotNull<T>(value: T | null | undefined, name: string): asserts value is T {
    if (value === null || value === undefined) {
      throw new ValidationError(
        `${name} cannot be null or undefined`,
        [`${name} is ${value}`]
      );
    }
  }
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  private static measurements: Map<string, number[]> = new Map();
  private static logger = new Logger('PerformanceMonitor');

  /**
   * Start timing an operation
   */
  public static start(name: string): () => void {
    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;

      if (!this.measurements.has(name)) {
        this.measurements.set(name, []);
      }

      const measurements = this.measurements.get(name)!;
      measurements.push(duration);

      // Keep only last 100 measurements
      if (measurements.length > 100) {
        measurements.shift();
      }

      return duration;
    };
  }

  /**
   * Get statistics for an operation
   */
  public static getStats(name: string): {
    count: number;
    average: number;
    min: number;
    max: number;
    last: number;
  } | null {
    const measurements = this.measurements.get(name);
    if (!measurements || measurements.length === 0) {
      return null;
    }

    const sum = measurements.reduce((a, b) => a + b, 0);
    const average = sum / measurements.length;
    const min = Math.min(...measurements);
    const max = Math.max(...measurements);
    const last = measurements[measurements.length - 1];

    return { count: measurements.length, average, min, max, last };
  }

  /**
   * Log statistics for all operations
   */
  public static logAllStats(): void {
    this.logger.info('Performance Statistics:');
    for (const [name, _] of this.measurements) {
      const stats = this.getStats(name);
      if (stats) {
        this.logger.info(
          `  ${name}: avg=${stats.average.toFixed(2)}ms, min=${stats.min.toFixed(2)}ms, max=${stats.max.toFixed(2)}ms, count=${stats.count}`
        );
      }
    }
  }

  /**
   * Clear all measurements
   */
  public static clear(): void {
    this.measurements.clear();
  }
}
