import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import gsap from 'gsap';
import { CameraPreset, GameMode, PieceColor } from '../types';

/**
 * Camera Constraint Constants - Prevent extreme low/high angles, disorientation, and piece occlusion.
 */

// 1. Min Polar Angle (Pitch from vertical): ~0.20 rad (~11.5° from vertical / 78.5° above board plane).
export const CAMERA_MIN_POLAR = 0.20;

// 2. Max Polar Angle (Pitch from vertical): ~1.25 rad (~71.6° from vertical / 18.4° above board plane).
export const CAMERA_MAX_POLAR = 1.25;

// 3. Distance bounds
export const CAMERA_MIN_DIST = 6.0;
export const CAMERA_MAX_DIST = 22.0;

/**
 * CameraController & Anti-Occlusion System
 * Handles industry-standard 3D framing, free-roaming 360° orbit bounds, GSAP preset switching,
 * turn board-flipping, and raycasted piece opacity fading.
 */
export class CameraController {
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private container: HTMLElement;
  private currentOrientationColor: PieceColor = 'w';
  private fadedPieceMeshes: THREE.Mesh[] = [];

  private lastInteractionTime: number = Date.now();
  private isUserInteracting: boolean = false;
  private isTweening: boolean = false;
  private activeTween: gsap.core.Tween | gsap.core.Timeline | null = null;
  private currentPreset: CameraPreset = 'standard';

  constructor(camera: THREE.PerspectiveCamera, controls: OrbitControls, container: HTMLElement) {
    this.camera = camera;
    this.controls = controls;
    this.container = container;

    this.applyOrbitConstraints();
    this.attachEventListeners();
  }

  // Constrain orbit limits so board is always comfortably playable without extreme flat angles or clipping
  public applyOrbitConstraints() {
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.rotateSpeed = 0.65;
    this.controls.zoomSpeed = 0.75;

    this.controls.minPolarAngle = CAMERA_MIN_POLAR;
    this.controls.maxPolarAngle = CAMERA_MAX_POLAR;

    this.controls.minDistance = CAMERA_MIN_DIST;
    this.controls.maxDistance = CAMERA_MAX_DIST;

    this.controls.target.set(0, 0, 0);
    this.updateAzimuthConstraints();
  }

  // Attach touch/drag interaction listeners to pause auto-recenter & interrupt active GSAP tweens
  private attachEventListeners() {
    this.controls.addEventListener('start', () => {
      this.isUserInteracting = true;
      if (this.activeTween) {
        this.activeTween.kill();
        this.activeTween = null;
      }
      this.isTweening = false;
    });

    this.controls.addEventListener('end', () => {
      this.isUserInteracting = false;
      this.lastInteractionTime = Date.now();
    });

    this.controls.addEventListener('change', () => {
      this.lastInteractionTime = Date.now();
    });

    const onPointerActivity = () => {
      this.lastInteractionTime = Date.now();
    };

    this.container.addEventListener('pointerdown', onPointerActivity);
    this.container.addEventListener('pointermove', onPointerActivity);
  }

  // Update active orientation color ('w' vs 'b') for spherical clamping
  public updateAzimuthConstraints(color: PieceColor = this.currentOrientationColor) {
    this.currentOrientationColor = color;
    this.controls.minAzimuthAngle = -Infinity;
    this.controls.maxAzimuthAngle = Infinity;
  }

  // Enforce polar angle and distance bounds continuously on camera
  private clampCameraToBounds() {
    const target = this.controls.target;
    const relPos = this.camera.position.clone().sub(target);
    if (relPos.lengthSq() < 0.001) {
      relPos.set(0, 6, 10);
    }
    const spherical = new THREE.Spherical().setFromVector3(relPos);

    if (isNaN(spherical.phi) || isNaN(spherical.theta) || isNaN(spherical.radius)) {
      spherical.set(12, Math.PI / 4, 0);
    }

    spherical.phi = THREE.MathUtils.clamp(spherical.phi, CAMERA_MIN_POLAR, CAMERA_MAX_POLAR);
    spherical.radius = THREE.MathUtils.clamp(spherical.radius, CAMERA_MIN_DIST, CAMERA_MAX_DIST);

    const clampedRelPos = new THREE.Vector3().setFromSpherical(spherical);
    this.camera.position.copy(clampedRelPos.add(target));
  }

