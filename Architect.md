# Kiến trúc: Đảo Đèn Lồng

> Ghi chú kiến trúc cho Phase 1. Luật chơi: `docs/NOTES.md` (A1–A14). Thứ tự tick: `docs/adr/0001-tick-step-order.md`. Thuật ngữ game: `GLOSSARY.md`.
> Từ vựng thiết kế theo skill `codebase-design`: **Module**, **Interface**, **Seam**, **Adapter**, **Depth**.

## 1. Bức tranh tổng

Có ba module, phụ thuộc theo **một chiều**:

```
                game.contract.json  (tuning: nguồn số duy nhất)
                         │
                         ▼
   ┌──────────────────────────────────────────┐
   │  sim   (src/sim)         MODULE SÂU      │
   │  createSim(cfg) → { step(ctrl), state }  │
   │  toàn bộ luật chơi, tất định, không I/O  │
   └──────────────────────────────────────────┘
           ▲                          ▲
           │ ControlState mỗi tick    │ ControlState mỗi tick
           │ SimEvent[] trả về        │ SimEvent[] trả về
   ┌───────┴───────────┐      ┌───────┴──────────────────┐
   │ headless          │      │ client (src/client)      │
   │ (src/headless)    │      │ Three.js, HUD, chuột,    │
   │ CLI + Test        │      │ camera MOBA, phím QWER   │
   │ Contract JSONL    │      │                          │
   └───────────────────┘      └──────────────────────────┘
```

- `sim` **không biết** ai gọi nó. Nó không import `three`, DOM hay Node API, không dùng `Math.random` hay đồng hồ thật.
- `headless` và `client` là hai **adapter** cùng lái một interface. Vì có hai adapter thật nên seam ở `createSim` là seam thật, không phải giả định.
- Hai adapter không import lẫn nhau.

## 2. Module `sim`: Interface

Toàn bộ luật chơi nằm sau một interface nhỏ:

```ts
// src/sim/index.ts: chỉ export những thứ dưới đây
export function createSim(cfg: SimConfig): Sim;

export interface SimConfig {
  seed: number;            // seed cho PRNG duy nhất của sim
  night: 1;
  scenario?: Scenario;     // đã validate; áp lên trạng thái mặc định
  tuning?: Tuning;         // mặc định đọc từ game.contract.json
}

export interface Sim {
  /** Chạy đúng 1 bước (1/60 s). Trả về các event phát sinh, mỗi event mang tick = state.tick mới.
   *  Gọi khi state.status !== 'playing' thì không làm gì và trả về []. */
  step(ctrl: ControlState): SimEvent[];
  /** Trạng thái chỉ-đọc; caller không được sửa. */
  readonly state: Readonly<SimState>;
}

/** Trạng thái nút ĐANG GIỮ tại tick này (level), không phải cạnh lên. */
export interface ControlState {
  move: [number, number];  // [x, z], mỗi thành phần ∈ [-1, 1]
  camYawDeg: number;
  jump: boolean; interact: boolean; pulse: boolean;
}
```

**Các bất biến mà caller cần biết** (cũng là một phần của interface):

- **Sim tự phát hiện cạnh lên** (false → true) bằng cách nhớ `ControlState` của tick trước. Caller chỉ cần gửi trạng thái "đang giữ". Vì vậy headless (tệp inputs, nơi giá trị được giữ nguyên giữa các frame) và client (phím đang nhấn) dùng chung một logic.
- **Sim tự xoay và chuẩn hoá `move`** theo `camYawDeg` đúng công thức trong contract.
- `createSim` dựng scenario **không phát event và không cộng điểm**. `state` ngay sau `createSim` chính là snapshot tick 0.
- `state.tick` = số bước đã chạy. `state.timeLeftS` được **suy ra** từ `tick` (`duration − tick/60`), không cộng dồn số thực.
- Sau khi kết thúc (`won`/`lost`), `state` đứng yên. Event `game_over` là event cuối cùng.

**Kiểu dữ liệu chính** (`src/sim/types.ts`):

- `SimState`: `{ tick, status: 'playing'|'won'|'lost', endReason?, timeLeftS, score, player, lanterns[], shades[], motes[] }`
- `player`: `{ pos: Vec3, vy, flames, carried, invulnTicks, pulseCooldownTicks }`
- `lanterns[]`: `{ id: 'L1'…'L5', pos, lit, deposited }`
- `shades[]`: `{ id, pos, state: 'chase'|'stunned', stunTicks }`
- `motes[]`: `{ id, pos }`
- `SimEvent`: union có phân biệt theo `name`, với `data` **đúng bảng event của contract** (`mote_picked`, `deposit`, `lantern_lit`, `pulse`, `player_hit`, `shade_spawned`, `game_over`) và kèm `tick`.

