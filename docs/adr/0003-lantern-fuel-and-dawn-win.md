# Đèn có dầu, thắng khi sống tới bình minh, thứ tự tick v1.2 (thay ADR-0002)

PRD v3 (Ticket-03) đổi mô hình đèn và luật thắng: đèn đã sáng có dầu, cạn dầu thì tắt; thắp đủ đèn không còn kết thúc Đêm; thắng chỉ xét ở bình minh. Test ẩn Phase 3 so output từng tick, nên chúng tôi viết lại mô hình trạng thái đèn và thứ tự xử lý cho khớp Test Contract v1.2.

## Mô hình trạng thái đèn

```
          nạp đủ 10 (chưa từng sáng)              nạp đủ 5 (ever_lit)
  tắt ───────────────────────────────▶ sáng ◀──────────────────────── tắt (ever_lit)
 (ever_lit=false)                    fuel_ticks=6000                        ▲
                                         │  hao 1/tick, mỗi Bóng drain 5/tick │
                                         │  châm dầu: +600 mỗi đom đóm        │
                                         └──── fuel_ticks ≤ 0 → lantern_out ──┘
                                               deposited = 0, ever_lit = true
```

- Dầu lưu bằng số nguyên `fuel_ticks` (tối đa 6000 = 100 × 60) để tính tất định; chỉ quy ra `fuel = round(fuel_ticks / 6) / 10` khi xuất. Scenario cho `fuel` số thực thì quy đổi `ceil(fuel × 60)`, kẹp trong [1, 6000].
- **Đèn yếu**: đèn sáng có `fuel_ticks < 1800` (`fuel < 30`). Đèn yếu mất vùng an toàn và là mục tiêu của Bóng Mực `wander`. `fuel = 30` vẫn là đèn khoẻ.
- Đèn đầy dầu không "nhận được" nên bị bỏ qua khi chọn đèn để tương tác.

## Thứ tự xử lý trong tick

Mỗi bước k đọc input tick k, tạo trạng thái k+1 và ghi sự kiện với `tick = k+1`:

1. Đọc input. `pause` xử lý trước: vừa tạm dừng hoặc đang tạm dừng thì dừng ở đây.
2. Giảm các bộ đếm (thời gian Đêm, hồi chiêu, bất tử, choáng, bùa, TTL đom đóm rơi, hồi bùa).
   - **2b. Dầu:** mỗi đèn sáng trừ 1, cộng 5 cho mỗi Bóng Mực đang `drain` đèn đó (trạng thái từ cuối tick trước). Bóng `drain` tới nhịp 60 tick của nó thì phát `fuel_drain`. Đèn có `fuel_ticks ≤ 0` tắt ngay: `lantern_out`, `deposited = 0`, `ever_lit = true`; Bóng đang hút đèn đó về `wander`.
3. Mây di chuyển, kiểm tra rơi.
4. Nhặt đom đóm và bùa (sức chứa = `min(20, 10 + 2 × successful_lights)`).
5. Tương tác với đèn nhận được gần nhất: nạp/thắp (`deposit`, `lantern_lit {relight}`) hoặc châm dầu (`refuel`).
6. Vùng an toàn: đèn vừa thắp, vừa thắp lại, hoặc vừa được châm từ dưới 30 lên ≥ 30 đẩy mọi Bóng trong 6 m ra mép (0.2 m/tick, ≤ 30 tick, vô hại khi bị đẩy); Bóng đang `drain` đèn đó về `wander`.
7. Tỏa Sáng (Bóng đang `drain` trúng đòn được 15 điểm thay vì 5).
8. Bóng Mực và Gió Lạc di chuyển; chuyển trạng thái `wander → drain` (≤ 2 m XZ tới đèn yếu mục tiêu), `drain → chase` (Mây ≤ 6 m), `drain → wander` (đèn hết yếu, tắt, hoặc cách > 2 m).
9. Chạm: Gió Lạc cướp trước, rồi tối đa một Bóng Mực theo id tăng dần. Vùng an toàn của đèn yếu không chặn.
10. Sinh đom đóm, Bóng Mực, Gió Lạc theo lịch.
11. Kiểm tra kết thúc, **sau mọi cập nhật của tick**: hết Ngọn Lửa thì luôn thua (`no_flames`), kể cả tick bình minh. Hết giờ: số đèn đang sáng ≥ `ceil(win_ratio × tổng_đèn)` thì thắng (`dawn_survived`, cộng thưởng bình minh), ngược lại thua (`dawn`). Không còn `all_lit`.
12. Ghi snapshot nếu tới lượt.

## Hệ quả

- Thắp đủ đèn không kết thúc Đêm; mọi Đêm chạy đủ 240/270/300 s trừ khi hết Ngọn Lửa.
- Dầu trừ ở bước 2b nên đèn có thể tắt trước khi Mây kịp châm trong cùng tick.
- Các case kỳ vọng `all_lit`, thưởng thời gian, thời lượng cũ trong test và `scenarios/cases.mjs` được tính lại hoặc xoá, mỗi thay đổi ghi lý do.
- Thứ tự vẫn chỉ nằm trong `src/sim/step.ts`; đổi thứ tự phải có ADR mới.

Trạng thái: chấp nhận (Phase 3). Thay thế ADR-0002.