  // Calculate standard target camera vector for a given preset and orientation
  public getPresetPosition(
    preset: CameraPreset,
    color: PieceColor = this.currentOrientationColor,
    isPortrait: boolean = false
  ): THREE.Vector3 {
    let phi = Math.PI / 4; // Standard 45° downward tilt angle
    let radius = 12.0;
    let deltaTheta = 0;

    switch (preset) {
      case 'standard':
      case 'white':
      case 'black':
        phi = Math.PI / 4; // 45° tilt
        radius = 12.0;
        deltaTheta = 0;
        break;
      case 'close':
      case 'cinematic':
        phi = 0.65; // ~37° tilt close-up
        radius = 8.5;
        deltaTheta = 0;
        break;
      case 'overhead':
      case 'top':
        phi = 0.35; // ~20° top-down angle
        radius = 13.0;
        deltaTheta = 0;
        break;
      case 'isometric':
        phi = Math.PI / 4; // 45° tilt
        radius = 12.0;
        deltaTheta = Math.PI / 6; // +30° isometric angle
        break;
      default:
        phi = Math.PI / 4;
        radius = 12.0;
        deltaTheta = 0;
    }

    if (preset === 'white') color = 'w';
    if (preset === 'black') color = 'b';

    if (isPortrait) {
      const width = this.container.clientWidth || 800;
      const height = this.container.clientHeight || 600;
      const aspect = height > 0 ? width / height : 1.0;
      const mult = Math.min(1.2, Math.max(1.0, 1.0 / (aspect * 0.95)));
      radius *= mult;
    }

    const baseTheta = color === 'w' ? 0 : Math.PI;
    const finalTheta = baseTheta + deltaTheta;

    const spherical = new THREE.Spherical(radius, phi, finalTheta);
    return new THREE.Vector3().setFromSpherical(spherical).add(this.controls.target);
  }

  // Auto-fits camera distance & FOV based on viewport aspect ratio so 8x8 board has padding
  public updateResponsiveFraming() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (!width || !height) return;

    const aspect = width / height;
    this.camera.aspect = aspect;

