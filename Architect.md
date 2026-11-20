# Kiến trúc: Đảo Đèn Lồng

> Ghi chú kiến trúc, cập nhật cho Phase 3 (Test Contract v1.2). Luật chơi: `PRD_v3.md` và giả định trong `docs/NOTES.md` (A1–A49). Thứ tự tick và mô hình đèn: `docs/adr/0003-lantern-fuel-and-dawn-win.md` (thay ADR-0002, ADR-0001). Thuật ngữ game: `GLOSSARY.md`.
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
- `SimEvent`: union có phân biệt theo `name`, với `data` **đúng bảng event của contract** (v1.0: `mote_picked`, `deposit`, `lantern_lit`, `pulse`, `player_hit`, `shade_spawned`, `game_over`; v1.1 thêm `night_start`, `dash`, `charm_picked`, `drifter_steal`, `drifter_drop`, `paused`, `resumed`; v1.2 thêm `refuel`, `lantern_out`, `fuel_drain` và `lantern_lit.relight`) và kèm `tick`.

## 3. Module `sim`: Implementation và seam nội bộ

```
src/sim/
  index.ts        createSim; interface công khai duy nhất (+ dữ liệu bản đồ chỉ-đọc cho client: nightDef)
  types.ts        SimState, ControlState, SimEvent, Scenario, Tuning
  tuning.ts       đọc tuning từ game.contract.json; đổi giây → tick: Math.round(s·60)
  world.ts        hằng số thế giới KHÔNG thuộc tuning (xem §6)
  nights.ts       dữ liệu bản đồ từng Đêm: điểm sinh, đèn, địa hình, bục nhảy, bùa, lịch sinh
  terrain.ts      địa hình dạng cột: mặt đất dưới chân, vách, vật cản, chỗ rơi
  rng.ts          mulberry32(seed); PRNG duy nhất (gió dùng luồng tách riêng theo seed)
  geometry.ts     distXZ, dist3, unit2, rotateYaw, pushOutOf, byId
  scenario.ts     buildInitialState(def, tuning, rng, scenario?)
  step.ts         NƠI DUY NHẤT quy định thứ tự hệ thống (ADR-0003)
  systems/
    context.ts    StepCtx, bộ nhớ giữa các tick (cạnh lên, bộ đếm id)
    timers.ts     bộ đếm, hồi sinh, gió; Phase 3 thêm bước 2b trừ dầu, tắt đèn
    player.ts     chạy, nhảy, lướt, bục nhảy, gió, rơi khỏi đảo
    pickup.ts     nhặt đom đóm và bùa (theo sức chứa)
    lanterns.ts   tương tác: nạp/thắp/thắp lại/châm dầu; vùng an toàn (chỉ đèn không yếu)
    pulse.ts      tốn đom đóm, cooldown, choáng, đẩy lùi, xua Gió Lạc
    shades.ts     Bóng Mực (spawning/wander/chase/recoil/stunned/drain) và Gió Lạc di chuyển
    contacts.ts   Gió Lạc cướp, rồi tối đa một Bóng Mực đánh
    spawn.ts      sinh đom đóm, Bóng Mực, Gió Lạc theo lịch; đom đóm rơi
    end.ts        no_flames → bình minh (dawn_survived / dawn); thưởng bình minh
```

