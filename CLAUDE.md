# CLAUDE.md

Game 3D **Đảo Đèn Lồng** (AI SDLC lab, 4 phase). Yêu cầu: `PRD.md` (Phase 1, v1.0), `PRD_v2.md` (Phase 2, v1.1) và `PRD_v3.md` (Phase 3 "Đèn cạn dầu", **Test Contract v1.2**, hiện hành; luật nào v3 không nhắc thì giữ v2). Kiến trúc: `Architect.md`. Kế hoạch: `docs/PLAN.md`. Thuật ngữ: `GLOSSARY.md`. Giả định & nhật ký: `docs/NOTES.md`. Breaking changes: `CHANGELOG.md`.

## Lệnh

- `npm ci && npm run build`: cài và build (web vào `dist/web/`, headless vào `dist/headless.js`)
- `npm start`: mở game có giao diện (Vite preview)
- `npm test`: Vitest, chỉ test lõi sim, chạy nhanh
- `npm run verify`: build rồi chạy binary thật với các case trong `scenarios/cases.mjs` (so kỳ vọng tính tay, chạy 2 lần để so tính tất định, exit 2, quét import cấm trong sim); ghi bằng chứng vào `docs/evidence/phase-N/`. Quy trình: skill `verify-phase`
- Hook `.claude/hooks/test-after-edit.sh` tự chạy Vitest sau mỗi lần sửa `src/**/*.ts` hoặc `tests/**/*.ts`; test đỏ thì sửa ngay, không đi tiếp
- Headless: `node dist/headless.js --seed 1 --night 1|2|3 [--scenario f] [--inputs f] --ticks N --out o.jsonl [--snapshot-every 10]`

## Kiến trúc (chi tiết: `Architect.md`)

Phụ thuộc một chiều: `headless` → `sim` ← `client`. Hai adapter không import lẫn nhau.

- `src/sim/`: module sâu chứa **toàn bộ luật chơi**. Interface công khai duy nhất là `index.ts`: `createSim({seed, night, scenario?, tuning?}) → { step(ctrl): SimEvent[], state }`.
  - `ctrl` là trạng thái nút **đang giữ**; sim tự phát hiện cạnh lên và tự xoay/chuẩn hoá `move`.
  - Thứ tự hệ thống chỉ nằm ở `step.ts`. Các file `systems/*` là seam nội bộ, không export ra ngoài.
  - Hằng số thế giới không thuộc tuning nằm ở `world.ts`; bản đồ từng Đêm (điểm sinh, đèn, địa hình, bục nhảy, bùa) là dữ liệu trong sim, địa hình qua module nội bộ `terrain`.
- `src/headless/`: `main.ts` là adapter Node mỏng (argv, fs, exit code). `runHeadless(cfg) → string[]` là hàm thuần để test. Hình dạng JSONL và làm tròn **chỉ** nằm ở `format.ts`.
- `src/client/`: Three.js, HUD, click-to-move (`moveToward` thuần), camera MOBA, phím QWER (Storage được truyền vào). Chỉ **đọc** `sim.state` và event.
- `game.contract.json`: **nguồn duy nhất** của các số `tuning`; `sim/tuning.ts` đọc file này.
- Test đi qua interface: `tests/sim` dùng `createSim`/`step`, `tests/headless` dùng `runHeadless`/parse. Không test trực tiếp `systems/*`.
- `scenarios/`, `inputs/`, `scripts/verify`: kiểm chứng end-to-end bằng binary thật.

## Quy tắc cứng

- `src/sim/` **không** import `three`, DOM, Node API; không dùng `Math.random`, `Date.now`, `performance.now`. Ngẫu nhiên chỉ đến từ PRNG được seed bằng `--seed`. `scripts/verify` kiểm tra tĩnh điều này.
- Bước cố định 1/60 s; mọi bộ đếm thời gian trong sim tính bằng **số nguyên tick**, `timeLeftS` suy ra từ `tick`. Thứ tự xử lý trong tick và mô hình đèn theo `docs/adr/0003-lantern-fuel-and-dawn-win.md` (thay ADR-0002 và ADR-0001); đổi thứ tự phải có ADR mới. Khi tạm dừng, `tick` tăng nhưng `sim_tick` và mọi bộ đếm đứng yên.
- Dầu đèn lưu bằng **số nguyên** `fuel_ticks` (tối đa 6000 = 100 × 60); chỉ quy ra `fuel` một chữ số thập phân ở `headless/format.ts`. Không cộng trừ dầu bằng số thực.
- Không hard-code số tuning trong code; khai ở `game.contract.json` để chỗ khai báo và số thật luôn khớp.
- Mọi khoảng cách gameplay đo trên mặt phẳng XZ trừ chỗ PRD ghi rõ 3D (bán kính Tỏa Sáng); "trong bán kính r" là `≤ r`. Toạ độ output làm tròn 3 chữ số; `fuel` làm tròn 1 chữ số.
- Dựng scenario không phát event, không cộng điểm. Event chỉ dùng tên/data đúng bảng trong `PRD.md` mục E, `PRD_v2.md` §6.2 và `PRD_v3.md` §6.
- Exit code: 0 nếu chạy xong hoặc game kết thúc; 2 nếu file inputs/scenario sai định dạng; ≠0 kèm stderr cho lỗi khác.
- Không sửa tay output hay bằng chứng; không viết test "luôn đạt". Chưa có bằng chứng thì báo **chưa xong**.
- Điều khiển (click-to-move, camera kiểu MOBA, phím Q/W/E/R/D, Esc/P) và âm thanh chỉ sống ở `src/client/`; sim chỉ biết `move [x,z]`, `cam_yaw_deg`, các nút (`jump`, `interact`, `pulse`, `dash`, `pause`). Nội dung sáng tạo phải tắt ở headless.
- Làm lõi theo Test Contract trước, rồi mới đến đồ họa, cài đặt phím hay phần sáng tạo.
- Commit nhỏ, mỗi commit một việc; không commit `.env` hay key.
- Dừng server nền theo PID (`kill <pid>`), **không** dùng `pkill -f <chuỗi>`: chuỗi đó khớp luôn dòng lệnh của chính shell và làm shell chết giữa chừng.

## Agent skills

### Issue tracker

Issues được theo dõi trên GitHub Issues của repo này, thao tác bằng `gh` CLI. Xem `docs/agents/issue-tracker.md`.

### Triage labels

Năm nhãn triage mặc định: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. Xem `docs/agents/triage-labels.md`.

### Domain docs

Single-context: một `GLOSSARY.md` và `docs/adr/` ở gốc repo. Xem `docs/agents/domain.md`.
