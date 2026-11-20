# Thứ tự xử lý trong tick theo Test Contract v1.1 (thay ADR-0001)

PRD v2 (§3.9) quy định một thứ tự xử lý bắt buộc khác với thứ tự Phase 1 tự chọn trong ADR-0001. Test ẩn Phase 2 so output từng tick, nên chúng tôi bỏ thứ tự cũ và làm đúng thứ tự của PRD. Mỗi bước k đọc input tick k, tạo trạng thái k+1 và ghi sự kiện với `tick = k+1`:

1. Đọc input. `pause` được xử lý trước: nếu bước này vừa tạm dừng, hoặc đang tạm dừng, thì dừng ở đây (`tick` tăng, `sim_tick` giữ nguyên).
2. Giảm các bộ đếm: thời gian Đêm, hồi chiêu, bất tử, choáng, bùa, TTL của đom đóm rơi, thời gian hồi bùa.
3. Mây di chuyển (nhảy, lướt, bục nhảy, gió), sau đó kiểm tra rơi khỏi đảo.
4. Nhặt đom đóm và bùa.
5. Tương tác với đèn (nạp, thắp).
6. Cập nhật vùng an toàn.
7. Tỏa Sáng.
8. Bóng Mực và Gió Lạc di chuyển.
9. Chạm: Gió Lạc cướp trước, sau đó Bóng Mực gây hit theo thứ tự id tăng dần.
10. Sinh đom đóm, Bóng Mực và Gió Lạc theo lịch. Thực thể mới chỉ tương tác từ tick sau.
11. Kiểm tra thắng/thua: hết Ngọn Lửa thì **luôn thua** (`no_flames`); còn sống và mọi đèn đã sáng thì thắng (kể cả đúng tick hết giờ); hết giờ thì thua (`dawn`).
12. Ghi snapshot nếu tới lượt.

## Hệ quả

- Kết quả thay đổi so với ADR-0001: nếu Mây mất Ngọn Lửa cuối cùng trong đúng tick thắp đèn cuối cùng thì giờ là **thua**. Bảng kỳ vọng trong `scenarios/cases.mjs` được tính lại theo số chuẩn, và mỗi case bị sửa đều ghi lý do.
- Vì bộ đếm giảm trước khi di chuyển, một cooldown đặt ở tick k được giảm lần đầu ở bước k+1.
- Thứ tự chỉ nằm trong `src/sim/step.ts`. Muốn đổi thứ tự phải viết ADR mới.

Trạng thái: chấp nhận (Phase 2). Thay thế ADR-0001.
