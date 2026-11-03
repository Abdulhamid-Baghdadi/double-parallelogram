// Side view of the double parallelogram arm, projected from 3D so the camera can orbit.
// World axes: x forward, y across the arm (positive towards the viewer in the front view), z up.
const L1 = 120, L2 = 150, R = 30, H = 22; // H: levelling offset (triangle and flange height)
// Depth of each layer across the arm, so servos and links sit side by side as in a real build.
// Servos sit outboard of the link layers so no link runs through a servo body.
const Y = { arm: 0, drive: 16, level: -16, servoA: [-58, -30], servoB: [30, 58] };
const $ = id => document.getElementById(id), rad = d => d * Math.PI / 180, deg = r => r * 180 / Math.PI;
const NS = "http://www.w3.org/2000/svg", css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const svg = $("v");
const cam = { az: -57, el: 31 }; // default 3D view; both servos and all three link layers visible

// Orbit: turn about the vertical axis by az, then tilt by el. az = el = 0 is the plain side view.
function proj([x, y, z]) {
  const a = rad(cam.az), e = rad(cam.el);
  // yr is depth away from the viewer, so positive y (towards the viewer) becomes negative depth.
  const xr = x * Math.cos(a) + y * Math.sin(a), yr = x * Math.sin(a) - y * Math.cos(a);
  return [xr, -(z * Math.cos(e) + yr * Math.sin(e)), yr * Math.cos(e) - z * Math.sin(e)];
}
const P = (p2, y) => [p2[0], y, p2[1]]; // a point of the arm plane (x, height) at depth y
const add = (p, q) => [p[0] + q[0], p[1] + q[1]];

let items = [];
const push = (depth, tag, at, text) => items.push({ depth, tag, at, text });
function ln(a, b, c, w, dash) {
  const [x1, y1, d1] = proj(a), [x2, y2, d2] = proj(b);
  push((d1 + d2) / 2, "line", { x1, y1, x2, y2, stroke:c, "stroke-width":w, "stroke-linecap":"round", ...(dash ? { "stroke-dasharray":dash } : {}) });
}
function pin(p, r = 3.5) { const [cx, cy, d] = proj(p); push(d + 0.1, "circle", { cx, cy, r, fill:css("--bg"), stroke:css("--ink"), "stroke-width":1.5 }); }
function txt(p, s, c, anchor = "start", dx = 0, dy = 0) { const [x, y] = proj(p); push(1e9, "text", { x:x + dx, y:y + dy, fill:c, "font-size":11, "text-anchor":anchor, "font-family":"system-ui" }, s); }
function box([x0, x1], [y0, y1], [z0, z1], c) {
  const v = [];
  for (const x of [x0, x1]) for (const y of [y0, y1]) for (const z of [z0, z1]) v.push([x, y, z]);
  const faces = [[0, 1, 3, 2], [4, 5, 7, 6], [0, 1, 5, 4], [2, 3, 7, 6], [0, 2, 6, 4], [1, 3, 7, 5]];
  for (const f of faces) {
    const pts = f.map(i => proj(v[i])), d = pts.reduce((s, p) => s + p[2], 0) / 4;
    push(d, "polygon", { points:pts.map(p => `${p[0]},${p[1]}`).join(" "), fill:c, "fill-opacity":.16, stroke:c, "stroke-width":1.2, "stroke-linejoin":"round" });
  }
}
function plateAt(pts2, y, c) {
  const pts = pts2.map(p => proj(P(p, y))), d = pts.reduce((s, p) => s + p[2], 0) / pts.length;
  push(d, "polygon", { points:pts.map(p => `${p[0]},${p[1]}`).join(" "), fill:c, "fill-opacity":.35, stroke:c, "stroke-width":2, "stroke-linejoin":"round" });
}
function ring(p, r, c, w) {
  // A circle in the x-z plane (around the shoulder axis), drawn as a polyline so it tilts with the camera.
  const pts = [];
  for (let i = 0; i <= 32; i++) { const t = i / 32 * 2 * Math.PI; pts.push(proj([p[0] + r * Math.cos(t), p[1], p[2] + r * Math.sin(t)])); }
  push(pts[0][2] + 0.2, "polyline", { points:pts.map(q => `${q[0]},${q[1]}`).join(" "), fill:"none", stroke:c, "stroke-width":w });
}

