import useThree, { InitFn, THREE } from 'lib/hooks/useThree';
import world from 'assets/world.jpg';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils';

const loader = new THREE.TextureLoader();
function parseData(text: string) {
  console.log(text);
  const data: (number | undefined)[][] = [];
  const settings = { data } as any;
  let max: number = 0;
  let min: number = 0;
  // split into lines
  text.split('\n').forEach((line) => {
    // split the line by whitespace
    const parts = line.trim().split(/\s+/);
    if (parts.length === 2) {
      // only 2 parts, must be a key/value pair
      settings[parts[0]] = parseFloat(parts[1]);
    } else if (parts.length > 2) {
      // more than 2 parts, must be data
      const values = parts.map((v) => {
        const value = parseFloat(v);
        if (value === settings.NODATA_value) {
          return undefined;
        }
        max = Math.max(max === undefined ? value : max, value);
        min = Math.min(min === undefined ? value : min, value);
        return value;
      });
      data.push(values);
    }
  });
  return Object.assign(settings, { min, max });
}

const initThree: InitFn = async (three) => {
  const text = await (await fetch('./gpw.asc')).text();
  const file = parseData(text);
  console.log(text);
  const { scene, camera, controls } = three;
  camera.position.set(0, 4, 2);

  {
    const light = new THREE.AmbientLight('#fff', 1);
    scene.add(light);
  }

  {
    const { min, max, data } = file;
    const range = max - min;

    // these helpers will make it easy to position the boxes
    // We can rotate the lon helper on its Y axis to the longitude
    const lonHelper = new THREE.Object3D();
    scene.add(lonHelper);
    // We rotate the latHelper on its X axis to the latitude
    const latHelper = new THREE.Object3D();
    lonHelper.add(latHelper);
    // The position helper moves the object to the edge of the sphere
    const positionHelper = new THREE.Object3D();
    positionHelper.position.z = 1;
    latHelper.add(positionHelper);
    // Used to move the center of the cube so it scales from the position Z axis
    const originHelper = new THREE.Object3D();
    originHelper.position.z = 0.5;
    positionHelper.add(originHelper);

    const lonFudge = Math.PI * 0.5;
    const latFudge = Math.PI * -0.135;
    const geometries: THREE.BoxGeometry[] = [];
    data.forEach((row: any, latNdx: any) => {
      row.forEach((value: any, lonNdx: any) => {
        if (value === undefined) {
          return;
        }
        // const amount = (value - min) / range;

        const boxWidth = 1;
        const boxHeight = 1;
        const boxDepth = 1;
        const geometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);

        // adjust the helpers to point to the latitude and longitude
        lonHelper.rotation.y =
          THREE.MathUtils.degToRad(lonNdx + file.xllcorner) + lonFudge;
        latHelper.rotation.x =
          THREE.MathUtils.degToRad(latNdx + file.yllcorner) + latFudge;

        // use the world matrix of the origin helper to
        // position this geometry
        positionHelper.scale.set(
          0.005,
          0.005,
          // THREE.MathUtils.lerp(0.01, 0.5, amount)
          0.005
        );
        originHelper.updateWorldMatrix(true, false);
        geometry.applyMatrix4(originHelper.matrixWorld);

        geometries.push(geometry);
      });
    });

    const mergedGeometry =
      BufferGeometryUtils.mergeBufferGeometries(geometries);
    const material = new THREE.MeshBasicMaterial({ color: 'red' });
    const mesh = new THREE.Mesh(mergedGeometry, material);
    scene.add(mesh);
  }

  {
    const texture = loader.load(world);
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      color: '#fff',
      // wireframe: true,
    });
    const sphereGeo = new THREE.SphereGeometry(1, 64, 32);
    const sphere = new THREE.Mesh(sphereGeo, material);

    scene.add(sphere);
  }
};

function App() {
  const { ref } = useThree({ init: initThree });

  return (
    <>
      <canvas ref={ref}></canvas>
    </>
  );
}

export default App;
