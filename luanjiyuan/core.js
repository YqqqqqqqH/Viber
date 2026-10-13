/* core.js — 一个 WebGL 渲染器 + 一条后期链，所有场景共用。
 * render(scene, camera, o)：这一帧渲哪个场景、用哪台相机、后期参数（辉光、曝光、黑场、闪白）都由调用方按时间给出。
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { W, H } from './lib.js';

export function createCore() {
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1); renderer.setSize(W, H, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const composer = new EffectComposer(renderer); composer.setPixelRatio(1); composer.setSize(W, H);
  const pass = new RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera()); composer.addPass(pass);
  const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), .72, .5, .85); composer.addPass(bloom);
  /* 暗角 + 一点色差 + 黑场 + 闪白（匹配剪辑时用：两边都亮到发白的那几帧换场） */
  const grade = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uVig: { value: .55 }, uCA: { value: .0022 }, uFade: { value: 1 }, uFlash: { value: 0 }, uFlashCol: { value: new THREE.Color('#FFF3DC') }, uHaze: { value: 0 }, uHazeCol: { value: new THREE.Color('#C9A27E') } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform sampler2D tDiffuse; uniform float uVig, uCA, uFade, uFlash, uHaze; uniform vec3 uFlashCol, uHazeCol; varying vec2 vUv;
      void main(){ vec2 d = vUv - .5; float r2 = dot(d*vec2(1.78,1.), d*vec2(1.78,1.));
        vec3 c = vec3(texture2D(tDiffuse, vUv - d*uCA*r2*4.).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv + d*uCA*r2*4.).b);
        c = mix(c, uHazeCol*1.35, uHaze);   // 大气：钻进行星的云层时整幅变成同一种雾色（两个场景在这里交接）
        c *= 1. - uVig*smoothstep(.15, 1.25, r2); c = c*uFade + uFlashCol*uFlash*3.; gl_FragColor = vec4(c, 1.); }`,
  });
  composer.addPass(grade); composer.addPass(new OutputPass());

  function render(scene, camera, o = {}) {
    pass.scene = scene; pass.camera = camera;
    bloom.strength = o.bloom == null ? .72 : o.bloom; bloom.radius = o.bloomR == null ? .5 : o.bloomR; bloom.threshold = o.threshold == null ? .85 : o.threshold;
    renderer.toneMappingExposure = o.exposure == null ? 1 : o.exposure;
    grade.uniforms.uFade.value = o.fade == null ? 1 : o.fade; grade.uniforms.uFlash.value = o.flash || 0;
    grade.uniforms.uHaze.value = o.haze || 0; grade.uniforms.uHazeCol.value.set(o.hazeCol || '#C9A27E'); grade.uniforms.uVig.value = o.vig == null ? .55 : o.vig; grade.uniforms.uCA.value = o.ca == null ? .0022 : o.ca;
    composer.render();
  }
  const ndc = new THREE.Vector3();
  /* 3D → 屏幕像素；behind=true 表示在相机后面 */
  function project(camera, p) { ndc.set(p[0], p[1], p[2]).project(camera); return { x: (ndc.x + 1) / 2 * W, y: (1 - ndc.y) / 2 * H, behind: ndc.z > 1 }; }
  return { canvas, renderer, render, project };
}
/* 距离 1 处一个像素多少世界单位 */
export const unitsPerPx = fov => 2 * Math.tan(fov / 2 * Math.PI / 180) / H;
/* 相机：位置 + 目标 + 可选滚转 */
export function aim(cam, pos, target, roll = 0) {
  cam.position.set(pos[0], pos[1], pos[2]); cam.up.set(Math.sin(roll), Math.cos(roll), 0); cam.lookAt(target[0], target[1], target[2]); cam.updateMatrixWorld();
}
