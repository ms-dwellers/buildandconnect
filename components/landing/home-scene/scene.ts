import * as THREE from "three";
import {
  SCENE,
  approachProgress,
  cameraRig,
  lerpVec3,
  restPose,
  screenBlend,
  screenPose,
  type CameraRig,
  type Pose,
  type SceneTokens,
} from "@/lib/home-scene";
import { createFirepitTexture } from "./firepit-texture";
import {
  buildContactShadow,
  buildMonitor,
  buildSideTable,
  buildTaskChair,
  buildWoodenChair,
  type Materials,
} from "./furniture";

export type PickTarget = "developer" | "partner" | "monitor";
export type LabelTarget = Exclude<PickTarget, "monitor">;

/**
 * How the canvas grows during the approach: from its box on the page (viewport
 * coordinates) to the whole viewport. The camera keeps the furniture where it
 * was on screen while the frame expands around it.
 */
export type ApproachExpansion = {
  box: { x: number; y: number; width: number; height: number };
  viewport: { width: number; height: number };
};

export type HomeSceneController = {
  resize(width: number, height: number, pixelRatio: number): void;
  /** Normalised pointer position (-1..1) for the parallax; (0, 0) when away. */
  setPointer(x: number, y: number): void;
  pick(x: number, y: number): PickTarget | null;
  setHover(target: PickTarget | null): void;
  setMotion(enabled: boolean): void;
  startApproach(now: number, expansion?: ApproachExpansion): void;
  resetApproach(now: number): void;
  /** Draws a frame; returns true when another frame is wanted. */
  render(now: number): boolean;
  /** CSS-pixel position of a chair's action anchor, or null when off-screen. */
  project(target: LabelTarget): { x: number; y: number } | null;
  dispose(): void;
};

const RESET_MS = 400;
const Y_AXIS = new THREE.Vector3(0, 1, 0);

