"use client";

import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, OrthographicCamera } from "@react-three/drei";
import type { OfficeRoom, OfficeDesk, OfficeStaff } from "@/lib/office/types";

// Minimal low-poly scene — efficient, frustum-culled by default in R3F.

function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
      <planeGeometry args={[22, 16]} />
      <meshStandardMaterial color="#fdf8f0" />
    </mesh>
  );
}

function GlassRoomMesh({
  room,
  onSelect,
}: {
  room: OfficeRoom;
  onSelect?: (r: OfficeRoom) => void;
}) {
  // Map 2D layout (x 0..360, y 0..250) into 3D floor plane centered at 0,0
  const cx = (room.x + room.w / 2 - 180) / 18;
  const cz = (room.y + room.h / 2 - 125) / 18;
  const sx = Math.max(0.6, room.w / 18);
  const sz = Math.max(0.5, room.h / 18);
  const color =
    room.type === "lobby"
      ? "#fef3c7"
      : room.type === "amenity"
        ? "#fafaf9"
        : room.color ?? "#ffffff";
  return (
    <group position={[cx, 0.35, cz]}>
      <mesh
        castShadow
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.(room);
        }}
      >
        <boxGeometry args={[sx, 0.7, sz]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={room.type === "amenity" ? 0.92 : 0.88}
          roughness={0.45}
        />
      </mesh>
      {/* keep frustum cull; Three is imported for types only — no runtime require needed in this branch */}
    </group>
  );
}

function DeskMesh({
  desk,
  staff,
  onAvatarClick,
}: {
  desk: OfficeDesk;
  staff?: OfficeStaff | null;
  onAvatarClick?: (s: OfficeStaff) => void;
}) {
  const x = desk.x != null ? (desk.x - 180) / 18 : 0;
  const z = desk.y != null ? (desk.y - 125) / 18 : 0;
  const dotColor =
    staff?.status === "active" ? "#10b981" : staff?.status === "break" ? "#f59e0b" : "#94a3b8";
  return (
    <group position={[x, 0.12, z]}>
      <mesh castShadow onClick={() => staff && onAvatarClick?.(staff)}>
        <boxGeometry args={[0.42, 0.14, 0.32]} />
        <meshStandardMaterial color={staff ? "#fffbeb" : "#f1f5f9"} roughness={0.6} />
      </mesh>
      {staff && (
        <mesh position={[0, 0.28, 0]}>
          <capsuleGeometry args={[0.11, 0.18, 4, 8]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      )}
      {staff && (
        <mesh position={[0.14, 0.22, 0.1]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial color={dotColor} emissive={dotColor} emissiveIntensity={0.6} />
        </mesh>
      )}
    </group>
  );
}

export default function OfficeCanvasR3F({
  rooms,
  desks,
  staff,
  onRoomSelect,
  onAvatarSelect,
}: {
  rooms: OfficeRoom[];
  desks: OfficeDesk[];
  staff: OfficeStaff[];
  onRoomSelect?: (room: OfficeRoom) => void;
  onAvatarSelect?: (s: OfficeStaff) => void;
}) {
  const staffById = React.useMemo(() => new Map(staff.map((s) => [s.id, s] as const)), [staff]);

  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
      onCreated={({ gl }) => {
        // Keep renderer lightweight
        gl.setClearColor("#fdf8f0", 0);
      }}
    >
      {/* Isometric fixed camera ~30° top-down — orthographic for diorama feel */}
      <OrthographicCamera
        makeDefault
        position={[14, 18, 14]}
        zoom={42}
        near={0.1}
        far={1000}
        onUpdate={(c) => c.lookAt(0, 0, 0)}
      />
      <ambientLight intensity={0.85} />
      <directionalLight
        position={[8, 12, 6]}
        intensity={1.15}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <hemisphereLight args={["#fff7ed", "#e7e5e4", 0.35]} />

      <Suspense fallback={null}>
        <Floor />
        {rooms.map((r) => (
          <GlassRoomMesh key={r.id} room={r} onSelect={onRoomSelect} />
        ))}
        {desks.map((d) => (
          <DeskMesh
            key={d.id}
            desk={d}
            staff={d.staffId ? staffById.get(d.staffId) ?? null : null}
            onAvatarClick={onAvatarSelect}
          />
        ))}
      </Suspense>

      <OrbitControls
        enableRotate={false}
        enablePan
        enableZoom
        minZoom={28}
        maxZoom={64}
        target={[0, 0, 0]}
      />
    </Canvas>
  );
}
