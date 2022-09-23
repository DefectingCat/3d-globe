import useThree, { InitFn, THREE } from "lib/hooks/useThree";
import world from "assets/world.png";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils";
import vertexShader from "assets/shaders/vertex.glsl";
import fragmentShader from "assets/shaders/fragment.glsl";

const loader = new THREE.TextureLoader();
function parseData(text: string) {
  const data: (number | undefined)[][] = [];
  const settings = { data } as any;
  let max: number = 0;
  let min: number = 0;
  // split into lines
  text.split("\n").forEach((line) => {
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

const initThree: InitFn = async ({ scene, camera, controls }) => {
  const text = await (await fetch("./gpw.asc")).text();
  const file = parseData(text);
  camera.position.set(0, 4, 2);

  {
    const light = new THREE.AmbientLight("#fff", 0.6);
    scene.add(light);
  }

  // {
  //   const { min, max, data } = file;
  //   const range = max - min;
  //
  //   // these helpers will make it easy to position the boxes
  //   // We can rotate the lon helper on its Y axis to the longitude
  //   const lonHelper = new THREE.Object3D();
  //   scene.add(lonHelper);
  //   // We rotate the latHelper on its X axis to the latitude
  //   const latHelper = new THREE.Object3D();
  //   lonHelper.add(latHelper);
  //   // The position helper moves the object to the edge of the sphere
  //   const positionHelper = new THREE.Object3D();
  //   positionHelper.position.z = 1;
  //   latHelper.add(positionHelper);
  //   // Used to move the center of the cube so it scales from the position Z axis
  //   const originHelper = new THREE.Object3D();
  //   originHelper.position.z = 0.1;
  //   positionHelper.add(originHelper);
  //
  //   const lonFudge = Math.PI * 0.5;
  //   const latFudge = Math.PI * -0.135;
  //   const geometries: THREE.BoxGeometry[] = [];
  //   const color = new THREE.Color();
  //   const globe: { [key: string]: number[] } = {};
  //   data.forEach((row: any, latNdx: any) => {
  //     row.forEach((value: any, lonNdx: any) => {
  //       if (value === undefined) {
  //         return;
  //       }
  //       globe[latNdx] ? globe[latNdx].push(lonNdx) : (globe[latNdx] = [lonNdx]);
  //       // const amount = (value - min) / range;
  //
  //       const boxWidth = 1;
  //       const boxHeight = 1;
  //       const boxDepth = 1;
  //       const geometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);
  //
  //       // Longitude
  //       lonHelper.rotation.y =
  //         THREE.MathUtils.degToRad(lonNdx + file.xllcorner) + lonFudge;
  //       // Latitude
  //       latHelper.rotation.x =
  //         THREE.MathUtils.degToRad(latNdx + file.yllcorner) + latFudge;
  //
  //       // use the world matrix of the origin helper to
  //       // position this geometry
  //       positionHelper.scale.set(
  //         0.005,
  //         0.005,
  //         // THREE.MathUtils.lerp(0.01, 0.5, amount)
  //         0.005
  //       );
  //       originHelper.updateWorldMatrix(true, false);
  //       geometry.applyMatrix4(originHelper.matrixWorld);
  //
  //       // compute a color
  //       // const hue = THREE.MathUtils.lerp(0.7, 0.3, 0.3);
  //       // const saturation = 1;
  //       // const lightness = THREE.MathUtils.lerp(0.4, 1.0, 0.3);
  //       // color.setHSL(hue, saturation, lightness);
  //       // get the colors as an array of values from 0 to 255
  //       // const rgb = color.toArray().map((v) => v * 255);
  //
  //       // make an array to store colors for each vertex
  //       // const numVerts = geometry.getAttribute("position").count;
  //       // const itemSize = 3; // r, g, b
  //       // const colors = new Uint8Array(itemSize * numVerts);
  //
  //       // copy the color into the colors array for each vertex
  //       // colors.forEach((v, ndx) => {
  //       //   colors[ndx] = rgb[ndx % 3];
  //       // });
  //
  //       // const normalized = true;
  //       // const colorAttrib = new THREE.BufferAttribute(
  //       //   colors,
  //       //   itemSize,
  //       //   normalized
  //       // );
  //       // geometry.setAttribute("color", colorAttrib);
  //
  //       geometries.push(geometry);
  //     });
  //   });
  //
  //   const mergedGeometry =
  //     BufferGeometryUtils.mergeBufferGeometries(geometries);
  //   const material = new THREE.MeshBasicMaterial({ color: "#fff" });
  //   const mesh = new THREE.Mesh(mergedGeometry, material);
  //   // scene.add(mesh);
  // }

  {
    const texture = loader.load(world);
    const material = new THREE.ShaderMaterial({
      // map: texture,
      // color: "#8e6eff",
      // wireframe: true,
      // emissive: "#a085ff",
      vertexShader,
      fragmentShader,
      uniforms: {
        globeTexture: {
          value: texture,
        },
      },
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
