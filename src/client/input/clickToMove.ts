import type { Vec3 } from '../../sim';

/** Move vector (world XZ, yaw 0) from Mây toward a clicked point; arrived within `stop` metres. */
export function moveToward(pos: Vec3, target: [number, number] | null, stop = 0.2): { move: [number, number]; arrived: boolean } {
  if (!target) return { move: [0, 0], arrived: true };
  const dx = target[0] - pos[0];
  const dz = target[1] - pos[2];
  const d = Math.hypot(dx, dz);
  if (d <= stop) return { move: [0, 0], arrived: true };
  return { move: [dx / d, dz / d], arrived: false };
}
