# PRD v2 — Đảo Đèn Lồng · "Ba hòn đảo"

| Mục | Giá trị |
|---|---|
| Nguồn | PRD-0 (Phase 1) + TICKET-02 (Phase 2) |
| Loại | Feature + chuẩn hóa |
| Ưu tiên | Cao |
| Tag nộp | `phase-2` |
| Test Contract | **v1.1** (thay thế v1.0) |
| Trạng thái | Draft — thay thế PRD v1 |

> **Quy tắc vàng của v2:** Số liệu chuẩn (§3), Bản đồ chuẩn (§4) và Test Contract v1.1 (§6) là **bất biến**. Mọi phần sáng tạo riêng (nhân vật, kẻ địch, hiệu ứng…) được giữ/thêm, miễn là **không đổi đầu ra headless** (tắt khi chạy headless).

---

## 1. Bối cảnh & mục tiêu

Đêm 1 đã chạy được. Nhà sản xuất chơi thử nhiều bản và thấy cảm giác điều khiển mỗi bản một khác. Phase 2 có hai mục tiêu:

1. **Đồng bộ số liệu chuẩn** — thay mọi giá trị tự chọn ở Phase 1 bằng bộ số chung để mọi bản cho cảm giác giống nhau.
2. **Mở rộng thành 3 Đêm** — thêm Đảo Cau (Đêm 2), Đảo Chuông (Đêm 3) và các tính năng mới: Lướt, Gió Lạc, Bùa Gió, Gió mạnh, chuỗi 3 Đêm, tạm dừng, cài đặt, âm thanh, HUD đầy đủ, bảng màu chuẩn.

### Chỉ số thành công
| # | Chỉ số | Ngưỡng |
|---|---|---|
| M1 | Toàn bộ test ẩn Phase 1 chạy với số chuẩn | 100% pass (regression) |
| M2 | Headless 1 Đêm đầy đủ (≤ 21.600 tick) | ≤ 30 giây |
| M3 | Bản có giao diện ở 1280×720 | ≥ 30 FPS trung bình |
| M4 | Mỗi tính năng mới §5 có ≥ 1 scenario headless | 100% |
| M5 | Tính tất định: cùng seed + scenario + inputs | Output JSONL giống hệt |

---

## 2. Phạm vi

### Trong phạm vi (v2)
- Áp dụng toàn bộ số liệu chuẩn §3 và thứ tự xử lý tick §3.9.
- Chuẩn hóa lại Đêm 1, thêm Đêm 2 & Đêm 3 theo bản đồ §4.
- 8 tính năng mới §5.
- Test Contract v1.1 §6.
- Cập nhật AGENTS.md / skills cho phạm vi mới (lịch sử git phải thể hiện).

### Ngoài phạm vi
- Đồ họa chân thực, bạo lực/máu me (giữ phong cách PRD-0: đêm, ấm áp, cổ tích, đơn giản nhưng đẹp).
- Thay đổi bất kỳ số chuẩn, bản đồ chuẩn hay định dạng contract.
- Nội dung Phase 3+ (chưa phát hành).

---

## 3. Số liệu chuẩn (bắt buộc)

Logic chạy **60 tick/giây**. Đơn vị: mét, giây. Trục **Y hướng lên**. Khoảng cách đo trên mặt phẳng XZ trừ khi ghi rõ 3D.

### 3.1 Di chuyển
| Hằng số | Giá trị |
|---|---|
| Tốc độ chạy | 6.0 m/s; tăng tốc/dừng trong ≤ 0.1 s; điều khiển trên không **không** đầy đủ |
| Nhảy | Vận tốc 7.0 m/s, trọng lực −20 m/s², chỉ nhảy khi chạm đất |

### 3.2 Lướt (mới)
| Hằng số | Giá trị |
|---|---|
| Tốc độ / thời gian / hồi chiêu | 14 m/s / 0.2 s (12 tick) / 1.5 s (tính từ lúc **bắt đầu** lướt) |
| Hướng | Hướng đang di chuyển; nếu đứng yên → hướng nhân vật đang quay mặt |
| Trên không | Giữ nguyên độ cao trong lúc lướt |
| Bất tử | **Không** bất tử khi lướt |

