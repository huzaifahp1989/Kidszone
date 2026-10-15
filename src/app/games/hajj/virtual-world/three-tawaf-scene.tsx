'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  getTawafProgress,
  TAWAF_CHECKPOINT_RADIANS,
  TAWAF_LAPS,
  TAWAF_TOTAL_RADIANS,
} from '@/lib/virtual-hajj-gameplay';

type Props = {
  active: boolean;
  controls: { forward: number; turn: number };
  resetToken: number;
  onReady: () => void;
  onError: (message: string) => void;
  onProgress: (progress: ReturnType<typeof getTawafProgress>) => void;
  onComplete: () => void;
};

const PATH_RADIUS = 11;
const START_ANGLE = Math.PI / 2;
const WALK_SPEED = 0.82;

export default function ThreeTawafScene({
  active,
  controls,
  resetToken,
  onReady,
  onError,
  onProgress,
  onComplete,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(active);
  const callbacksRef = useRef({ onReady, onError, onProgress, onComplete });
  const controlsRef = useRef(controls);
  const progressRef = useRef(0);

  activeRef.current = active;
  controlsRef.current = controls;
  callbacksRef.current = { onReady, onError, onProgress, onComplete };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    progressRef.current = 0;
    controlsRef.current = { forward: 0, turn: 0 };

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        powerPreference: 'low-power',
        alpha: false,
      });
    } catch {
      callbacksRef.current.onError(
        'This browser could not start 3D graphics. Try an updated browser or use the 2D Tawaf activity.'
      );
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0xdceeff);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xdceeff);
    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 180);
    const hemisphere = new THREE.HemisphereLight(0xffffff, 0x7d92a8, 2.1);
    scene.add(hemisphere);
    const sunlight = new THREE.DirectionalLight(0xffffff, 2.3);
    sunlight.position.set(-18, 32, 22);
    scene.add(sunlight);

    const disposeables: Array<THREE.BufferGeometry | THREE.Material> = [];
    const addMesh = (
      geometry: THREE.BufferGeometry,
      material: THREE.Material,
      position: THREE.Vector3,
      parent: THREE.Object3D = scene
    ) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(position);
      parent.add(mesh);
      disposeables.push(geometry, material);
      return mesh;
    };

    const white = new THREE.MeshStandardMaterial({ color: 0xf8fbff, roughness: 0.82 });
    const stone = new THREE.MeshStandardMaterial({ color: 0xd9e3ed, roughness: 0.88 });
    const blue = new THREE.MeshStandardMaterial({ color: 0x2784d7, roughness: 0.56 });
    const gold = new THREE.MeshStandardMaterial({
      color: 0xd2a84f,
      metalness: 0.45,
      roughness: 0.42,
    });
    const black = new THREE.MeshStandardMaterial({ color: 0x171a20, roughness: 0.8 });

    addMesh(
      new THREE.PlaneGeometry(120, 120),
      new THREE.MeshStandardMaterial({ color: 0xeaf2f9, roughness: 1 }),
      new THREE.Vector3(0, -0.12, 0)
    ).rotation.x = -Math.PI / 2;

    const courtyard = addMesh(
      new THREE.CylinderGeometry(19, 19, 0.18, 80),
      white,
      new THREE.Vector3(0, -0.01, 0)
    );
    courtyard.receiveShadow = true;

    for (let index = 0; index < 20; index += 1) {
      const angle = (index / 20) * Math.PI * 2;
      const x = Math.cos(angle) * 25;
      const z = Math.sin(angle) * 25;
      addMesh(
        new THREE.CylinderGeometry(0.55, 0.68, 11, 10),
        white,
        new THREE.Vector3(x, 5.5, z)
      );
      addMesh(
        new THREE.CylinderGeometry(0.9, 0.9, 0.3, 10),
        gold,
        new THREE.Vector3(x, 10.95, z)
      );
    }

    const kaaba = new THREE.Group();
    scene.add(kaaba);
    addMesh(
      new THREE.BoxGeometry(7.1, 8.5, 7.1),
      black,
      new THREE.Vector3(0, 4.25, 0),
      kaaba
    );
    addMesh(
      new THREE.BoxGeometry(7.13, 0.55, 7.13),
      gold,
      new THREE.Vector3(0, 6.75, 0),
      kaaba
    );
    addMesh(
      new THREE.BoxGeometry(1.25, 2.15, 0.08),
      gold,
      new THREE.Vector3(1.65, 2.8, 3.58),
      kaaba
    );
    addMesh(
      new THREE.BoxGeometry(7.15, 0.13, 7.15),
      stone,
      new THREE.Vector3(0, 0.14, 0),
      kaaba
    );

    const routeRing = addMesh(
      new THREE.TorusGeometry(PATH_RADIUS, 0.18, 8, 180),
      blue,
      new THREE.Vector3(0, 0.18, 0)
    );
    routeRing.rotation.x = Math.PI / 2;

    for (let index = 0; index < 14; index += 1) {
      const angle = START_ANGLE - (index / 14) * Math.PI * 2;
      const arrow = addMesh(
        new THREE.ConeGeometry(0.32, 0.8, 4),
        blue,
        new THREE.Vector3(Math.cos(angle) * PATH_RADIUS, 0.48, Math.sin(angle) * PATH_RADIUS)
      );
      const direction = new THREE.Vector3(Math.sin(angle), 0, -Math.cos(angle)).normalize();
      arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    }

    const checkpoints: THREE.Group[] = [];
    for (let index = 0; index < 7; index += 1) {
      const angle = START_ANGLE - (index + 1) * TAWAF_CHECKPOINT_RADIANS;
      const checkpoint = new THREE.Group();
      checkpoint.position.set(Math.cos(angle) * PATH_RADIUS, 0, Math.sin(angle) * PATH_RADIUS);
      scene.add(checkpoint);
      addMesh(
        new THREE.CylinderGeometry(0.34, 0.44, 1.9, 12),
        index === 6 ? gold : blue,
        new THREE.Vector3(0, 0.95, 0),
        checkpoint
      );
      addMesh(
        new THREE.SphereGeometry(0.45, 14, 10),
        white,
        new THREE.Vector3(0, 2.05, 0),
        checkpoint
      );
      checkpoints.push(checkpoint);
    }

    const player = new THREE.Group();
    scene.add(player);
    addMesh(
      new THREE.CylinderGeometry(0.42, 0.62, 0.35, 18),
      blue,
      new THREE.Vector3(0, 0.25, 0),
      player
    );
    addMesh(
      new THREE.ConeGeometry(0.42, 1.2, 5),
      new THREE.MeshStandardMaterial({
        color: 0x1f65b5,
        emissive: 0x0a2a52,
        roughness: 0.5,
      }),
      new THREE.Vector3(0, 1.0, 0),
      player
    );
    addMesh(
      new THREE.TorusGeometry(0.82, 0.08, 6, 24),
      gold,
      new THREE.Vector3(0, 0.08, 0),
      player
    ).rotation.x = Math.PI / 2;

    const target = new THREE.Vector3();
    const cameraPosition = new THREE.Vector3();
    let cameraYaw = 0;
    let dragPointerId: number | null = null;
    let lastPointerX = 0;
    let lastTime = performance.now();
    let lastUiUpdate = 0;
    let completionSent = false;
    let frame = 0;
    let disposed = false;

    const resize = () => {
      if (!canvas.clientWidth || !canvas.clientHeight) return;
      renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();

    const pressed = new Set<string>();
    const onKeyDown = (event: KeyboardEvent) => {
      if (['ArrowUp', 'w', 'W', 'ArrowLeft', 'a', 'A', 'ArrowRight', 'd', 'D'].includes(event.key)) {
        event.preventDefault();
        pressed.add(event.key.toLowerCase());
      }
    };
    const onKeyUp = (event: KeyboardEvent) => pressed.delete(event.key.toLowerCase());
    const onPointerDown = (event: PointerEvent) => {
      dragPointerId = event.pointerId;
      lastPointerX = event.clientX;
      canvas.setPointerCapture(event.pointerId);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (dragPointerId !== event.pointerId) return;
      cameraYaw -= (event.clientX - lastPointerX) * 0.006;
      lastPointerX = event.clientX;
    };
    const onPointerUp = (event: PointerEvent) => {
      if (dragPointerId === event.pointerId) dragPointerId = null;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);

    const animate = (time: number) => {
      if (disposed) return;
      const delta = Math.min((time - lastTime) / 1000, 0.04);
      lastTime = time;

      if (activeRef.current) {
        const keyboardForward = pressed.has('arrowup') || pressed.has('w') ? 1 : 0;
        const keyboardTurn = Number(pressed.has('arrowright') || pressed.has('d')) -
          Number(pressed.has('arrowleft') || pressed.has('a'));
        const controls = controlsRef.current;
        const forward = Math.max(keyboardForward, controls.forward);
        cameraYaw += (keyboardTurn + controls.turn) * delta * 1.7;
        progressRef.current = Math.min(
          TAWAF_TOTAL_RADIANS,
          progressRef.current + forward * WALK_SPEED * delta
        );

        const angle = START_ANGLE - progressRef.current;
        player.position.set(Math.cos(angle) * PATH_RADIUS, 0, Math.sin(angle) * PATH_RADIUS);
        player.rotation.y = -angle;

        const cameraDistance = 15;
        cameraPosition.set(
          player.position.x + Math.sin(cameraYaw) * cameraDistance,
          8.3,
          player.position.z + Math.cos(cameraYaw) * cameraDistance
        );
        camera.position.lerp(cameraPosition, 1 - Math.exp(-delta * 5));
        target.set(player.position.x, 1, player.position.z);
        camera.lookAt(target);

        const progress = getTawafProgress(progressRef.current);
        if (time - lastUiUpdate > 120) {
          callbacksRef.current.onProgress(progress);
          lastUiUpdate = time;
        }
        if (progress.complete && !completionSent) {
          completionSent = true;
          controlsRef.current = { forward: 0, turn: 0 };
          callbacksRef.current.onComplete();
        }
      } else {
        const angle = START_ANGLE - progressRef.current;
        player.position.set(Math.cos(angle) * PATH_RADIUS, 0, Math.sin(angle) * PATH_RADIUS);
        cameraPosition.set(player.position.x, 8.3, player.position.z + 15);
        camera.position.lerp(cameraPosition, 0.04);
        target.set(player.position.x, 1, player.position.z);
        camera.lookAt(target);
      }

      checkpoints.forEach((checkpoint, index) => {
        const passed = getTawafProgress(progressRef.current).totalCheckpoints > index;
        const material = (checkpoint.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial;
        material.emissive.setHex(passed ? 0x1c4771 : 0x000000);
      });

      if (frame++ % 2 === 0) renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };

    callbacksRef.current.onReady();
    const animationId = requestAnimationFrame(animate);

    return () => {
      disposed = true;
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      for (const item of disposeables) item.dispose();
      renderer.dispose();
    };
  }, [resetToken]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full touch-none"
      aria-label="Interactive 3D Kaaba courtyard and Tawaf path"
    />
  );
}
