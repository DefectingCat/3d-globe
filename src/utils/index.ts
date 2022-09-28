import * as THREE from 'three';

export function randomIntFromInterval(min: number, max: number) {
  // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min);
}

/**
 * 获取两个点之间
 */
export function getVCenter(v1: THREE.Vector3, v2: THREE.Vector3) {
  const v = v1.add(v2);
  return v.divideScalar(2);
}

export function getLenVcetor(
  v1: THREE.Vector3,
  v2: THREE.Vector3,
  len: number
) {
  const v1v2Len = v1.distanceTo(v2);
  return v1.lerp(v2, len / v1v2Len);
}

export function getBezierPoint(v0: THREE.Vector3, v3: THREE.Vector3) {
  const angle = (v0.angleTo(v3) * 45) / Math.PI; // 0 ~ Math.PI       // 计算向量夹角
  const aLen = angle;
  const p0 = new THREE.Vector3(0, 0, 0); // 法线向量
  const rayLine = new THREE.Ray(p0, getVCenter(v0.clone(), v3.clone())); // 顶点坐标
  const vtop = new THREE.Vector3(0, 0, 0); // 法线向量
  rayLine.at(100, vtop); // 位置
  // 控制点坐标
  const v1 = getLenVcetor(v0.clone(), vtop, aLen);
  const v2 = getLenVcetor(v3.clone(), vtop, aLen);
  return {
    v1,
    v2,
  };
}

/**
 * 从 canvas 获取 ImageData
 */
export const getImageData = (img: HTMLImageElement) => {
  const ctx = document.createElement('canvas').getContext('2d');
  if (!ctx?.canvas) return;
  ctx.canvas.width = img.width;
  ctx.canvas.height = img.height;
  ctx.drawImage(img, 0, 0, img.width, img.height);
  return ctx.getImageData(0, 0, img.width, img.height);
};

/**
 * 检测是当前 UV 是否有像素
 */
export const visibilityForCoordinate = (
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

export const DEG2RAD = Math.PI / 180;

/**
 * 计算 UV 到 Vector3
 */
export const calcPos = (
  lat: number,
  lng: number,
  radius: number,
  vec?: THREE.Vector3
) => {
  const _vec = vec ?? new THREE.Vector3();
  const v = (90 - lat) * DEG2RAD;
  const h = (lng + 180) * DEG2RAD;
  _vec.set(
    -radius * Math.sin(v) * Math.cos(h),
    radius * Math.cos(v),
    radius * Math.sin(v) * Math.sin(h)
  );
  return _vec;
};
