# Kế hoạch phát triển: Đảo Đèn Lồng

> Nguồn yêu cầu: `PRD.md` (Phase 1, Test Contract v1.0), `PRD_v2.md` (Phase 2, Test Contract v1.1). Giả định đã chốt: `docs/NOTES.md`. Thuật ngữ: `GLOSSARY.md`.
> Ưu tiên: **đúng Test Contract và có bằng chứng** > chơi được > đẹp > sáng tạo.

## Chiến lược chung

- **Lõi sim trước, render sau.** Test ẩn chiếm 30/100 điểm và chỉ chạy headless, nên mọi luật chơi phải chạy và được kiểm chứng ở headless trước khi có Three.js.
- **Kiểm chứng trước khi code.** Mỗi mốc có sẵn scenario/inputs và kỳ vọng, viết trước rồi mới để agent code.
- **Một nguồn số liệu.** Sim đọc `tuning` từ `game.contract.json`, nên chỗ khai báo và số thật không thể lệch nhau.
- **Hết giờ thì tag.** Phần chưa xong ghi "chưa đạt" kèm lý do trong bảng bằng chứng.

## Phase 1: Đêm 1 – Đảo Bến (tag `phase-1`, ~60 phút)

### Thông số thế giới (đã chốt)

- Đảo tròn bán kính 40 m, tường vô hình ở mép (`fall_enabled: false`). Mây xuất phát tại (0, 0, 0).
- Đèn đặt trên vòng tròn bán kính 25 m, cách nhau 72°, θᵢ = (i−1)·72°, pos = (25·sinθ, 0, 25·cosθ):
  `L1 (0, 0, 25)`, `L2 (23.776, 0, 7.725)`, `L3 (14.695, 0, −20.225)`, `L4 (−14.695, 0, −20.225)`, `L5 (−23.776, 0, 7.725)`.
- Đom đóm: 30 con ban đầu, vị trí ngẫu nhiên theo seed trong đảo. Khi số đom đóm còn lại < 15 thì mỗi 2 s sinh thêm 1 con.
- Bóng Mực: 2 con ban đầu ở mép sương (r = 38 m), cứ 60 s sinh thêm 1, tối đa 5. Tâm ở Y = 1.0. Id `S1`, `S2`, … theo thứ tự.

### Các mốc

Mỗi mốc kết thúc bằng **một commit** và **bằng chứng chạy được**. Thời gian chỉ để định hướng.

