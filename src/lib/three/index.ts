import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import ResourceTracker, { Disposable } from 'lib/three/ResourceTracker';
import { Vector3 } from 'three';
import Stats from 'stats.js';

class SceneWithTracker extends THREE.Scene {
  constructor(private tracker: ResourceTracker<Disposable>) {
    super();
  }

  add(...object: THREE.Object3D<THREE.Event>[]): this {
    super.add(...object);
    this.tracker.track(...object);
    return this;
  }
}

export type ThreeProps = {
  rotateInversion?: boolean;
  antialias?: boolean;
  renderOnDemand?: boolean;
  width?: number;
  height?: number;
  alpha?: boolean;
  canvas?: HTMLCanvasElement | null;
};

export const defaultProps: Partial<ThreeProps> = {
  rotateInversion: false,
  antialias: true,
  renderOnDemand: false,
  alpha: false,
};

class RUAThree {
  tracker = new ResourceTracker();

  scene = new SceneWithTracker(this.tracker);
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  stats: Stats | null = null;

  private width: number | null | undefined = null;
  private height: number | null | undefined = null;
  protected cameraWidth = window.innerWidth;
  protected cameraHeight = window.innerHeight;

  constructor({
    rotateInversion,
    antialias,
    renderOnDemand,
    width,
    height,
    alpha,
    canvas,
  }: ThreeProps) {
    this.width = width;
    this.height = height;
    this.cameraWidth = this.width ?? window.innerWidth;
    this.cameraHeight = this.height ?? window.innerHeight;

    this.renderer = new THREE.WebGLRenderer({
      antialias,
      alpha,
      canvas: canvas ?? undefined,
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(this.cameraWidth, this.cameraHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // renderer.outputEncoding = THREE.sRGBEncoding;

    this.camera = new THREE.PerspectiveCamera(
      50,
      this.cameraWidth / this.cameraHeight,
      0.1,
      1000
    );

    this.controls = new OrbitControls(this.camera, canvas ?? undefined);
    this.controls.enableDamping = true;
    // Set controls rotate inversion must be in constructor.
    if (rotateInversion) this.controls.rotateSpeed *= -1;
    this.controls.update();

    this.renderOnDemand = renderOnDemand ?? true;

    this.render = this.render.bind(this);
    this.requestRender = this.requestRender.bind(this);
    this.onWindowResize = this.onWindowResize.bind(this);

    if (this.renderOnDemand) {
      this.controls.addEventListener('change', this.requestRender);
      this.requestRender();
    } else {
      requestAnimationFrame(this.render);
    }

    window.addEventListener('resize', this.onWindowResize);

    if (process.env.NODE_ENV === 'development') {
      this.tracker.debug = true;

      this.stats = new Stats();
      document.body.appendChild(this.stats.dom);
    }
  }

  private renderQueue: ((time: DOMHighResTimeStamp) => void)[] = [];
  private renderOnDemand = true;
  private renderRequested = false;

  private time: DOMHighResTimeStamp = 0;
  private render(time: DOMHighResTimeStamp) {
    this.renderRequested = false;
    this.time = time *= 0.001;
    this.renderer.render(this.scene, this.camera);
    this.controls.update();
    this.renderQueue.map((cb) => cb(this.time));
    this.stats && this.stats.update();

    !this.renderOnDemand && requestAnimationFrame(this.render);
  }

  private requestRender() {
    if (this.renderRequested) return;
    this.renderRequested = true;
    requestAnimationFrame(this.render);
  }

  private onWindowResize() {
    this.cameraWidth = this.width ?? window.innerWidth;
    this.cameraHeight = this.height ?? window.innerHeight;
    this.camera.aspect = this.cameraWidth / this.cameraHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.cameraWidth, this.cameraHeight);
    this.render(this.time);
  }

  /**
   * Add render funtion into requestAnimationFrame.
   *
   * callback time is `DOMHighResTimeStamp * 0.001`
   * @param cb `(time: number) => void`
   */
  addRenderCallback(cb: (time: number) => void) {
    this.renderQueue.push(cb);
  }

  frameArea(
    sizeToFitOnScreen: number,
    boxSize: number,
    boxCenter: Vector3,
    camera: THREE.PerspectiveCamera
  ) {
    const halfSizeToFitOnScreen = sizeToFitOnScreen * 0.5;
    const halfFovY = THREE.MathUtils.degToRad(camera.fov * 0.5);
    const distance = halfSizeToFitOnScreen / Math.tan(halfFovY);
    // compute a unit vector that points in the direction the camera is now
    // in the xz plane from the center of the box
    const direction = new THREE.Vector3()
      .subVectors(camera.position, boxCenter)
      .multiply(new THREE.Vector3(1, 0, 1))
      .normalize();

    // move the camera to a position distance units way from the center
    // in whatever direction the camera was from the center already
    camera.position.copy(direction.multiplyScalar(distance).add(boxCenter));

    console.log(boxCenter);

    // pick some near and far values for the frustum that
    // will contain the box.
    camera.near = boxSize / 100;
    camera.far = boxSize * 100;

    camera.updateProjectionMatrix();

    // point the camera to look at the center of the box
    camera.lookAt(boxCenter.x, boxCenter.y, boxCenter.z);
  }

  clear() {
    this.tracker.dispose();
    this.scene.clear();
    window.removeEventListener('resize', this.onWindowResize);
    this.stats?.dom.remove();
  }
}

export default RUAThree;
export { THREE };
