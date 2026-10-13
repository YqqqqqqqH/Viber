/* space.js — 三体系统：三颗太阳（世界 A 实体 + 世界 B 青色影子）、一颗行星、轨迹、星空、星云、尘埃。
 * buildSpace(r, upp) → { scene, camera, update(s) }；s 里给出两套世界的位置、轨迹和各种透明度。
 */
import * as THREE from 'three';
import { W, H, GOLD, ICE, SUN_COL, sstep, radialTex, planetTextures, sunMat, rimMat, atmoMat, Ribbon, starfield, nebula, dust, GLSL_NOISE, gridMat, inkRibbon, cycloneTex } from './lib.js';

export const SUN_R = .06, PLANET_R = .03, TRN = 180;

export function buildSpace(r, upp, earthTex) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#02040A');
  const camera = new THREE.PerspectiveCamera(30, W / H, .004, 400);
  const stars = starfield(scene, r), neb = nebula(scene, r), dustM = dust(scene, r, upp);
  const coronaTex = radialTex([[0, 1], [.12, .75], [.3, .22], [.6, .05], [1, 0]]), haloTex = radialTex([[0, .5], [.25, .12], [.6, .025], [1, 0]]);
  const sunsA = SUN_COL.map((c, i) => {
    const g = new THREE.Group(), body = new THREE.Mesh(new THREE.SphereGeometry(SUN_R, 96, 64), sunMat(c, i * 13.7));
    const corona = new THREE.Sprite(new THREE.SpriteMaterial({ map: coronaTex, color: c, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: .9 })); corona.scale.setScalar(SUN_R * 7.5);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, color: c, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: .2 })); halo.scale.setScalar(SUN_R * 34);
    g.add(body, corona, halo); scene.add(g);
    const light = new THREE.PointLight(c, 1, 0, 0); scene.add(light);
    return { g, body, corona, halo, light };
  });
  const sunsB = SUN_COL.map(() => {
    const g = new THREE.Group(), ring = new THREE.Mesh(new THREE.SphereGeometry(SUN_R * 1.32, 48, 32), rimMat(ICE, 3.2, .04));
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: coronaTex, color: ICE, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 })); glow.scale.setScalar(SUN_R * 5.5);
    g.add(ring, glow); scene.add(g); return { g, ring, glow };
  });
  const tex = planetTextures(), planet = new THREE.Group();
  const surf = new THREE.Mesh(new THREE.SphereGeometry(PLANET_R, 128, 96), new THREE.MeshStandardMaterial({ map: tex.surface, roughnessMap: tex.rough, roughness: 1, metalness: 0 }));
  const clouds = new THREE.Mesh(new THREE.SphereGeometry(PLANET_R * 1.012, 128, 96), new THREE.MeshStandardMaterial({ color: '#ffffff', alphaMap: tex.clouds, transparent: true, depthWrite: false, roughness: 1 }));
  const atmo = new THREE.Mesh(new THREE.SphereGeometry(PLANET_R * 1.035, 64, 48), atmoMat());
  planet.add(surf, clouds, atmo); planet.rotation.z = .41; scene.add(planet);
  const planetB = new THREE.Group(), pbRing = new THREE.Mesh(new THREE.SphereGeometry(PLANET_R * 1.45, 48, 32), rimMat(ICE, 2.4, .08)); planetB.add(pbRing); scene.add(planetB);
  scene.add(new THREE.AmbientLight('#1A2333', .03));
  /* 地球：被甩出去的那颗行星，青色的空壳一点点"长"出真实的地球（NASA Blue Marble），只有一个太阳照着 */
  const earth = new THREE.Group(); earth.visible = false; scene.add(earth);
  const reveal = mat => { mat.onBeforeCompile = sh => {                 // 按噪声一块一块显出来，不是整体淡入
    sh.uniforms.uReveal = mat.userData.uReveal;                   // 用同一个对象：编译那一帧也拿到当前的值
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
varying vec3 vObjP;`).replace('#include <begin_vertex>', `#include <begin_vertex>
vObjP = position;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
uniform float uReveal; varying vec3 vObjP;
${GLSL_NOISE}`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
 float rv = fbm(normalize(vObjP)*3.2); if (rv > uReveal*1.15 - .05) discard;`);
  }; mat.userData.uReveal = { value: 0 }; return mat; };
  let eSurf = null, eCloud = null, eAtmo = null, eRing = null;
  if (earthTex) {
    eSurf = new THREE.Mesh(new THREE.SphereGeometry(PLANET_R, 192, 128), reveal(new THREE.MeshStandardMaterial({ map: earthTex.map, roughnessMap: earthTex.rough, roughness: 1, metalness: 0 })));
    eCloud = new THREE.Mesh(new THREE.SphereGeometry(PLANET_R * 1.006, 192, 128), reveal(new THREE.MeshStandardMaterial({ color: '#ffffff', alphaMap: earthTex.clouds, transparent: true, depthWrite: false, roughness: 1 })));
    eAtmo = new THREE.Mesh(new THREE.SphereGeometry(PLANET_R * 1.03, 96, 64), atmoMat(['#FFF4E2', '#000000', '#000000'], [.3, .55, 1]));
    eRing = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), rimMat(ICE, 2.4, .08));
    const tilt = new THREE.Group(); tilt.rotation.z = .41; tilt.add(eSurf, eCloud); earth.add(tilt, eAtmo, eRing); earth.userData.tilt = tilt;
    /* 理查森的网格：和地表同一套网格划分（面和地表平行），离地多高由 e.grid.lift 给（默认罩在云上面一点）；台风：贴在云层上的一个球冠
       镜头贴近地面时网格必须贴着地面画，不然近大远小，格子比地图上那一格大一圈（和大厅墙上那一格对不上） */
    const grid = new THREE.Mesh(new THREE.SphereGeometry(PLANET_R, 192, 128), gridMat()); tilt.add(grid); earth.userData.grid = grid;
    /* 起点那一点差别：青色像墨一样洇开（边缘带噪声） */
    const stain = new THREE.Mesh(new THREE.SphereGeometry(PLANET_R * 1.0105, 192, 96), new THREE.ShaderMaterial({
      uniforms: { uCenter: { value: new THREE.Vector3(0, 1, 0) }, uR: { value: 0 }, uA: { value: 0 }, uColor: { value: new THREE.Color(ICE) } },
      vertexShader: `varying vec3 vObj; void main(){ vObj = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: `uniform vec3 uCenter, uColor; uniform float uR, uA; varying vec3 vObj; ${GLSL_NOISE}
        void main(){ vec3 d = normalize(vObj); float ang = acos(clamp(dot(d, normalize(uCenter)), -1., 1.));
          float edge = uR*(1. + (fbm(d*7.) - .5)*.55) + .002;
          float inside = 1. - smoothstep(edge*.92, edge, ang), rim = exp(-pow((ang - edge*.96)/(edge*.06 + .004), 2.));
          float a = (inside*(.22 + .2*fbm(d*18.)) + rim*.9)*uA;
          gl_FragColor = vec4(uColor*a, 1.); }`,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    tilt.add(stain); earth.userData.stain = stain;
    const capAng = .11, capG = new THREE.SphereGeometry(PLANET_R * 1.0072, 64, 12, 0, Math.PI * 2, 0, capAng), cp = capG.attributes.position, cu = capG.attributes.uv, sr = PLANET_R * 1.0072 * Math.sin(capAng);
    for (let i = 0; i < cp.count; i++) cu.setXY(i, .5 + .5 * cp.getX(i) / sr, .5 + .5 * cp.getZ(i) / sr);
    const cyc = new THREE.Mesh(capG, new THREE.MeshStandardMaterial({ color: '#ffffff', alphaMap: cycloneTex(), transparent: true, depthWrite: false, roughness: 1, opacity: 0 }));
    const cycHold = new THREE.Group(); cycHold.add(cyc); tilt.add(cycHold); earth.userData.cyc = cyc; earth.userData.cycHold = cycHold;
  }
  /* 地球的太阳：只有一个 */
  const sol = new THREE.Group(); sol.visible = false; scene.add(sol);
  const solBody = new THREE.Mesh(new THREE.SphereGeometry(.45, 64, 48), sunMat('#FFF1D6', 7.7)); sol.add(solBody);
  const solCor = new THREE.Sprite(new THREE.SpriteMaterial({ map: coronaTex, color: '#FFF1D6', blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: .8 })); solCor.scale.setScalar(.45 * 9); sol.add(solCor);
  const solLight = new THREE.DirectionalLight('#FFF4E2', 0); scene.add(solLight, solLight.target);
  /* 从洛伦茨那张桌子上接过来的蝴蝶（两条墨迹），画法和 lorenz.js 里的一样 */
  const bfA = inkRibbon(2001, GOLD), bfB = inkRibbon(2001, ICE); bfA.mesh.visible = bfB.mesh.visible = false; scene.add(bfA.mesh, bfB.mesh);
  const trailsA = [0, 1, 2, 3].map(i => new Ribbon(TRN, i < 3 ? GOLD : '#E8F0FF')), trailsB = [0, 1, 2, 3].map(() => new Ribbon(TRN, ICE));
  for (const tr of [...trailsA, ...trailsB]) scene.add(tr.mesh);

  /* s: { t, cam, target, A, B, trailA[4], trailB[4], bA, bSplit, trailVis, planetTrail, planetSpin, sunGain? } */
  const tmp = new THREE.Vector3();
  function update(s) {
    const focus = tmp.set(...s.target).distanceTo(camera.position);
    stars.uniforms.uTime.value = s.t; dustM.uniforms.uTime.value = s.t; dustM.uniforms.uFocus.value = focus;
    stars.uniforms.uA.value = s.bgA == null ? 1 : s.bgA; dustM.uniforms.uA.value = s.dustA == null ? 1 : s.dustA; for (const m of neb) m.opacity = .55 * (s.nebA == null ? 1 : s.nebA);
    planet.position.set(s.A[9], s.A[10], s.A[11]);
    for (let i = 0; i < 3; i++) {
      const A = sunsA[i], B = sunsB[i];
      A.g.position.set(s.A[i * 3], s.A[i * 3 + 1], s.A[i * 3 + 2]); A.body.material.uniforms.uTime.value = s.t; A.light.position.copy(A.g.position);
      const sysK = s.sysK == null ? 1 : s.sysK;
      const d = A.g.position.distanceTo(planet.position); A.light.intensity = 1.35 * Math.min(1.6, Math.pow(.26 / Math.max(d, .1), 1.8)) * sysK; A.g.visible = sysK > .001;
      const dc = camera.position.distanceTo(A.g.position);
      A.halo.material.opacity = .2 * sstep(.9, 3.2, dc) * sysK; A.corona.material.opacity = .9 * (.12 + .88 * sstep(.5, 2.6, dc)) * sysK;
      A.body.material.uniforms.uGain.value = (.42 + .58 * sstep(.3, 1.8, dc)) * (s.sunGain || 1) * sysK;   // 贴近时像相机收光圈：看得见米粒组织，不是一片白
      B.g.position.set(s.B[i * 3], s.B[i * 3 + 1], s.B[i * 3 + 2]); B.ring.material.uniforms.uA.value = s.bA; B.glow.material.opacity = .45 * s.bA * s.bSplit; B.g.visible = s.bA > .001;
    }
    surf.rotation.y = s.planetSpin; clouds.rotation.y = s.planetSpin * 1.15 + .3;
    for (let i = 0; i < 3; i++) { atmo.material.uniforms.uSun.value[i].copy(sunsA[i].g.position); atmo.material.uniforms.uSunI.value[i] = sunsA[i].light.intensity / 1.35; }
    planetB.position.set(s.B[9], s.B[10], s.B[11]); pbRing.material.uniforms.uA.value = s.bA; planetB.visible = s.bA > .001;
    const sysK = s.sysK == null ? 1 : s.sysK;
    planet.visible = sysK > .001; for (const B of sunsB) { B.ring.material.uniforms.uA.value *= sysK; B.glow.material.opacity *= sysK; }
    pbRing.material.uniforms.uA.value *= (s.earth && s.earth.on ? 1 - s.earth.ringK : 1);
    for (let i = 0; i < 4; i++) {
      const pv = (i < 3 ? 1 : s.planetTrail) * sysK;
      trailsA[i].mesh.visible = s.trailVis * pv > .001; trailsB[i].mesh.visible = s.bA * s.trailVis * pv > .001;
      if (trailsA[i].mesh.visible) { trailsA[i].update(s.trailA[i], camera.position, i < 3 ? 2.4 : 1.4, upp); trailsA[i].mat.uniforms.uA.value = (i < 3 ? .9 : .6) * s.trailVis * pv; }
      if (trailsB[i].mesh.visible) { trailsB[i].update(s.trailB[i], camera.position, i < 3 ? 1.6 : 1.1, upp); trailsB[i].mat.uniforms.uA.value = .85 * s.bA * s.trailVis * pv; }
    }
    /* 地球 */
    const e = s.earth; earth.visible = !!(e && e.on && eSurf); sol.visible = earth.visible;
    if (earth.visible) {
      earth.position.set(...e.pos); earth.userData.tilt.rotation.y = 0; eSurf.rotation.y = e.spin; eCloud.rotation.y = e.spin + e.cloudSpin;
      eSurf.material.userData.uReveal.value = e.reveal; eCloud.material.userData.uReveal.value = e.reveal;
      const rr = PLANET_R * (1.45 - .42 * e.ringK); eRing.scale.setScalar(rr); eRing.material.uniforms.uA.value = (1 - e.ringK) * s.bA;
      const sd = new THREE.Vector3(...e.sunDir).normalize(); sol.position.copy(earth.position).addScaledVector(sd, 40);
      solBody.material.uniforms.uTime.value = s.t; solBody.material.uniforms.uGain.value = e.sunK; solCor.material.opacity = .8 * e.sunK;
      solLight.position.copy(sol.position); solLight.target.position.copy(earth.position); solLight.intensity = 3.2 * e.sunK;
      eAtmo.material.uniforms.uSun.value[0].copy(sol.position); eAtmo.material.uniforms.uSunI.value[0] = e.sunK; eAtmo.material.uniforms.uA.value = e.reveal;
      planetB.visible = false;
      eCloud.material.opacity = e.cloudA == null ? 1 : e.cloudA;
      const gr = earth.userData.grid, gu = gr.material.uniforms; gr.rotation.y = e.spin; gr.visible = !!(e.grid && e.grid.a > .001); if (gr.visible) gr.scale.setScalar(1 + (e.grid.lift == null ? .009 : e.grid.lift));
      if (gr.visible) { gu.uA.value = e.grid.a; gu.uReveal.value = e.grid.reveal; gu.uCenter.value.set(...e.grid.center); gu.uCell.value.set(...e.grid.cell); gu.uCellA.value = e.grid.cellA; gu.uStep.value.set(...(e.grid.step || [1.8, 3])); }
      const st = earth.userData.stain; st.rotation.y = e.spin; st.visible = !!(e.stain && e.stain.a > .001);
      if (st.visible) { st.material.uniforms.uA.value = e.stain.a; st.material.uniforms.uR.value = e.stain.r; st.material.uniforms.uCenter.value.set(...e.stain.center); }
      const cy = earth.userData.cyc; cy.visible = !!(e.cyc && e.cyc.a > .001);
      if (cy.visible) { earth.userData.cycHold.rotation.y = e.spin + e.cloudSpin; cy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...e.cyc.dir)); cy.material.opacity = e.cyc.a * (e.cloudA == null ? 1 : e.cloudA); }
    } else solLight.intensity = 0;
    /* 蝴蝶 */
    const bf = s.bfly; bfA.mesh.visible = bfB.mesh.visible = !!(bf && bf.a > .001);
    if (bf && bf.a > .001) { bfA.update(bf.A, camera.position, bf.px, upp, 1); bfB.update(bf.B, camera.position, bf.px * .85, upp, 1); bfA.mat.uniforms.uA.value = bfB.mat.uniforms.uA.value = bf.a;
      bfA.mat.uniforms.uColor.value.set(GOLD).multiplyScalar(1.35); bfB.mat.uniforms.uColor.value.set(ICE).multiplyScalar(1.35); }
    scene.background.set('#02040A').multiplyScalar(s.bg == null ? 1 : s.bg);   // 每帧重设：不留跨帧状态
  }
  return { scene, camera, update, planet, sunsA, earth };
}
