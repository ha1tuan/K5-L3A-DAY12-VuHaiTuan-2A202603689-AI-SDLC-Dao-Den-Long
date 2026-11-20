# Bằng chứng Phase 1

Mọi bằng chứng ở đây được tạo từ code tại tag `phase-1`. Để tái lập: `npm ci && npm run build && npm test && npm run verify`.

- [verify-report.md](verify-report.md): 25 kiểm tra trên binary headless thật, kèm lệnh chạy của từng case. Output nằm trong [out/](out/).
- `npm test`: 72 test Vitest (luật chơi qua `createSim`, contract qua `runHeadless`).
- [gameplay-night1.jpg](gameplay-night1.jpg): ảnh chụp bản có giao diện đang chơi.

## Checklist nộp bài → bằng chứng

| Yêu cầu (PRD-0 / Test Contract) | Cách kiểm chứng | Bằng chứng | Kết quả |
|---|---|---|---|
| Chơi được Đêm 1 tới thắng | Headless dựng 4 đèn sáng sẵn, nạp đèn cuối; tính điểm tay | case `win-all-lit`, `score-win` | đạt |
| Chơi được Đêm 1 tới thua (hết lửa / bình minh) | Headless | case `invuln-no-double-hit`, `lose-no-flames`, `lose-dawn` | đạt |
| Chơi lại được sau khi thắng hoặc thua | Màn kết thúc có nút "Chơi lại" và phím R; tạo sim mới | Code `src/client/main.ts` (`newNight`) | **chưa có bằng chứng chơi tay**, xem ghi chú |
| Đi lại, nhảy, camera 3D | Headless (đi, xoay theo yaw, chuẩn hoá); Vitest (nhảy theo cạnh lên); chơi tay (click-to-move, camera) | case `move-*`; `tests/sim/movement.test.ts`; ảnh chụp | đạt |
| Đom đóm rải rác, nhặt được | Headless | case `idle-default-night` (30 đom đóm), `pickup`, `pickup-full` | đạt |
| Nạp ánh sáng để thắp đèn | Headless | case `deposit-partial`, `light-one` | đạt |
| Bóng Mực xuất hiện và đuổi | Headless | case `shade-spawn`, `safe-radius-block`; `tests/sim/shades.test.ts` | đạt |
| Tỏa sáng xua Bóng Mực | Headless | case `pulse-stun-push`, `pulse-not-enough`, `pulse-cooldown` | đạt |
| Điểm số | Headless, kỳ vọng tính tay | case `pickup`, `light-one`, `pulse-stun-push`, `win-all-lit`, `score-win` | đạt |
| HUD hiển thị thông tin cần thiết | Ảnh chụp: lửa, lọ đom đóm, dây đèn x/8, đồng hồ, điểm, phím | `gameplay-night1.jpg` | đạt |
| README ≤ 3 lệnh, điều khiển, điểm, sáng tạo, tuning `null`/`false` | Đọc README; chạy 3 lệnh từ bản clone sạch | [README.md](../../../README.md); mục "Clone sạch" bên dưới | đạt |
| `game.contract.json`, tuning khớp số thật | Sim đọc trực tiếp file này; đổi `lantern_cost` 8 → 9 làm đúng 3 case đỏ (thử đột biến) | kiểm tra `contract-file`; [NOTES.md](../../NOTES.md) | đạt |
| Headless đúng tham số, 60 tick/s, exit 0/2/≠0 | Binary thật | case `bad-inputs`, `bad-inputs-json`, `bad-scenario`; mọi case exit 0 | đạt |
| JSONL có snapshot tick 0, event, dòng `end`; toạ độ 3 chữ số | Kiểm tra chung trên mọi output | mọi case trong verify-report | đạt |
| Chạy 2 lần cùng seed → giống hệt | Mọi case được chạy lại và so từng byte | verify-report (`determinism-walk` và mọi case) | đạt |
| Sim tất định, không phụ thuộc giao diện | Quét tĩnh `src/sim` | kiểm tra `static-sim-purity` | đạt |
| Harness AI | `CLAUDE.md`, `.claude/settings.json` (hook), `.claude/skills/verify-phase` | thư mục `.claude/` | đạt |
| Ghi chép giả định, nhật ký AI | | [docs/NOTES.md](../../NOTES.md) | đạt (token chưa có số đo, xem NOTES) |

## Clone sạch

Chạy đúng các lệnh trong README trên một bản clone mới ở thư mục tạm: xem [clean-clone.log](clean-clone.log).

## Ghi chú trung thực

- **Chưa chơi tay trọn ván trên giao diện.** Tab Chrome điều khiển tự động bị hãm còn 1.5 khung hình/giây (một trang trắng cũng chỉ đạt 1.5 FPS), nên không thể chơi tới thắng hay thua trong đó. Thắng, thua và chơi lại mới được chứng minh ở tầng sim và headless. Ảnh màn kết thúc và chơi lại cần được bổ sung bằng một lần chơi tay trên máy thật.