### 3.3 Đom đóm
| Hằng số | Giá trị |
|---|---|
| Sức chứa | 10 |
| Nhặt | Tự động khi XZ ≤ 1.0 m **và** chênh cao chân Mây ↔ mặt đất điểm đom đóm ≤ 1.5 m |
| Số lượng | 20 lúc bắt đầu tại 20 điểm khác nhau; trần 30; tại tick 240, 480, … sinh thêm 1 ở một điểm trống nếu < 30; hết điểm trống thì bỏ lượt |

### 3.4 Đèn lồng
| Hằng số | Giá trị |
|---|---|
| Chi phí thắp | 10 đom đóm; nạp nhiều lần được; đèn hiển thị tiến độ |
| Tương tác | Bán kính 2.0 m; mỗi lần bấm nạp `min(đang mang, còn thiếu)` vào **một** đèn. Chỉ xét đèn chưa sáng; chọn đèn gần nhất, bằng nhau → id nhỏ hơn |
| Vùng an toàn | Đèn **đã sáng** tạo vùng bán kính 6 m: Bóng Mực ngoài bị chặn ở mép; Bóng đang ở trong lúc đèn vừa thắp bị đẩy ra mép trong ≤ 30 tick, không gây sát thương trong lúc đó |

### 3.5 Tỏa Sáng
| Hằng số | Giá trị |
|---|---|
| Chi phí / bán kính / hồi chiêu | 3 đom đóm / 5 m / 3 s |
| Tâm | Chân Mây + 0.8 m (Y) |
| Mục tiêu | Chốt ngay tick kích hoạt: khoảng cách **3D** tới tâm Bóng Mực ≤ 5 m |
| Hiệu ứng | Choáng 120 tick; 15 tick đầu bị đẩy lùi tổng 4 m theo phương ngang (dừng nếu gặp vật cản; trùng vị trí → đẩy theo +X). Pulse lại làm mới choáng và đẩy lùi. Không chết |
| Điều kiện | Không đủ 3 đom đóm → không kích hoạt |

### 3.6 Bóng Mực
| Hằng số | Giá trị |
|---|---|
| Tốc độ | 4.0 m/s (Đêm 3: 4.5 m/s) |
| Phát hiện / bỏ đuổi | 12 m / 18 m |
| Chạm | XZ ≤ 1.0 m và chênh cao ≤ 1.5 m. Tối đa **1** lần mất Ngọn Lửa mỗi tick. Bóng gây hit lùi 2 m trong 60 tick (`recoil`); chạm lúc Mây bất tử không làm gì |
| Lịch sinh | 2 con tại tick 300, sau đó 1 con mỗi `khoảng sinh` (Đêm 1: tick 300 + 480k); hết điểm hợp lệ → bỏ lượt. Id `S1`, `S2`, … theo thứ tự sinh |
| Trạng thái (bắt buộc tên) | `spawning`, `wander`, `chase`, `recoil`, `stunned` |

### 3.7 Bị đánh, Máu, Thời gian, Thắng/thua
| Hạng mục | Quy tắc |
|---|---|
| Bị đánh | −1 Ngọn Lửa; rơi `floor(đang mang / 2)` đom đóm ra vành 1.5–2.5 m quanh Mây (tồn tại 480 tick, nhặt lại được từ tick sau); bất tử 90 tick |
| Rơi khỏi đảo (Y < −10) | Xảy ra **đúng 1 lần, bỏ qua bất tử**: −1 Ngọn Lửa, mất toàn bộ đom đóm. Chờ 60 tick (không nhặt, không bị chạm), hồi sinh ở điểm xuất phát, vận tốc 0, bất tử 90 tick. Hết Ngọn Lửa → thua ngay, không hồi sinh |
| Ngọn Lửa | 3, hồi đầy đầu mỗi Đêm |
| Thời lượng Đêm 1/2/3 | 300 / 330 / 360 s |
| Thắng/thua (sau mỗi tick) | Hết Ngọn Lửa → **luôn thua** (`no_flames`); còn sống và tất cả đèn sáng → thắng (kể cả đúng tick hết giờ); còn lại mà hết giờ → thua (`dawn`) |

