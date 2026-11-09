"use client";

import React from "react";
import { Grid } from "@react-three/drei";
import { Floor, PlotConfig } from "@/types/homeStudio";

export interface SceneLightingAndGroundProps {
  plot: PlotConfig;
  floors: Floor[];
  ambientLightIntensity: number;
  daylightIntensity?: number;
  sunAngle: number;
  sunElevation?: number;
  timeOfDayHours?: number;
  interiorLightsEnabled?: boolean;
  onClearSelection: () => void;
}

export default function SceneLightingAndGround({
  plot,
  floors,
  ambientLightIntensity,
  daylightIntensity = 1.15,
  sunAngle,
  sunElevation = 55,
  timeOfDayHours = 12.5,
  interiorLightsEnabled = true,
  onClearSelection,
}: SceneLightingAndGroundProps) {
  const plotW = plot.width;
  const plotL = plot.length;
  const sb = plot.setbacks;

  const azRad = ((sunAngle || 45) * Math.PI) / 180;
  const elRad = (Math.max(10, Math.min(88, sunElevation || 55)) * Math.PI) / 180;
  const orbitDist = 90;
  const sunX = plotW / 2 + Math.cos(azRad) * Math.cos(elRad) * orbitDist;
  const sunY = Math.max(18, Math.sin(elRad) * orbitDist);
  const sunZ = plotL / 2 + Math.sin(azRad) * Math.cos(elRad) * orbitDist;

  // Compute daylight color temperature from timeOfDayHours
  const sunColor =
    timeOfDayHours >= 16.5 && timeOfDayHours <= 19
      ? "#FFE4B5" // Golden hour warm amber
      : timeOfDayHours > 19 || timeOfDayHours < 7
      ? "#D4DFED" // Evening twilight cool
      : "#FFFDF8"; // Crisp architectural solar noon

  const envW = Math.max(8, plotW - sb.left - sb.right);
  const envL = Math.max(8, plotL - sb.front - sb.back);
  const envCenterX = sb.left + envW / 2;
  const envCenterZ = sb.front + envL / 2;

  // Gather active luminaire fixtures across visible floors (capped at 8 point lights for WebGL shadow/shader performance)
  const interiorLightFixtures = interiorLightsEnabled
    ? floors
        .filter((f) => f.visible)
        .flatMap((flr) =>
          flr.objects
            .filter(
              (o) => o.category === "lighting" || o.category === "lights"
            )
            .map((o) => ({
              id: o.id,
              x: o.position.x + o.dimensions.width / 2,
              y: flr.elevation + (o.position.y || 7.2),
              z: o.position.z + o.dimensions.depth / 2,
            }))
        )
        .slice(0, 8)
    : [];

  return (
    <>
      {/* Studio Architectural Daylight Setup */}
      <ambientLight
        intensity={ambientLightIntensity || 0.78}
        color={sunColor}
      />
      <directionalLight
        position={[sunX, sunY, sunZ]}
        intensity={daylightIntensity}
        color={sunColor}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-35, 42, -25]} intensity={0.32} />

      {/* Interior Point Lights from placed Chandeliers, Pendants & Floor Lamps */}
      {interiorLightFixtures.map((light) => (
        <pointLight
          key={`pt-light-${light.id}`}
          position={[light.x, light.y, light.z]}
          intensity={1.1}
          distance={26}
          decay={1.8}
          color="#FFE9C4"
        />
      ))}

      {/* Surrounding Architectural Studio Plinth */}
      <mesh
        position={[plotW / 2, -0.55, plotL / 2]}
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          onClearSelection();
        }}
      >
        <boxGeometry args={[plotW + 24, 0.4, plotL + 24]} />
        <meshStandardMaterial
          color="#F2F1ED"
          roughness={0.95}
          metalness={0.01}
        />
      </mesh>

      {/* Plot Boundary Ground Plane */}
      <mesh
        position={[plotW / 2, -0.25, plotL / 2]}
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          onClearSelection();
        }}
      >
        <boxGeometry args={[plotW, 0.35, plotL]} />
        <meshStandardMaterial
          color="#FFFFFF"
          roughness={0.9}
          metalness={0.02}
        />
      </mesh>

      {/* Buildable Setback Envelope Plinth */}
      <mesh position={[envCenterX, -0.05, envCenterZ]} receiveShadow>
        <boxGeometry args={[envW, 0.06, envL]} />
        <meshStandardMaterial color="#F6F2EA" roughness={0.85} />
      </mesh>

      {/* Architectural Reference Grid */}
      <Grid
        position={[plotW / 2, -0.01, plotL / 2]}
        args={[plotW, plotL]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#EBEBE6"
        sectionSize={10}
        sectionThickness={1}
        sectionColor="#D6D4CC"
        fadeDistance={240}
      />
    </>
  );
}
