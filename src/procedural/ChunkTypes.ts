/**
 * Chunk Data Structures
 * Defines interfaces for chunk-based world generation
 * Validates: Requirements 1.1, 1.4
 */

import * as BABYLON from '@babylonjs/core';

/**
 * Chunk - A fixed-size square section of the game world
 */
export interface Chunk {
  // Grid coordinates
  x: number;
  z: number;
  
  // World space position (corner)
  worldX: number;
  worldZ: number;
  
  // Generated content
  roads: Road[];
  buildings: Building[];
  vehicles: Vehicle[];
  signs: TrafficSign[];
  
  // Babylon.js objects
  meshes: BABYLON.Mesh[];
  imposters: BABYLON.PhysicsImpostor[];
  
  // Metadata
  generatedAt: number;        // Timestamp
  seed: number;               // Chunk-specific seed
}

/**
 * Road - A road network with segments and intersections
 */
export interface Road {
  id: string;
  segments: RoadSegment[];
  intersections: Intersection[];
  mesh: BABYLON.Mesh;
  imposter: BABYLON.PhysicsImpostor;
}

/**
 * Road Segment - A section of road between two points
 */
export interface RoadSegment {
  start: BABYLON.Vector2;
  end: BABYLON.Vector2;
  width: number;
  type: 'main' | 'side';
  lanes: number;
}

/**
 * Intersection - Where roads meet
 */
export interface Intersection {
  position: BABYLON.Vector2;
  roads: string[];            // IDs of connecting roads
  type: 'cross' | 't' | 'corner';
}

/**
 * Building - A procedurally generated building
 */
export interface Building {
  id: string;
  position: BABYLON.Vector3;
  dimensions: BABYLON.Vector3;
  rotation: number;
  style: BuildingStyle;
  mesh: BABYLON.Mesh;
  imposter: BABYLON.PhysicsImpostor;
}

/**
 * Building Style - Visual style for buildings
 */
export interface BuildingStyle {
  name: string;
  colorPalette: string[];
  windowPattern: string;
  roofType: 'flat' | 'pitched';
}

/**
 * Vehicle - A static or dynamic vehicle in the world
 */
export interface Vehicle {
  id: string;
  position: BABYLON.Vector3;
  rotation: number;
  type: VehicleType;
  color: string;
  mesh: BABYLON.Mesh;
  imposter?: BABYLON.PhysicsImpostor;
  metadata?: any; // Optional metadata (e.g., sourceSegment for placement validation)
}

/**
 * Vehicle Type - Different types of vehicles
 */
export enum VehicleType {
  Sedan = 'sedan',
  SUV = 'suv',
  Truck = 'truck',
  Van = 'van',
  Compact = 'compact'
}

/**
 * Traffic Sign - Road signs and signals
 */
export interface TrafficSign {
  id: string;
  position: BABYLON.Vector3;
  rotation: number;
  type: SignType;
  mesh: BABYLON.Mesh;
}

/**
 * Sign Type - Different types of traffic signs
 */
export enum SignType {
  StopSign = 'stop',
  TrafficLight = 'traffic_light',
  SpeedLimit = 'speed_limit',
  StreetName = 'street_name',
  Directional = 'directional',
  Yield = 'yield',
  NoPark = 'no_park'
}
