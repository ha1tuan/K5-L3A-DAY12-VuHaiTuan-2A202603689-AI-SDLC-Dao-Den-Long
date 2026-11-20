# Thứ tự xử lý cố định trong một bước tick

Test ẩn so output headless từng tick, nên thứ tự xử lý trong một bước quyết định sự kiện nào xảy ra trước và được ghi ở tick nào. Mỗi bước k (đọc input tick k, tạo trạng thái k+1, sự kiện ghi `tick = k+1`) luôn chạy theo thứ tự:

1. Áp input tick k (cạnh lên của nút).
2. Mây di chuyển và nhảy, sau đó kẹp trong mép đảo.
3. Nhặt đom đóm.
4. `interact`: nạp và thắp.
5. `pulse`.
6. Bóng Mực di chuyển, sau đó bị đẩy ra khỏi vùng an toàn.
7. Kiểm tra bị chạm.
8. Giảm các bộ đếm (choáng, bất tử, cooldown, thời gian Đêm), sinh Bóng Mực và đom đóm.
9. Kiểm tra kết thúc theo thứ tự `all_lit` → `no_flames` → `dawn`. Khi kết thúc thì dừng mô phỏng ngay.

Hệ quả có chủ đích: thắp đèn cuối cùng thắng ngay cả khi cùng tick đó có Bóng Mực chạm, và hành động của người chơi luôn được xử lý trước nguy hiểm. Đổi thứ tự sẽ làm lệch kết quả các scenario và bằng chứng đã lưu, vì vậy chỉ đổi khi có ADR mới.
