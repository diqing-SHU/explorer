/**
 * MeshInstanceManager - Manages mesh instancing for repeated objects
 * Validates: Requirement 8.5
 * 
 * This class provides efficient mesh instancing to reduce draw calls
 * for repeated objects like vehicles, signs, and building components.
 */

import * as BABYLON from '@babylonjs/core';

/**
 * Instance data for a mesh
 */
export interface InstanceData {
  position: BABYLON.Vector3;
  rotation: number;
  scale: BABYLON.Vector3;
  color?: BABYLON.Color3;
}

/**
 * MeshInstanceManager - Manages instanced meshes for performance
 * Validates: Requirement 8.5
 */
export class MeshInstanceManager {
  private scene: BABYLON.Scene;
  private masterMeshes: Map<string, BABYLON.Mesh> = new Map();
  private instances: Map<string, BABYLON.InstancedMesh[]> = new Map();

  constructor(scene: BABYLON.Scene) {
    this.scene = scene;
  }

  /**
   * Register a master mesh for instancing
   * Validates: Requirement 8.5
   * 
   * @param name - Unique name for this mesh type
   * @param mesh - Master mesh to instance from
   */
  public registerMasterMesh(name: string, mesh: BABYLON.Mesh): void {
    if (this.masterMeshes.has(name)) {
      console.warn(`Master mesh "${name}" already registered, overwriting`);
    }

    // Make master mesh invisible (only instances will be visible)
    mesh.isVisible = false;
    
    this.masterMeshes.set(name, mesh);
    this.instances.set(name, []);
    
    console.log(`Registered master mesh: ${name}`);
  }

  /**
   * Create an instance of a registered mesh
   * Validates: Requirement 8.5
   * 
   * @param name - Name of the master mesh
   * @param data - Instance data (position, rotation, scale, color)
   * @returns The created instance or null if master mesh not found
   */
  public createInstance(name: string, data: InstanceData): BABYLON.InstancedMesh | null {
    const masterMesh = this.masterMeshes.get(name);
    
    if (!masterMesh) {
      console.warn(`Master mesh "${name}" not found, cannot create instance`);
      return null;
    }

    // Create instance
    const instance = masterMesh.createInstance(`${name}_instance_${this.instances.get(name)!.length}`);
    
    // Set position, rotation, scale
    instance.position = data.position.clone();
    instance.rotation.y = data.rotation;
    instance.scaling = data.scale.clone();

    // Set color if provided
    if (data.color && masterMesh.material) {
      // For instanced meshes with color variation, we need to use vertex colors
      // or create a material clone (which reduces instancing benefits)
      // For now, we'll use a simple approach with material cloning for colored instances
      const material = masterMesh.material.clone(`${name}_material_${this.instances.get(name)!.length}`);
      if (material instanceof BABYLON.StandardMaterial) {
        material.diffuseColor = data.color;
      }
      instance.material = material;
    }

    // Track instance
    this.instances.get(name)!.push(instance);

    return instance;
  }

  /**
   * Create multiple instances at once
   * Validates: Requirement 8.5
   * 
   * @param name - Name of the master mesh
   * @param dataArray - Array of instance data
   * @returns Array of created instances
   */
  public createInstances(name: string, dataArray: InstanceData[]): BABYLON.InstancedMesh[] {
    const instances: BABYLON.InstancedMesh[] = [];
    
    for (const data of dataArray) {
      const instance = this.createInstance(name, data);
      if (instance) {
        instances.push(instance);
      }
    }

    return instances;
  }

  /**
   * Get master mesh by name
   * 
   * @param name - Name of the master mesh
   * @returns Master mesh or undefined if not found
   */
  public getMasterMesh(name: string): BABYLON.Mesh | undefined {
    return this.masterMeshes.get(name);
  }

  /**
   * Get all instances of a mesh type
   * 
   * @param name - Name of the master mesh
   * @returns Array of instances or empty array if not found
   */
  public getInstances(name: string): BABYLON.InstancedMesh[] {
    return this.instances.get(name) || [];
  }

  /**
   * Get instance count for a mesh type
   * Validates: Requirement 8.5
   * 
   * @param name - Name of the master mesh
   * @returns Number of instances
   */
  public getInstanceCount(name: string): number {
    return this.instances.get(name)?.length || 0;
  }

  /**
   * Get total instance count across all mesh types
   * Validates: Requirement 8.5
   * 
   * @returns Total number of instances
   */
  public getTotalInstanceCount(): number {
    let total = 0;
    for (const instances of this.instances.values()) {
      total += instances.length;
    }
    return total;
  }

  /**
   * Dispose instances of a specific mesh type
   * Validates: Requirement 8.3
   * 
   * @param name - Name of the master mesh
   */
  public disposeInstances(name: string): void {
    const instances = this.instances.get(name);
    
    if (!instances) {
      return;
    }

    // Dispose all instances
    for (const instance of instances) {
      instance.dispose();
    }

    // Clear instance array
    this.instances.set(name, []);
    
    console.log(`Disposed ${instances.length} instances of ${name}`);
  }

  /**
   * Dispose all instances and master meshes
   * Validates: Requirement 8.3
   */
  public dispose(): void {
    // Dispose all instances
    for (const [name, instances] of this.instances.entries()) {
      for (const instance of instances) {
        instance.dispose();
      }
      console.log(`Disposed ${instances.length} instances of ${name}`);
    }

    // Dispose master meshes
    for (const [name, mesh] of this.masterMeshes.entries()) {
      mesh.dispose();
      console.log(`Disposed master mesh: ${name}`);
    }

    this.instances.clear();
    this.masterMeshes.clear();
  }

  /**
   * Get statistics about instancing
   * Validates: Requirement 8.5
   * 
   * @returns Statistics object
   */
  public getStats(): {
    masterMeshCount: number;
    totalInstanceCount: number;
    instancesByType: Map<string, number>;
  } {
    const instancesByType = new Map<string, number>();
    
    for (const [name, instances] of this.instances.entries()) {
      instancesByType.set(name, instances.length);
    }

    return {
      masterMeshCount: this.masterMeshes.size,
      totalInstanceCount: this.getTotalInstanceCount(),
      instancesByType
    };
  }
}
