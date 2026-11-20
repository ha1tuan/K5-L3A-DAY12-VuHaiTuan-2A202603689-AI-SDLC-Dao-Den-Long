# Đảo Đèn Lồng

Game 3D: Mây gom đom đóm để thắp lại các Đèn Lồng Lớn trên đảo, né Bóng Mực trong sương đen. Tên trong ngoặc là tên dùng trong code và Test Contract.

## Nhân vật & thực thể

**Mây** (`player`):
Người giữ đèn nhỏ tuổi do người chơi điều khiển; vị trí là điểm chân.
_Avoid_: hero, character

**Đom đóm** (`mote`):
Một đốm sáng nằm trên mặt đất đảo, nhặt được; là đơn vị "ánh sáng".
_Avoid_: firefly, light orb, đốm sáng (khi nói về code)

**Đèn Lồng Lớn** (`lantern`):
Cột đèn cố định trên đảo (`L1`…`L5`), được thắp khi nạp đủ đom đóm.
_Avoid_: lamp, beacon

**Bóng Mực** (`shade`):
Sinh vật mực đen trong sương, đuổi Mây và gây mất lửa khi chạm.
_Avoid_: enemy, monster, ghost

## Tài nguyên & chỉ số

**Lửa** (`flames`):
Máu của Mây; về 0 thì thua.
_Avoid_: HP, health, lives, máu

**Đang mang** (`carried`):
Số đom đóm Mây đang giữ, tối đa `carry_capacity`; vừa là nguyên liệu thắp đèn vừa là "ánh sáng" để tỏa sáng.
_Avoid_: inventory, light (như một chỉ số riêng)

**Đã nạp** (`deposited`):
Số đom đóm đã nạp vào một Đèn Lồng Lớn chưa sáng.

## Hành động & sự kiện

**Nạp** (`deposit`):
Chuyển đom đóm đang mang vào Đèn Lồng Lớn gần nhất chưa sáng.
_Avoid_: feed, charge

**Thắp** (`lantern_lit`):
Khoảnh khắc một Đèn Lồng Lớn nhận đủ `lantern_cost` và sáng lên.

**Tỏa sáng** (`pulse`):
Mây đốt đom đóm đang mang để làm choáng và đẩy lùi Bóng Mực xung quanh.
_Avoid_: blast, attack, flash

**Choáng** (`stunned`):
Trạng thái Bóng Mực đứng yên và vô hại sau khi trúng tỏa sáng.
_Avoid_: frozen, scared

**Bị chạm** (`player_hit`):
Bóng Mực chạm Mây: mất một lửa và đánh rơi một phần đom đóm đang mang.

**Bất tử tạm** (`invuln`):
Khoảng thời gian ngắn sau khi bị chạm, Mây không thể bị chạm tiếp.

## Không gian & thời gian

**Vùng an toàn** (`safe_radius`):
Vùng tròn quanh một Đèn Lồng Lớn **đã sáng** mà Bóng Mực không vào được.
_Avoid_: safe zone quanh đèn chưa sáng

**Đêm** (`night`):
Một màn chơi có giới hạn thời gian; Phase 1 chỉ có Đêm 1 – Đảo Bến.
_Avoid_: level, stage

**Bình minh** (`dawn`):
Hết thời gian Đêm mà chưa thắp hết đèn, dẫn đến thua.
_Avoid_: timeout

**Kịch bản** (`scenario`):
Tình huống dựng sẵn cho chế độ headless, ghi đè trạng thái ban đầu của Đêm.
_Avoid_: level file, fixture
