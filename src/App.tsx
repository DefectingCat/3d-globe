import useThree, { InitFn, THREE } from 'lib/hooks/useThree';
import world from 'assets/world.jpg';

const loader = new THREE.TextureLoader();
const initThree: InitFn = (three) => {
  const { scene, camera, controls } = three;
  camera.position.set(0, 8, 3);

  {
    const light = new THREE.AmbientLight('#fff', 1);
    scene.add(light);
  }

  const texture = loader.load(world);
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    color: '#fff',
    wireframe: true,
  });
  const sphereGeo = new THREE.SphereGeometry(1, 64, 32);
  const sphere = new THREE.Mesh(sphereGeo, material);
  sphere.position.set(0, 5, 0);

  scene.add(sphere);

  controls.target = sphere.position;
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
