// The morobot-P double parallelogram arm, projected from 3D so the camera can orbit.
// All lengths, pivots and part depths come from geometry.json, measured from the morobot-P CAD model.
// World axes: x forward, y across the arm (positive towards the viewer in the front view), z up. Origin: shoulder axis.
const $ = id => document.getElementById(id), rad = d => d * Math.PI / 180, deg = r => r * 180 / Math.PI;
const NS = "http://www.w3.org/2000/svg", css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const svg = $("v");
const cam = { az: -57, el: 31 }; // default 3D view; both servos and all link layers visible
let G; // geometry.json

// Orbit: turn about the vertical axis by az, then tilt by el. az = el = 0 is the plain side view.
function proj([x, y, z]) {
  const a = rad(cam.az), e = rad(cam.el);
  // yr is depth away from the viewer, so positive y (towards the viewer) becomes negative depth.
  const xr = x * Math.cos(a) + y * Math.sin(a), yr = x * Math.sin(a) - y * Math.cos(a);
  return [xr, -(z * Math.cos(e) + yr * Math.sin(e)), yr * Math.cos(e) - z * Math.sin(e)];
}
const P = (p2, y) => [p2[0], y, p2[1]]; // a point of the arm plane (forward, up) at depth y
const add = (p, q) => [p[0] + q[0], p[1] + q[1]];
const mid = k => (G.depth[k][0] + G.depth[k][1]) / 2;

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
// A part's bounding box from geometry.json: [[forward, up] min, max] in the arm plane, depth range across.
const boxOf = (k, dk, c) => { const [a, b] = G.boxes[k]; box([a[0], b[0]], G.depth[dk], [a[1], b[1]], c); };
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
const axle = (p, ys) => ln(P(p, Math.min(...ys)), P(p, Math.max(...ys)), css("--muted"), 1.5); // pin through stacked parts

let W2 = [0, 0];
function draw() {
  const q1 = +$("q1").value, q2 = +$("q2").value; $("o1").textContent = q1; $("o2").textContent = q2;
  $("oaz").textContent = cam.az; $("oel").textContent = cam.el;
  const { L1, L2, R } = G, a1 = rad(q1), a2 = rad(q2), ink = css("--ink"), cA = css("--a"), cB = css("--b"), mu = css("--muted");
  const O = [0, 0], E = [L1 * Math.cos(a1), L1 * Math.sin(a1)], W = add(E, [L2 * Math.cos(a2), L2 * Math.sin(a2)]);
  const C = [-R * Math.cos(a2), -R * Math.sin(a2)], Lv = add(E, C);           // crank tip and forearm rear lever
  const Gp = G.G, T = add(E, G.triRear), T2 = add(E, G.triTop), F2 = add(W, G.triTop); // levelling pivots
  W2 = W;
  const rel = q1 - q2, ok = rel >= 25 && rel <= 155;
  const yA = mid("upperArm"), yC = mid("crank"), yR = mid("rod"), yF = mid("forearm"), yT = mid("triangle"), yL = mid("level"), yK = mid("bracket");
  items = [];

  boxOf("servo", "servoA", cA); boxOf("servo", "servoB", cB);
  ring([0, G.depth.servoA[1], 0], 12, cA, 3); ring([0, G.depth.servoB[0], 0], 12, cB, 3);
  axle(O, [G.depth.servoA[1], G.depth.servoB[0]]);
  txt([-36, G.depth.servoA[0], 12], "Servo A (behind): turns upper arm", cA, "end", -8, 0);
  txt([12, G.depth.servoB[1], -12], "Servo B (in front): turns crank", cB, "start", 8, 18);

  if ($("p2").checked) {
    // Fixed arm of the turret plate, rod parallel to the upper arm, elbow triangle, long link parallel to the
    // forearm, and the flange that closes the second parallelogram at the wrist.
    ln(P(O, yK), P(Gp, yK), ink, 8); ln(P(Gp, yL), P(T, yL), ink, 6); ln(P(T2, yL), P(F2, yL), ink, 6);
    plateAt([E, T, T2], yT, ink);
    axle(Gp, [yK, yL]); axle(T, [yT, yL]); axle(T2, [yT, yL]); axle(F2, [yL, G.depth.flange[1]]);
    [Gp, T, T2, F2].forEach(p => pin(P(p, yL)));
  }
  if ($("p1").checked) {
    ln(P(O, yC), P(C, yC), cB, 8); ln(P(C, yR), P(Lv, yR), ink, 6);
    axle(C, [yC, yR]); axle(Lv, [yR, yF]);
    [C, Lv].forEach(p => pin(P(p, yR)));
  }
  ln(P(O, yA), P(E, yA), cA, 9); ln(P(Lv, yF), P(W, yF), ok ? ink : css("--bad"), 10);
  // Flange: a U bracket around the wrist pin, as wide as the arm; its face carries the tool.
  const fl = G.flange.map(p => add(W, p));
  plateAt(fl, G.depth.flange[0], ink); plateAt(fl, G.depth.flange[1], ink);
  axle(E, [yA, yT]); axle(W, G.depth.flange);
  [O, E].forEach(p => pin(P(p, yA))); pin(P(W, yF));
  txt(P(E, yA), "elbow: no motor", mu, "start", 10, -12); txt(P(W, yF), "wrist: no motor", mu, "start", 6, 34);

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
  if (!G) return;
  if (mode === "orbit") {
    cam.az = Math.round(Math.max(-80, Math.min(80, cam.az + (e.clientX - last[0]) * 0.5)));
    cam.el = Math.round(Math.max(0, Math.min(70, cam.el + (e.clientY - last[1]) * 0.5)));
    last = [e.clientX, e.clientY]; $("az").value = cam.az; $("el").value = cam.el; draw();
  } else if (mode === "ik") {
    const { L1, L2 } = G;
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

fetch("geometry.json?v=5").then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).then(g => {
  G = g;
  $("q1").value = Math.round(G.pose.q1); $("q2").value = Math.round(G.pose.q2); // the pose saved in the CAD model
  draw();
}).catch(err => {
  $("r").textContent = `Could not load geometry.json (${err.message}). Open the page through a web server, not as a file.`;
});
