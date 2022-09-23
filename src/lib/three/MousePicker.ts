import {
  Camera,
  MeshLambertMaterial,
  MeshPhongMaterial,
  MeshStandardMaterial,
  MeshToonMaterial,
  PerspectiveCamera,
  Raycaster,
  Scene,
  WebGLRenderer,
  WebGLRenderTarget,
} from 'three';

export class MaterialChecker {
  /**
   * Check material include emissive
   * @param material
   */
  checkMaterial(
    material:
      | MeshStandardMaterial
      | MeshToonMaterial
      | MeshPhongMaterial
      | MeshLambertMaterial
      | null
  ): material is MeshStandardMaterial {
    return (
      material instanceof MeshStandardMaterial ||
      material instanceof MeshToonMaterial ||
      material instanceof MeshPhongMaterial ||
      material instanceof MeshLambertMaterial
    );
  }
}

export class MousePicker {
  raycaster = new Raycaster();
  checker = new MaterialChecker();

  pick(
    normalizePosition: { x: number; y: number },
    scene: Scene,
    camera: Camera
  ) {
    this.raycaster.setFromCamera(normalizePosition, camera);
    // Save closet object
    const intersectObjects = this.raycaster.intersectObjects(scene.children);
    return intersectObjects[0]?.object;
  }

  checkMaterial(
    material:
      | MeshStandardMaterial
      | MeshToonMaterial
      | MeshPhongMaterial
      | MeshLambertMaterial
      | null
  ): material is MeshStandardMaterial {
    return this.checker.checkMaterial(material);
  }
}

export class GPUPicker {
  // 创建一个 1px 的渲染目标
  pickingTextur = new WebGLRenderTarget(1, 1);
  pixelBuffer = new Uint8Array(4);
  checker = new MaterialChecker();

  constructor(
    public renderer: WebGLRenderer,
    public idToObject: { [key: string]: THREE.Mesh }
  ) {}

  pick(
    cssPosition: { x: number; y: number },
    scene: Scene,
    camera: PerspectiveCamera
  ) {
    const { pickingTextur: pickingTexture, pixelBuffer, renderer } = this;

    // set the view offset to represent just a single pixel under the mouse
    const pixelRatio = renderer.getPixelRatio();
    camera.setViewOffset(
      renderer.getContext().drawingBufferWidth, // full width
      renderer.getContext().drawingBufferHeight, // full top
      (cssPosition.x * pixelRatio) | 0, // rect x
      (cssPosition.y * pixelRatio) | 0, // rect y
      1, // rect width
      1 // rect height
    );
    // render the scene
    renderer.setRenderTarget(pickingTexture);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    // clear the view offset so rendering returns to normal
    camera.clearViewOffset();
    //read the pixel
    renderer.readRenderTargetPixels(
      pickingTexture,
      0, // x
      0, // y
      1, // width
      1, // height
      pixelBuffer
    );

    const id = (pixelBuffer[0] << 16) | (pixelBuffer[1] << 8) | pixelBuffer[2];
    const intersectedObject = this.idToObject[id];
    return intersectedObject;
  }

  checkMaterial(
    material:
      | MeshStandardMaterial
      | MeshToonMaterial
      | MeshPhongMaterial
      | MeshLambertMaterial
      | null
  ): material is MeshStandardMaterial {
    return this.checker.checkMaterial(material);
  }
}
