// Phone-local millimetres → kit world units.
//
// Local frame (as seen from the FRONT, screen facing you, top up):
//   u  0 → 78     across, from the left edge to the right edge
//   v  0 → 163.4  down, from the top edge to the bottom edge
//   w  0 → 8.75   from the back plane to the front glass
// World frame (kit): x, y on the floor, z up. The kit's isometric projection is mirrored (it
// draws world +x to the right of the screen where a real camera standing at +x+y would see it
// on the left), so to draw the real phone and not its mirror image, u runs along −y:
//   x = (v − 81.7)·U    y = (39 − u)·U    z = w·U
// The phone lies screen-up with its top (Dynamic Island) to the left of the frame and its left
// side (Action button, volume) facing the viewer; text drawn in the phone's own frame reads
// the right way round.

export const U = 4;                 // world units per millimetre
export const PHONE = { u: 78, v: 163.4, w: 8.75, r: 11.6 };   // r: corner radius (estimate)

export const X = (v) => (v - PHONE.v / 2) * U;
export const Y = (u) => (PHONE.u / 2 - u) * U;
export const Z = (w) => w * U;
export const W3 = (u, v, w) => [X(v), Y(u), Z(w)];

// A rounded rectangle given in local mm (u0, v0, du, dv, r) → a kit floor plan.
export const plan = (u0, v0, du, dv, r = 0) => ({ x: X(v0), y: Y(u0 + du), w: dv * U, d: du * U, r: r * U });
// Same, from a centre and a size.
export const planC = (uc, vc, du, dv, r = 0) => plan(uc - du / 2, vc - dv / 2, du, dv, r);
// A floor ring from local [u, v] points.
export const ringL = (points) => points.map(([u, v]) => [X(v), Y(u)]);