let W2 = [0, 0];
function draw() {
  const q1 = +$("q1").value, q2 = +$("q2").value; $("o1").textContent = q1; $("o2").textContent = q2;
  $("oaz").textContent = cam.az; $("oel").textContent = cam.el;
  const a1 = rad(q1), a2 = rad(q2), ink = css("--ink"), cA = css("--a"), cB = css("--b"), cC = css("--c"), mu = css("--muted");
  const O = [0, 0], E = [L1 * Math.cos(a1), L1 * Math.sin(a1)], W = add(E, [L2 * Math.cos(a2), L2 * Math.sin(a2)]);
  const C = [-R * Math.cos(a2), -R * Math.sin(a2)], Lv = add(E, C);  // crank tip and forearm lever
  const T2 = add(E, [0, H]), G2 = [0, H], F2 = add(W, [0, H]);       // levelling: base bar, triangle, flange
  W2 = W;
  const rel = q1 - q2, ok = rel >= 25 && rel <= 155;
  items = [];

  box([-60, 60], [-70, 70], [-40, -36], mu);                                   // base plate
  box([-22, 22], Y.servoA, [-36, 18], cA); box([-22, 22], Y.servoB, [-36, 18], cB);
  // Servo A's shaft runs through to the upper arm; servo B's shaft runs to the crank. Both on one axis.
  ln([0, Y.servoA[1], 0], [0, Y.arm, 0], cA, 4); ln([0, Y.servoB[0], 0], [0, Y.drive, 0], cB, 4);
  ring([0, Y.servoA[1], 0], 12, cA, 3); ring([0, Y.servoB[0], 0], 9, cB, 3);
  // Fixed bracket from the base plate holding the levelling bar; it never moves.
  ln([-8, Y.level, -36], [0, Y.level, 0], mu, 5); ln([8, Y.level, -36], [0, Y.level, H], mu, 5);
  txt([-22, Y.servoA[0], 18], "Servo A (behind): turns upper arm", cA, "end", -8, 0);
  txt([22, Y.servoB[1], -30], "Servo B (in front): turns crank", cB, "start", 8, 18);

  if ($("p2").checked) {
    const y = Y.level;
    // Fixed bar on the base, rod parallel to the upper arm, elbow triangle, link parallel to the forearm,
    // and the flange plate that closes the second parallelogram at the wrist.
    ln(P(O, y), P(G2, y), mu, 6); ln(P(G2, y), P(T2, y), cC, 5); ln(P(T2, y), P(F2, y), cC, 6);
    // Triangle and flange are plates, as in morobot-P, not single bars.
    plateAt([E, T2, add(E, [H * 0.9, H * 0.5])], y, cC);
    plateAt([W, F2, add(F2, [26, 0]), add(W, [26, 0])], y, ink);
    ln(P(O, Y.arm), P(O, y), mu, 1.5); ln(P(E, Y.arm), P(E, y), mu, 1.5); ln(P(W, Y.arm), P(W, y), mu, 1.5); // pins through the layers
    [O, G2, E, T2, W, F2].forEach(p => pin(P(p, y)));
  }
  if ($("p1").checked) {
    const y = Y.drive;
    ln(P(O, y), P(C, y), cB, 7); ln(P(C, y), P(Lv, y), cB, 5); ln(P(Lv, Y.arm), P(Lv, y), mu, 1.5);
    [C, Lv].forEach(p => pin(P(p, y)));
  }
  ln(P(O, Y.arm), P(E, Y.arm), cA, 10); ln(P(Lv, Y.arm), P(W, Y.arm), ok ? ink : css("--bad"), 8);
  const fl = Y.arm;
  ln(P(W, fl), P(add(W, [28, 0]), fl), ink, 4); ln(P(add(W, [28, 0]), fl), P(add(W, [28, -22]), fl), ink, 3);
  [O, E, Lv, W].forEach(p => pin(P(p, Y.arm)));
  txt(P(E, 0), "elbow: no motor", mu, "start", 10, -12); txt(P(W, 0), "wrist: no motor", mu, "start", 6, 34);

  svg.replaceChildren();
  items.sort((a, b) => b.depth - a.depth);  // painter's order: far first
  for (const it of items) { const e = document.createElementNS(NS, it.tag); for (const k in it.at) e.setAttribute(k, it.at[k]); if (it.text) e.textContent = it.text; svg.append(e); }
  if (cam.az === 0 && cam.el === 0) {
    const [hx, hy] = proj(P(W, 0));
    const h = document.createElementNS(NS, "circle");
    for (const [k, v] of Object.entries({ cx:hx, cy:hy, r:12, fill:cA, "fill-opacity":.18, stroke:cA, style:"cursor:grab" })) h.setAttribute(k, v);
    h.addEventListener("pointerdown", e => { e.stopPropagation(); mode = "ik"; svg.setPointerCapture(e.pointerId); });
    svg.append(h);
  }
  $("r").innerHTML =
    `<div><b>Wrist</b>x ${W[0].toFixed(0)}, y ${W[1].toFixed(0)} mm</div>` +
    `<div><b>Forearm</b>${q2}° from horizontal = servo B</div>` +
    `<div><b>Flange tilt</b>0° (held by the levelling links)</div>` +
    `<div><b>Joint gap</b><span class="${ok ? "" : "bad"}">${rel}° ${ok ? "" : "near dead centre"}</span></div>`;
}