| # | Mốc | Nội dung | Kiểm chứng (viết trước) | ~phút |
|---|---|---|---|---|
| M0 | Khung dự án | `package.json`, TS, Vite, Three.js, Vitest, `tsx`/esbuild; `game.contract.json` với bộ số Q10; scripts `build`/`start`/`test`/`verify` | `npm ci && npm run build` chạy sạch; `node dist/headless.js --help` có output | 5 |
| M1 | Sim rỗng + CLI headless | Kiểu state, PRNG mulberry32, `step()`; parse args; đọc và validate scenario/inputs (**exit 2** khi sai); ghi snapshot tick 0, snapshot mỗi `--snapshot-every`, dòng `end`; làm tròn 3 chữ số | Chạy `--ticks 60` thấy snapshot tick 0/10/…/60 và `end`; chạy 2 lần cùng seed rồi `diff` rỗng; inputs có tick giảm dần thì exit 2 | 8 |
| M2 | Di chuyển + scenario | Input giữ giá trị cũ, cạnh lên của nút, xoay theo `cam_yaw_deg`, chuẩn hoá vector; `player_speed`; nhảy chỉ đổi Y; kẹp mép đảo; áp scenario (cập nhật đèn theo id, thay thế `motes`/`shades`) | Vitest: `move [0,1]` trong 60 tick thì Z = 6.000; yaw 90° xoay đúng công thức; `move [1,1]` được chuẩn hoá; scenario đặt `lit: true` không phát event, không cộng điểm | 6 |
| M3 | Đom đóm, nạp, thắp, thắng | Tự nhặt (≤ `pickup_radius`, không vượt `carry_capacity`); `interact` nạp vào đèn chưa sáng gần nhất trong `interact_radius`; `deposit`, `lantern_lit`; `all_lit` thì `game_over won` | Scenario `pickup`, `deposit-partial`, `light-one`, `win-all-lit` (4 đèn sáng sẵn, nạp đèn cuối) | 8 |
| M4 | Bóng Mực, bị chạm, pulse, thua | Đuổi theo trên XZ; chặn ở `safe_radius` quanh đèn đã sáng; bị chạm thì `flames−1`, rơi `floor(carried·ratio)`, bất tử tạm; pulse tốn `pulse_cost`, có cooldown, choáng và đẩy lùi; `no_flames`, `dawn` | Scenario `hit-drop`, `invuln-no-double-hit`, `pulse-stun-push`, `pulse-not-enough`, `pulse-cooldown`, `safe-radius-block`, `lose-no-flames`, `lose-dawn` | 10 |
| M5 | Điểm + sinh thêm | Điểm theo Q8 (thưởng thời gian và lửa chỉ khi thắng); sinh Bóng Mực có `shade_spawned`; sinh đom đóm bù | Scenario `score-win` tính tay rồi so `end.score`; scenario `shade-spawn` (`player.flames: 999` để Mây đứng yên không thua sớm), chạy 14 400 tick, thấy `shade_spawned` S3, S4, S5 ở các tick 3600, 7200, 10 800 và không có S6 | 5 |
| M6 | Harness + verify | `scripts/verify` kiểm tra tĩnh import cấm trong `src/sim/`, chạy mọi scenario, so kỳ vọng, chạy 2 lần để `diff`, kiểm tra exit 2; hook `PostToolUse` chạy `npm test` khi sửa `src/`; skill `verify-phase` | `npm run verify` xanh và ghi `docs/evidence/phase-1/` | 5 |
| M7 | Render chơi được | Three.js: đảo, 5 đèn (sáng dần), đom đóm, Bóng Mực tím đen, Mây đội nón lá có đèn nhỏ; **click chuột trái để đi tới điểm** (dừng khi còn ≤ 0.2 m, kẹp mép đảo); camera kiểu MOBA (góc cố định ~55°, trượt ở mép màn hình, Space về Mây, giữ Space bám theo, lăn chuột zoom); phím Q nhảy, W nạp, E tỏa sáng, R chơi lại (chỉ khi đã kết thúc); HUD: lửa, mang/tối đa, đèn x/5, thời gian, điểm, cooldown pulse; màn thắng/thua | Chơi tay từ đầu tới thắng và tới thua, rồi chơi lại; ảnh chụp HUD và đảo đã sáng | 12 |
| M8 | Hoàn thiện + nộp | README (≤ 3 lệnh, điều khiển, cách tính điểm, "Sáng tạo của tôi", giải thích tuning `null`/`false`), bảng bằng chứng, `docs/NOTES.md` (nhật ký AI, token, retro); tag `phase-1`, push, repo public | Clone sạch vào thư mục tạm, chạy đúng 3 lệnh README; `npm run verify` xanh ở commit được tag | 6 |

**Ranh giới cắt khi trễ giờ** (cắt từ dưới lên): màn Cài đặt đổi phím → trau chuốt đồ họa → trượt camera ở mép màn hình → HUD cooldown. Không bao giờ cắt M1–M5 hay bằng chứng.

### Việc sau lõi (chỉ làm nếu còn thời gian)

- Màn **Cài đặt** (Esc) đổi phím Q/W/E/R/Space: từ chối phím trùng, có nút khôi phục mặc định, lưu `localStorage` (bọc try/catch, lỗi thì quay về mặc định).

### Danh mục scenario kiểm chứng Phase 1

Mỗi scenario gồm `scenarios/<tên>.json`, `inputs/<tên>.json` (nếu cần) và kỳ vọng trong `scripts/verify` (event nào ở tick nào, giá trị state cuối):

`idle`, `move-basic`, `move-yaw`, `move-normalize`, `pickup`, `pickup-full`, `deposit-partial`, `light-one`, `win-all-lit`, `hit-drop`, `invuln-no-double-hit`, `pulse-stun-push`, `pulse-not-enough`, `pulse-cooldown`, `safe-radius-block`, `lose-no-flames`, `lose-dawn`, `score-win`, `shade-spawn`, `bad-inputs` (exit 2), `bad-scenario` (exit 2), `determinism` (2 lần chạy rồi `diff`).

### Tiêu chí hoàn thành Phase 1

