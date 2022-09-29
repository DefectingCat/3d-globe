import * as THREE from 'three';
import TWEEN, { Tween } from '@tweenjs/tween.js';
import { MeshLineMaterial, MeshLine, MeshLineRaycast } from 'meshline';
import { getBezierPoint, getVCenter, randomIntFromInterval } from 'utils';

/**
 * 目标地点的圆点
 */
export class Dot {
  mesh: THREE.Mesh<THREE.CircleGeometry, THREE.MeshStandardMaterial>;
  material: THREE.MeshStandardMaterial;

  constructor(
    public destination: THREE.Matrix4,
    public color: number | string,
    public size: number
  ) {
    const destGeo = new THREE.CircleGeometry(this.size, 32);
    this.material = new THREE.MeshStandardMaterial({
      color: this.color,
      opacity: 0,
      transparent: true,
    });
    this.mesh = new THREE.Mesh(destGeo, this.material);
    this.mesh.applyMatrix4(this.destination);
  }
}

/**
 * 目标地点的圆环动画
 */
export class Ring {
  mesh: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;

  /**
   * 开始动画
   */
  draw: Tween<{
    scale: number;
    opacity: number;
  }>;

  /**
   * 开始返回动画
   */
  drawBack: Tween<{
    scale: number;
    opacity: number;
  }>;

  protected ringScale = {
    scale: 1,
    opacity: 1,
  };

  constructor(
    public destination: THREE.Matrix4,
    public color: number | string,
    public size: number
  ) {
    const outter = new THREE.RingGeometry(this.size, this.size + 0.05, 32);
    const materialOutter = new THREE.MeshBasicMaterial({
      color: this.color,
      side: THREE.DoubleSide,
      opacity: 0,
      transparent: true,
    });

    this.mesh = new THREE.Mesh(outter, materialOutter);
    this.mesh.applyMatrix4(this.destination);
    this.draw = new TWEEN.Tween(this.ringScale)
      .to(
        {
          scale: 4.2,
          opacity: 0.4,
        },
        700
      )
      .onUpdate(() => {
        materialOutter.opacity = this.ringScale.opacity;
        this.mesh.scale.set(
          this.ringScale.scale,
          this.ringScale.scale,
          this.ringScale.scale
        );
      });
    this.drawBack = new TWEEN.Tween(this.ringScale)
      .to(
        {
          opacity: 0,
        },
        100
      )
      .onUpdate(() => {
        materialOutter.opacity = this.ringScale.opacity;
      })
      .onComplete(() => {
        this.mesh.scale.set(0, 0, 0);
      });
  }

  pause() {
    this.draw.pause();
    this.drawBack.pause();
  }

  resume() {
    this.draw.resume();
    this.drawBack.resume();
  }
}

export class Line {
  mesh: THREE.Mesh<MeshLine, MeshLineMaterial>;
  draw: Tween<{
    value: number;
  }>;
  drawBack: Tween<{
    value: number;
  }>;

  constructor(
    public source: THREE.Vector3,
    public destination: THREE.Vector3,
    public color: number | string,
    public size: number,
    public destDot: Dot,
    public destRing: Ring
  ) {
    let curve;
    const angle = this.source.angleTo(this.destination);
    if (angle > 1) {
      const { v1, v2 } = getBezierPoint(source, this.destination);
      curve = new THREE.CubicBezierCurve3(source, v1, v2, this.destination);
    } else {
      const p = new THREE.Vector3(0, 0, 0);
      const rayLine = new THREE.Ray(
        p,
        getVCenter(this.source.clone(), this.destination.clone())
      );
      const vtop = rayLine.at(1.3, new THREE.Vector3());
      curve = new THREE.QuadraticBezierCurve3(source, vtop, this.destination);
    }
    const curvePoints = curve.getPoints(100);
    const material = new MeshLineMaterial({
      color: this.color,
      lineWidth: 0.3,
      resolution: new THREE.Vector2(100, 100),
      opacity: 0.8,
    });
    const lineLength = { value: 0 };
    const line = new MeshLine();
    this.draw = new TWEEN.Tween(lineLength)
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
        this.destDot.material.opacity = 1;
        this.destDot.mesh.scale.set(
          this.destDot.mesh.scale.x + 0.01,
          this.destDot.mesh.scale.y + 0.01,
          this.destDot.mesh.scale.z + 0.01
        );
        this.destRing.draw
          .easing(TWEEN.Easing.Circular.Out)
          .chain(this.destRing.drawBack.easing(TWEEN.Easing.Circular.In))
          .start();
        setTimeout(() => {
          this.drawBack.start();
        }, 2000);
      });
    this.drawBack = new TWEEN.Tween(lineLength)
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
        this.destDot.material.opacity = 0;
        this.destDot.mesh.scale.set(0, 0, 0);
      });

    this.mesh = new THREE.Mesh(line, material);
    this.mesh.raycast = MeshLineRaycast;
  }

  pause() {
    this.draw.pause();
    this.drawBack.pause();
  }

  resume() {
    this.draw.resume();
    this.drawBack.resume();
  }
}

class LinkLine {
  protected p0 = new THREE.Vector3();
  protected p4 = new THREE.Vector3();

  destDot: Dot;
  destRing: Ring;
  line: Line;

  paused = false;

  /**
   * 线条的 mesh uuid
   * 用于识别线条暂停动画
   */
  uuid: string;

  constructor(
    public source: THREE.Matrix4,
    public destination: THREE.Matrix4,
    public color: number | string,
    public size: number
  ) {
    this.p0.applyMatrix4(source);
    this.p4.applyMatrix4(destination);

    this.destDot = new Dot(destination, color, size);
    this.destRing = new Ring(destination, color, size);

    this.line = new Line(
      this.p0,
      this.p4,
      color,
      size,
      this.destDot,
      this.destRing
    );
    this.uuid = this.line.mesh.uuid;
  }

  start() {
    this.line.draw.start();
  }

  resume() {
    if (!this.paused) return;
    this.destRing.resume();
    this.line.resume();
    this.paused = false;
  }

  pause() {
    this.destRing.pause();
    this.line.pause();
    this.paused = true;
  }
}

export default LinkLine;
