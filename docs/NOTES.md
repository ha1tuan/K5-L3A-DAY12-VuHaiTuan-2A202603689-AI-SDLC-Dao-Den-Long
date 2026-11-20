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
| Chuẩn bị | Cấu hình skills (issue tracker, labels, domain docs); grilling PRD để chốt giả định; viết CLAUDE.md, PLAN, GLOSSARY, ADR-0001 | Claude Code | | |

### Retro

_(Điền cuối phase: cái gì đạt, cái gì chưa, AI sai ở đâu, harness cần chỉnh gì.)_