### 3.8 Điểm (chuẩn hóa)
| Sự kiện | Điểm |
|---|---|
| Mỗi đom đóm nạp vào đèn | +10 |
| Mỗi đèn thắp | +100 |
| Mỗi Bóng Mực trúng Tỏa Sáng (mỗi con mỗi lần, kể cả con đang choáng) | +5 |
| Khi thắng Đêm | + `floor(giây còn lại) × 2` + 50 × Ngọn Lửa còn lại |

**Tổng điểm game** = tổng điểm các Đêm **đã thắng**.

### 3.9 Thứ tự xử lý trong một tick (bắt buộc)
1. Đọc input (xử lý `pause` trước; nếu vừa tạm dừng → dừng bước ở đây).
2. Giảm bộ đếm: thời gian, hồi chiêu, bất tử, choáng, bùa, TTL đom đóm rơi, hồi bùa.
3. Di chuyển Mây (nhảy, lướt, bục nhảy, gió) rồi kiểm tra rơi khỏi đảo.
4. Nhặt đom đóm và bùa.
5. Tương tác với đèn.
6. Cập nhật vùng an toàn.
7. Tỏa Sáng.
8. Di chuyển Bóng Mực và Gió Lạc.
9. Chạm: Gió Lạc cướp trước, rồi Bóng Mực gây hit (theo id tăng dần).
10. Sinh đom đóm, Bóng Mực, Gió Lạc theo lịch (thực thể mới chỉ tương tác từ tick sau).
11. Xét thắng/thua.
12. Ghi snapshot nếu tới lượt.

**Khi tạm dừng:** `tick` vẫn tăng nhưng `sim_tick`, thời gian, hồi chiêu, spawn, TTL đứng yên; snapshot ghi `state: "paused"`.

---

## 4. Bản đồ chuẩn

Góc đo từ trục +X, ngược chiều kim đồng hồ khi nhìn từ trên xuống, trên mặt phẳng XZ.

### 4.1 Đêm 1 — Đảo Bến (chuẩn hóa lại)
- Đảo tròn tâm (0,0,0), bán kính 40 m; ngoài 40 m là biển mây (rơi).
- Xuất phát (0,0,0), quay mặt về +Z.
- Đèn: L1 (0,0,25) · L2 (23.8,0,7.7) · L3 (14.7,0,−20.2) · L4 (−14.7,0,−20.2) · L5 (−23.8,0,7.7).
- Điểm sinh đom đóm: 8 điểm r = 12 m (mỗi 45°) + 16 điểm r = 33 m (mỗi 22.5°) → 24 điểm.
- Bóng Mực sinh trên 12 điểm r = 37 m (15°, 45°, …), cách người chơi ≥ 15 m; 2 con ở giây 5, sau đó mỗi 8 s; tối đa 6.

### 4.2 Đêm 2 — Đảo Cau (mới)
- Hai đảo tròn r = 28 m: A tâm (0,0,0), B tâm (70,0,0); nối bằng **cầu tre** x ∈ [26, 44], z ∈ [−2, 2], không lan can.
- **Bục nhảy** tròn r = 1 m tại (20,0,18) và (50,0,−18): chân Mây chạm bục → bắn lên vY = 14 m/s, vận tốc ngang **24 m/s hướng về tâm đảo kia**. Vận tốc phóng giữ nguyên tới khi chạm đất (phím di chuyển không ghi đè; vẫn lướt được). Bay ~1.4 s, đáp trong đảo đích.
- Đom đóm mỗi đảo: 4 điểm r = 10 m (0°, 90°, 180°, 270°) + 8 điểm r = 22 m (mỗi 45°).
- Bóng Mực sinh trên 8 điểm r = 26 m mỗi đảo (22.5°, 67.5°, …).
- Đèn L1…L6: (0,0,20), (17,0,−10), (−17,0,−10), (70,0,20), (87,0,−10), (53,0,−10).
- Bóng Mực: mỗi 7 s, tối đa 8.
- Bùa Gió `C1` tại (35,0,0) (giữa cầu).