- Mỗi `system` có dạng `(s: SimState, ctx: StepCtx) → void`, trong đó `ctx` chứa tuning, rng, các cạnh lên đã tính và hàm `emit(event)`. Đây là **seam nội bộ**: không export ra ngoài `index.ts`.
- **Điểm số** được cộng tại nơi phát event tương ứng (`deposit`, `refuel`, `lantern_lit`, `pulse`), riêng thưởng bình minh khi thắng thì nằm ở `end.ts`. Số điểm đọc từ khối `score` của contract. Không có module "score" riêng: nếu thử xoá đi (deletion test), logic điểm chỉ là 1 dòng ở mỗi nơi.
- **Mọi bộ đếm thời gian tính bằng số nguyên tick** (choáng, bất tử, cooldown, lịch sinh), và **dầu cũng là số nguyên** `fuel_ticks` (1/60 đơn vị, tối đa 6000), chỉ quy ra số thực khi xuất. Như vậy không có sai số cộng dồn và giữ tính tất định.
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
  main.ts            ghép mọi thứ: vòng lặp bước cố định (accumulator 1/60 s, tối đa 15 bước/frame), Chuỗi 3 Đêm, tạm dừng
  campaign.ts        Chuỗi 3 Đêm: thắng cộng điểm và sang Đêm kế, thua chơi lại (hàm thuần)
  story.ts           lời Ông Đăng trước mỗi Đêm
  input/
    clickToMove.ts   moveToward(pos, target, stop=0.2) → { move, arrived }  (hàm thuần)
    keybindings.ts   ↑↓←→ (Phase 4) + Q/W/E/D/P/R/Space; Esc dành cho tạm dừng; lưu Storage được truyền vào
    keyMove.ts       keyMove(keys, cameraForward) → hướng đi theo camera (hàm thuần)
    controls.ts      sample(playerPos, forward) → ControlState (camYawDeg luôn = 0; phím đi đè đích click)
  camera.ts          camera MOBA góc cố định, trượt ở mép, Space về Mây, lăn để zoom; giới hạn theo Đêm, theo độ nhạy
  scene.ts           WorldView: dựng đảo từ nightDef + trang trí (cây, cỏ, đom đóm trang trí); sync(state) mỗi frame
  lighting.ts        bảng màu F-10, ánh sáng môi trường 0.15 + 0.55 × sáng/tổng (hàm thuần)
  hud.ts             DOM overlay F-08: Ngọn Lửa, đồng hồ, dây đèn, điểm, lọ đom đóm, hồi chiêu, nhắc nạp, mũi tên, banner gió
  audio.ts           âm thanh tổng hợp WebAudio
  settings.ts        menu Tạm dừng + Cài đặt (phím, âm lượng, độ nhạy)
  settingsStore.ts   đọc/ghi cài đặt qua Storage được truyền vào (hàm thuần); Phase 3 thêm Bảng màu dễ phân biệt, Phase 4 thêm Giảm chuyển động, Chữ lớn
  cues.ts            Phase 4: phụ đề và mũi tên Bóng Mực; cuesFor(state, events, memory) là hàm thuần
  leaderboardStore.ts Phase 4: bảng xếp hạng qua /api/leaderboard, không có server thì localStorage
  benchMath.ts       Phase 4: số liệu khung của bench (§1.4) và quỹ đạo camera (hàm thuần); main.ts chạy cảnh ở ?bench=1
```

### Phase 4: server và bảng xếp hạng

```
src/leaderboard/index.ts  luật bảng xếp hạng (tên, top 10, sắp xếp, chuẩn hoá file), thuần, dùng chung client + server
src/server/serve.ts       → dist/serve.js: phục vụ dist/web, GET/POST /api/leaderboard ghi data/leaderboard.json,
                          --export-leaderboard <file>; startServer() dùng lại trong scripts/bench.mjs, scripts/ui-check.mjs