## 3. Module `sim`: Implementation và seam nội bộ

```
src/sim/
  index.ts        createSim; interface công khai duy nhất
  types.ts        SimState, ControlState, SimEvent, Scenario, Tuning
  tuning.ts       đọc tuning từ game.contract.json; đổi giây → tick: Math.round(s·60)
  world.ts        hằng số thế giới KHÔNG thuộc tuning (xem §6)
  rng.ts          mulberry32(seed); PRNG duy nhất, mọi nơi dùng chung một instance
  geometry.ts     distXZ, normalize2, rotateYaw, clampToDisk, pushOutOfDisk
  scenario.ts     buildInitialState(seed, tuning, scenario?)
  step.ts         NƠI DUY NHẤT quy định thứ tự hệ thống (ADR-0001)
  systems/
    player.ts     di chuyển, nhảy (chỉ đổi Y), kẹp mép đảo
    motes.ts      tự nhặt, sinh bù
    lanterns.ts   interact → nạp/thắp
    pulse.ts      tốn đom đóm, cooldown, choáng, đẩy lùi
    shades.ts     đuổi theo, đẩy ra khỏi vùng an toàn của đèn đã sáng, sinh thêm
    hits.ts       bị chạm, rơi đom đóm, bất tử
    end.ts        all_lit → no_flames → dawn; thưởng điểm khi thắng
```

- Mỗi `system` có dạng `(s: SimState, ctx: StepCtx) → void`, trong đó `ctx` chứa tuning, rng, các cạnh lên đã tính và hàm `emit(event)`. Đây là **seam nội bộ**: không export ra ngoài `index.ts`.
- **Điểm số** được cộng tại nơi phát event tương ứng (`mote_picked`, `lantern_lit`, `pulse`), riêng thưởng khi thắng thì nằm ở `end.ts`. Không có module "score" riêng: nếu thử xoá đi (deletion test), logic điểm chỉ là 1 dòng ở mỗi nơi.
- **Mọi bộ đếm thời gian tính bằng số nguyên tick** (choáng, bất tử, cooldown, sinh Bóng Mực mỗi 3600 tick, sinh đom đóm mỗi 120 tick) để tránh sai số cộng dồn và giữ tính tất định.
- **Id** được sinh bằng bộ đếm tăng dần trong state (`S1`…, `M1`…), không dùng ngẫu nhiên.
- **Trường hợp biên:** khi đẩy lùi mà Bóng Mực trùng đúng vị trí Mây (không có hướng) thì đẩy theo +X. Khi bị đẩy ra khỏi vùng an toàn, Bóng Mực được đặt **đúng trên mép** `safe_radius`. Bóng Mực **không** bị kẹp trong đảo vì chúng sống trong sương.

## 4. Module `headless`

```
src/headless/
  main.ts       adapter Node mỏng: argv → đọc file → runHeadless → ghi file → exit code
  args.ts       parseArgs(argv) → HeadlessArgs        (sai thì ArgError → exit 1)
  parse.ts      parseScenario(json), parseInputs(json) (sai định dạng thì ContractFormatError → exit 2)
  timeline.ts   InputTimeline: frames → ControlState tại tick k (giữ giá trị cũ, mặc định 0/false)
  run.ts        runHeadless(cfg) → string[]  (dòng JSONL)    ← interface để test
  format.ts     NƠI DUY NHẤT biết hình dạng JSONL của contract + làm tròn 3 chữ số
```

- **Interface để test:** `runHeadless({ seed, night, scenario?, timeline, ticks, snapshotEvery }) → string[]`. Đây là hàm thuần: vòng lặp tick, snapshot ở tick 0 và mỗi `snapshotEvery`, ghi event ngay khi phát sinh, snapshot cuối khi game kết thúc, rồi dòng `end`. Vitest gọi trực tiếp hàm này mà không cần spawn process.
- `main.ts` là phần duy nhất chạm tới `fs`, `process.exit` và `stderr`. Phần exit code được kiểm chứng end-to-end bằng `scripts/verify` (chạy binary thật), không phải bằng Vitest.
- `format.ts` gom mọi hiểu biết về contract output vào một chỗ (locality): tên trường snake_case, `sim_tick`, `motes_active`, mảng `motes` khuyến nghị, làm tròn toạ độ. Nếu contract đổi ở phase sau thì chỉ sửa file này.

## 5. Module `client`

