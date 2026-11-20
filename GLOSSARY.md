# Đảo Đèn Lồng

Game 3D: Mây gom đom đóm để thắp lại các Đèn Lồng Lớn trên ba hòn đảo, né Bóng Mực trong sương đen. Tên trong ngoặc là tên dùng trong code và Test Contract.

## Nhân vật & thực thể

**Mây** (`player`):
Người giữ đèn nhỏ tuổi do người chơi điều khiển; vị trí là điểm chân.
_Avoid_: hero, character

**Ông Đăng**:
Nhân vật kể chuyện, nói lời giới thiệu trước mỗi Đêm; không có mặt trong mô phỏng.

**Đom đóm** (`mote`):
Một đốm sáng nằm trên mặt đất đảo, nhặt được; là đơn vị "ánh sáng". Có hai loại: đom đóm thường (`random`) và đom đóm rơi.
_Avoid_: firefly, light orb, đốm sáng (khi nói về code)

**Đom đóm rơi** (`kind: dropped`):
Đom đóm văng ra quanh Mây khi bị chạm, hoặc do Gió Lạc thả lại; chỉ tồn tại trong một thời gian ngắn rồi biến mất.

**Đèn Lồng Lớn** (`lantern`):
Cột đèn cố định trên đảo (`L1`…`Ln`), được thắp khi nạp đủ đom đóm.
_Avoid_: lamp, beacon

**Bóng Mực** (`shade`):
Sinh vật mực đen lơ lửng trong sương, đuổi Mây và gây mất Ngọn Lửa khi chạm.
_Avoid_: enemy, monster, ghost

**Gió Lạc** (`drifter`):
Dải lụa xám xanh đuổi theo Mây khi Mây mang nhiều đom đóm; cướp đom đóm rồi bỏ chạy, không làm mất Ngọn Lửa.
_Avoid_: thief, bat, Bóng Mực (đây là loài khác)

**Bùa Gió** (`charm`):
Lá bùa đỏ viền vàng nằm cố định trên bản đồ; nhặt được sẽ tăng tốc chạy và bỏ hồi chiêu Lướt trong một thời gian, sau đó xuất hiện lại.
_Avoid_: power-up, buff

## Tài nguyên & chỉ số

**Ngọn Lửa** (`flames`):
Máu của Mây; về 0 thì thua. Hồi đầy ở đầu mỗi Đêm.
_Avoid_: HP, health, lives, máu, Lửa

**Đang mang** (`carried`):
Số đom đóm Mây đang giữ, tối đa `carry_capacity`; vừa là nguyên liệu thắp đèn vừa là "ánh sáng" để tỏa sáng.
_Avoid_: inventory, light (như một chỉ số riêng)

**Đã nạp** (`deposited`):
Số đom đóm đã nạp vào một Đèn Lồng Lớn chưa sáng.

**Tổng điểm game**:
Tổng điểm của các Đêm **đã thắng** trong Chuỗi 3 Đêm; điểm của Đêm thua không được tính.

## Hành động & sự kiện

**Nạp** (`deposit`):
Chuyển đom đóm đang mang vào Đèn Lồng Lớn gần nhất chưa sáng.
_Avoid_: feed, charge

**Thắp** (`lantern_lit`):
Khoảnh khắc một Đèn Lồng Lớn nhận đủ `lantern_cost` và sáng lên.

**Tỏa sáng** (`pulse`):
Mây đốt đom đóm đang mang để làm choáng và đẩy lùi Bóng Mực xung quanh, và xua Gió Lạc.
_Avoid_: blast, attack, flash

**Lướt** (`dash`):
Cú lao ngắn và rất nhanh theo hướng đang di chuyển; không giúp Mây bất tử.
_Avoid_: roll, dodge, blink

**Choáng** (`stunned`):
Trạng thái Bóng Mực đứng yên và vô hại sau khi trúng tỏa sáng.
_Avoid_: frozen, scared

**Bị chạm** (`player_hit`):
Mây mất một Ngọn Lửa, do Bóng Mực chạm hoặc do rơi khỏi đảo.
_Avoid_: bị cướp (đó là việc của Gió Lạc)

**Bị cướp** (`drifter_steal`):
Gió Lạc chạm Mây và lấy đi một ít đom đóm đang mang; không mất Ngọn Lửa, bất tử tạm và vùng an toàn không ngăn được.

**Rơi khỏi đảo** (`by: "fall"`):
Mây rơi xuống biển mây; mất một Ngọn Lửa và toàn bộ đom đóm, rồi hồi sinh ở điểm xuất phát.

**Bất tử tạm** (`invuln`):
Khoảng thời gian ngắn sau khi bị chạm, Mây không thể bị chạm tiếp.

**Tạm dừng** (`pause`):
Người chơi dừng Đêm lại; mọi thứ trong Đêm đứng yên cho tới khi tiếp tục.

## Không gian & thời gian

**Vùng an toàn** (`safe_radius`):
Vùng tròn quanh một Đèn Lồng Lớn **đã sáng** mà Bóng Mực không vào được.
_Avoid_: safe zone quanh đèn chưa sáng

**Đêm** (`night`):
Một màn chơi có giới hạn thời gian trên một hòn đảo: Đêm 1 – Đảo Bến, Đêm 2 – Đảo Cau, Đêm 3 – Đảo Chuông.
_Avoid_: level, stage

**Chuỗi 3 Đêm**:
Chơi lần lượt Đêm 1 → 2 → 3; thua thì chơi lại chính Đêm đó.
_Avoid_: campaign, story mode

**Bình minh** (`dawn`):
Hết thời gian Đêm mà chưa thắp hết đèn, dẫn đến thua.
_Avoid_: timeout, Màn Bình Minh

**Màn Bình Minh**:
Màn kết sau khi thắng Đêm 3, hiện Tổng điểm game.
_Avoid_: Bình minh (đó là lý do thua), ending screen

**Gió mạnh** (`wind`):
Cơn gió định kỳ ở Đêm 3 đẩy Mây theo một hướng; có báo trước.
_Avoid_: storm, Gió Lạc

**Bục nhảy** (bounce pad):
Bục tròn trên mặt đất; Mây bước lên thì bị bắn vọt lên cao và bay sang một chỗ định sẵn.
_Avoid_: trampoline, jump pad

**Cầu tre**:
Dải đường hẹp không lan can nối hai đảo của Đêm 2; bước ra ngoài là rơi.

**Tầng**:
Một mặt phẳng ở một độ cao cố định trên Đảo Chuông (tầng 0, 1, 2).

**Vách**:
Mép đứng giữa hai tầng; không đi lên được, bước ra thì rơi xuống tầng dưới.
_Avoid_: tường (không có tường), cliff

**Dốc**:
Đường nghiêng nối tầng 0 với tầng 1.

**Tháp chuông**:
Trụ đá ở giữa tầng 2 của Đảo Chuông; vật cản, không leo được.

**Kịch bản** (`scenario`):
Tình huống dựng sẵn cho chế độ headless, ghi đè trạng thái ban đầu của Đêm.
_Avoid_: level file, fixture
