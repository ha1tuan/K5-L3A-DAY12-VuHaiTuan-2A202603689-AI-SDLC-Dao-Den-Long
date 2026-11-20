# Kế hoạch phát triển: Đảo Đèn Lồng

> Nguồn yêu cầu: `PRD.md` (PRD-0 + Test Contract v1.0). Giả định đã chốt: `docs/NOTES.md`. Thuật ngữ: `GLOSSARY.md`.
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

## Phase 2–4: khung (ticket chưa phát hành)

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
