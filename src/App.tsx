import TWEEN from '@tweenjs/tween.js';
import world from 'assets/world.png';
import LinkLine from 'components/LinkLine';
import {
  getCanvasRelativePosition,
  InitFn,
  MousePicker,
  THREE,
  useThree,
} from 'rua-three';
import {
  calcPos,
  DEG2RAD,
  getImageData,
  randomIntFromInterval,
  visibilityForCoordinate,
} from 'utils';
import haloFragment from './lib/shaders/haloFragment.glsl';
import haloVertex from './lib/shaders/haloVertex.glsl';

const GLOBE_RADIUS = 25;
// Globe map 的纵向像素
const worldDotRows = 200;
const worldDotSize = 0.095;

const destNumber = 10;
const destColor = 0xf957ff;
const dotSize = worldDotSize * 3;

const App = () => {
  const init: InitFn = ({ scene, camera, controls, addRenderCallback }) => {
    camera.position.set(0, 10, 100);
    controls.enableZoom = false;
    controls.enablePan = false;
    scene.background = new THREE.Color(0x040d21);

    // Globe map
    const img = document.createElement('img');
    img.src = world;
    img.crossOrigin = 'Anonymous';

    // parent container is dots's container
    const parentContainer = new THREE.Group();
    const euler = new THREE.Euler(0.3, 4.6, 0.05);
    const offset = new Date().getTimezoneOffset() || 0;
    euler.y = euler.y + Math.PI * (offset / 720);
    parentContainer.rotation.copy(euler);
    scene.add(parentContainer);

    const haloContainer = new THREE.Group();

    // Globe
    const spGeo = new THREE.SphereGeometry(GLOBE_RADIUS, 55, 55);
    const material = new THREE.MeshStandardMaterial({
      color: 1513012,
      metalness: 0,
      roughness: 0.9,
    });
    const sphereGroup = new THREE.Group();
    const sphere = new THREE.Mesh(spGeo, material);
    sphere.renderOrder = 1;
    sphereGroup.add(sphere);
    scene.add(sphere);

    // lights
    const lightAmb = new THREE.AmbientLight(16777215, 0.8);
    const lightSpot1 = new THREE.SpotLight(2197759, 28, 120, 0.3, 0, 1.1);
    const lightSpot2 = new THREE.SpotLight(16018366, 16, 75, 0.5, 0, 1.25);
    const lightDir = new THREE.DirectionalLight(11124735, 10);
    lightSpot1.position.set(
      parentContainer.position.x - 2.5 * GLOBE_RADIUS,
      80,
      -40
    );
    lightSpot2.position.set(
      parentContainer.position.x + GLOBE_RADIUS,
      GLOBE_RADIUS,
      2 * GLOBE_RADIUS
    );
    lightSpot2.distance = 75; // * t
    lightDir.position.set(
      parentContainer.position.x - 50,
      parentContainer.position.y + 30,
      10
    );
    lightSpot1.target = parentContainer;
    lightSpot2.target = parentContainer;
    lightDir.target = parentContainer;
    camera.add(lightAmb, lightSpot1, lightSpot2);
    scene.add(camera);

    // Dots
    const linkInstance: LinkLine[] = [];
    img.onload = () => {
      const point = new THREE.Object3D();
      const imgData = getImageData(img);
      const points: THREE.Matrix4[] = [];
      for (let lat = -90; lat <= 90; lat += 180 / worldDotRows) {
        const radius = Math.cos(Math.abs(lat) * DEG2RAD) * GLOBE_RADIUS;
        const circum = radius * Math.PI * 2 * 2;
        for (let r = 0; r < circum; r++) {
          const lng = (360 * r) / circum - 180;
          if (!visibilityForCoordinate(lng, lat, imgData)) continue;
          const s = calcPos(lat, lng, GLOBE_RADIUS);
          point.position.set(s.x, s.y, s.z);
          const o = calcPos(lat, lng, GLOBE_RADIUS + 5);
          point.lookAt(o.x, o.y, o.z);
          point.updateMatrix();
          points.push(point.matrix.clone());
        }
      }
      const dot = new THREE.CircleGeometry(worldDotSize, 6);
      const dotMat = new THREE.MeshLambertMaterial({
        color: 3818644,
        transparent: !0,
        alphaTest: 0.02,
      });

      const pointsLen = points.length;
      // Use InstancedMesh if you have to render a large number of objects
      // with the same geometry and material but with different world transformations.
      // World dots
      const dots = new THREE.InstancedMesh(dot, dotMat, pointsLen);
      for (let l = 0; l < pointsLen; l++) dots.setMatrixAt(l, points[l]);
      dots.renderOrder = 3;
      parentContainer.add(dots);

      const links = new THREE.Group();
      for (let i = 0; i < destNumber; i++) {
        const index = randomIntFromInterval(0, pointsLen - 1);
        const sourceIndex = randomIntFromInterval(0, pointsLen - 1);
        const delay = randomIntFromInterval(0, 500);

        const linkLine = new LinkLine(
          points[sourceIndex],
          points[index],
          destColor,
          dotSize
        );
        setTimeout(() => {
          linkLine.start();
        }, delay * i);
        links.add(
          linkLine.destDot.mesh,
          linkLine.destRing.mesh,
          linkLine.line.mesh
        );
        linkInstance.push(linkLine);
      }
      parentContainer.add(links);
    };

    // halo
    const haloMaterial = new THREE.ShaderMaterial({
      uniforms: {
        c: {
          value: 0.9,
        },
        p: {
          value: 6,
        },
        glowColor: {
          value: new THREE.Color(1844322),
        },
        viewVector: {
          value: new THREE.Vector3(0, 0, 220),
        },
      },
      vertexShader: haloVertex,
      fragmentShader: haloFragment,
      side: 2,
      blending: 2,
      transparent: !0,
      dithering: !0,
    });
    const halo = new THREE.Mesh(spGeo, haloMaterial);
    halo.position.set(0, 0, -91);
    halo.rotateY(0.05 * Math.PI);
    halo.rotateX(0.05 * Math.PI);
    halo.renderOrder = 4;
    haloContainer.add(halo);
    camera.add(haloContainer);

    // const raycaster = new THREE.Raycaster();
    const picker = new MousePicker();
    const pickPosition = {
      x: -Infinity,
      y: -Infinity,
    };
    let lastObject: THREE.Object3D | null = null;
    const getTouches = (e: TouchEvent) => {
      e.preventDefault();
      setPickPosition(e.touches[0]);
    };
    const setPickPosition = (e: MouseEvent | Touch) => {
      if (!ref.current) return;
      const canvas = ref.current;
      if (!(canvas instanceof HTMLCanvasElement)) return;
      const pos = getCanvasRelativePosition(e, canvas);
      pickPosition.x = (pos.x / canvas.width) * 2 - 1;
      pickPosition.y = (pos.y / canvas.height) * -2 + 1; // note we flip Y
    };
    const clearPickPosition = () => {
      pickPosition.x = -Infinity;
      pickPosition.y = -Infinity;
    };
    const pickLink = (time: number) => {
      const paused = linkInstance.filter((item) => item.paused);
      lastObject = picker.pick(pickPosition, scene, camera);
      if (!lastObject) {
        paused.length && paused.forEach((item) => item.resume());
        return;
      }
      if (!(lastObject instanceof THREE.Mesh)) return;
      const target = linkInstance.find(
        (item) => item.uuid === lastObject?.uuid
      );
      if (!target) {
        paused.length && paused.forEach((item) => item.resume());
        return;
      }
      target.pause();
    };

    // requestAnimationFrame callback
    const update = (time: number) => {
      TWEEN.update(time / 0.001);
      pickLink(time);
    };
    addRenderCallback(update);

    ref.current?.addEventListener('mousemove', setPickPosition);
    ref.current?.addEventListener('mouseout', clearPickPosition);
    ref.current?.addEventListener('mouseleve', clearPickPosition);
    ref.current?.addEventListener('touchstart', getTouches, { passive: false });
    ref.current?.addEventListener('touchmove', getTouches);
    ref.current?.addEventListener('touchend', clearPickPosition);

    return () => {
      console.log('calling cleanup');
      ref.current?.removeEventListener('mousemove', setPickPosition);
      ref.current?.removeEventListener('mouseout', clearPickPosition);
      ref.current?.removeEventListener('mouseleve', clearPickPosition);
      ref.current?.removeEventListener('touchstart', getTouches);
      ref.current?.removeEventListener('touchmove', getTouches);
      ref.current?.removeEventListener('touchend', clearPickPosition);
    };
  };

  const { ref } = useThree({ init });

  return <canvas ref={ref}></canvas>;
};

export default App;
