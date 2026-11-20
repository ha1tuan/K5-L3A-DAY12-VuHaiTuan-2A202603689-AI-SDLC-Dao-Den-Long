# CLAUDE.md

Game 3D **Đảo Đèn Lồng** (AI SDLC lab, 4 phase). Yêu cầu: `PRD.md` (Phase 1) + Test Contract v1.0. Kiến trúc: `Architect.md`. Kế hoạch: `docs/PLAN.md`. Thuật ngữ: `GLOSSARY.md`. Giả định & nhật ký: `docs/NOTES.md`.

## Lệnh

- `npm ci && npm run build`: cài và build (web vào `dist/web/`, headless vào `dist/headless.js`)
- `npm start`: mở game có giao diện (Vite preview)
- `npm test`: Vitest, chỉ test lõi sim, chạy nhanh
- `npm run verify`: chạy mọi scenario headless, so kỳ vọng, kiểm tra tính tất định, ghi bằng chứng vào `docs/evidence/phase-N/`
- Headless: `node dist/headless.js --seed 1 --night 1 [--scenario f] [--inputs f] --ticks N --out o.jsonl [--snapshot-every 10]`

## Kiến trúc (chi tiết: `Architect.md`)

Phụ thuộc một chiều: `headless` → `sim` ← `client`. Hai adapter không import lẫn nhau.

- `src/sim/`: module sâu chứa **toàn bộ luật chơi**. Interface công khai duy nhất là `index.ts`: `createSim({seed, night, scenario?, tuning?}) → { step(ctrl): SimEvent[], state }`.
  - `ctrl` là trạng thái nút **đang giữ**; sim tự phát hiện cạnh lên và tự xoay/chuẩn hoá `move`.
  - Thứ tự hệ thống chỉ nằm ở `step.ts`. Các file `systems/*` là seam nội bộ, không export ra ngoài.
  - Hằng số thế giới không thuộc tuning nằm ở `world.ts`.
- `src/headless/`: `main.ts` là adapter Node mỏng (argv, fs, exit code). `runHeadless(cfg) → string[]` là hàm thuần để test. Hình dạng JSONL và làm tròn **chỉ** nằm ở `format.ts`.
- `src/client/`: Three.js, HUD, click-to-move (`moveToward` thuần), camera MOBA, phím QWER (Storage được truyền vào). Chỉ **đọc** `sim.state` và event.
- `game.contract.json`: **nguồn duy nhất** của các số `tuning`; `sim/tuning.ts` đọc file này.
- Test đi qua interface: `tests/sim` dùng `createSim`/`step`, `tests/headless` dùng `runHeadless`/parse. Không test trực tiếp `systems/*`.
- `scenarios/`, `inputs/`, `scripts/verify`: kiểm chứng end-to-end bằng binary thật.

## Quy tắc cứng

- `src/sim/` **không** import `three`, DOM, Node API; không dùng `Math.random`, `Date.now`, `performance.now`. Ngẫu nhiên chỉ đến từ PRNG được seed bằng `--seed`. `scripts/verify` kiểm tra tĩnh điều này.
- Bước cố định 1/60 s; mọi bộ đếm thời gian trong sim tính bằng **số nguyên tick**, `timeLeftS` suy ra từ `tick`. Thứ tự xử lý trong tick theo `docs/adr/0001-tick-step-order.md`; đổi thứ tự phải có ADR mới.
- Không hard-code số tuning trong code; khai ở `game.contract.json` để chỗ khai báo và số thật luôn khớp.
- Mọi khoảng cách gameplay đo trên mặt phẳng XZ, "trong bán kính r" là `≤ r`. Toạ độ output làm tròn 3 chữ số.
- Dựng scenario không phát event, không cộng điểm. Event chỉ dùng tên/data đúng bảng trong `PRD.md` mục E.
- Exit code: 0 nếu chạy xong hoặc game kết thúc; 2 nếu file inputs/scenario sai định dạng; ≠0 kèm stderr cho lỗi khác.
- Không sửa tay output hay bằng chứng; không viết test "luôn đạt". Chưa có bằng chứng thì báo **chưa xong**.
- Điều khiển (click-to-move, camera kiểu MOBA, phím QWER) chỉ sống ở `src/client/`; sim chỉ biết `move [x,z]`, `cam_yaw_deg`, các nút.
- Làm lõi theo Test Contract trước, rồi mới đến đồ họa, cài đặt phím hay phần sáng tạo.
- Commit nhỏ, mỗi commit một việc; không commit `.env` hay key.

## Agent skills

### Issue tracker

Issues được theo dõi trên GitHub Issues của repo này, thao tác bằng `gh` CLI. Xem `docs/agents/issue-tracker.md`.

### Triage labels

Năm nhãn triage mặc định: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. Xem `docs/agents/triage-labels.md`.

### Domain docs

Single-context: một `GLOSSARY.md` và `docs/adr/` ở gốc repo. Xem `docs/agents/domain.md`.
