"use client";

import React, { memo } from "react";
import { BoxMeshSpec3D } from "@/lib/home-studio/geometry3d";

export interface BuildingMeshes3DProps {
  meshes: BoxMeshSpec3D[];
  selectedIds: string[];
  onSelectObject: (sourceObjectId: string, kind: BoxMeshSpec3D["kind"]) => void;
}

const BuildingMeshes3D = memo(function BuildingMeshes3D({
  meshes,
  selectedIds,
  onSelectObject,
}: BuildingMeshes3DProps) {
  return (
    <group name="hmx-building-3d-root">
      {meshes.map((m) => {
        const isSelected = selectedIds.includes(m.sourceObjectId);
        const isEmissiveLuminaire = m.id.includes("diffuser-ring");

        return (
          <mesh
            key={m.id}
            position={[m.position.x, m.position.y, m.position.z]}
            rotation={[0, m.rotationYRad, 0]}
            castShadow={
              m.kind !== "window_glass" &&
              m.kind !== "room_floor" &&
              !isEmissiveLuminaire
            }
            receiveShadow
            onClick={(e) => {
              e.stopPropagation();
              onSelectObject(m.sourceObjectId, m.kind);
            }}
          >
            <boxGeometry
              args={[
                m.dimensions.width,
                m.dimensions.height,
                m.dimensions.depth,
              ]}
            />
            <meshStandardMaterial
              color={isSelected ? "#C5A880" : m.color}
              emissive={
                isEmissiveLuminaire
                  ? "#FFE8B8"
                  : isSelected
                  ? "#3A2E1E"
                  : "#000000"
              }
              emissiveIntensity={
                isEmissiveLuminaire ? 0.65 : isSelected ? 0.15 : 0
              }
              roughness={m.roughness}
              metalness={m.metalness}
              transparent={m.opacity < 1}
              opacity={m.opacity}
            />
          </mesh>
        );
      })}
    </group>
  );
});

export default BuildingMeshes3D;
