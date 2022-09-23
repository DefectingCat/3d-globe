import useThree, { InitFn, THREE } from 'lib/hooks/useThree';
import world from 'assets/world.png';
import dot from 'assets/dot.png';
import { Color } from 'three';

const GLOBE_COLOR = 0xff0000;
const GLOBE_PARTICLE_COLOR = 0xff0000;

const init: InitFn = ({ scene, camera }) => {
  camera.position.set(0, 5, 5);

  // Create globe
  const spGeo = new THREE.SphereGeometry(1, 64, 32);
  const spMaterial = new THREE.MeshLambertMaterial({ color: GLOBE_COLOR });
  const globe = new THREE.Mesh(spGeo, spMaterial);
  scene.add(globe);

  // lights
  {
    const spotLight = new THREE.SpotLight(0x404040, 2.5);
    spotLight.target = globe;
    scene.add(spotLight);
    scene.add(new THREE.AmbientLight(0xffffff, 0.25));
  }

  // Create dots
  let imgData: ImageData | null | undefined = null;
  {
    const particles = new THREE.Object3D();
    const img = document.createElement('img');
    img.src = dot;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0, img.width, img.height);
      imgData = ctx?.getImageData(0, 0, img.width, img.height);
    };

    // Read the globe texture. And replace pixel with dot image
    const positions = [
      {
        positions: [],
      },
      {
        positions: [],
      },
    ];
    const sizes = [
      {
        sizes: [],
      },
      {
        sizes: [],
      },
    ];
    const material = new THREE.PointsMaterial({
      size: 2.5,
      color: new THREE.Color(GLOBE_PARTICLE_COLOR),
      map: new THREE.TextureLoader().load(dot),
      depthWrite: false,
      transparent: true,
      opacity: 0.3,
      side: THREE.FrontSide,
      blending: THREE.AdditiveBlending,
    });
    const spherical = new THREE.Spherical(100);

    const step = 250;
    for (let i = 0; i < step; i++) {
      const vec = new THREE.Vector3();
      const radians = step * (1 - Math.sin((i / step) * Math.PI));
      for (let j = 0; j < step; j += radians) {
        const c = j / step; // 底图上的横向百分比
        const f = i / step; // 底图上的纵向百分比
        const index = Math.floor(2 * Math.random())
        const pos = positions[index]
        const size = sizes[index]
      }
    }
  }
};

const App = () => {
  const { ref } = useThree({ init });

  return <canvas ref={ref}></canvas>;
};

export default App;