src/headless/soak.ts      → dist/soak.js (qua soakMain.ts): runSoak({seed, nights, rssMb}) thuần, RSS được truyền vào
scripts/bench.mjs         bench_cmd: server + Chrome qua playwright-core, đo RSS cây tiến trình Chrome
```

- Cảnh bench sống trong sim (`createSim({bench: true})`, `src/sim/bench.ts`, bước `stepBench`) để vị trí 200 Bóng Mực và 100 đom đóm là tất định theo seed 42 và luật `wander` là luật thật của sim. Headless không bao giờ bật nó.

- **Click-to-move nằm hoàn toàn ở client.** Raycast điểm click vào địa hình thật (bậc, cầu, đảo bên kia), trượt ra ngoài thì lấy mặt phẳng Y = 0 nên Mây có thể chạy quá mép và rơi. Mỗi tick `moveToward` sinh `move` theo hướng thế giới. Sim không biết gì về chuột.
- `keybindings.ts` và `settingsStore.ts` nhận `Storage` qua tham số. Có hai adapter (`localStorage` thật và `Map` trong bộ nhớ cho test), nên seam này là seam thật. Mọi lần đọc/ghi đều bọc `try/catch`, lỗi thì dùng mặc định.
- `scene` và `hud` chỉ **đọc** `sim.state` và các `SimEvent` (event dùng cho hiệu ứng như đèn bừng sáng hay chớp khi bị chạm). Chúng không bao giờ ghi vào state.
- Đồng hồ thật và `Math.random` (seed cho lượt chơi mới) được phép ở client, vì client không phải phần được chấm tất định.

## 6. Hằng số

| Ở đâu | Gì |
|---|---|
| `game.contract.json` → `tuning` | Mọi số có tên trong contract (A10). Không lặp lại ở nơi khác. |
| `src/sim/world.ts`, `src/sim/nights.ts` | Hằng số thế giới không thuộc tuning (trọng lực, nhảy, lịch sinh, trạng thái Bóng Mực, Gió Lạc, gió, bùa, `fuel_ticks` tối đa 6000) và dữ liệu bản đồ từng Đêm |
| `src/client/*` | Chỉ hằng số hiển thị/điều khiển (ngưỡng dừng 0.2 m, góc camera, tốc độ trượt mép, giới hạn zoom, màu) |

## 7. Kiểm thử: interface là bề mặt test

| Tầng | Công cụ | Đi qua interface nào |
|---|---|---|
| Luật chơi | Vitest `tests/sim/*.test.ts` | `createSim` + `step` + `state`, dùng scenario nhỏ; không test trực tiếp các `system` |
| Contract output | Vitest `tests/headless/*.test.ts` | `runHeadless`, `parseScenario`, `parseInputs`, `InputTimeline` |
| End-to-end + exit code + tính tất định | `scripts/verify` | binary `node dist/headless.js` thật với `scenarios/` và `inputs/` |
| Client: hàm thuần | Vitest `tests/client/*.test.ts` | `ambientIntensity`, `advanceCampaign`, `loadSettings`/`saveSettings`, `KeyBindings` với Storage trong bộ nhớ |
| Client (hình ảnh, HUD, âm thanh) | Chơi tay + ảnh chụp | `npm start` |

**Hàng rào phụ thuộc:** `scripts/verify` (và hook) có một bước kiểm tra tĩnh rằng `src/sim/**` không chứa `from 'three'`, `document`, `window`, `node:`, `Math.random`, `Date.now`, `performance.now`. Lỗi kiểu này được chặn bằng máy thay vì chỉ dặn bằng lời.

## 8. Các quyết định và phương án đã cân nhắc

- **Sim tự phát hiện cạnh lên** thay vì để caller gửi "nhấn mới". Phát hiện cạnh lên nằm một chỗ cho cả hai adapter, và tệp inputs của contract vốn là level-state.
- **Sim mutable nội bộ, `step` trả về event** thay vì `step(state) → newState` bất biến. Cách này đơn giản và nhanh cho hàng chục nghìn tick, còn caller vẫn chỉ thấy `Readonly<SimState>`.
- **Hình dạng JSONL nằm ở `headless/format.ts`, không nằm trong sim**, vì client không cần nó và contract có thể đổi giữa các phase.
- **Không làm event bus hay ECS:** với 6 loại thực thể và khoảng 10 hệ thống thì gọi hàm theo thứ tự trong `step.ts` là đủ, và thứ tự được nhìn thấy ngay.
- **Render không nội suy** giữa hai tick ở Phase 1, vì 60 Hz đã đủ mượt. Có thể thêm sau mà không đổi interface.