- [ ] Checklist nộp nhanh trong `PRD.md` đạt hết, mỗi dòng có bằng chứng trong `docs/evidence/phase-1/`
- [ ] `tuning` trong `game.contract.json` là số thật sim đang dùng
- [ ] Chơi tay được từ đầu tới thắng và thua, chơi lại được
- [ ] Tag `phase-1` trên repo public trước mốc 1h

## Phase 2: Ba hòn đảo (tag `phase-2`, Test Contract v1.1)

> Nguồn: `PRD_v2.md`. Số chuẩn (§3), bản đồ chuẩn (§4) và contract v1.1 (§6) là **bất biến**, không tự chọn lại. Thứ tự trong một tick: `docs/adr/0002-tick-step-order-v1-1.md` (thay ADR-0001). Giả định mới: A15–A28 trong `docs/NOTES.md`.

### Đánh giá tác động lên Phase 1

- **Tuning đổi gần hết:** carry 10, lantern_cost 10, interact 2.0, pulse 3 / 5 m (đo **3D** từ chân + 0.8 m) / hồi 3 s, stun 2 s, per_stun 5, `fall_enabled: true`, thêm `night2/3_duration_s` và `dash_*`. Mọi kỳ vọng trong `scenarios/cases.mjs` phải tính tay lại; case nào sửa thì ghi lý do ngay trong case.
- **Thứ tự tick đổi** (ADR-0002): bộ đếm giảm trước khi di chuyển, Tỏa Sáng chạy sau nạp đèn và cập nhật vùng an toàn, kiểm tra kết thúc theo thứ tự `no_flames` → `all_lit` → `dawn`.
- **Đêm 1 chuẩn hoá:**
  - Đom đóm: 24 điểm sinh cố định, 20 con lúc đầu, cứ 240 tick sinh thêm 1 nếu còn < 30.
  - Bóng Mực: 12 điểm sinh r = 37 m, cách Mây ≥ 15 m, 2 con ở tick 300 rồi cứ 480 tick thêm 1, tối đa 6.
  - Mép đảo không còn tường: ra khỏi đảo là rơi.
- **Sim:**
  - `createSim` nhận `night: 1 | 2 | 3`.
  - State thêm vận tốc, `grounded`, hướng quay mặt, các bộ đếm Lướt/bùa, `simTick`, `paused`, `drifters`, `charms`, `wind`; đom đóm có `kind` và `ttl`.
  - Bóng Mực dùng đủ 5 trạng thái `spawning`/`wander`/`chase`/`recoil`/`stunned`.
- **Module mới bên trong sim:**
  - `terrain`: mặt đất theo từng Đêm, bước lên tối đa 0.3 m, vách, vật cản, bục nhảy.
  - `nights/` chứa dữ liệu bản đồ của từng Đêm.
  - Hai module này vẫn nằm sau `index.ts`, không export ra ngoài.
- **Headless:** `--night 1|2|3`, input `dash`/`pause`, scenario v1.1 (`drifters`/`charms` **thay thế** danh sách mặc định), snapshot v1.1, các sự kiện mới, `player_hit.lost`.

### Các mốc