```
src/client/
  main.ts            ghép mọi thứ; R → createSim(seed mới) khi đã kết thúc
  loop.ts            vòng lặp bước cố định: accumulator 1/60 s, tối đa 5 bước mỗi frame
  input/
    clickToMove.ts   moveToward(pos, target, stop=0.2) → { move, arrived }  (hàm thuần)
    keybindings.ts   Q nhảy / W nạp / E tỏa sáng / R chơi lại / Space camera; lưu localStorage
    controls.ts      sample(playerPos) → ControlState (camYawDeg luôn = 0)
  camera.ts          camera MOBA: góc cố định ~55°, trượt ở mép màn hình, Space về Mây/giữ để bám, lăn để zoom
  scene/             dựng mesh: đảo, đèn, đom đóm, Bóng Mực, Mây; sync(state) mỗi frame
  hud.ts             DOM overlay: lửa, mang/tối đa, đèn x/5, thời gian, điểm, cooldown, màn thắng/thua
  settings.ts        màn Cài đặt (Esc) đổi phím; làm sau lõi
```

- **Click-to-move nằm hoàn toàn ở client.** Raycast điểm click xuống mặt phẳng Y = 0, kẹp vào đĩa bán kính 40 m, rồi mỗi tick `moveToward` sinh `move` theo hướng thế giới. Sim không biết gì về chuột.
- `keybindings.ts` nhận `Storage` qua tham số. Có hai adapter (`localStorage` thật và `Map` trong bộ nhớ cho test), nên seam này là seam thật. Mọi lần đọc/ghi đều bọc `try/catch`, lỗi thì dùng mặc định.
- `scene` và `hud` chỉ **đọc** `sim.state` và các `SimEvent` (event dùng cho hiệu ứng như đèn bừng sáng hay chớp khi bị chạm). Chúng không bao giờ ghi vào state.
- Đồng hồ thật và `Math.random` (seed cho lượt chơi mới) được phép ở client, vì client không phải phần được chấm tất định.

## 6. Hằng số

| Ở đâu | Gì |
|---|---|
| `game.contract.json` → `tuning` | Mọi số có tên trong contract (A10). Không lặp lại ở nơi khác. |
| `src/sim/world.ts` | Bán kính đảo 40, vòng đèn 25 (L1 ở 0°, mỗi đèn cách 72°), 30 đom đóm ban đầu, ngưỡng sinh bù < 15, chu kỳ sinh bù 120 tick, 2 Bóng Mực ban đầu, chu kỳ sinh Bóng Mực 3600 tick, tối đa 5, bán kính sinh 38, Bóng Mực ở Y = 1.0, trọng lực và vận tốc nhảy |
| `src/client/*` | Chỉ hằng số hiển thị/điều khiển (ngưỡng dừng 0.2 m, góc camera, tốc độ trượt mép, giới hạn zoom, màu) |

## 7. Kiểm thử: interface là bề mặt test

| Tầng | Công cụ | Đi qua interface nào |
|---|---|---|
| Luật chơi | Vitest `tests/sim/*.test.ts` | `createSim` + `step` + `state`, dùng scenario nhỏ; không test trực tiếp các `system` |
| Contract output | Vitest `tests/headless/*.test.ts` | `runHeadless`, `parseScenario`, `parseInputs`, `InputTimeline` |
| End-to-end + exit code + tính tất định | `scripts/verify` | binary `node dist/headless.js` thật với `scenarios/` và `inputs/` |
| Client (điều khiển, camera, HUD, hình ảnh) | Chơi tay + ảnh chụp, không có seam test tự động ở Phase 1 | `npm start` |

**Hàng rào phụ thuộc:** `scripts/verify` (và hook) có một bước kiểm tra tĩnh rằng `src/sim/**` không chứa `from 'three'`, `document`, `window`, `node:`, `Math.random`, `Date.now`, `performance.now`. Lỗi kiểu này được chặn bằng máy thay vì chỉ dặn bằng lời.

## 8. Các quyết định và phương án đã cân nhắc

- **Sim tự phát hiện cạnh lên** thay vì để caller gửi "nhấn mới". Phát hiện cạnh lên nằm một chỗ cho cả hai adapter, và tệp inputs của contract vốn là level-state.
- **Sim mutable nội bộ, `step` trả về event** thay vì `step(state) → newState` bất biến. Cách này đơn giản và nhanh cho hàng chục nghìn tick, còn caller vẫn chỉ thấy `Readonly<SimState>`.
- **Hình dạng JSONL nằm ở `headless/format.ts`, không nằm trong sim**, vì client không cần nó và contract có thể đổi giữa các phase.
- **Không làm event bus hay ECS:** với 4 loại thực thể và 7 hệ thống thì gọi hàm theo thứ tự trong `step.ts` là đủ, và thứ tự được nhìn thấy ngay.
- **Render không nội suy** giữa hai tick ở Phase 1, vì 60 Hz đã đủ mượt. Có thể thêm sau mà không đổi interface.
