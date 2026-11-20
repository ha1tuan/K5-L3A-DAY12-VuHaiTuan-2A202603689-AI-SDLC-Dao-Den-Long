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
Cột đèn cố định trên đảo (`L1`…`Ln`), được thắp khi nạp đủ đom đóm; khi sáng thì cháy bằng dầu và có thể tắt lại khi cạn dầu.
_Avoid_: lamp, beacon

**Đèn yếu**:
Đèn đang sáng có dầu dưới 30; mất vùng an toàn và bị Bóng Mực nhắm tới để hút dầu.
_Avoid_: đèn tắt (đèn yếu vẫn đang sáng), low lantern

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
Số đom đóm đã nạp vào một Đèn Lồng Lớn đang tắt; về 0 khi đèn cạn dầu.

**Dầu** (`fuel`):
Lượng cháy còn lại của một đèn đang sáng, từ 0 tới 100; tự hao theo thời gian và bị Bóng Mực hút. Đèn tắt có dầu 0.
_Avoid_: nhiên liệu, oil, energy

**Sức chứa** (`capacity`):
Số đom đóm tối đa Mây mang được; bắt đầu Đêm ở 10, tăng 2 mỗi lần thắp thành công (kể cả thắp lại), tối đa 20.
_Avoid_: carry_capacity (đó là số khởi điểm trong `tuning`), túi

**Tổng điểm game**:
Tổng điểm của các Đêm **đã thắng** trong Chuỗi 3 Đêm; điểm của Đêm thua không được tính.

## Hành động & sự kiện

**Nạp** (`deposit`):
Chuyển đom đóm đang mang vào Đèn Lồng Lớn gần nhất chưa sáng.
_Avoid_: feed, charge

**Thắp** (`lantern_lit`):
Khoảnh khắc một Đèn Lồng Lớn đang tắt nhận đủ đom đóm và sáng lên với dầu đầy. Gồm thắp lần đầu và thắp lại.

**Thắp lại** (`relight: true`):
Thắp một đèn đã từng sáng rồi cạn dầu; chỉ cần 5 đom đóm.
_Avoid_: hồi sinh đèn, reignite

**Châm dầu** (`refuel`):
Nạp đom đóm vào một đèn **đang sáng** để thêm dầu, mỗi đom đóm thêm 10.
_Avoid_: nạp (nạp là cho đèn đang tắt), recharge

**Cạn dầu** (`lantern_out`):
Khoảnh khắc dầu của một đèn về 0 và đèn tắt.
_Avoid_: đèn chết, đèn hỏng

**Hút dầu** (`drain`):
Trạng thái Bóng Mực đứng sát một đèn yếu và rút dầu của nó.
_Avoid_: tấn công đèn, ăn đèn

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
Vùng tròn quanh một Đèn Lồng Lớn **đang sáng và không yếu** mà Bóng Mực không vào được.
_Avoid_: safe zone quanh đèn tắt hoặc đèn yếu

**Đêm** (`night`):
Một màn chơi có giới hạn thời gian trên một hòn đảo: Đêm 1 – Đảo Bến, Đêm 2 – Đảo Cau, Đêm 3 – Đảo Chuông. Đêm chỉ kết thúc ở bình minh hoặc khi hết Ngọn Lửa.
_Avoid_: Đảo Đôi, Đảo Tháp Chuông (tên sai từng dùng ở client)
_Avoid_: level, stage

**Chuỗi 3 Đêm**:
Chơi lần lượt Đêm 1 → 2 → 3; thua thì chơi lại chính Đêm đó.
_Avoid_: campaign, story mode

**Bình minh**:
Thời điểm hết giờ của Đêm; ở đây xét thắng hay thua theo số đèn đang sáng.
_Avoid_: timeout, Màn Bình Minh

**Sống tới bình minh** (`dawn_survived`):
Thắng Đêm: tới bình minh Mây còn Ngọn Lửa và số đèn đang sáng ít nhất 60% tổng số đèn (3/5, 4/6, 5/7).
_Avoid_: thắp hết đèn (không còn là điều kiện thắng), all_lit

**Bình minh đến khi thiếu đèn** (`dawn`):
Thua Đêm vì tới bình minh số đèn đang sáng dưới ngưỡng.
_Avoid_: hết giờ (nói chung chung)

**Màn Bình Minh**:
Màn kết sau khi thắng Đêm 3, hiện Tổng điểm game.
_Avoid_: Bình minh (đó là thời điểm xét thắng/thua), ending screen

**Bảng màu dễ phân biệt**:
Cài đặt dành cho người mù màu; đổi màu Bóng Mực và cảnh báo, và làm đèn tắt/đèn yếu nhận ra được không cần màu.
_Avoid_: dark mode, high contrast

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