| # | Mốc | Nội dung | Kiểm chứng (viết trước) |
|---|---|---|---|
| P2-M0 | Chuẩn bị | Nhánh `feat/phase-2`; commit `PRD_v2.md`, ADR-0002, GLOSSARY, PLAN, NOTES; spec Phase 2 trên GitHub Issues | — |
| P2-M1 | Số chuẩn + contract v1.1 + Đêm 1 chuẩn hoá | `game.contract.json` v1.1; thứ tự tick ADR-0002; đom đóm theo điểm sinh và lịch 240 tick; đom đóm rơi (vành 1.5–2.5 m, TTL 480, nhặt được từ tick sau); bất tử 90 tick; máy trạng thái Bóng Mực 5 trạng thái + `recoil`; Tỏa Sáng 3D, đẩy lùi 4 m trong 15 tick, trúng con đang choáng thì làm mới; vùng an toàn đẩy ra trong ≤ 30 tick; snapshot/scenario/input v1.1 | Tính lại toàn bộ case cũ; thêm case: hết Ngọn Lửa đúng tick thắp đèn cuối → thua; `per_stun` cộng cả con đang choáng |
| P2-M2 | Lướt + Tạm dừng | F-01 (14 m/s × 12 tick, hồi 90 tick tính từ lúc bắt đầu, giữ Y trên không, không bất tử); F-05 (`tick` tăng, `sim_tick` và mọi bộ đếm đứng yên, `state:"paused"`) | `p2_dash_basic`, `p2_dash_hit`, `p2_pause` |
| P2-M3 | Địa hình + rơi + Đêm 2 + Bùa Gió | Trọng lực −20, nhảy 7 m/s; điều khiển trên không 12 m/s²; rơi khi Y < −10 (bỏ qua bất tử, mất hết đom đóm, chờ 60 tick, hồi sinh, bất tử 90 tick); Đảo Cau (2 đảo, cầu tre, bục nhảy 14/24 m/s); F-03 Bùa Gió | `p2_fall`, `p2_bounce_pad_n2`, `p2_charm`, `p2_nights` (Đêm 2) |
| P2-M4 | Gió Lạc | F-02: `idle`/`chase`/`flee`/`removed`, cướp `min(3, đang mang)`, Tỏa Sáng làm bỏ chạy hoặc thả lại; cướp xử lý trước hit | `p2_drifter_spawn`, `p2_drifter_chase_threshold`, `p2_drifter_steal`, `p2_drifter_pulse_drop`, `p2_steal_then_hit` |
| P2-M5 | Đêm 3 + Gió mạnh | Đảo Chuông 3 tầng, 2 dốc, vách, tháp chuông (vật cản), bục nhảy (0,3,13); Bóng Mực 4.5 m/s; F-09 gió mỗi 1800 tick, kéo dài 300 tick, 2 m/s, hướng lấy từ RNG theo seed | `p2_bounce_pad_n3`, `p2_wind`, `p2_nights` (Đêm 1/2/3), `p2_perf_full_night` (21 600 tick ≤ 30 s) |
| P2-M6 | Client chơi được 3 Đêm | Render Đảo Cau và Đảo Chuông; Chuỗi 3 Đêm (menu → lời Ông Đăng → chơi → kết quả → Đêm kế; thua thì chơi lại Đêm đó; Màn Bình Minh); HUD đầy đủ F-08 (đồng hồ đỏ và nhấp nháy khi ≤ 30 s, thanh 10 ô, icon hồi Lướt/Tỏa Sáng, dòng nhắc nạp theo phím đang gán, mũi tên tới đèn gần nhất ngoài màn hình); menu Tạm dừng (Esc/P); Cài đặt: đổi phím + âm lượng + độ nhạy (pan/zoom), lưu `localStorage` | Ảnh chụp 1280×720 từng Đêm, HUD, menu Tạm dừng, Màn Bình Minh; mở lại trang thì Cài đặt vẫn giữ |
| P2-M7 | Âm thanh + bảng màu | F-07: WebAudio tổng hợp, chỉ ở `src/client/audio`; F-10: bảng màu chuẩn, ánh sáng môi trường `0.15 + 0.55 × sáng/tổng` (hàm thuần, có test 0/5 → 0.15, 5/5 → 0.70) | Test hàm ánh sáng; ghi âm hoặc quay video thủ công |
| P2-M8 | Verify + nộp | `npm run verify` cho mọi case cũ và mới; cập nhật README (Lướt, Tạm dừng, điểm, "Sáng tạo của tôi", shade 4.5 ở Đêm 3); CLAUDE.md và skill `verify-phase`; bằng chứng `docs/evidence/phase-2/`; clean-clone; tag `phase-2` | Verify xanh ở commit được tag |

**Ranh giới cắt** (cắt từ dưới lên): âm thanh F-07 → độ chính xác màu F-10 → mũi tên chỉ đèn → lời Ông Đăng. **Không cắt** bất cứ thứ gì trong sim/headless (P2-M1…M5) hay bằng chứng.

### Điều khiển Phase 2 (bổ sung A13)

Q nhảy, W nạp, E tỏa sáng, R chơi lại, **D lướt**, **Esc/P tạm dừng**; Space và chuột giữ như Phase 1. Mọi phím đổi được trong Cài đặt (nằm trong menu Tạm dừng). Dòng nhắc trên HUD đọc phím đang gán, nên mặc định là "W — Nạp ánh sáng (x/10)" chứ không phải chữ E như PRD.

### Tiêu chí hoàn thành Phase 2