### 4.3 Đêm 3 — Đảo Chuông (mới)
- Đảo tròn r = 45 m, **3 tầng**: tầng 0 (Y=0) toàn đảo; tầng 1 (Y=3) vành khăn r 12–24 m ở nửa z > 0; tầng 2 (Y=6) đĩa r = 8 m ở tâm.
- Mép các tầng là vách đứng (không đi lên được; bước ra thì rơi xuống tầng dưới).
- 2 dốc thẳng rộng 3 m dọc bán kính ở góc 30° và 150°: chân dốc r = 30 m (Y=0), đỉnh dốc r = 24 m (Y=3).
- Bục nhảy r = 1 m tại **(0,3,13)**: vY = 12 m/s, ngang 8 m/s hướng −Z, giữ tới khi chạm đất → đáp lên tầng 2.
- Tháp chuông cao 8 m ở tâm tầng 2, hình trụ r = 2 m, không leo được.
- Đom đóm (30 điểm): tầng 0 — 18 điểm r = 34 m (mỗi 20° từ 0°); tầng 1 — 8 điểm r = 18 m (20°, 40°, …, 160°); tầng 2 — 4 điểm r = 5 m (45°, 135°, 225°, 315°).
- Bóng Mực sinh trên 16 điểm r = 43 m (mỗi 22.5°); mỗi 6 s, tối đa 10; tốc độ 4.5 m/s.
- Đèn L1…L7: (0,6,6), (18,3,10), (−18,3,10), (35,0,−10), (−35,0,−10), (20,0,−35), (−20,0,−35).
- **Gió mạnh:** mỗi 30 s có một cơn gió 5 s theo hướng ngẫu nhiên, đẩy người chơi 2 m/s; báo trước 2 s bằng lá bay + âm thanh.
- Bùa Gió `C1` (30,0,25), `C2` (−30,0,25).

---

## 5. Tính năng mới & Acceptance Criteria

> Mỗi AC dưới đây phải có ít nhất một scenario headless tương ứng (xem §7).

### F-01 · Lướt (Dash)
Theo §3.2. Input `dash` kích hoạt khi chuyển false → true.

| ID | Acceptance criteria |
|---|---|
| AC-01.1 | Đứng yên quay mặt +Z, bấm `dash` → sau 12 tick Mây đi thêm ≈ 2.8 m theo +Z; phát `event dash {}` |
| AC-01.2 | Bấm lại trong 90 tick kể từ lúc bắt đầu lướt → không lướt, không phát event; `dash_cd_s` trong snapshot giảm dần về 0 |
| AC-01.3 | Lướt khi đang trên không → Y giữ nguyên trong 12 tick lướt |
| AC-01.4 | Bị Bóng Mực chạm trong lúc lướt (không bất tử) → vẫn mất Ngọn Lửa |

### F-02 · Gió Lạc (Đêm 2 và 3)
Dải lụa xám xanh, tối đa 2 con, sinh tại tick 1200, 2400, … trên điểm sương ngẫu nhiên, id `D1`, `D2`, …
- Trạng thái: `idle` (lượn chậm 2 m/s) → `chase` (7 m/s) → `flee` → `removed`.
- `idle → chase` khi Mây mang **≥ 5 đom đóm** và cách ≤ 15 m (kiểm tra mỗi tick); mất điều kiện → về `idle`.
- Chạm (XZ ≤ 1.2 m): **cướp `min(3, đang mang)`**, chuyển `flee` (bay ra xa 7 m/s trong 240 tick rồi biến mất cùng số đã cướp). Mỗi con chỉ cướp 1 lần.
- Tỏa Sáng trúng Gió Lạc `chase` → chuyển `flee`, không cướp. Trúng lúc `flee` đang mang đồ → thả lại toàn bộ đom đóm đã cướp tại chỗ (thành đom đóm rơi), biến mất sau 120 tick.
- Không làm mất Ngọn Lửa; vùng an toàn không chặn; bất tử của Mây không ngăn bị cướp.

