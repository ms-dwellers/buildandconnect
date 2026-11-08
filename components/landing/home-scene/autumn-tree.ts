import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

/** Unit-height low-poly autumn tree from `public/assets/home-scene/autumn-tree.glb`. */
export const AUTUMN_TREE_SRC = "/assets/home-scene/autumn-tree.glb";

let templatePromise: Promise<THREE.Group> | null = null;

/**
 * Source FBX keeps the mesh above y=0 and offset on xz. Bake a unit-height,
 * grounded, centred tree into `root` so the backdrop's outer `scale.setScalar`
 * (which overwrites the wrapper) still plants trunks on the ground.
 */
export function groundAutumnTree(root: THREE.Object3D): THREE.Group {
  const wrapper = new THREE.Group();
  wrapper.add(root);
  wrapper.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(wrapper);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  if (size.y < 1e-6) return wrapper;
  const scale = 1 / size.y;
  root.position.set(
    -center.x * scale,
    -box.min.y * scale,
    -center.z * scale,
  );
  root.scale.setScalar(scale);
  wrapper.updateMatrixWorld(true);
  return wrapper;
}

/**
 * Load once and cache. The template is grounded and scaled to height 1 so
 * callers can `scale.setScalar(height)`.
 */
export function loadAutumnTreeTemplate(): Promise<THREE.Group> {
  if (!templatePromise) {
    templatePromise = new GLTFLoader()
      .loadAsync(AUTUMN_TREE_SRC)
      .then((gltf) => groundAutumnTree(gltf.scene))
      .catch((error) => {
        templatePromise = null;
        throw error;
      });
  }
  return templatePromise;
}

function pickLeafMaterial(
  name: string,
  materials: {
    orange: THREE.Material;
    yellow: THREE.Material;
    brown: THREE.Material;
  },
) {
  const key = name.toLowerCase();
  if (key.includes("yellow")) return materials.yellow;
  if (key.includes("brown")) return materials.brown;
  return materials.orange;
}

/** Deep-clone the template and give this instance its own shared autumn materials. */
export function instanceAutumnTree(
  template: THREE.Group,
  materials: {
    orange: THREE.Material;
    yellow: THREE.Material;
    brown: THREE.Material;
  },
): THREE.Group {
  const tree = template.clone(true);
  tree.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const listed = Array.isArray(object.material)
      ? object.material
      : [object.material];
    const next = listed.map((material) =>
      pickLeafMaterial(material?.name ?? "", materials),
    );
    object.material = next.length === 1 ? next[0]! : next;
  });
  return tree;
}