export function createHomeScene(
  canvas: HTMLCanvasElement,
  tokens: SceneTokens,
  options: { approachMs: number; cityName: string; fontFamily: string },
): HomeSceneController {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "low-power",
  });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Token colours must survive unchanged; tone mapping would shift them.
  renderer.toneMapping = THREE.NoToneMapping;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(SCENE.fov, 1, 0.1, 50);
  const standard = (
    hex: string,
    extra: THREE.MeshStandardMaterialParameters = {},
  ) =>
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(hex),
      roughness: 0.78,
      metalness: 0,
      flatShading: true,
      ...extra,
    });
  const materials: Materials = {
    fabric: standard(tokens.fabric),
    cushion: standard(tokens.cushion),
    wood: standard(tokens.wood),
    woodEdge: standard(tokens.woodEdge),
    metal: standard(tokens.metal, {
      roughness: 0.35,
      metalness: 0.55,
      flatShading: false,
    }),
    metalEdge: standard(tokens.metalEdge, {
      roughness: 0.3,
      metalness: 0.6,
      flatShading: false,
    }),
    bezel: standard(tokens.bezel, {
      roughness: 0.4,
      metalness: 0.1,
      flatShading: false,
    }),
  };
  const firepit = createFirepitTexture(tokens, options);
  const screenMaterial = firepit
    ? new THREE.MeshBasicMaterial({ map: firepit.texture, toneMapped: false })
    : new THREE.MeshBasicMaterial({
        color: new THREE.Color(tokens.pine),
        toneMapped: false,
      });

  scene.add(
    new THREE.HemisphereLight(
      new THREE.Color(tokens.background),
      new THREE.Color(tokens.mint),
      1.1,
    ),
  );
  const key = new THREE.DirectionalLight(
    new THREE.Color(tokens.background),
    1.4,
  );
  key.position.set(3, 5, 4);
  const fill = new THREE.DirectionalLight(
    new THREE.Color(tokens.background),
    0.35,
  );
  fill.position.set(-4, 2, -2);
  scene.add(key, fill);

  const developer = buildTaskChair(materials);
  developer.position.set(-SCENE.chairOffset, 0, SCENE.chairDepth);
  developer.rotation.y = SCENE.chairYaw;
  const partner = buildWoodenChair(materials);
  partner.position.set(SCENE.chairOffset, 0, SCENE.chairDepth);
  partner.rotation.y = -SCENE.chairYaw;
  const table = buildSideTable(materials);
  table.position.set(0, 0, SCENE.tableDepth);
  const monitor = buildMonitor(materials, screenMaterial);
  monitor.position.set(0, 0, SCENE.screen.center[2] - 0.019);
  const shadows = [
    buildContactShadow(
      0.95,
      0.95,
      tokens.shadow,
      -SCENE.chairOffset,
      SCENE.chairDepth,
    ),
    buildContactShadow(
      0.95,
      0.95,
      tokens.shadow,
      SCENE.chairOffset,
      SCENE.chairDepth,
    ),
    buildContactShadow(1.2, 0.8, tokens.shadow, 0, SCENE.tableDepth),
  ].filter((shadow): shadow is THREE.Mesh => shadow !== null);
  scene.add(developer, partner, table, monitor, ...shadows);

  const groups: Record<PickTarget, THREE.Group> = {
    developer,
    partner,
    monitor,
  };
  const pickables = [developer, partner, monitor];
  const raycaster = new THREE.Raycaster();
  const pointerNdc = new THREE.Vector2();
  const offset = new THREE.Vector3();
  const anchor = new THREE.Vector3();

  let width = 1;
  let height = 1;
  let aspect = 1;
  let rig: CameraRig = cameraRig(aspect);
  let motion = true;
  const pointer = { x: 0, y: 0 };
  const parallax = { x: 0, y: 0 };
  let approach: {
    start: number;
    from: Pose;
    to: Pose;
    expansion: ApproachExpansion | null;
  } | null = null;
  let reset: { pose: Pose; start: number } | null = null;
  let currentPose: Pose = restPose(rig);

  function applyPose(pose: Pose, yaw: number, pitch: number) {
    const [tx, ty, tz] = pose.target;
    offset.set(
      pose.position[0] - tx,
      pose.position[1] - ty,
      pose.position[2] - tz,
    );
    if (yaw) offset.applyAxisAngle(Y_AXIS, yaw);
    if (pitch) offset.y += Math.tan(pitch) * offset.length();
    camera.position.set(tx + offset.x, ty + offset.y, tz + offset.z);
    camera.lookAt(tx, ty, tz);
    currentPose = {
      position: [camera.position.x, camera.position.y, camera.position.z],
      target: pose.target,
    };
  }

  /**
   * While the canvas grows from its box to the viewport, render the box's
   * original framing through a view offset so the furniture stays put, and
   * relax that offset to a plain full-viewport projection as the dolly ends.
   */
  function applyExpansion(expansion: ApproachExpansion, progress: number) {
    const { box, viewport } = expansion;
    const fullWidth = box.width + (viewport.width - box.width) * progress;
    const fullHeight = box.height + (viewport.height - box.height) * progress;
    camera.aspect = fullWidth / fullHeight;
    camera.setViewOffset(
      fullWidth,
      fullHeight,
      -box.x * (1 - progress),
      -box.y * (1 - progress),
      viewport.width,
      viewport.height,
    );
    camera.updateProjectionMatrix();
  }

  function render(now: number) {
    let wantsFrame = false;
    let blend = 0;
    if (approach) {
      const progress = approachProgress(
        now - approach.start,
        options.approachMs,
      );
      if (approach.expansion) applyExpansion(approach.expansion, progress);
      applyPose(
        {
          position: lerpVec3(
            approach.from.position,
            approach.to.position,
            progress,
          ),
          target: lerpVec3(approach.from.target, approach.to.target, progress),
        },
        0,
        0,
      );
      blend = screenBlend(progress);
      wantsFrame = progress < 1;
    } else if (reset) {
      const t = Math.min(1, (now - reset.start) / RESET_MS);
      const eased = t * t * (3 - 2 * t);
      const rest = restPose(rig);
      applyPose(
        {
          position: lerpVec3(reset.pose.position, rest.position, eased),
          target: lerpVec3(reset.pose.target, rest.target, eased),
        },
        0,
        0,
      );
      wantsFrame = t < 1;
      if (!wantsFrame) reset = null;
    } else {
      let yaw = 0;
      let pitch = 0;
      if (motion) {
        const seconds = now / 1000;
        parallax.x +=
          (THREE.MathUtils.degToRad(1.5) * pointer.x - parallax.x) * 0.06;
        parallax.y +=
          (THREE.MathUtils.degToRad(0.8) * -pointer.y - parallax.y) * 0.06;
        yaw =
          THREE.MathUtils.degToRad(1.5) *
            Math.sin((2 * Math.PI * seconds) / 14) +
          parallax.x;
        pitch =
          THREE.MathUtils.degToRad(0.5) *
            Math.sin((2 * Math.PI * seconds) / 9) +
          parallax.y;
      }
      applyPose(restPose(rig), yaw, pitch);
      wantsFrame = motion;
    }
    firepit?.draw(now, blend, motion);
    renderer.render(scene, camera);
    return wantsFrame;
  }

  return {
    resize(nextWidth, nextHeight, pixelRatio) {
      width = Math.max(1, nextWidth);
      height = Math.max(1, nextHeight);
      aspect = width / height;
      rig = cameraRig(aspect);
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(width, height, false);
    },
    setPointer(x, y) {
      pointer.x = Math.max(-1, Math.min(1, x));
      pointer.y = Math.max(-1, Math.min(1, y));
    },
    pick(x, y) {
      pointerNdc.set(x, y);
      raycaster.setFromCamera(pointerNdc, camera);
      const hit = raycaster.intersectObjects(pickables, true)[0];
      let object: THREE.Object3D | null = hit?.object ?? null;
      while (object && !object.userData.id) object = object.parent;
      const id = object?.userData.id;
      return id === "developer" || id === "partner" || id === "monitor"
        ? id
        : null;
    },
    setHover(target) {
      for (const [id, group] of Object.entries(groups) as [
        PickTarget,
        THREE.Group,
      ][])
        group.position.y = id === target ? 0.015 : 0;
    },
    setMotion(enabled) {
      motion = enabled;
      if (!enabled) {
        parallax.x = 0;
        parallax.y = 0;
      }
    },
    startApproach(now, expansion) {
      const endAspect = expansion
        ? expansion.viewport.width / expansion.viewport.height
        : aspect;
      approach = {
        start: now,
        from: currentPose,
        to: screenPose(rig, endAspect),
        expansion: expansion ?? null,
      };
      reset = null;
      this.setHover(null);
    },
    resetApproach(now) {
      if (!approach) return;
      approach = null;
      camera.clearViewOffset();
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      reset = { pose: currentPose, start: now };
    },
    render,
    project(target) {
      const [x, y, z] = SCENE.labelAnchors[target];
      anchor.set(x, y, z).project(camera);
      if (anchor.z > 1) return null;
      return {
        x: ((anchor.x + 1) / 2) * width,
        y: ((1 - anchor.y) / 2) * height,
      };
    },
    dispose() {
      const disposed = new Set<THREE.Material | THREE.Texture>();
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        const list = Array.isArray(object.material)
          ? object.material
          : [object.material];
        for (const material of list) {
          if (disposed.has(material)) continue;
          disposed.add(material);
          const map = (material as THREE.MeshBasicMaterial).map;
          if (map && !disposed.has(map)) {
            disposed.add(map);
            map.dispose();
          }
          material.dispose();
        }
      });
      firepit?.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