// Drag the wrist for inverse kinematics (side view only); drag anywhere else to orbit the camera.
let mode = null, last = null;
svg.addEventListener("pointerdown", e => { mode = "orbit"; last = [e.clientX, e.clientY]; svg.setPointerCapture(e.pointerId); });
svg.addEventListener("pointermove", e => {
  if (mode === "orbit") {
    cam.az = Math.round(Math.max(-80, Math.min(80, cam.az + (e.clientX - last[0]) * 0.5)));
    cam.el = Math.round(Math.max(0, Math.min(70, cam.el + (e.clientY - last[1]) * 0.5)));
    last = [e.clientX, e.clientY]; $("az").value = cam.az; $("el").value = cam.el; draw();
  } else if (mode === "ik") {
    const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
    const s = p.matrixTransform(svg.getScreenCTM().inverse()), x = s.x, y = -s.y;
    const d = Math.min(Math.hypot(x, y), L1 + L2 - 1), al = Math.atan2(y, x);
    const c = (d * d + L1 * L1 - L2 * L2) / (2 * L1 * d); if (Math.abs(c) > 1) return;
    const a1 = al + Math.acos(c), a2 = Math.atan2(d * Math.sin(al) - L1 * Math.sin(a1), d * Math.cos(al) - L1 * Math.cos(a1));
    $("q1").value = Math.round(deg(a1)); $("q2").value = Math.round(deg(a2)); draw();
  }
});
svg.addEventListener("pointerup", () => mode = null);
["q1", "q2", "p1", "p2"].forEach(id => $(id).addEventListener("input", draw));
$("az").addEventListener("input", () => { cam.az = +$("az").value; draw(); });
$("el").addEventListener("input", () => { cam.el = +$("el").value; draw(); });
$("side").addEventListener("click", () => { cam.az = 0; cam.el = 0; $("az").value = 0; $("el").value = 0; draw(); });
$("iso").addEventListener("click", () => { cam.az = -57; cam.el = 31; $("az").value = -57; $("el").value = 31; draw(); });
$("az").value = cam.az; $("el").value = cam.el;
draw();
