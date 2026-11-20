# Ghi chép dự án

## Phase 1

### Giả định (chốt qua phiên grilling trước khi code)

PRD-0 cố ý mơ hồ; dưới đây là cách hiểu đã chọn. Test và bằng chứng kiểm chứng theo đúng các giả định này.

| # | Chủ đề | Giả định |
|---|---|---|
| A1 | Công nghệ | TypeScript + Three.js + Vite; headless chạy bằng Node; test bằng Vitest |
| A2 | Kiến trúc | Lõi `src/sim/` thuần TS và tất định, dùng chung cho bản có giao diện và headless; PRNG mulberry32 seed bằng `--seed` |
| A3 | Nhặt | Tự nhặt khi khoảng cách XZ ≤ `pickup_radius` và `carried < carry_capacity`; túi đầy thì đom đóm ở nguyên chỗ |
| A4 | Nạp | `interact` (cạnh lên) vào đèn **chưa sáng gần nhất** trong `interact_radius`; `amount = min(carried, lantern_cost − deposited)`; được nạp từng phần; đủ thì `deposit` rồi `lantern_lit` cùng tick |
| A5 | Tỏa sáng | "Ánh sáng" = đom đóm đang mang; mỗi pulse tiêu `pulse_cost`; không đủ hoặc đang cooldown thì không pulse, không event; choáng mọi Bóng Mực trong `pulse_radius` và đẩy chúng ra xa thêm `pulse_push_m`; event `pulse` vẫn phát khi `stunned_ids` rỗng |
| A6 | Bóng Mực | Trạng thái `chase` hoặc `stunned`; đuổi thẳng trên XZ với `shade_speed`; không vào `safe_radius` quanh **đèn đã sáng** (đèn chưa sáng không có tác dụng); đầu game 2 con không phát event, cứ 60 s thêm 1 con, tối đa 5, phát `shade_spawned`; tâm ở Y = 1.0 |
| A7 | Bị chạm | Khi khoảng cách XZ ≤ `shade_hit_radius`, Bóng Mực không bị choáng và Mây không bất tử: `flames −1`, `dropped = floor(carried × hit_drop_ratio)` và số này **biến mất**, bất tử `invuln_s`; tối đa một lần chạm mỗi tick |
| A8 | Điểm | `per_mote` khi nhặt; `per_lantern` khi thắp; `per_stun` cho mỗi Bóng Mực bị choáng; `per_second_left × floor(time_left_s)` và `per_flame_left × flames` chỉ cộng khi **thắng** |
| A9 | Bản đồ | Đảo bán kính 40 m, tường vô hình (`fall_enabled: false`, không có `player_hit` loại `fall`); đèn trên vòng 25 m cách nhau 72°, `L1` ở (0, 0, 25); 30 đom đóm ban đầu, còn < 15 thì mỗi 2 s sinh thêm 1; nhảy chỉ đổi Y, không ảnh hưởng gameplay |
| A10 | Tuning | player_speed 6, carry_capacity 5, lantern_cost 8, pickup_radius 1.0, interact_radius 2.5, pulse_cost 2, pulse_radius 6, night1_duration_s 300, flames 3, invuln_s 1.5, hit_drop_ratio 0.5, pulse_stun_s 3, pulse_push_m 4, pulse_cooldown_s 1.5, safe_radius 6, shade_speed 4, shade_hit_radius 1.0; điểm 10 / 100 / 25 / 2 / 50 |
| A11 | Mã đội | `2A202603689-VuHaiTuan` |
| A12 | Thứ tự tick | Theo `docs/adr/0001-tick-step-order.md`: hành động người chơi trước, nguy hiểm sau; kết thúc kiểm tra theo thứ tự `all_lit` → `no_flames` → `dawn` |
| A13 | Điều khiển | Click chuột trái để đi tới điểm (dừng khi còn ≤ 0.2 m, kẹp mép đảo); không có di chuyển bằng bàn phím; camera kiểu MOBA góc cố định (trượt ở mép màn hình, Space về Mây, giữ Space bám theo, lăn chuột zoom); Q nhảy, W nạp, E tỏa sáng, R chơi lại; đổi phím ở màn Cài đặt (Esc), lưu `localStorage`. Bản có giao diện luôn gửi `cam_yaw_deg = 0` |
| A14 | Phạm vi | Phase 1 không làm phần sáng tạo cho tới khi lõi đạt |

