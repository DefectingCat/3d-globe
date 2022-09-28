import { useThree, THREE, InitFn } from 'rua-three';
import world from 'assets/world.png';
import {
  calcPos,
  DEG2RAD,
  getBezierPoint,
  getImageData,
  getVCenter,
  randomIntFromInterval,
  visibilityForCoordinate,
} from 'utils';
import TWEEN from '@tweenjs/tween.js';
import { MeshLine, MeshLineMaterial } from 'meshline';
import haloVertex from './lib/shaders/haloVertex.glsl';
import haloFragment from './lib/shaders/haloFragment.glsl';

const GLOBE_RADIUS = 25;
// Globe map 的纵向像素
const worldDotRows = 200;
const worldDotSize = 0.095;

const destNumber = 10;
const destColor = 0xf957ff;
const dotSize = worldDotSize * 3;

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
      const source = new THREE.Vector3();
      const destiantion = new THREE.Vector3();
      source.applyMatrix4(points[sourceIndex]);
      destiantion.applyMatrix4(points[index]);

      // dots
      const destGeo = new THREE.CircleGeometry(dotSize, 32);
      const destMaterial = new THREE.MeshStandardMaterial({
        color: destColor,
        opacity: 0,
        transparent: true,
      });
      const destDot = new THREE.Mesh(destGeo, destMaterial);
      destDot.applyMatrix4(points[index]);
      links.add(destDot);

      // rings
      const outter = new THREE.RingGeometry(dotSize, dotSize + 0.05, 32);
      const materialOutter = new THREE.MeshBasicMaterial({
        color: destColor,
        side: THREE.DoubleSide,
        opacity: 0,
        transparent: true,
      });
      const ringOutter = new THREE.Mesh(outter, materialOutter);
      ringOutter.applyMatrix4(points[index]);
      const ringScale = { scale: 1, opacity: 1 };
      const drawRingTween = new TWEEN.Tween(ringScale)
        .to(
          {
            scale: 4.2,
            opacity: 0.4,
          },
          700
        )
        .onUpdate(() => {
          materialOutter.opacity = ringScale.opacity;
          ringOutter.scale.set(
            ringScale.scale,
            ringScale.scale,
            ringScale.scale
          );
        });
      const drawRingBack = new TWEEN.Tween(ringScale)
        .to(
          {
            opacity: 0,
          },
          100
        )
        .onUpdate(() => {
          materialOutter.opacity = ringScale.opacity;
        })
        .onComplete(() => {
          ringOutter.scale.set(0, 0, 0);
        });
      links.add(ringOutter);

      // lines
      let curve;
      const angle = source.angleTo(destiantion);
      if (angle > 1) {
        const { v1, v2 } = getBezierPoint(source, destiantion);
        curve = new THREE.CubicBezierCurve3(source, v1, v2, destiantion);
      } else {
        const p = new THREE.Vector3(0, 0, 0);
        const rayLine = new THREE.Ray(
          p,
          getVCenter(source.clone(), destiantion.clone())
        );
        const vtop = rayLine.at(1.3, new THREE.Vector3());
        curve = new THREE.QuadraticBezierCurve3(source, vtop, destiantion);
      }
      if (!curve) continue;
      const curvePoints = curve.getPoints(100);
      const material = new MeshLineMaterial({
        color: destColor,
        lineWidth: 0.3,
        resolution: new THREE.Vector2(100, 100),
        opacity: 0.8,
      });
      const lineLength = { value: 0 };
      const line = new MeshLine();
      const drawLineTween = new TWEEN.Tween(lineLength)
        .to(
          {
            value: 100,
          },
          3000
        )
        .onUpdate(() => {
          line.setPoints(
            curvePoints
              .slice(0, lineLength.value + 1)
              .flatMap((p) => p.toArray()),
            (p) => 0.2 + p / 2
          );
        })
        .onComplete(() => {
          destMaterial.opacity = 1;
          destDot.scale.set(
            destDot.scale.x + 0.01,
            destDot.scale.y + 0.01,
            destDot.scale.z + 0.01
          );
          drawRingTween
            .easing(TWEEN.Easing.Circular.Out)
            .chain(drawRingBack.easing(TWEEN.Easing.Circular.In))
            .start();
        })
        .start();
      const eraseLineTween = new TWEEN.Tween(lineLength)
        .to({ value: 0 }, 3000)
        .onUpdate(() => {
          line.setPoints(
            curvePoints
              .slice(curvePoints.length - lineLength.value, curvePoints.length)
              .flatMap((p) => p.toArray()),
            (p: number) => 0.2 + p / 2
          );
        })
        .onComplete(() => {
          destMaterial.opacity = 0;
          destDot.scale.set(0, 0, 0);
        });
      setTimeout(() => {
        eraseLineTween.start();
      }, 6000);

      const lineMesh = new THREE.Mesh(line, material);
      links.add(lineMesh);
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

  // requestAnimationFrame callback
  const update = (time: number) => {
    TWEEN.update(time / 0.001);
  };
  addRenderCallback(update);
};

const App = () => {
  const { ref } = useThree({ init });

  return <canvas ref={ref}></canvas>;
};

export default App;