| ID | Acceptance criteria |
|---|---|
| AC-02.1 | Không xuất hiện ở Đêm 1; ở Đêm 2/3 sinh đúng tick 1200, 2400…, không quá 2 con cùng lúc |
| AC-02.2 | Mây mang 4 đom đóm, cách 10 m → drifter giữ `idle`; mang 5 → chuyển `chase` cùng tick |
| AC-02.3 | Chạm khi Mây mang 7 → `drifter_steal {drifter_id, amount:3, carried:4}`; drifter `flee`, `stolen=3`, biến mất sau 240 tick |
| AC-02.4 | Mây đang bất tử / đứng trong vùng an toàn vẫn bị cướp; Ngọn Lửa không đổi |
| AC-02.5 | Pulse trúng drifter `flee` có `stolen=3` → `drifter_drop {drifter_id, amount:3}`, 3 đom đóm `kind=dropped` xuất hiện tại chỗ |
| AC-02.6 | Cùng tick chạm cả Gió Lạc và Bóng Mực → cướp xử lý trước, rồi hit (đom đóm rơi tính trên số còn lại) |

### F-03 · Bùa Gió
Lá bùa đỏ viền vàng, id `C1`, `C2`. Nhặt theo luật như đom đóm. Hiệu lực 600 tick (nhặt lại thì làm mới): tốc độ chạy **7.2 m/s** và Lướt không hồi chiêu (vẫn phải nhấn lại; nhấn khi đang lướt bị bỏ qua; lướt vẫn 14 m/s trong 12 tick). Xuất hiện lại sau 2700 tick. Vị trí theo §4.2, §4.3.

| ID | Acceptance criteria |
|---|---|
| AC-03.1 | Nhặt bùa → `charm_picked {charm_id, charm_ticks:600}`; `charm.available=false`, `respawn_s` đếm từ 45.0 |
| AC-03.2 | Trong hiệu lực, tốc độ chạy tối đa 7.2 m/s; hết 600 tick về 6.0 m/s |
| AC-03.3 | Trong hiệu lực, lướt 2 lần liên tiếp cách 12 tick đều thành công; nhấn khi đang lướt bị bỏ qua |
| AC-03.4 | Bùa xuất hiện lại sau đúng 2700 tick |

### F-04 · Chuỗi 3 Đêm
Menu chính → giới thiệu Đêm (tên đảo, lời Ông Đăng) → chơi → kết quả → Đêm kế tiếp. Thắng Đêm 3 → màn hình **Bình Minh** với tổng điểm. Thua → chơi lại Đêm đó.

| ID | Acceptance criteria |
|---|---|
| AC-04.1 | Headless `--night 1|2|3` dựng đúng bản đồ, thời lượng, số đèn của Đêm đó; phát `night_start {night}` |
| AC-04.2 | Ngọn Lửa hồi đầy 3 ở đầu mỗi Đêm |
| AC-04.3 | Tổng điểm Bình Minh = tổng điểm các Đêm đã thắng; Đêm thua rồi chơi lại không cộng điểm lần thua |

### F-05 · Tạm dừng (Esc/P)
Logic dừng hoàn toàn. Menu: Tiếp tục / Chơi lại Đêm / Cài đặt / Về menu.

| ID | Acceptance criteria |
|---|---|
| AC-05.1 | Input `pause` → `paused {}`; trong lúc dừng `tick` tăng, `sim_tick`/thời gian/hồi chiêu/spawn/TTL đứng yên; snapshot `state:"paused"` |
| AC-05.2 | Bấm `pause` lần nữa → `resumed {}`, mọi bộ đếm chạy tiếp từ giá trị cũ |

### F-06 · Cài đặt
Âm lượng và độ nhạy chuột, **được lưu** giữa các lần mở game.

| ID | Acceptance criteria |
|---|---|
| AC-06.1 | Đổi âm lượng/độ nhạy, đóng và mở lại game → giá trị giữ nguyên |