### Nhật ký dùng AI

| Thời điểm | Việc | Công cụ / model | AI sai ở đâu, đã sửa thế nào | Token / chi phí ước tính |
|---|---|---|---|---|
| M0–M5 | Lõi sim + headless theo TDD (72 test qua `createSim`/`runHeadless`) | Claude Code | Test nhảy viết sai (nhấn lại khi nút còn giữ), đã sửa test; sim đúng | |
| M7 | Client Three.js + frontend-design | Claude Code + Chrome | Cảnh quá tối, camera quá gần, nút đổi phím mất chữ khi hover: phát hiện qua ảnh chụp, đã sửa. Tab Chrome tự động bị hãm 1.5 FPS (đo trên trang trắng), nên chưa chơi trọn ván trên UI | |
| M6 | `scripts/verify.mjs` (25 kiểm tra), hook test-after-edit, skill verify-phase | Claude Code | 25/25 xanh ngay lần đầu, nên đã thử đột biến (sai kỳ vọng; `lantern_cost` 8 → 9): verify bắt được cả hai. Lệnh khôi phục sau đột biến hỏng giữa chừng (`git checkout` gặp file chưa track), phát hiện nhờ verify ra 22/25, đã khôi phục | |
| M8 | README game, CREDITS, bảng bằng chứng, clone sạch, tag | Claude Code | Tự thêm dấu cho tên tác giả (đoán "Vũ Hải Tuấn" từ `VuHaiTuan`), đã sửa về đúng cách viết trong repo. Lặp lại lỗi `pkill -f` tự kết liễu shell khi dừng server (lần 2), đã chuyển sang dừng theo PID | |
| Chuẩn bị | Cấu hình skills (issue tracker, labels, domain docs); grilling PRD để chốt giả định; viết CLAUDE.md, PLAN, GLOSSARY, ADR-0001 | Claude Code | | |

### Retro

**Đạt:**
- Toàn bộ checklist PRD-0 và Test Contract v1.0 có bằng chứng tự động: 72 test Vitest, 25/25 kiểm tra verify trên binary thật, chạy lại được từ một bản clone sạch.
- Đã thử đột biến để chắc bộ kiểm chứng biết báo đỏ.

**Chưa đạt / còn thiếu:**
- Chưa có bằng chứng chơi tay trọn ván trên giao diện (tới màn thắng/thua rồi chơi lại). Tab trình duyệt tự động bị hãm 1.5 FPS. Cần một lần chơi tay và chụp ảnh trên máy thật.
- Chưa có số đo token và chi phí: cần lấy từ `/cost` của Claude Code hoặc trang usage, rồi điền vào nhật ký. Không ghi số ước đoán.

**AI sai ở đâu:**
- Viết test sai một lần (nhảy).
- Đặt kỳ vọng sát ranh giới bán kính, dễ lệch vì sai số dấu phẩy động (đã dời case `pickup`).
- Đoán dấu tên tác giả.
- Hai lần dùng `pkill -f` làm chết chính shell.
- Lệnh khôi phục sau thử đột biến hỏng giữa chừng.
- Mọi lỗi đều được phát hiện nhờ chạy thật và đọc output, không nhờ lời agent tự báo.

**Harness cần chỉnh:**
- Thêm vào CLAUDE.md quy tắc dừng server theo PID, không dùng `pkill -f`.
- Cân nhắc thêm một Stop hook chạy `npm run verify` trước khi kết thúc lượt, nếu verify đủ nhanh (hiện khoảng 3 s sau build).

