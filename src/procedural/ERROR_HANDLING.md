# Error Handling and Robustness Guide

This document describes the error handling and robustness features implemented in the procedural world generation system.

## Overview

The system implements comprehensive error handling to ensure:
- **Graceful degradation**: Non-critical failures don't crash the entire system
- **Detailed logging**: All errors are logged with context for debugging
- **Input validation**: All inputs are validated before processing
- **Resource cleanup**: Resources are properly disposed even when errors occur
- **Edge case handling**: Extreme values and edge cases are handled safely

## Error Types

### Custom Error Classes

The system defines several custom error types for better error categorization:

```typescript
// Configuration errors
throw new ConfigurationError('Invalid chunk size');

// Generation errors with context
throw new GenerationError('Failed to generate', chunkX, chunkZ, 'RoadGenerator');

// Validation errors with details
throw new ValidationError('Invalid input', ['error1', 'error2']);

// Resource disposal errors
throw new ResourceError('Failed to dispose mesh');
```

### Error Severity Levels

Errors are categorized by severity:

1. **Critical Errors**: Cause generation to fail completely (e.g., RoadGenerator failure)
2. **Non-Critical Errors**: Allow partial generation (e.g., BuildingGenerator failure)
3. **Warnings**: Logged but don't affect generation (e.g., slow performance)

## Logging System

### Log Levels

The system supports multiple log levels:

```typescript
import { Logger, LogLevel } from './ErrorHandling';

// Set global log level
Logger.setLogLevel(LogLevel.DEBUG);  // Show all messages
Logger.setLogLevel(LogLevel.INFO);   // Show info, warnings, and errors
Logger.setLogLevel(LogLevel.WARN);   // Show warnings and errors only
Logger.setLogLevel(LogLevel.ERROR);  // Show errors only
Logger.setLogLevel(LogLevel.NONE);   // Disable all logging
```

### Using the Logger

```typescript
import { Logger } from './ErrorHandling';

const logger = new Logger('MyComponent');

logger.debug('Detailed debug information');
logger.info('General information');
logger.warn('Warning message');
logger.error('Error message');
```

## Input Validation

### Validator Utilities

The `Validator` class provides common validation functions:

```typescript
import { Validator } from './ErrorHandling';

// Validate finite numbers
Validator.isFiniteNumber(value, 'parameterName');

// Validate range
Validator.isInRange(value, 0, 100, 'parameterName');

// Validate positive numbers
Validator.isPositive(value, 'parameterName');

// Validate non-negative numbers
Validator.isNonNegative(value, 'parameterName');

// Validate non-empty arrays
Validator.isNonEmptyArray(array, 'parameterName');

// Validate not null/undefined
Validator.isNotNull(value, 'parameterName');
```

## Configuration Validation

### ChunkManager Configuration

The ChunkManager validates all configuration parameters:

```typescript
const config: ChunkConfig = {
  chunkSize: 100,        // Must be positive
  activeRadius: 200,     // Must be positive
  unloadDistance: 300,   // Must be > activeRadius
  seed: 12345,          // Must be finite
  generationOrder: []    // Must be array
};

// Validation happens automatically during initialization
chunkManager.initialize(scene, config);
```

### WorldConfig Validation

The WorldConfigManager validates all generator configurations:

```typescript
const validation = worldConfig.validateConfig(partialConfig);

if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}

if (validation.warnings.length > 0) {
  console.warn('Validation warnings:', validation.warnings);
}
```

## Edge Case Handling

### Extreme Coordinates

The system handles extreme coordinate values safely:

```typescript
// Player position is clamped to safe bounds
const MAX_COORDINATE = 1000000;
if (Math.abs(playerPosition.x) > MAX_COORDINATE) {
  playerPosition.x = Math.max(-MAX_COORDINATE, Math.min(MAX_COORDINATE, playerPosition.x));
}
```

### Invalid Seeds

Seeds are validated and sanitized:

```typescript
// Invalid seeds are replaced with safe defaults
if (!Number.isFinite(seed)) {
  console.warn('Invalid seed, using default');
  seed = 1;
}

// Extreme seeds are wrapped to safe range
if (Math.abs(seed) > Number.MAX_SAFE_INTEGER) {
  seed = seed % Number.MAX_SAFE_INTEGER;
}
```

### Empty Arrays

Empty arrays are handled gracefully:

```typescript
if (positions.length === 0) {
  console.log('No valid positions found, returning empty result');
  return [];
}
```

## Graceful Degradation

### Handling Generation Failures

The system uses graceful degradation to handle failures:

```typescript
import { GracefulDegradation } from './ErrorHandling';

// Handle failure with fallback
const result = GracefulDegradation.handleGenerationFailure(
  error,
  'building generation',
  () => {
    // Fallback: return empty array
    return [];
  }
);
```

### Generator Criticality

Generators are categorized by criticality:

- **Critical**: RoadGenerator (must succeed)
- **Non-Critical**: BuildingGenerator, VehicleGenerator, TrafficGenerator (can fail)

```typescript
if (generatorName === 'RoadGenerator') {
  // Critical generator - throw error
  throw new Error(`Critical generator failed`);
} else {
  // Non-critical - log warning and continue
  console.warn(`Non-critical generator failed, continuing`);
}
```

## Resource Cleanup

### Safe Disposal

Resources are disposed safely even when errors occur:

```typescript
private disposeChunkResources(chunk: Chunk): void {
  try {
    for (const mesh of chunk.meshes) {
      try {
        if (mesh && !mesh.isDisposed()) {
          mesh.dispose();
        }
      } catch (error) {
        console.error('Error disposing mesh:', error);
        // Continue with other meshes
      }
    }
  } catch (error) {
    console.error('Error during resource disposal:', error);
  }
}
```

