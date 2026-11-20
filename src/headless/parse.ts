import type { Scenario, Vec3 } from '../sim';
import type { InputFrame } from './timeline';

/** Malformed inputs/scenario file: the CLI maps this to exit code 2. */
export class ContractFormatError extends Error {}

const fail = (msg: string): never => {
  throw new ContractFormatError(msg);
};
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function bool(v: unknown, where: string): boolean | undefined {
  if (v === undefined) return undefined;
  return typeof v === 'boolean' ? v : fail(`${where} must be a boolean`);
}
function num(v: unknown, where: string, min = -Infinity): number | undefined {
  if (v === undefined) return undefined;
  return isNum(v) && v >= min ? v : fail(`${where} must be a number >= ${min}`);
}
function int(v: unknown, where: string, min = 0): number | undefined {
  const n = num(v, where, min);
  return n === undefined || Number.isInteger(n) ? n : fail(`${where} must be an integer`);
}
function vec3(v: unknown, where: string): Vec3 {
  return Array.isArray(v) && v.length === 3 && v.every(isNum) ? [v[0], v[1], v[2]] : fail(`${where} must be [x, y, z]`);
}

export function parseInputs(json: unknown): InputFrame[] {
  if (!isObj(json) || !Array.isArray(json.frames)) return fail('inputs must be an object with a "frames" array');
  let last = -1;
  return json.frames.map((f, i) => {
    const at = `frames[${i}]`;
    if (!isObj(f)) return fail(`${at} must be an object`);
    const tick = int(f.tick, `${at}.tick`) ?? fail(`${at}.tick is required`);
    if (tick <= last) fail(`${at}.tick must be strictly increasing`);
    last = tick;
    const frame: InputFrame = { tick };
    if (f.move !== undefined) {
      const m = f.move;
      if (!Array.isArray(m) || m.length !== 2 || !m.every((x) => isNum(x) && x >= -1 && x <= 1))
        fail(`${at}.move must be [x, z] with components in [-1, 1]`);
      frame.move = [(m as number[])[0], (m as number[])[1]];
    }
    frame.cam_yaw_deg = num(f.cam_yaw_deg, `${at}.cam_yaw_deg`);
    frame.jump = bool(f.jump, `${at}.jump`);
    frame.interact = bool(f.interact, `${at}.interact`);
    frame.pulse = bool(f.pulse, `${at}.pulse`);
    frame.dash = bool(f.dash, `${at}.dash`);
    return frame;
  });
}

export function parseScenario(json: unknown): Scenario {
  if (!isObj(json)) return fail('scenario must be an object');
  const sc: Scenario = {};
  if (json.player !== undefined) {
    const p = json.player;
    if (!isObj(p)) return fail('player must be an object');
    sc.player = {
      pos: p.pos === undefined ? undefined : vec3(p.pos, 'player.pos'),
      carried: int(p.carried, 'player.carried'),
      flames: int(p.flames, 'player.flames'),
    };
  }
  sc.random_motes = bool(json.random_motes, 'random_motes');
  sc.random_shades = bool(json.random_shades, 'random_shades');
  if (json.motes !== undefined) {
    if (!Array.isArray(json.motes)) return fail('motes must be an array');
    sc.motes = json.motes.map((m, i) => vec3(m, `motes[${i}]`));
  }
  if (json.shades !== undefined) {
    if (!Array.isArray(json.shades)) return fail('shades must be an array');
    sc.shades = json.shades.map((s, i) => {
      if (!isObj(s)) return fail(`shades[${i}] must be an object`);
      if (s.id !== undefined && typeof s.id !== 'string') fail(`shades[${i}].id must be a string`);
      return { id: s.id as string | undefined, pos: vec3(s.pos, `shades[${i}].pos`) };
    });
  }
  if (json.lanterns !== undefined) {
    if (!Array.isArray(json.lanterns)) return fail('lanterns must be an array');
    sc.lanterns = json.lanterns.map((l, i) => {
      if (!isObj(l) || typeof l.id !== 'string') return fail(`lanterns[${i}] needs a string id`);
      return {
        id: l.id,
        pos: l.pos === undefined ? undefined : vec3(l.pos, `lanterns[${i}].pos`),
        deposited: int(l.deposited, `lanterns[${i}].deposited`),
        lit: bool(l.lit, `lanterns[${i}].lit`),
      };
    });
  }
  sc.time_left_s = num(json.time_left_s, 'time_left_s', 0);
  return sc;
}