**Thứ tự đã làm:** grilling PRD (17 câu, A1–A14) → kiến trúc → spec (issue #1) → TDD sim/headless → client → harness verify → nộp. Các phase sau giữ nguyên vòng này.

## Phase 2

Nguồn: `PRD_v2.md` (Test Contract v1.1). Số chuẩn, bản đồ chuẩn và contract lấy nguyên từ PRD. Bảng dưới chỉ ghi những chỗ PRD để mở, đã chốt qua phiên grilling.

### Giả định

| # | Chủ đề | Giả định |
|---|---|---|
| A15 | Thứ tự tick | Theo `docs/adr/0002-tick-step-order-v1-1.md` (đúng §3.9), thay A12. Hết Ngọn Lửa luôn thua, kể cả cùng tick thắp đèn cuối cùng |
| A16 | Thuật ngữ | "Bình minh" (`dawn`) là lý do thua; màn kết sau khi thắng Đêm 3 gọi là "Màn Bình Minh". "Lửa" đổi thành "Ngọn Lửa" |
| A17 | Phím | Thêm D lướt, Esc/P tạm dừng; giữ Q/W/E/R. Dòng nhắc nạp trên HUD dùng phím đang gán (mặc định W), khác chữ "E" trong PRD F-08 |
| A18 | Menu | Esc/P mở menu Tạm dừng (Tiếp tục / Chơi lại Đêm / Cài đặt / Về menu); Cài đặt gồm đổi phím, âm lượng, độ nhạy chuột (= tốc độ pan ở mép màn hình và bước zoom, vì không có xoay camera bằng chuột); lưu `localStorage` dưới key có version mới |
| A19 | Tăng tốc | Trên mặt đất đổi vận tốc tức thì (0 s, thoả "≤ 0.1 s"); trên không vận tốc ngang tiến về hướng mong muốn với gia tốc 12 m/s² (0.2 m/s mỗi tick). Bục nhảy khoá vận tốc ngang tới khi chạm đất |
| A20 | Địa hình | Mặt đất dưới chân là bề mặt cao nhất không cao hơn chân Mây quá 0.3 m; vách cao hơn bị chặn ngang; ra khỏi mép thì rơi theo trọng lực. Số liệu bản đồ là dữ liệu trong sim, không thuộc `tuning` |
| A21 | Bóng Mực bay | Tâm luôn ở 1.0 m trên mặt đất bên dưới; bay qua vách và cầu; chỉ bị chặn bởi trụ tháp chuông, mép vùng an toàn và mép đảo (đẩy lùi dừng tại đó). Gió Lạc theo cùng luật |
| A22 | Trạng thái Bóng Mực | `spawning` 60 tick (đứng yên, vô hại); `wander` đi tới điểm ngẫu nhiên (RNG theo seed) trong bán kính 8 m với 50% `shade_speed`, đổi điểm khi tới nơi hoặc sau 180 tick; `chase` khi XZ ≤ 12 m, về `wander` khi > 18 m; `recoil` lùi 2 m trong 60 tick ra xa Mây |
| A23 | Vùng an toàn | Bóng Mực đang ở trong lúc đèn vừa thắp bị đẩy ra mép với 0.2 m mỗi tick (6 m trong ≤ 30 tick), vô hại trong lúc bị đẩy |
| A24 | PRD §10 | Chấp nhận nguyên Q1–Q9 của PRD (shade 4.5 m/s ở Đêm 3 xử lý trong code, `tuning.shade_speed = 4.0`; Gió Lạc sinh ở điểm sinh Bóng Mực của Đêm, chọn bằng RNG; tối đa 2 con chưa `removed`; gió ở tick 1800k, báo trước từ 1680k; drifter 7 m/s cả `chase` và `flee`; 20/24 điểm đom đóm Đêm 2 chọn bằng RNG; rơi đom đóm làm tròn xuống) |
| A25 | Điểm Gió Lạc | Tỏa Sáng trúng Gió Lạc không cộng `per_stun` |
| A26 | Id đom đóm | `M1`, `M2`, … theo thứ tự xuất hiện, kể cả đom đóm rơi |
| A27 | Âm thanh | Tổng hợp bằng WebAudio, không dùng file; chỉ nằm ở `src/client/audio`; headless không khởi tạo audio |
| A28 | Màu | Cảnh 3D dùng bảng màu chuẩn F-10; UI dùng `#F5F1E6` / `#FF5A5F` / `#F2C14E`. Giữ phông Baloo 2 và HUD dây đèn lồng làm phần sáng tạo |
| A29 | Điểm xuất phát Đêm 3 | PRD không ghi; chọn (0, 0, −30) trên mặt đất phía bắc, xa bậc và tháp, cũng là điểm hồi sinh sau khi rơi |
| A30 | Lời Ông Đăng | Màn giới thiệu trước mỗi Đêm (tên đảo, ba câu của Ông Đăng, một dòng mẹo). Chỉ ở client: sim chưa bước tick nào cho tới khi người chơi nhấn "Vào Đêm"; thua thì chơi lại Đêm đó và nghe lại lời giới thiệu |
| A31 | Trang trí và lối tắt khi thử | Cây, cỏ, đom đóm trang trí, sao và mây chỉ ở client, sinh bằng PRNG cố định theo số Đêm (không dùng `--seed`, không đụng sim). `?night=2\|3` trên URL vào thẳng Đêm đó để thử nhanh, Chuỗi 3 Đêm bắt đầu từ Đêm ấy |

### Nhật ký dùng AI

| Thời điểm | Việc | Công cụ / model | AI sai ở đâu, đã sửa thế nào | Token / chi phí ước tính |
|---|---|---|---|---|
| P2-M0 | Đọc `PRD_v2.md`, so với Phase 1; grilling 14 câu; viết ADR-0002, cập nhật GLOSSARY, PLAN, NOTES, CLAUDE.md | Claude Code (Opus) | | |
| P2-M1–M4 | Spec (issue #3), lõi sim + headless v1.1 theo TDD: số chuẩn, ADR-0002, địa hình cột, Lướt, Tạm dừng, Bóng Mực 5 trạng thái, Gió Lạc, Bùa Gió, gió, ba bản đồ (109 test) | Claude Code (Opus) | Lệnh `git rm` hỏng giữa chuỗi `&&` nên `world.ts` cũ còn nguyên, sim sinh 24 đom đóm thay vì 20: test bắt được, đã sửa. Nhiều test tự viết sai thời điểm (hai lần nhấn Lướt liền tick là một lần giữ; bùa hết hạn ở tick 601; người chơi đi lạc khỏi đảo trong test bùa; Bóng Mực đặt trong vùng an toàn nên vô hại theo luật): sửa test, sim đúng. Bóng Mực lùi chỉ 59 tick: lỗi đếm, đã sửa sim. Sai số dấu phẩy động khi đáp đất (y ≈ 2e-15): thêm dung sai 1e-9 | |
| P2-M5 | `scenarios/cases.mjs` + `scripts/verify.mjs` cho v1.1: 46 case + 2 kiểm tra tĩnh, kỳ vọng tính tay | Claude Code (Opus) | `p2_fall` lệch 3 tick vì Mây nhặt Bùa Gió đặt sẵn giữa cầu rồi chạy nhanh hơn: bỏ bùa khỏi scenario thay vì sửa số kỳ vọng. Case `hit-drop` đọc snapshot tick 1 nhưng chu kỳ snapshot là 10: thêm `snapshotEvery: 1`. Đột biến `dash_speed` 14 → 13: verify bắt được ở 3 kiểm tra | |
| P2-M6/M7 | Client WebGL với skill `game-engine` + Chrome: ba đảo 3D từ dữ liệu bản đồ, cây, đom đóm bay, Lướt, menu Tạm dừng, Cài đặt, Chuỗi 3 Đêm, âm thanh WebAudio, HUD F-08, lời Ông Đăng (5 test hàm thuần) | Claude Code (Opus) + Chrome | Qua ảnh chụp phát hiện: cảnh quá tối, cây che kín đảo, đom đóm ngả xanh (màu cộng lên nền xanh ngọc và bị sương pha), dốc Đêm 3 nghiêng ngược chiều, mặt bậc trùng màu nền, mũi tên chỉ đèn đè lên ô điểm: đã sửa cả. Tưởng camera không pan được, hoá ra công cụ rê chuột dùng toạ độ ảnh đã thu nhỏ. Đo được tab Chrome tự động bị hãm 1 FPS (khung cách đều 1008 ms, không có long task) nên không chờ được tới banner gió, đồng hồ đỏ và dòng nhắc nạp đèn trên UI | |

## Phase 3

Nguồn: `PRD_v3.md` (Ticket-03 "Đèn cạn dầu", Test Contract v1.2). Luật nào PRD v3 không nhắc giữ nguyên Phase 2. Bảng dưới ghi những chỗ PRD để mở (§11) hoặc mâu thuẫn với code, đã chốt qua phiên grilling.

### Giả định

| # | Chủ đề | Giả định |
|---|---|---|
| A32 | Quy trình | Như Phase 2: nhánh `feat/phase-3`, tài liệu → spec → TDD lõi sim/headless → verify → client → PR → tag `phase-3`. Lõi theo contract trước |
| A33 | Thứ tự tick | Theo `docs/adr/0003-lantern-fuel-and-dawn-win.md`, thay A15. Bước 2b trừ dầu ngay sau bộ đếm (Bóng `drain` lấy trạng thái cuối tick trước), đèn `fuel ≤ 0` tắt ngay ở đó; kết thúc xét `no_flames` → bình minh (`dawn_survived` / `dawn`); bỏ `all_lit` |
| A34 | Đơn vị dầu (§11 câu 3) | Lưu `fuel_ticks` số nguyên, tối đa 6000; xuất `round(fuel_ticks / 6) / 10` (làm tròn thường). Scenario `fuel` thực → `ceil(fuel × 60)`, kẹp [1, 6000] (0.01 → 1 nên AC-06 tắt sau 1 tick). Đèn yếu: xem A49 |
| A35 | `wander` khi không có đèn yếu | PRD viết "đi về đèn tắt gần nhất như trước", nhưng Phase 2 (A22) chưa bao giờ có hành vi đó. Giữ A22 (điểm ngẫu nhiên trong 8 m). Có đèn yếu thì đi thẳng tới đèn đó với tốc độ `wander` (50% `shade_speed`) |
| A36 | Đổi mục tiêu (§11 câu 5) | Bóng `wander` chọn lại đèn yếu gần nhất mỗi tick (bằng nhau → id nhỏ); hết đèn yếu thì về đi ngẫu nhiên. Bóng `chase` không đổi mục tiêu |
| A37 | Nhịp `fuel_drain` (§11 câu 2) | Bộ đếm riêng từng Bóng, tính từ lúc vào `drain`; phát ở tick hút thứ 60, 120, …; `fuel` trong payload là dầu sau khi trừ ở tick đó. Rời `drain` thì bộ đếm về 0 |
| A38 | Đẩy ra khi thắp lại / châm vượt 30 (§11 câu 4) | Dùng luật A23 cho thắp lần đầu, thắp lại, và châm làm đèn từ < 30 lên ≥ 30: mọi Bóng trong 6 m bị đẩy ra mép 0.2 m/tick (≤ 30 tick), vô hại khi bị đẩy; Bóng đang `drain` đèn đó về `wander` |
| A39 | Vượt sức chứa (§11 câu 1) | Mỗi Đêm là một sim mới, Mây bắt đầu với 0 đom đóm, nên trường hợp này không phát sinh trong game. Scenario đặt `carried` > sức chứa thì giữ nguyên, chỉ không nhặt thêm |
| A40 | Tương tác | Mỗi lần nhấn chỉ tác động một đèn: đèn **nhận được** gần nhất trong 2 m (tắt, hoặc sáng chưa đầy). Đèn tắt: `deposit` như cũ, cần 5 nếu `ever_lit`, 10 nếu chưa. Đèn sáng: `refuel {lantern_id, amount, fuel}`. Mỗi đom đóm +5; thắp lần đầu +100; thắp lại +40 |
| A41 | Khối `score` | `per_mote` 5, `per_lantern` 100, `per_relight` 40, `per_stun` 5, `per_stun_drain` 15 (tổng cho con đang `drain`), `per_lantern_at_dawn` 50 (+ `floor(fuel)`), `per_flame_left` 50; bỏ `per_second_left`. Điểm vẫn khai ở contract |
| A42 | `shades[].target_lantern_id` | Không bắt buộc; id không tồn tại → exit 2. `state: "drain"` mà thiếu target → đèn sáng gần nhất trong 2 m, không có thì `wander`. `player.successful_lights` mặc định 0 |
| A43 | Thuật ngữ | Thêm Dầu, Châm dầu, Thắp lại, Đèn yếu, Hút dầu, Sức chứa, Sống tới bình minh. Sửa A16: "Bình minh" (`dawn`) vẫn là lý do thua nhưng chỉ khi hết giờ mà số đèn sáng dưới ngưỡng; hết giờ đủ đèn là `dawn_survived` (thắng) |
| A44 | Bảng màu dễ phân biệt | Chỉ ở client, lưu trong `settingsStore` cùng âm lượng/độ nhạy. Bóng Mực viền và mắt `#00B3FF`; cảnh báo trắng kèm ⚠; đèn tắt xẹp 20% và giấy rách; đèn yếu nhấp nháy 1 Hz ở mọi chế độ. AC-18 kiểm bằng test hàm thuần |
| A45 | Test cũ, changelog, bằng chứng | Test sim/headless và case verify bị luật mới làm sai (`all_lit`, thời lượng, điểm, thưởng thời gian, sức chứa cố định) được sửa hoặc xoá kèm lý do trong commit và `req`. `CHANGELOG.md` ở gốc. Bằng chứng ở `docs/evidence/phase-3/` |
| A46 | Thưởng bình minh `floor(fuel)` | Tính từ dầu chính xác: `floor(fuel_ticks / 60)` bằng số nguyên trong sim, không dùng giá trị đã làm tròn để xuất (5999 → 99, không phải 100) |
| A47 | Bước tăng sức chứa | Số gốc lấy từ `carry_capacity` (10), trần từ `capacity_max` (20). Bước `+2` mỗi lần thắp là hằng số thế giới `CAPACITY_PER_LIGHT` trong `world.ts`, không thêm khoá lạ vào `tuning` của contract |
| A48 | Đèn đầy dầu (AC-05) | Dầu trừ ở bước 2b trước bước tương tác, nên đèn `fuel = 100` lúc nhấn đã còn 5999. Đèn coi là **đầy** khi `fuel` xuất ra là 100.0, tức `fuel_ticks ≥ 5997`; đèn đầy không nhận được. Ngoài ra `used` vẫn tính `ceil` trên số chính xác (AC-04 vẫn ra 1) |
| A49 | Đèn yếu (AC-08) | Cùng lý do với A48: đèn `fuel = 30` đã còn 1799 khi Bóng Mực xét ở bước 8. Mọi so sánh ngưỡng dầu (đầy, yếu, châm lên ≥ 30) dùng giá trị `fuel` xuất ra một chữ số thập phân. Đèn **yếu** khi `fuel` xuất ra < 30.0, tức `fuel_ticks ≤ 1796`. Thay mốc `< 1800` ở A34 và ADR-0003 |

### Nhật ký dùng AI

| Thời điểm | Việc | Công cụ / model | AI sai ở đâu, đã sửa thế nào | Token / chi phí ước tính |
|---|---|---|---|---|
| P3-M0 | Đọc `PRD_v3.md`, đối chiếu code; grilling 14 câu; viết ADR-0003, CHANGELOG, cập nhật GLOSSARY, PLAN, NOTES, CLAUDE.md, Architect, skill `verify-phase` | Claude Code (Opus) | Khi đối chiếu GLOSSARY phát hiện client và README Phase 2 tự đặt tên đảo "Đảo Đôi"/"Đảo Tháp Chuông", sai với PRD v2 ("Đảo Cau"/"Đảo Chuông"): đã sửa về đúng tên | |
| P3-M1…M5 | TDD lõi sim/headless theo Contract v1.2 (dầu, châm dầu, thắp lại, sức chứa, hút dầu, thắng ở bình minh); 22 case verify mới, tính lại case Phase 1–2; thử 3 đột biến | Claude Code (Opus) | (1) AC-05 và AC-08 mâu thuẫn với thứ tự tick (dầu trừ ở bước 2b trước bước 5 và bước 8): chốt A48/A49, so ngưỡng trên giá trị `fuel` xuất ra. (2) Lần đầu viết `nearestWeak` sắp xếp đèn bằng `byId` (`localeCompare`) mỗi tick cho mỗi Bóng Mực, sim chậm ~5×, test gió Đêm 3 timeout: bỏ sắp xếp vì đèn vốn theo thứ tự id. (3) Ban đầu tính bước `wander` nhân `DT` hai lần, test bắt được trước khi commit | |
