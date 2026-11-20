# Retro: Đảo Đèn Lồng, 4 phase với Claude Code

Bài lab AI SDLC Day 12. Chi tiết giả định và nhật ký từng phase ở [NOTES.md](NOTES.md), thay đổi ở [CHANGELOG.md](../CHANGELOG.md).

## Tổng hợp Evaluation của 4 phase

| Phase | Ticket | Kết quả có bằng chứng | Chưa đạt |
|---|---|---|---|
| 1 | PRD-0, Contract v1.0 | 72 test, verify 25/25 trên binary thật, chạy lại từ clone sạch | Chưa chơi tay trọn ván; chưa có token |
| 2 | Ba hòn đảo, v1.1 | 109+ test, 46 case + 2 kiểm tra tĩnh, 3 Đêm 3D, Chuỗi 3 Đêm | Tab Chrome tự động bị hãm 1 FPS nên chưa xem được gió, đồng hồ đỏ trên UI |
| 3 | Đèn cạn dầu, v1.2 | 163 test, verify 70/70, AC-01…AC-18 có case/test, 3 đột biến đều bị bắt | Chưa chụp màn bình minh; chưa nghe âm thanh mới |
| 4 | Phát hành v1.0.0, v1.3 | 190 test, verify 70/70; bench 318 fps / p1-low 108; soak 0 crash, bộ nhớ ×1.10; bảng xếp hạng, dễ tiếp cận, LICENSE, zip phát hành | Video; số trên máy chấm |

## Điều gì hiệu quả

- **Grilling trước khi code.** Mỗi phase bắt đầu bằng 10–17 câu hỏi có đề xuất sẵn, chốt thành giả định A1–A60. Phần lớn mâu thuẫn trong PRD (AC-05/AC-08 với thứ tự tick, "wander như trước" không tồn tại, vsync dưới Wayland) lộ ra ở đây hoặc khi viết test đầu tiên, không phải lúc nộp.
- **Một module sim sâu với interface nhỏ** (`createSim` → `step`, `state`). Test đi qua interface nên đổi luật ở Phase 3 chỉ phải viết lại test của luật đó. Phase 4 thêm cảnh bench mà không đụng output headless: verify vẫn 70/70.
- **Kiểm chứng bằng binary thật**, kỳ vọng tính tay, chạy hai lần so từng byte, và thử đột biến để chắc bộ kiểm chứng biết đỏ.
- **Ảnh chụp tự động** bắt được những lỗi test không thấy: cảnh quá tối, màu Bóng Mực sai bảng màu, màn kết thúc tràn khỏi 720 px.

## Điều gì không hiệu quả

- Chơi tay trên trình duyệt do agent điều khiển gần như không làm được: tab tự động bị hãm 1 FPS, một Đêm dài 4–5 phút. Phải thêm lối tắt dev (`?night=`, `?demo=fuel`, `?demo=end`) để tới được từng màn.
- Đo hiệu năng trên laptop có màn 120 Hz dưới Wayland cho số bị chặn mà không báo lỗi: phải tự nghi số "đẹp quá tròn" mới phát hiện.

## Những lần AI sai và cách phát hiện

| Lỗi | Phát hiện nhờ |
|---|---|
| Test viết sai thời điểm (nhảy, lướt, bùa hết hạn) | Chạy test thấy đỏ rồi tính tay lại; sim đúng |
| `git rm` / `git checkout` hỏng giữa chuỗi lệnh | Số đom đóm 24 thay vì 20; verify 22/25 |
| `pkill -f` làm chết chính shell (2 lần) | Shell chết; thêm quy tắc vào CLAUDE.md |
| Đoán dấu tên tác giả | Người dùng đọc lại |
| Tên đảo tự đặt sai PRD | Đối chiếu GLOSSARY |
| Sắp xếp `localeCompare` mỗi tick làm sim chậm 5× | Hook chạy test sau mỗi lần sửa: test gió timeout |
| Mỗi Bóng Mực 4 vật liệu riêng, bench p1-low sát ngưỡng | Log 12 khung chậm nhất tụ theo góc camera |
| Chỉ số "CPU work" đo sai nghĩa | Tự đọc lại cách đo trước khi lưu bằng chứng |
| CREDITS ghi "chưa có âm thanh" | Rà tài liệu khi phát hành |

Không lỗi nào được phát hiện nhờ agent tự báo "xong"; tất cả nhờ chạy thật, đọc output và xem ảnh.

## Harness nào giúp nhiều nhất

1. **Hook `test-after-edit`**: chạy Vitest sau mỗi lần sửa `src/` hoặc `tests/`, test đỏ là chặn. Bắt lỗi hiệu năng ở Phase 3 và lỗi test cài đặt ở Phase 4 ngay lúc sửa.
2. **Skill `verify-phase`** + `scripts/verify.mjs`: một lệnh ra báo cáo bằng chứng có commit hash, không sửa tay được.
3. **CLAUDE.md**: quy tắc cứng (sim không `Math.random`, dầu là số nguyên, không hard-code tuning, dừng server theo PID) giữ agent đúng hướng qua nhiều phiên và nhiều lần nén ngữ cảnh.
4. **Skill grilling / domain-modeling**: biến PRD mơ hồ thành giả định có số hiệu, dẫn chiếu được từ code và case.

## Token và chi phí

| Phase | Token | Chi phí |
|---|---|---|
| 1–4 | _chưa có số: lấy từ `/cost` của Claude Code hoặc trang usage_ | |

Đã tiết kiệm token bằng cách:
- Giao từng mốc nhỏ kèm kỳ vọng thay vì "làm cả game".
- Đọc file theo đoạn (`sed -n`, `grep`) thay vì cả file.
- Dùng `/compact` khi ngữ cảnh đầy.
- Để test và verify trả về một dòng tóm tắt (`N/M passed`) thay vì log dài.
- Không chạy subagent khi không cần.

## Nếu làm lại

- Dựng sẵn lối tắt dev và script ảnh chụp tự động (`ui-check`) ngay từ Phase 1, thay vì tới Phase 4.
- Ghi token sau mỗi phiên ngay khi xong, không để dồn tới cuối.
- Đo hiệu năng sớm với nhiều thực thể. Lỗi 4 vật liệu mỗi Bóng Mực có từ Phase 1, chỉ lộ ra khi bench sinh 200 con.
- Viết kịch bản video và quay ngay khi client ổn định, không để vào 15 phút cuối.