### F-07 · Âm thanh
Nhạc nền đêm + hiệu ứng: nhặt, thắp đèn, tỏa sáng, bị đánh, nhảy, lướt, thắng, thua, Bóng Mực xuất hiện, đếm ngược 10 s cuối, báo gió mạnh. Tắt hoàn toàn ở headless.

| ID | Acceptance criteria |
|---|---|
| AC-07.1 | Mỗi sự kiện trên phát đúng âm (kiểm tra thủ công/quay video) |
| AC-07.2 | Headless không khởi tạo audio, output không đổi |

### F-08 · HUD đầy đủ
- Ngọn Lửa (trên trái); đồng hồ `mm:ss` (trên giữa, đỏ + nhấp nháy khi ≤ 30 s); đèn `k/n` và điểm (trên phải); thanh đom đóm 10 ô (dưới giữa); biểu tượng hồi chiêu Lướt và Tỏa Sáng (dưới phải).
- Nhắc "E — Nạp ánh sáng (x/10)" khi đứng gần đèn; mũi tên chỉ tới đèn chưa sáng gần nhất khi nó ở ngoài màn hình.

| ID | Acceptance criteria |
|---|---|
| AC-08.1 | Mọi thành phần trên hiển thị đúng vị trí ở 1280×720 |
| AC-08.2 | Đồng hồ chuyển đỏ và nhấp nháy tại 0:30 |

### F-09 · Gió mạnh (Đêm 3)
Theo §4.3. Snapshot `wind {active, dir_deg}`; scenario `wind_enabled`.

| ID | Acceptance criteria |
|---|---|
| AC-09.1 | `wind_enabled:true` → mỗi 30 s có gió 5 s, `wind.active=true`, Mây bị đẩy thêm 2 m/s theo `dir_deg` |
| AC-09.2 | `wind_enabled:false` → `wind.active` luôn false |
| AC-09.3 | Cùng seed → cùng chuỗi `dir_deg` |

### F-10 · Bảng màu chuẩn & ánh sáng môi trường
Sai lệch tối đa 10% mỗi kênh RGB cho các thành phần liệt kê; chi tiết khác tự chọn.

| Dùng cho | Hex |
|---|---|
| Trời đêm / sương | `#0E1430` / `#1B2350` |
| Cỏ / cát / gỗ / biển mây | `#2F5D50` / `#C9B48A` / `#6B4A2F` / `#12384A` |
| Đèn sáng / lõi / đèn tắt | `#FFB347` / `#FFE9B0` / `#5B5F6E` |
| Đom đóm lõi / quầng | `#FFF6C2` / `#FFE58A` |
| Bóng Mực thân / viền / bị choáng | `#120A1A` / `#7A3CFF` / `#3A3450` |
| Áo Mây / khăn Mây và Bùa Gió | `#E8E2D0` / `#C8102E` |
| Viền vàng, điểm số / Gió Lạc | `#F2C14E` / `#8FA3B8` |
| UI nguy hiểm / chữ UI | `#FF5A5F` / `#F5F1E6` |

Cường độ ánh sáng môi trường = `0.15 + 0.55 × (đèn sáng / tổng đèn)`.

| ID | Acceptance criteria |
|---|---|
| AC-10.1 | Ảnh chụp các thành phần liệt kê nằm trong ±10%/kênh |
| AC-10.2 | 0/5 đèn → 0.15; 5/5 đèn → 0.70 |

---

## 6. Test Contract v1.1

