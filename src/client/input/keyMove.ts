/**
 * Keyboard movement relative to the camera (PRD v4 §4): "up" walks where the camera looks on the
 * ground plane, "right" to its right. Returns a unit [x, z], or null when no direction is held.
 */
export function keyMove(keys: { up?: boolean; down?: boolean; left?: boolean; right?: boolean }, forward: [number, number]): [number, number] | null {
  const f = (keys.up ? 1 : 0) - (keys.down ? 1 : 0);
  const r = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  if (f === 0 && r === 0) return null;
  const fl = Math.hypot(forward[0], forward[1]) || 1;
  const [fx, fz] = [forward[0] / fl, forward[1] / fl];
  const [rx, rz] = [-fz, fx]; // Y up: right of a ground direction (fx, fz)
  const x = fx * f + rx * r;
  const z = fz * f + rz * r;
  const len = Math.hypot(x, z);
  return [x / len + 0, z / len + 0];
}