- [ ] DoD §9 của `PRD_v2.md` đạt hết, mỗi dòng có bằng chứng trong `docs/evidence/phase-2/`
- [ ] Mỗi AC ở §5 có ít nhất một case headless trong `scenarios/cases.mjs` (trừ AC kiểm tra thủ công: 06.1, 07.1, 08.x, 10.1, có ảnh hoặc video)
- [ ] Toàn bộ case Phase 1 (đã tính lại theo số chuẩn) vẫn xanh
- [ ] Headless 1 Đêm đầy đủ ≤ 30 s; ≥ 30 FPS ở 1280×720 trên máy thật
- [ ] Tag `phase-2` trên repo public

## Phase 3: Đèn cạn dầu (tag `phase-3`, Test Contract v1.2)

> Nguồn: `PRD_v3.md` (Ticket-03, Change Request). Luật nào PRD v3 không nhắc giữ nguyên Phase 2. Mô hình đèn và thứ tự tick: `docs/adr/0003-lantern-fuel-and-dawn-win.md` (thay ADR-0002). Giả định mới: A32–A45 trong `docs/NOTES.md`. Breaking changes: `CHANGELOG.md`.

### Đánh giá tác động lên Phase 2

- **Đèn:** thêm `fuel_ticks` (số nguyên, tối đa 6000), `ever_lit`, `relit_count`; đèn sáng có thể tắt (`lantern_out`), thắp lại chỉ cần 5. Tương tác chọn đèn **nhận được** gần nhất (tắt, hoặc sáng chưa đầy), áp nạp/thắp hoặc châm dầu (`refuel`).
- **Thứ tự tick đổi** (ADR-0003): bước 2b trừ dầu ngay sau bộ đếm; kiểm tra kết thúc chỉ còn `no_flames` → bình minh (`dawn_survived` hoặc `dawn`). Bỏ `all_lit`.
- **Bóng Mực:** thêm trạng thái `drain`; `wander` nhắm đèn yếu gần nhất (chọn lại mỗi tick), không có thì đi ngẫu nhiên như A22. Vùng an toàn chỉ còn ở đèn sáng có `fuel ≥ 30`.
- **Số đổi:** thời lượng 240/270/300 s; sức chứa `min(20, 10 + 2 × successful_lights)`; điểm v1.2 (bỏ thưởng thời gian). Tuning thêm 8 khoá, `contract_version` "1.2".
- **Headless:** snapshot đèn thêm `fuel` (1 chữ số), `ever_lit`, `relit_count`; `player.capacity`; scenario thêm `lit`/`fuel`/`ever_lit` cho đèn, `player.successful_lights`, `shades[].target_lantern_id`; sự kiện mới `refuel`, `lantern_out`, `fuel_drain`; `lantern_lit.relight`.
- **Test cũ bị đổi:** mọi test và case dựa vào `all_lit`, thắng sớm, thưởng thời gian, `per_mote` 10, thời lượng 300/330/360, sức chứa cố định 10. Sửa hoặc xoá, ghi lý do trong commit và trong `req` của case.
- **Client:** thanh dầu trên đèn, nhấp nháy 1 Hz khi yếu; HUD `đang_mang / sức_chứa`; Chuỗi 3 Đêm dùng `dawn_survived`; màn kết thúc tính điểm mới; Cài đặt "Bảng màu dễ phân biệt"; lời Ông Đăng nói về dầu.

### Các mốc