### 6.1 `game.contract.json` (giá trị tuning đã khớp số chuẩn)
```json
{
  "contract_version": "1.1",
  "team": "mssv-ho-ten",
  "build_cmd": "...",
  "run_cmd": "...",
  "headless_cmd": "...",
  "tuning": {
    "player_speed": 6.0,
    "carry_capacity": 10,
    "lantern_cost": 10,
    "lantern_count_night1": 5,
    "pickup_radius": 1.0,
    "interact_radius": 2.0,
    "pulse_cost": 3,
    "pulse_radius": 5.0,
    "night1_duration_s": 300,
    "night2_duration_s": 330,
    "night3_duration_s": 360,
    "flames": 3,
    "invuln_s": 1.5,
    "hit_drop_ratio": 0.5,
    "pulse_stun_s": 2.0,
    "pulse_push_m": 4.0,
    "pulse_cooldown_s": 3.0,
    "safe_radius": 6.0,
    "shade_speed": 4.0,
    "shade_hit_radius": 1.0,
    "fall_enabled": true,
    "dash_speed": 14.0,
    "dash_duration_s": 0.2,
    "dash_cooldown_s": 1.5,
    "score": {
      "per_mote": 10, "per_lantern": 100, "per_stun": 5,
      "per_second_left": 2, "per_flame_left": 50
    }
  }
}
```

### 6.2 Thay đổi so với v1.0
| Hạng mục | v1.1 |
|---|---|
| CLI | `--night` nhận 1, 2, 3 |
| Snapshot gốc | thêm `night`, `wind {active, dir_deg}` |
| `player` | thêm `vel`, `grounded`, `invuln`, `dash_cd_s`, `pulse_cd_s`, `charm_s` |
| Mảng **bắt buộc** | `motes` (`id`, `pos`, `kind` = `random`/`dropped`, `ttl_s`); `drifters` (`id`, `pos`, `state`, `stolen`); `charms` (`id`, `available`, `respawn_s`) |
| Scenario | thêm `player.{invuln_ticks, dash_cd_ticks, pulse_cd_ticks, charm_ticks}`, `shades[].{state, state_ticks_left}`, `drifters`, `charms`, cờ `random_drifters`, `wind_enabled`. Mảng `drifters`, `charms` **thay thế** danh sách mặc định |
| Input | thêm `dash`, `pause` (kích hoạt khi false → true) |
| Sự kiện mới | `dash {}`, `charm_picked {charm_id, charm_ticks}`, `drifter_steal {drifter_id, amount, carried}`, `drifter_drop {drifter_id, amount}`, `night_start {night}`, `paused {}`, `resumed {}` |
| `player_hit` | thêm trường `lost` (khi rơi khỏi đảo) |
| Trạng thái Bóng Mực | đúng tên: `spawning`, `wander`, `chase`, `recoil`, `stunned` |
| Hiệu năng | Headless 1 Đêm đầy đủ (≤ 21.600 tick) ≤ 30 s |

### 6.3 Giữ nguyên từ v1.0
- Mô hình tick: snapshot tick 0 = sau khi dựng scenario, trước input; bước k đọc input tick k → trạng thái k+1; sự kiện ghi `tick = k+1`; `--ticks N` = đúng N bước.
- Dừng khi đủ `--ticks` hoặc game kết thúc → exit 0; lỗi → exit ≠ 0 + stderr; inputs/scenario sai định dạng → exit 2.
- Output JSONL: `snapshot` / `event` / `end` (dòng cuối bắt buộc). Tọa độ làm tròn 3 chữ số thập phân.
- Quy ước vị trí: `player.pos` = chân; `shade.pos` = tâm; `lantern.pos` = chân cột; đom đóm = điểm trên mặt đất.
- Tính tất định theo `--seed`, kể cả id tự sinh.
- Dựng scenario không phát sự kiện, không cộng điểm.
- Sự kiện không tồn tại trong game thì không ghi.

---

## 7. Kế hoạch test headless (tối thiểu)

