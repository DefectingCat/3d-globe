import useThree, { InitFn, THREE } from 'lib/hooks/useThree';
import world from 'assets/world.png';
import dot from 'assets/dot.png';
import globeVertex from 'assets/shaders/vertex.glsl';
import globeFragment from 'assets/shaders/fragment.glsl';

const GLOBE_RADIUS = 25;
const DEG2RAD = Math.PI / 180;
// Globe map 的纵向像素
const worldDotRows = 200;
const worldDotSize = 0.095;

const getImageData = (img: HTMLImageElement) => {
  const ctx = document.createElement('canvas').getContext('2d');
  if (!ctx?.canvas) return;
  ctx.canvas.width = img.width;
  ctx.canvas.height = img.height;
  ctx.drawImage(img, 0, 0, img.width, img.height);
  return ctx.getImageData(0, 0, img.width, img.height);
};

const visibilityForCoordinate = (
  lng: number,
  lat: number,
  data: ImageData | undefined
) => {
  if (!data) return;
  const i = 4 * data.width;
  const r = parseInt((((lng + 180) / 360) * data.width + 0.5).toString());
  const a =
    data.height - parseInt((((lat + 90) / 180) * data.height - 0.5).toString());
  const s = parseInt((i * (a - 1) + 4 * r).toString()) + 3;
  return data.data[s] > 90;
};