    if (aspect < 1.0) {
      // Portrait mode (mobile): calculate vertical FOV to maintain a consistent horizontal FOV (~48deg)
      const targetHorizontalFovRad = THREE.MathUtils.degToRad(48);
      const fovVertRad = 2 * Math.atan(Math.tan(targetHorizontalFovRad / 2) / aspect);
      // Clamp FOV between 45 and 82 degrees to avoid extreme perspective fish-eye distortion
      this.camera.fov = THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(fovVertRad), 45, 82);
      this.controls.target.set(0, -0.15, 0);
    } else {
      // Landscape mode (desktop / tablet): AAA standard 40deg FOV
      this.camera.fov = 40;
      this.controls.target.set(0, 0, 0);
    }

    this.camera.updateProjectionMatrix();
    this.controls.update();
  }

  // Set standard Camera Presets with GSAP timeline spherical interpolation
  public setPreset(preset: CameraPreset, isPortrait: boolean = false) {
    this.currentPreset = preset;
    if (preset === 'white') this.currentOrientationColor = 'w';
    if (preset === 'black') this.currentOrientationColor = 'b';

    this.updateAzimuthConstraints();

    const targetPos = this.getPresetPosition(preset, this.currentOrientationColor, isPortrait);
    const targetRelPos = targetPos.clone().sub(this.controls.target);
    const targetSph = new THREE.Spherical().setFromVector3(targetRelPos);

    const currentRelPos = this.camera.position.clone().sub(this.controls.target);
    const currentSph = new THREE.Spherical().setFromVector3(currentRelPos);

    let deltaTheta = targetSph.theta - currentSph.theta;
    while (deltaTheta > Math.PI) deltaTheta -= Math.PI * 2;
    while (deltaTheta < -Math.PI) deltaTheta += Math.PI * 2;
    const finalTheta = currentSph.theta + deltaTheta;

    if (this.activeTween) this.activeTween.kill();
    this.isTweening = true;

    const animState = {
      radius: currentSph.radius,
      phi: currentSph.phi,
      theta: currentSph.theta,
    };

    const tl = gsap.timeline({
      onUpdate: () => {
        const sph = new THREE.Spherical(animState.radius, animState.phi, animState.theta);
        if (isNaN(sph.radius) || isNaN(sph.phi) || isNaN(sph.theta)) return;
        const pos = new THREE.Vector3().setFromSpherical(sph).add(this.controls.target);
        this.camera.position.copy(pos);
        this.camera.lookAt(this.controls.target);
        this.controls.update();
      },
      onComplete: () => {
        this.isTweening = false;
        this.activeTween = null;
        this.controls.update();
        this.lastInteractionTime = Date.now();
      },
    });

    tl.to(animState, {
      radius: targetSph.radius,
      phi: targetSph.phi,
      theta: finalTheta,
      duration: 0.85,
      ease: 'power2.inOut',
    });

    this.activeTween = tl;
  }

  // Refactored Game Mode transition camera sequence using GSAP Timeline
  public animateGameModeSequence(
    mode: GameMode,
    userColor: PieceColor = 'w',
    activeTurn: PieceColor = 'w'
  ) {
    const isPortrait = this.container.clientWidth / (this.container.clientHeight || 1) < 1.0;
    const targetColor = mode === 'pvp' ? activeTurn : userColor;

    this.currentOrientationColor = targetColor;
    this.updateAzimuthConstraints();

    const targetPos = this.getPresetPosition('standard', targetColor, isPortrait);
    const targetRelPos = targetPos.clone().sub(this.controls.target);
    const targetSph = new THREE.Spherical().setFromVector3(targetRelPos);

    const currentRelPos = this.camera.position.clone().sub(this.controls.target);
    const currentSph = new THREE.Spherical().setFromVector3(currentRelPos);

    let deltaTheta = targetSph.theta - currentSph.theta;
    while (deltaTheta > Math.PI) deltaTheta -= Math.PI * 2;
    while (deltaTheta < -Math.PI) deltaTheta += Math.PI * 2;
    if (Math.abs(Math.abs(deltaTheta) - Math.PI) < 0.02) {
      deltaTheta = Math.PI;
    }
    const finalTheta = currentSph.theta + deltaTheta;

    if (this.activeTween) this.activeTween.kill();
    this.isTweening = true;

    const animState = {
      radius: currentSph.radius,
      phi: currentSph.phi,
      theta: currentSph.theta,
    };

    const tl = gsap.timeline({
      onUpdate: () => {
        const sph = new THREE.Spherical(animState.radius, animState.phi, animState.theta);
        if (isNaN(sph.radius) || isNaN(sph.phi) || isNaN(sph.theta)) return;
        const pos = new THREE.Vector3().setFromSpherical(sph).add(this.controls.target);
        this.camera.position.copy(pos);
        this.camera.lookAt(this.controls.target);
        this.controls.update();
      },
      onComplete: () => {
        this.isTweening = false;
        this.activeTween = null;
        this.controls.update();
        this.lastInteractionTime = Date.now();
      },
    });

    tl.to(animState, {
      radius: targetSph.radius,
      phi: targetSph.phi,
      theta: finalTheta,
      duration: 0.8,
      ease: 'power2.inOut',
    });

    this.activeTween = tl;
  }

  // Flips board perspective 180 degrees for active player turn using GSAP timeline spherical interpolation
  public flipBoardToColor(color: PieceColor, duration: number = 0.9) {
    this.currentOrientationColor = color;

    this.updateAzimuthConstraints();

    const isPortrait = this.container.clientWidth / (this.container.clientHeight || 1) < 1.0;
    const targetPos = this.getPresetPosition(this.currentPreset, color, isPortrait);

    // Compute target-relative spherical coordinates relative to board's center target
    const targetRelPos = targetPos.clone().sub(this.controls.target);
    const targetSph = new THREE.Spherical().setFromVector3(targetRelPos);

    // Compute current camera position spherical coordinates
    const currentRelPos = this.camera.position.clone().sub(this.controls.target);
    const currentSph = new THREE.Spherical().setFromVector3(currentRelPos);

    // Calculate shortest angular arc delta for theta rotation around board center
    let deltaTheta = targetSph.theta - currentSph.theta;
    while (deltaTheta > Math.PI) deltaTheta -= Math.PI * 2;
    while (deltaTheta < -Math.PI) deltaTheta += Math.PI * 2;
    if (Math.abs(Math.abs(deltaTheta) - Math.PI) < 0.02) {
      deltaTheta = Math.PI;
    }
    const finalTheta = currentSph.theta + deltaTheta;

    if (this.activeTween) this.activeTween.kill();
    this.isTweening = true;

    const animState = {
      radius: currentSph.radius,
      phi: currentSph.phi,
      theta: currentSph.theta,
    };

    // GSAP Timeline sequencing camera rotation and distance reset
    const tl = gsap.timeline({
      onUpdate: () => {
        const sph = new THREE.Spherical(animState.radius, animState.phi, animState.theta);
        if (isNaN(sph.radius) || isNaN(sph.phi) || isNaN(sph.theta)) return;
        const pos = new THREE.Vector3().setFromSpherical(sph).add(this.controls.target);
        this.camera.position.copy(pos);
        this.camera.lookAt(this.controls.target);
        this.controls.update();
      },
      onComplete: () => {
        this.isTweening = false;
        this.activeTween = null;
        this.controls.update();
        this.lastInteractionTime = Date.now();
      },
    });

    tl.to(animState, {
      radius: targetSph.radius,
      phi: targetSph.phi,
      theta: finalTheta,
      duration: duration,
      ease: 'power2.inOut',
    });

    this.activeTween = tl;
  }

  // Auto-recenter camera to Standard View preset position using spherical arc
  public recenterToStandardPreset(animated: boolean = true) {
    const isPortrait = this.container.clientWidth / (this.container.clientHeight || 1) < 1.0;
    const targetPos = this.getPresetPosition('standard', this.currentOrientationColor, isPortrait);

    if (this.camera.position.distanceTo(targetPos) < 0.15) return;

    const targetRelPos = targetPos.clone().sub(this.controls.target);
    const targetSph = new THREE.Spherical().setFromVector3(targetRelPos);

    const currentRelPos = this.camera.position.clone().sub(this.controls.target);
    const currentSph = new THREE.Spherical().setFromVector3(currentRelPos);

    let deltaTheta = targetSph.theta - currentSph.theta;
    while (deltaTheta > Math.PI) deltaTheta -= Math.PI * 2;
    while (deltaTheta < -Math.PI) deltaTheta += Math.PI * 2;
    const finalTheta = currentSph.theta + deltaTheta;

    if (this.activeTween) this.activeTween.kill();
    this.isTweening = true;

    const animState = {
      radius: currentSph.radius,
      phi: currentSph.phi,
      theta: currentSph.theta,
    };

    const tl = gsap.timeline({
      onUpdate: () => {
        const sph = new THREE.Spherical(animState.radius, animState.phi, animState.theta);
        if (isNaN(sph.radius) || isNaN(sph.phi) || isNaN(sph.theta)) return;
        const pos = new THREE.Vector3().setFromSpherical(sph).add(this.controls.target);
        this.camera.position.copy(pos);
        this.camera.lookAt(this.controls.target);
        this.controls.update();
      },
      onComplete: () => {
        this.isTweening = false;
        this.activeTween = null;
        this.controls.update();
        this.lastInteractionTime = Date.now();
      },
    });

    tl.to(animState, {
      radius: targetSph.radius,
      phi: targetSph.phi,
      theta: finalTheta,
      duration: animated ? 0.75 : 0.01,
      ease: 'power2.out',
    });

    this.activeTween = tl;
  }

  // Rotate camera incrementally by angle radians (e.g. 45° left or right)
  public rotateByAngle(angleDeltaRadians: number) {
    const target = this.controls.target;
    const relPos = this.camera.position.clone().sub(target);
    const currentSph = new THREE.Spherical().setFromVector3(relPos);
    const finalTheta = currentSph.theta + angleDeltaRadians;

    if (this.activeTween) this.activeTween.kill();
    this.isTweening = true;

    const animState = {
      radius: currentSph.radius,
      phi: currentSph.phi,
      theta: currentSph.theta,
    };

    const tl = gsap.timeline({
      onUpdate: () => {
        const sph = new THREE.Spherical(animState.radius, animState.phi, animState.theta);
        if (isNaN(sph.radius) || isNaN(sph.phi) || isNaN(sph.theta)) return;
        const pos = new THREE.Vector3().setFromSpherical(sph).add(target);
        this.camera.position.copy(pos);
        this.camera.lookAt(target);
        this.controls.update();
      },
      onComplete: () => {
        this.isTweening = false;
        this.activeTween = null;
        this.controls.update();
        this.lastInteractionTime = Date.now();
      },
    });

    tl.to(animState, {
      theta: finalTheta,
      duration: 0.5,
      ease: 'power2.out',
    });

    this.activeTween = tl;
  }

  public playIntroSweep() {
    const isPortrait = this.container.clientWidth / (this.container.clientHeight || 1) < 1.0;
    const targetPos = this.getPresetPosition('standard', this.currentOrientationColor, isPortrait);
    const targetRelPos = targetPos.clone().sub(this.controls.target);
    const targetSph = new THREE.Spherical().setFromVector3(targetRelPos);

    const startSph = new THREE.Spherical(16.0, 1.1, targetSph.theta - Math.PI / 4);

    if (this.activeTween) this.activeTween.kill();
    this.isTweening = true;

    const animState = {
      radius: startSph.radius,
      phi: startSph.phi,
      theta: startSph.theta,
    };

    const pos = new THREE.Vector3().setFromSpherical(startSph).add(this.controls.target);
    this.camera.position.copy(pos);
    this.camera.lookAt(this.controls.target);
    this.controls.update();

    const tl = gsap.timeline({
      onUpdate: () => {
        const sph = new THREE.Spherical(animState.radius, animState.phi, animState.theta);
        if (isNaN(sph.radius) || isNaN(sph.phi) || isNaN(sph.theta)) return;
        const p = new THREE.Vector3().setFromSpherical(sph).add(this.controls.target);
        this.camera.position.copy(p);
        this.camera.lookAt(this.controls.target);
        this.controls.update();
      },
      onComplete: () => {
        this.isTweening = false;
        this.activeTween = null;
        this.controls.update();
        this.lastInteractionTime = Date.now();
      },
    });

    tl.to(animState, {
      radius: targetSph.radius,
      phi: targetSph.phi,
      theta: targetSph.theta,
      duration: 1.2,
      ease: 'power2.out',
    });

    this.activeTween = tl;
  }

  // Check effect: Subtle camera zoom-in (8% closer) and quick smooth recovery
  public animateCheckPulse() {
    if (this.isTweening) return;

    const currentRelPos = this.camera.position.clone().sub(this.controls.target);
    const currentSph = new THREE.Spherical().setFromVector3(currentRelPos);

    const zoomRadius = Math.max(CAMERA_MIN_DIST, currentSph.radius * 0.92);

    const animState = {
      radius: currentSph.radius,
    };

    if (this.activeTween) this.activeTween.kill();
    this.isTweening = true;

    const tl = gsap.timeline({
      onUpdate: () => {
        const sph = new THREE.Spherical(animState.radius, currentSph.phi, currentSph.theta);
        if (isNaN(sph.radius)) return;
        const p = new THREE.Vector3().setFromSpherical(sph).add(this.controls.target);
        this.camera.position.copy(p);
        this.camera.lookAt(this.controls.target);
        this.controls.update();
      },
      onComplete: () => {
        this.isTweening = false;
        this.activeTween = null;
        this.controls.update();
      },
    });

    tl.to(animState, {
      radius: zoomRadius,
      duration: 0.35,
      ease: 'power2.out',
    }).to(animState, {
      radius: currentSph.radius,
      duration: 0.45,
      ease: 'power2.inOut',
    });

    this.activeTween = tl;
  }

  // Checkmate / Victory effect: Dramatic slow orbit around the board
  public animateVictoryView() {
    const isPortrait = this.container.clientWidth / (this.container.clientHeight || 1) < 1.0;
    const targetPos = new THREE.Vector3(0, 6.5, isPortrait ? 10.0 : 8.5);
    const targetRelPos = targetPos.clone().sub(this.controls.target);
    const targetSph = new THREE.Spherical().setFromVector3(targetRelPos);

    const currentRelPos = this.camera.position.clone().sub(this.controls.target);
    const currentSph = new THREE.Spherical().setFromVector3(currentRelPos);

    if (this.activeTween) this.activeTween.kill();
    this.isTweening = true;

    const animState = {
      radius: currentSph.radius,
      phi: currentSph.phi,
      theta: currentSph.theta,
    };

    const tl = gsap.timeline({
      onUpdate: () => {
        const sph = new THREE.Spherical(animState.radius, animState.phi, animState.theta);
        if (isNaN(sph.radius) || isNaN(sph.phi) || isNaN(sph.theta)) return;
        const p = new THREE.Vector3().setFromSpherical(sph).add(this.controls.target);
        this.camera.position.copy(p);
        this.camera.lookAt(this.controls.target);
        this.controls.update();
      },
      onComplete: () => {
        this.isTweening = false;
        this.activeTween = null;
        this.controls.update();
      },
    });

    tl.to(animState, {
      radius: targetSph.radius,
      phi: targetSph.phi,
      theta: currentSph.theta + Math.PI * 0.75, // Slow dramatic 135° orbit around board
      duration: 3.2,
      ease: 'power1.inOut',
    });

    this.activeTween = tl;
  }

  public rotateLeft() {
    this.rotateByAngle(Math.PI / 4); // 45° left
  }

  public rotateRight() {
    this.rotateByAngle(-Math.PI / 4); // 45° right
  }

  public resetCamera() {
    this.recenterToStandardPreset(true);
  }

  // Smoothly recenters camera after move execution
  public recenterAfterMove() {
    this.recenterToStandardPreset(true);
  }

  // Frame update called from main render loop
  public update() {
    if (this.isTweening) {
      return;
    }

    this.controls.update();
    this.clampCameraToBounds();
  }

  // Anti-occlusion: Fades out piece meshes that physically block view lines to legal move tiles
  public updateAntiOcclusion(
    pieceMeshes: Map<string, THREE.Mesh>,
    targetPositions: THREE.Vector3[]
  ) {
    this.restoreFadedPieces();

    if (targetPositions.length === 0) return;

    const raycaster = new THREE.Raycaster();
    const camPos = this.camera.position.clone();
    const meshesToCheck: THREE.Mesh[] = Array.from(pieceMeshes.values());

    targetPositions.forEach((destPos) => {
      const dir = destPos.clone().sub(camPos);
      const dist = dir.length();
      if (dist <= 0.2) return;
      dir.normalize();

      raycaster.set(camPos, dir);
      raycaster.far = dist - 0.2; // Only check objects between camera and target

      const intersects = raycaster.intersectObjects(meshesToCheck, true);
      intersects.forEach((hit) => {
        let parentMesh: THREE.Mesh | null = null;
        if (hit.object instanceof THREE.Mesh) {
          parentMesh = hit.object;
        } else if (hit.object.parent instanceof THREE.Mesh) {
          parentMesh = hit.object.parent;
        }

        if (parentMesh && !this.fadedPieceMeshes.includes(parentMesh)) {
          this.fadedPieceMeshes.push(parentMesh);
          const mat = parentMesh.material;
          if (Array.isArray(mat)) {
            mat.forEach((m) => {
              m.transparent = true;
              gsap.to(m, { opacity: 0.35, duration: 0.2 });
            });
          } else if (mat) {
            mat.transparent = true;
            gsap.to(mat, { opacity: 0.35, duration: 0.2 });
          }
        }
      });
    });
  }

  // Restores opacity of all temporarily faded blocking pieces
  public restoreFadedPieces() {
    this.fadedPieceMeshes.forEach((mesh) => {
      const mat = mesh.material;
      if (Array.isArray(mat)) {
        mat.forEach((m) => {
          gsap.to(m, {
            opacity: 1.0,
            duration: 0.2,
            onComplete: () => {
              m.transparent = false;
            },
          });
        });
      } else if (mat) {
        gsap.to(mat, {
          opacity: 1.0,
          duration: 0.2,
          onComplete: () => {
            mat.transparent = false;
          },
        });
      }
    });
    this.fadedPieceMeshes = [];
  }
}