| Scenario | Đêm | Kiểm tra |
|---|---|---|
| `p2_dash_basic.json` | 1 | AC-01.1–01.3 |
| `p2_dash_hit.json` | 1 | AC-01.4 |
| `p2_drifter_spawn.json` | 2 | AC-02.1 |
| `p2_drifter_chase_threshold.json` | 2 | AC-02.2 |
| `p2_drifter_steal.json` | 2 | AC-02.3, 02.4 |
| `p2_drifter_pulse_drop.json` | 3 | AC-02.5 |
| `p2_steal_then_hit.json` | 2 | AC-02.6, thứ tự tick |
| `p2_charm.json` | 2 | AC-03.1–03.4 |
| `p2_nights.json` (×3) | 1/2/3 | AC-04.1, 04.2 |
| `p2_pause.json` | 1 | AC-05.1, 05.2 |
| `p2_wind.json` | 3 | AC-09.1–09.3 |
| `p2_bounce_pad_n2.json` / `_n3.json` | 2/3 | Đáp trong đảo đích / tầng 2 |
| `p2_fall.json` | 2 | Rơi khỏi cầu → `player_hit` có `lost`, hồi sinh sau 60 tick |
| `p2_perf_full_night.json` | 3 | 21.600 tick ≤ 30 s |
| Regression Phase 1 | 1 | Toàn bộ test ẩn Phase 1 pass với số chuẩn |
| Determinism | 1/2/3 | Chạy 2 lần, `diff` output rỗng |

---

## 8. Yêu cầu phi chức năng
- Chạy trên macOS/Linux sau `build_cmd` (Docker được phép).
- Bản thường ≥ 30 FPS trung bình ở 1280×720.
- Headless không cần cửa sổ, không cần GPU, không khởi tạo audio.
- Nội dung sáng tạo riêng phải tắt ở headless.

---

## 9. Định nghĩa hoàn thành (DoD)
- [ ] Có bằng chứng game chạy đúng các yêu cầu phase (định dạng tự chọn).
- [ ] Mọi test ẩn Phase 1 vẫn đạt với số chuẩn (regression).
- [ ] Tài liệu spec (file này) có acceptance criteria cho từng tính năng §5.
- [ ] AGENTS.md (hoặc tương đương) và skills cập nhật cho phạm vi mới; lịch sử git thể hiện.
- [ ] ≥ 1 scenario headless cho mỗi tính năng mới.
- [ ] ≥ 30 FPS trung bình ở 1280×720.
- [ ] README cập nhật: cách chạy, điều khiển (thêm Lướt, Tạm dừng), cách tính điểm, mục "Sáng tạo của tôi".
- [ ] Gắn tag `phase-2` trên repo public.

---

## 10. Giả định & câu hỏi mở
Ticket chưa nói rõ các điểm dưới đây. Ghi giả định hợp lý để triển khai, và xác nhận lại với giảng viên nếu có thể.

| # | Điểm mơ hồ | Giả định đề xuất |
|---|---|---|
| Q1 | `tuning` chỉ có một `shade_speed`, nhưng Đêm 3 dùng 4.5 m/s | Ghi `4.0` (giá trị chuẩn chung), xử lý 4.5 ở Đêm 3 trong code và ghi chú README |
| Q2 | "Điểm sương ngẫu nhiên" của Gió Lạc chưa được định nghĩa | Dùng tập điểm sinh Bóng Mực của Đêm đó, chọn bằng RNG theo seed |
| Q3 | "Tối đa 2 con" Gió Lạc: tính con đang sống hay tổng cả Đêm? | Tính số con chưa `removed` tại thời điểm sinh |
| Q4 | Thời điểm cơn gió mạnh đầu tiên | Gió bắt đầu tại t = 30, 60, … s (tick 1800k), báo trước từ tick 1680k |
| Q5 | Tốc độ `chase` của Gió Lạc | 7 m/s (theo mô tả "bay nhanh 7 m/s"); `flee` cũng 7 m/s |
| Q6 | Thời gian Bóng Mực ở `spawning` | Tự chọn và ghi vào README; scenario dùng `state_ticks_left` để test |
| Q7 | Lướt có chịu trọng lực trên mặt đất dốc/mép vách không | Lướt chỉ khóa Y khi đang trên không; trên đất vẫn theo địa hình, ra khỏi mép thì rơi sau khi hết lướt |
| Q8 | Đom đóm Đêm 2: 20 con ban đầu trên 24 điểm của 2 đảo | Chọn 20/24 điểm bằng RNG theo seed |
| Q9 | `hit_drop_ratio` khi số lẻ | 0.5 với làm tròn xuống (`floor`) như §3.7 |