### Unload Error Handling

Chunk unloading handles errors gracefully:

```typescript
public unloadChunk(chunkX: number, chunkZ: number): void {
  try {
    // Dispose resources
    // ...
  } catch (error) {
    console.error('Error unloading chunk:', error);
    // Try to remove from map anyway to prevent memory leak
    try {
      this.loadedChunks.delete(key);
    } catch (e) {
      console.error('Failed to remove chunk from map:', e);
    }
  }
}
```

## Performance Monitoring

### Tracking Performance

The `PerformanceMonitor` tracks operation performance:

```typescript
import { PerformanceMonitor } from './ErrorHandling';

// Start timing
const end = PerformanceMonitor.start('chunk-generation');

// ... perform operation ...

// End timing (returns duration)
const duration = end();

// Get statistics
const stats = PerformanceMonitor.getStats('chunk-generation');
console.log(`Average: ${stats.average}ms`);
console.log(`Min: ${stats.min}ms, Max: ${stats.max}ms`);
```

### Logging All Stats

```typescript
// Log statistics for all tracked operations
PerformanceMonitor.logAllStats();
```

## Best Practices

### 1. Validate Early

Validate inputs at the entry point of functions:

```typescript
public generate(chunk: Chunk, context: GenerationContext): GeneratedObject[] {
  if (!chunk || !context || !context.scene) {
    throw new Error('Invalid chunk or context');
  }
  // ... rest of function
}
```

### 2. Use Try-Catch Blocks

Wrap critical operations in try-catch blocks:

```typescript
try {
  // Critical operation
  const result = this.generateContent();
} catch (error) {
  console.error('Generation failed:', error);
  throw new Error(`Failed to generate - ${error}`);
}
```

### 3. Log with Context

Always include context in log messages:

```typescript
console.error(`ChunkManager.generateChunk: Failed for chunk (${chunkX}, ${chunkZ}):`, error);
```

### 4. Clean Up on Failure

Always clean up resources when operations fail:

```typescript
try {
  this.executeGenerators(chunk);
} catch (error) {
  // Remove partially generated chunk
  this.loadedChunks.delete(key);
  // Dispose any created resources
  this.disposeChunkResources(chunk);
  throw error;
}
```

### 5. Provide Fallbacks

Provide fallback behavior for non-critical failures:

```typescript
if (positions.length === 0) {
  console.warn('No valid positions, using fallback');
  return this.generateFallbackPositions();
}
```

## Debugging

### Enable Debug Logging

```typescript
import { Logger, LogLevel } from './ErrorHandling';

// Enable debug logging
Logger.setLogLevel(LogLevel.DEBUG);
```

### Monitor Performance

```typescript
import { PerformanceMonitor } from './ErrorHandling';

// Track specific operations
const end = PerformanceMonitor.start('my-operation');
// ... operation ...
end();

// View statistics
PerformanceMonitor.logAllStats();
```

### Check Validation Errors

```typescript
const validation = worldConfig.validateConfig(config);
if (!validation.valid) {
  console.error('Configuration errors:', validation.errors);
}
if (validation.warnings.length > 0) {
  console.warn('Configuration warnings:', validation.warnings);
}
```

## Common Error Scenarios

### Scenario 1: Invalid Configuration

**Problem**: Configuration has invalid values

**Solution**: Validation catches errors during initialization

```typescript
try {
  chunkManager.initialize(scene, config);
} catch (error) {
  console.error('Invalid configuration:', error);
  // Use default configuration
  chunkManager.initialize(scene, defaultConfig);
}
```

### Scenario 2: Generation Timeout

**Problem**: Chunk generation takes too long

**Solution**: System logs warning but continues

```typescript
if (generationTime > 100) {
  console.warn(`Chunk generation took ${generationTime}ms, exceeding 100ms target`);
}
```

### Scenario 3: Resource Disposal Failure

**Problem**: Mesh disposal throws error

**Solution**: Error is caught and logged, other resources still disposed

```typescript
for (const mesh of chunk.meshes) {
  try {
    mesh.dispose();
  } catch (error) {
    console.error('Error disposing mesh:', error);
    // Continue with other meshes
  }
}
```

### Scenario 4: Extreme Player Position

**Problem**: Player position exceeds safe bounds

**Solution**: Position is clamped to safe range

```typescript
const MAX_COORDINATE = 1000000;
if (Math.abs(playerPosition.x) > MAX_COORDINATE) {
  console.warn('Player position exceeds safe bounds, clamping');
  playerPosition.x = Math.max(-MAX_COORDINATE, Math.min(MAX_COORDINATE, playerPosition.x));
}
```

## Testing Error Handling

### Unit Tests

Test error conditions explicitly:

```typescript
it('should throw error for invalid configuration', () => {
  expect(() => {
    chunkManager.initialize(scene, invalidConfig);
  }).toThrow('Invalid configuration');
});
```

### Integration Tests

Test error recovery in integration scenarios:

```typescript
it('should continue after non-critical generator failure', () => {
  // Simulate generator failure
  buildingGenerator.generate = () => { throw new Error('Test error'); };
  
  // Should not throw
  expect(() => {
    chunkManager.generateChunk(0, 0);
  }).not.toThrow();
});
```

## Summary

The error handling system provides:

✅ **Comprehensive validation** of all inputs
✅ **Detailed logging** with context and severity levels
✅ **Graceful degradation** for non-critical failures
✅ **Safe resource cleanup** even when errors occur
✅ **Edge case handling** for extreme values
✅ **Performance monitoring** for debugging
✅ **Custom error types** for better categorization

This ensures the procedural generation system is robust and reliable even in edge cases and error conditions.