| # | Mốc | Nội dung | Kiểm chứng (viết trước) |
|---|---|---|---|
| P3-M0 | Chuẩn bị | Nhánh `feat/phase-3`; commit `PRD_v3.md`, ADR-0003, GLOSSARY, PLAN, NOTES, CHANGELOG, CLAUDE.md; spec Phase 3 trên GitHub Issues | — |
| P3-M1 | Contract v1.2 + dầu | Tuning và score v1.2; `fuel_ticks`, hao 1/tick, tắt ở bước 2b, `lantern_out`, `ever_lit`; snapshot/scenario đèn v1.2 (thiếu `fuel` → 100) | AC-01, 02, 06, 17 |
| P3-M2 | Tương tác mới | Chọn đèn nhận được; châm dầu `used = min(mang, ceil((6000 − fuel_ticks)/600))`; thắp lại 5, `relit_count`, `relight`; sức chứa tăng dần; điểm nạp/thắp/thắp lại | AC-03, 04, 05, 07, 16 |
| P3-M3 | Bóng Mực hút dầu | Đèn yếu mất vùng an toàn; `wander` nhắm đèn yếu; `drain` (≤ 2 m, 5/tick, cộng dồn), `fuel_drain` mỗi 60 tick theo từng Bóng; thoát `drain`; đẩy ra khi châm lên ≥ 30 hoặc thắp lại; +15 khi Tỏa Sáng trúng con đang `drain` | AC-08, 09, 10, 11 |
| P3-M4 | Luật thắng mới | Thời lượng 240/270/300; không thắng sớm; bình minh xét `ceil(0.6 × tổng)`; thưởng bình minh; `no_flames` ưu tiên ở tick cuối | AC-12, 13, 14, 15 |
| P3-M5 | Verify | `scenarios/cases.mjs` + `scripts/verify.mjs` cho v1.2; tính lại mọi case Phase 1–2 bị đổi; thử đột biến | `npm run verify` xanh, bằng chứng `docs/evidence/phase-3/` |
| P3-M6 | Client | Thanh dầu, nhấp nháy 1 Hz, đèn tắt xẹp và rách; HUD sức chứa; Bóng `drain` có hiệu ứng hút; chế độ mù màu (AC-18, test hàm thuần `settingsStore`); âm thanh `refuel`/`lantern_out`; Ông Đăng nói luật mới | Ảnh chụp, test hàm thuần |
| P3-M7 | Nộp | README, CHANGELOG hoàn chỉnh, NOTES (nhật ký AI, retro), PR, clean clone, tag `phase-3` | Verify xanh ở commit được tag |

**Ranh giới cắt** (cắt từ dưới lên): âm thanh mới → hiệu ứng hút dầu → lời Ông Đăng mới. **Không cắt** sim/headless (P3-M1…M5), chế độ mù màu (có AC-18), changelog, ADR hay bằng chứng.

### Tiêu chí hoàn thành Phase 3

- [ ] DoD §9 của `PRD_v3.md` đạt hết, mỗi dòng có bằng chứng trong `docs/evidence/phase-3/`
- [ ] Mỗi AC-01…AC-17 có ít nhất một case headless; AC-18 có test hàm thuần và ảnh chụp
- [ ] Case Phase 1–2 không bị luật mới thay thế vẫn xanh; case bị thay thế đã sửa hoặc xoá có lý do
- [ ] `CHANGELOG.md` liệt kê đủ breaking changes §10
- [ ] Tag `phase-3` trên repo public

## Phase 4: khung (ticket chưa phát hành)

Mỗi phase lặp lại vòng làm việc sau, khoảng 60 phút:

1. **Đọc ticket (8–10'):** gạch chân con số, tên lệnh, thay đổi contract. Ghi giả định mới vào `docs/NOTES.md`.
2. **Đánh giá tác động (3'):** ticket chạm vào luật nào, scenario cũ nào, ADR nào. Nếu ticket mâu thuẫn ADR thì viết ADR mới thay thế.
3. **Kiểm chứng trước (5'):** thêm hoặc sửa scenario cho yêu cầu mới. Test cũ bị sai do yêu cầu đổi thì **sửa kèm lý do**, không tắt âm thầm.
4. **Build theo mốc nhỏ (25–30'):** sim trước, render sau, mỗi mốc một commit.
5. **Verify (10'):** `npm run verify` cho **toàn bộ** scenario cũ và mới, rồi chơi tay. Lưu vào `docs/evidence/phase-N/`.
6. **Ghi chép + tag (5'):** nhật ký AI và token, retro ngắn, tag `phase-N`.

Riêng Phase 4: chừa 10–15 phút cuối cho Release `v1.0.0` và video demo `.mp4` dưới 5 phút (chơi thử, chạy `npm run verify`, lướt qua bằng chứng và lịch sử git).

## Quản lý token

- Giao agent từng mốc, kèm scenario kỳ vọng; không giao "làm cả game".
- `CLAUDE.md` giữ ngắn; chi tiết để ở PLAN, NOTES, ADR và chỉ đọc khi cần.
- Dùng model nhẹ cho việc đọc, tìm, định dạng; model mạnh cho sim và debug.
- Ghi ước tính token và chi phí cuối mỗi phase vào `docs/NOTES.md`.