const init: InitFn = ({ scene, camera, controls, renderer }) => {
  camera.position.set(0, 10, 100);
  scene.background = new THREE.Color(0x040d21);

  const { width, height, x, y } = renderer.domElement.getBoundingClientRect();

  // Globe map
  const img = document.createElement('img');
  img.src = world;
  img.crossOrigin = 'Anonymous';

  const parentContainer = new THREE.Group();
  const euler = new THREE.Euler(0.3, 4.6, 0.05);
  const offset = new Date().getTimezoneOffset() || 0;
  euler.y = euler.y + Math.PI * (offset / 720);
  parentContainer.rotation.copy(euler);
  scene.add(parentContainer);

  const haloContainer = new THREE.Group();
  scene.add(haloContainer);

  // Globe water
  const shadowPoint = new THREE.Vector3()
    .copy(parentContainer.position)
    .add(
      new THREE.Vector3(0.7 * GLOBE_RADIUS, 0.3 * -GLOBE_RADIUS, GLOBE_RADIUS)
    );
  const highlightPoint = new THREE.Vector3()
    .copy(parentContainer.position)
    .add(new THREE.Vector3(1.5 * -GLOBE_RADIUS, 1.5 * -GLOBE_RADIUS, 0));
  const frontPoint = new THREE.Vector3()
    .copy(parentContainer.position)
    .add(new THREE.Vector3(0, 0, GLOBE_RADIUS));

  // Globe
  const spGeo = new THREE.SphereGeometry(GLOBE_RADIUS, 55, 55);
  const material = new THREE.MeshStandardMaterial({
    color: 1513012,
    metalness: 0,
    roughness: 0.9,
  });
  const uniforms = [];
  // material.onBeforeCompile = (t) => {
  //   t.uniforms.shadowDist = {
  //     value: 1.5 * GLOBE_RADIUS,
  //   };
  //   t.uniforms.highlightDist = {
  //     value: 5,
  //   };
  //   t.uniforms.shadowPoint = {
  //     value: new THREE.Vector3().copy(shadowPoint),
  //   };
  //   t.uniforms.highlightPoint = {
  //     value: new THREE.Vector3().copy(highlightPoint),
  //   };
  //   t.uniforms.frontPoint = {
  //     value: new THREE.Vector3().copy(frontPoint),
  //   };
  //   t.uniforms.highlightColor = {
  //     value: new THREE.Color(5339494),
  //   };
  //   t.vertexShader =
  //     '#define GLSLIFY 1\n#define STANDARD\nvarying vec3 vViewPosition;\n#ifndef FLAT_SHADED\n\tvarying vec3 vNormal;\n\t#ifdef USE_TANGENT\n\t\tvarying vec3 vTangent;\n\t\tvarying vec3 vBitangent;\n\t#endif\n#endif\n#include <common>\n#include <uv_pars_vertex>\n#include <uv2_pars_vertex>\n#include <displacementmap_pars_vertex>\n#include <color_pars_vertex>\n#include <fog_pars_vertex>\n#include <morphtarget_pars_vertex>\n#include <skinning_pars_vertex>\n#include <shadowmap_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <clipping_planes_pars_vertex>\n\nvarying vec3 vWorldPosition;\n\nvoid main() {\n\t#include <uv_vertex>\n\t#include <uv2_vertex>\n\t#include <color_vertex>\n\t#include <beginnormal_vertex>\n\t#include <morphnormal_vertex>\n\t#include <skinbase_vertex>\n\t#include <skinnormal_vertex>\n\t#include <defaultnormal_vertex>\n#ifndef FLAT_SHADED\n\tvNormal = normalize( transformedNormal );\n\t#ifdef USE_TANGENT\n\t\tvTangent = normalize( transformedTangent );\n\t\tvBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );\n\t#endif\n#endif\n\t#include <begin_vertex>\n\t#include <morphtarget_vertex>\n\t#include <skinning_vertex>\n\t#include <displacementmap_vertex>\n\t#include <project_vertex>\n\t#include <logdepthbuf_vertex>\n\t#include <clipping_planes_vertex>\n\tvViewPosition = - mvPosition.xyz;\n\t// # include <worldpos_vertex>\n    vec4 worldPosition = vec4( transformed, 1.0 );\n\n\t#ifdef USE_INSTANCING\n\n\t\tworldPosition = instanceMatrix * worldPosition;\n\n\t#endif\n\n\tworldPosition = modelMatrix * worldPosition;\n\tvWorldPosition = worldPosition.xyz;\n\t#include <shadowmap_vertex>\n\t#include <fog_vertex>\n}';
  //   t.fragmentShader =
  //     '#define GLSLIFY 1\n#define STANDARD\n#ifdef PHYSICAL\n\t#define REFLECTIVITY\n\t#define CLEARCOAT\n\t#define TRANSPARENCY\n#endif\nuniform vec3 diffuse;\nuniform vec3 emissive;\nuniform float roughness;\nuniform float metalness;\nuniform float opacity;\n#ifdef TRANSPARENCY\n\tuniform float transparency;\n#endif\n#ifdef REFLECTIVITY\n\tuniform float reflectivity;\n#endif\n#ifdef CLEARCOAT\n\tuniform float clearcoat;\n\tuniform float clearcoatRoughness;\n#endif\n#ifdef USE_SHEEN\n\tuniform vec3 sheen;\n#endif\nvarying vec3 vViewPosition;\n#ifndef FLAT_SHADED\n\tvarying vec3 vNormal;\n\t#ifdef USE_TANGENT\n\t\tvarying vec3 vTangent;\n\t\tvarying vec3 vBitangent;\n\t#endif\n#endif\n#include <common>\n#include <packing>\n#include <dithering_pars_fragment>\n#include <color_pars_fragment>\n#include <uv_pars_fragment>\n#include <uv2_pars_fragment>\n#include <map_pars_fragment>\n#include <alphamap_pars_fragment>\n#include <aomap_pars_fragment>\n#include <lightmap_pars_fragment>\n#include <emissivemap_pars_fragment>\n#include <bsdfs>\n#include <cube_uv_reflection_fragment>\n#include <envmap_common_pars_fragment>\n#include <envmap_physical_pars_fragment>\n#include <fog_pars_fragment>\n#include <lights_pars_begin>\n#include <lights_physical_pars_fragment>\n#include <shadowmap_pars_fragment>\n#include <bumpmap_pars_fragment>\n#include <normalmap_pars_fragment>\n#include <clearcoat_pars_fragment>\n#include <roughnessmap_pars_fragment>\n#include <metalnessmap_pars_fragment>\n#include <logdepthbuf_pars_fragment>\n#include <clipping_planes_pars_fragment>\n\nuniform float shadowDist;\nuniform float highlightDist;\nuniform vec3 shadowPoint;\nuniform vec3 highlightPoint;\nuniform vec3 frontPoint;\nuniform vec3 highlightColor;\nuniform vec3 frontHighlightColor;\n\nvarying vec3 vWorldPosition;\n\nvoid main() {\n\t#include <clipping_planes_fragment>\n\tvec4 diffuseColor = vec4( diffuse, opacity );\n\tReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );\n\tvec3 totalEmissiveRadiance = emissive;\n\t#include <logdepthbuf_fragment>\n\t#ifdef USE_MAP\n\n\t\tvec4 texelColor = texture2D( map, vUv );\n\t\ttexelColor = mapTexelToLinear( texelColor );\n\t\t\n\t\t#ifndef IS_FILL\n\t\t\tdiffuseColor *= texelColor;\n\t\t#endif\n\n\t#endif\n\t#include <color_fragment>\n\t#include <alphamap_fragment>\n\t#include <alphatest_fragment>\n\t#include <roughnessmap_fragment>\n\t#include <metalnessmap_fragment>\n\t#include <normal_fragment_begin>\n\t#include <normal_fragment_maps>\n\t#include <clearcoat_normal_fragment_begin>\n\t#include <clearcoat_normal_fragment_maps>\n\t#include <emissivemap_fragment>\n\t#include <lights_physical_fragment>\n\t#include <lights_fragment_begin>\n\t#include <lights_fragment_maps>\n\t#include <lights_fragment_end>\n\t#include <aomap_fragment>\n\tvec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;\n\t#ifdef TRANSPARENCY\n\t\tdiffuseColor.a *= saturate( 1. - transparency + linearToRelativeLuminance( reflectedLight.directSpecular + reflectedLight.indirectSpecular ) );\n\t#endif\n\n    float dist;\n\tfloat distZ;\n\n    // highlights\n\t#ifdef USE_HIGHLIGHT\n\t\tdist = distance(vWorldPosition, highlightPoint);\n\t\tdistZ = distance(vWorldPosition.z, 0.0);\n\t\toutgoingLight = mix(highlightColor, outgoingLight, smoothstep(0.0, highlightDist, dist) * smoothstep(0.0, 3.0, pow(distZ, 0.5)));\n        outgoingLight = mix(outgoingLight * 2.0, outgoingLight, smoothstep(0.0, 12.0, distZ));\n\t#endif\n\n    // front hightlight\n    #ifdef USE_FRONT_HIGHLIGHT\n        dist = distance(vWorldPosition * vec3(0.875, 0.5, 1.0), frontPoint);\n        outgoingLight = mix(frontHighlightColor * 1.6, outgoingLight, smoothstep(0.0, 15.0, dist));\n    #endif\n\n    // shadows\n    dist = distance(vWorldPosition, shadowPoint);\n\toutgoingLight = mix(outgoingLight * 0.01, outgoingLight, smoothstep(0.0, shadowDist, dist));\n    // shadow debug\n\t// outgoingLight = mix(vec3(1.0, 0.0, 0.0), outgoingLight, smoothstep(0.0, shadowDist, dist));\n\n\t#ifdef IS_FILL\n\t\toutgoingLight = mix(outgoingLight, outgoingLight * 0.5, 1.0 - texelColor.g * 1.5);\n\t#endif\n\n\tgl_FragColor = vec4( outgoingLight, diffuseColor.a );\n\t#include <tonemapping_fragment>\n\t#include <encodings_fragment>\n\t#include <fog_fragment>\n\t#include <premultiplied_alpha_fragment>\n\t#include <dithering_fragment>\n}';
  //   uniforms.push(t.uniforms);
  // };
  // material.defines = {
  //   USE_HIGHLIGHT: 1,
  //   USE_HIGHLIGHT_ALT: 1,
  //   USE_FRONT_HIGHLIGHT: 1,
  //   DITHERING: 1,
  // };
  const sphereGroup = new THREE.Group();
  const sphere = new THREE.Mesh(spGeo, material);
  sphere.renderOrder = 1;
  sphereGroup.add(sphere);
  scene.add(sphere);

  // lights
  const lightAmb = new THREE.AmbientLight(16777215, 0.8);
  const lightSpot1 = new THREE.SpotLight(2197759, 12, 120, 0.3, 0, 1.1);
  const lightSpot2 = new THREE.SpotLight(16018366, 5, 75, 0.5, 0, 1.25);
  const lightDir = new THREE.DirectionalLight(11124735, 3);
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
  scene.add(new THREE.SpotLightHelper(lightSpot1));
  scene.add(camera);

  // Dots
  img.onload = () => {
    const point = new THREE.Object3D();
    const imgData = getImageData(img);
    const arr = [];
    for (let lat = -90; lat <= 90; lat += 180 / worldDotRows) {
      const radius = Math.cos(Math.abs(lat) * DEG2RAD) * GLOBE_RADIUS;
      const circum = radius * Math.PI * 2 * 2;
      for (let r = 0; r < circum; r++) {
        const lng = (360 * r) / circum - 180;
        if (!visibilityForCoordinate(lng, lat, imgData)) continue;
      }
    }
  };
};

const App = () => {
  const { ref } = useThree({ init });

  return <canvas ref={ref}></canvas>;
};

export default App;
