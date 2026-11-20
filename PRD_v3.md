# PRD v3 — Đảo Đèn Lồng · TICKET-03 "Đèn cạn dầu" (Phase 3)

| Mục | Giá trị |
|---|---|
| Loại | **Change Request** — thay đổi luật cốt lõi |
| Ưu tiên | Rất cao |
| Tag nộp | `phase-3` |
| Test Contract | **v1.2** (thay cho v1.1 của Ticket-02) |
| Kế thừa | PRD-0 (Phase 1), Ticket-02 (Phase 2) — mọi luật không được nhắc tới ở đây giữ nguyên |

---

## 1. Bối cảnh & vấn đề

Playtest cho thấy người chơi giỏi thắp hết đèn trong khoảng 2 phút rồi Đêm kết thúc → cuối Đêm thiếu căng thẳng.

**Quyết định thiết kế:** đèn đã thắp **vẫn có thể tắt** (cạn dầu). Mục tiêu chuyển từ *"thắp hết đèn"* sang *"giữ đảo sáng tới bình minh"*.

## 2. Mục tiêu & chỉ số thành công

- Người chơi phải quản lý đèn suốt Đêm, không còn thắng sớm.
- Áp lực tăng dần về cuối Đêm (đèn hao dầu, Bóng Mực săn đèn yếu).
- Đầu ra headless khớp Test Contract v1.2; mọi test ẩn Phase 1–2 **không bị thay thế** vẫn đạt.

## 3. Phạm vi

**Trong phạm vi:** nhiên liệu đèn, hành vi `drain` của Bóng Mực, luật thắng/thua mới, sức chứa tăng dần, công thức điểm mới, chế độ mù màu, Test Contract v1.2, ADR + changelog.

**Sáng tạo riêng:** phần sáng tạo từ các phase trước được giữ và được thêm (kể cả nhân vật/kẻ địch mới), **miễn là** luật, số liệu, Test Contract không đổi và đầu ra headless không đổi. Ý sáng tạo nào xung đột với luật mới → phải chỉnh theo luật mới.

## 4. Các luật bị THAY THẾ

| # | Luật cũ | Luật mới |
|---|---|---|
| R1 | Đèn đã sáng không nhận thêm đom đóm | Đèn sáng có nhiên liệu, có thể châm dầu (§5.1) |
| R2 | Bóng Mực không bao giờ vào vùng an toàn | Đèn `fuel < 30` mất vùng an toàn; Bóng Mực hút dầu (§5.2) |
| R3 | Thắng ngay khi tất cả đèn sáng | Thắng khi sống tới bình minh với đủ số đèn sáng (§5.3) |
| R4 | Công thức điểm cũ | Công thức điểm mới, bỏ thưởng thời gian (§5.5) |

---

## 5. Yêu cầu chức năng

### 5.1 Nhiên liệu đèn — [THAY THẾ R1]

| Quy tắc | Giá trị |
|---|---|
| Nhiên liệu tối đa | `100` |
| Khi vừa thắp (lần đầu hoặc thắp lại) | `fuel = 100` |
| Hao hụt khi đang sáng | 1.0 đơn vị/giây = **1/60 mỗi tick** |
| Châm dầu | Bấm Tương tác ở đèn đang sáng: `used = min(đang_mang, ceil((100 - fuel) / 10))`; `fuel = min(100, fuel + 10 × used)`; trừ `used` đom đóm |
| Đèn đầy dầu | `used = 0` → **không** được chọn khi tương tác, không phát sự kiện, không cộng điểm |
| Chọn đèn khi tương tác | Chỉ xét đèn **nhận được** (chưa sáng, hoặc sáng nhưng chưa đầy dầu); chọn đèn gần nhất, bằng nhau thì `id` nhỏ hơn |
| Độ chính xác | Nên lưu dầu theo đơn vị nguyên **1/60** (tránh sai số số thực); chỉ làm tròn khi xuất ra |
| Hết dầu (`fuel ≤ 0`) | Đèn chuyển sang **tắt**, `deposited = 0`, phát `lantern_out`, ánh sáng môi trường giảm theo; đặt `ever_lit = true` |
| Thắp lại | Đèn đã từng sáng (`ever_lit`) chỉ cần **5** đom đóm; đèn chưa từng sáng vẫn cần **10** |
| Hiển thị | Thanh dầu trên đèn đang sáng; khi `fuel < 30` đèn và thanh dầu **nhấp nháy chậm 1 Hz** |

**Gợi ý cài đặt:** lưu `fuel_ticks` kiểu int (`max = 6000`), hao `−1`/tick, mỗi Bóng Mực hút `−5`/tick, mỗi đom đóm châm `+600`. Xuất ra: `fuel = round(fuel_ticks / 60, 1)`.

**Ví dụ:** đèn `fuel = 37.5`, Mây mang 4 đom đóm → `ceil(62.5/10) = 7`, `used = min(4, 7) = 4`, `fuel = 77.5`, còn 0 đom đóm, +20 điểm.

### 5.2 Bóng Mực hút dầu — [THAY THẾ R2]

- Đèn có `fuel < 30` **mất vùng an toàn**. `fuel = 30` vẫn còn vùng an toàn.
- **Chỉ** Bóng Mực ở trạng thái `wander` mới chọn đèn yếu: đi tới **đèn sáng có `fuel < 30` gần nhất** (bằng nhau → `id` nhỏ hơn). Không có → đi về đèn tắt gần nhất như trước. Bóng đang `chase` không đổi mục tiêu.
- Khi cách đèn mục tiêu **≤ 2 m (mặt phẳng XZ)** → trạng thái mới **`drain`**: đứng yên, hút **5 fuel/giây liên tục** (5/60 mỗi tick). Nhiều con cộng dồn. Đèn vẫn tự hao 1/giây.
- Chuyển trạng thái từ `drain`:
  - → `chase` nếu Mây vào trong 6 m;
  - → `stunned` nếu trúng Tỏa Sáng;
  - → `wander` nếu đèn tắt, nếu `fuel` được châm lên ≥ 30, hoặc nếu cách đèn > 2 m.
- Hết choáng → về `wander`.
- Khi đèn được châm lên **≥ 30** lúc có Bóng Mực trong vùng 6 m: các con đó bị **đẩy ra mép vùng** trong tối đa **30 tick** và **không gây sát thương** trong lúc đó (giống khi đèn vừa thắp).

```
wander ──(đèn sáng fuel<30 gần nhất, ≤2m)──▶ drain
drain ──(Mây ≤6m)──▶ chase
drain ──(trúng Tỏa Sáng)──▶ stunned ──(hết choáng)──▶ wander
drain ──(đèn tắt | fuel≥30 | cách đèn >2m)──▶ wander
```

### 5.3 Luật thắng mới — [THAY THẾ R3]

| Quy tắc | Giá trị mới |
|---|---|
| Thời gian Đêm 1 / 2 / 3 | **240 / 270 / 300 s** |
| Thắng | Mây **còn sống khi hết giờ** (bình minh) **và** số đèn đang sáng tại tick cuối ≥ `ceil(0.6 × tổng_đèn)` → Đêm 1: 3/5, Đêm 2: 4/6, Đêm 3: 5/7 |
| Không còn thắng sớm | Thắp đủ đèn **không** kết thúc Đêm |
| Thua | Hết Ngọn Lửa (ngay lập tức, kể cả ở tick cuối) **hoặc** hết giờ mà số đèn sáng dưới ngưỡng |
| Lý do kết thúc | Thắng: `dawn_survived` · Thua: `dawn` hoặc `no_flames` |

**Thứ tự xử lý trong tick** (theo Ticket-02, bổ sung):

1. *(như Ticket-02)*
2. Trừ dầu (hao + bị hút) → ngay sau bước 2, đèn có `fuel ≤ 0` **tắt**.
3. … *(các bước còn lại như Ticket-02)*
4. **Xét thắng/thua** diễn ra **sau mọi cập nhật** của tick, kể cả tick bình minh. Hết Ngọn Lửa luôn ưu tiên → thua `no_flames` trước.

### 5.4 Sức chứa tăng dần (mới)

- `sức_chứa = 10 + 2 × successful_lights`, tối đa **20**.
- `successful_lights` = số lần thắp thành công trong Đêm (tính cả thắp lại; đèn đặt sẵn bằng scenario **không** tính).
- Đặt lại về 0 ở đầu mỗi Đêm.
- HUD hiển thị `đang_mang / sức_chứa`.

### 5.5 Điểm mới — [THAY THẾ R4]

| Sự kiện | Điểm |
|---|---|
| Mỗi đom đóm nạp vào đèn (thắp mới, thắp lại hoặc châm dầu) | +5 |
| Thắp lần đầu | +100 |
| Thắp lại | +40 |
| Bóng Mực trúng Tỏa Sáng | +5 mỗi con; **tổng +15** nếu ngay trước đó nó đang `drain` |
| Bình minh (chỉ khi thắng): mỗi đèn đang sáng | +50 + `floor(fuel)` |
| Bình minh (chỉ khi thắng): mỗi Ngọn Lửa còn lại | +50 |
| Thưởng thời gian | **Bỏ** |
| Tổng điểm game, chơi lại | Không đổi so với Ticket-02 |

### 5.6 Chế độ mù màu (mới)

Cài đặt **"Bảng màu dễ phân biệt"** (được lưu lại):

- Viền và mắt Bóng Mực: `#7A3CFF` → `#00B3FF`.
- Màu cảnh báo UI: `#FF5A5F` → `#FFFFFF`, kèm biểu tượng ⚠.
- Đèn tắt và đèn sáng phân biệt được **không cần màu**: đèn tắt bị xẹp 20% và giấy có vết rách; đèn sắp hết dầu nhấp nháy.

---

## 6. Test Contract v1.2

**Phiên bản:** `contract_version: "1.2"`

**`tuning` thêm:**

```json
{
  "fuel_max": 100,
  "fuel_decay_per_s": 1.0,
  "fuel_per_mote": 10,
  "relight_cost": 5,
  "win_ratio": 0.6,
  "drain_per_s": 5,
  "low_fuel_threshold": 30,
  "capacity_max": 20,
  "night1_duration_s": 240,
  "night2_duration_s": 270,
  "night3_duration_s": 300
}
```

**Snapshot:**
- Mỗi đèn thêm `fuel` (số thực, 1 chữ số thập phân; đèn tắt có `fuel: 0`), `ever_lit`, `relit_count`.
- `player` thêm `capacity`.
- Bóng Mực có thêm trạng thái `drain`.

**Scenario (đầu vào):**
- Mỗi đèn được đặt `lit`, `fuel`, `ever_lit`.
- `player` thêm `successful_lights`.
- `shades[]` thêm `target_lantern_id`.
- Đèn đặt `lit: true` mà không có `fuel` → mặc định `fuel: 100`.

**Sự kiện:**

| Sự kiện | Payload | Ghi chú |
|---|---|---|
| `refuel` *(mới)* | `{lantern_id, amount, fuel}` | |
| `lantern_out` *(mới)* | `{lantern_id}` | |
| `fuel_drain` *(mới)* | `{lantern_id, shade_id, fuel}` | Ghi **mỗi 60 tick** khi đang hút |
| `lantern_lit` | thêm `relight: true \| false` | |
| `game_over.reason` | thêm `dawn_survived` | `all_lit` **không còn dùng** |

---

## 7. Tiêu chí nghiệm thu (acceptance criteria)

| ID | Given | When | Then |
|---|---|---|---|
| AC-01 | Đèn vừa thắp | — | `fuel = 100`, `lantern_lit.relight = false` (lần đầu) |
| AC-02 | Đèn sáng `fuel = 100`, không Bóng Mực | 60 tick | `fuel = 99.0` |
| AC-03 | Đèn `fuel = 37.5`, mang 4 | Tương tác | `refuel {amount: 4, fuel: 77.5}`, mang 0, +20 điểm |
| AC-04 | Đèn `fuel = 95`, mang 3 | Tương tác | `used = 1`, `fuel = 100`, mang 2 |
| AC-05 | Đèn sáng `fuel = 100` gần nhất + đèn tắt xa hơn | Tương tác | Đèn đầy bị bỏ qua, tương tác áp vào đèn tắt |
| AC-06 | Đèn `fuel = 0.01` | 1 tick | Đèn tắt ở bước 2, `lantern_out`, `deposited = 0`, `ever_lit = true` |
| AC-07 | Đèn `ever_lit`, đang tắt | Nạp 5 đom đóm | Thắp lại, `fuel = 100`, `relight = true`, `relit_count +1`, +40 +25 điểm |
| AC-08 | Đèn `fuel = 30` | Bóng Mực `wander` | Đèn vẫn có vùng an toàn, không bị chọn làm mục tiêu hút |
| AC-09 | 2 Bóng Mực `drain` cùng 1 đèn | 60 tick | `fuel` giảm 11.0 (1 + 5 + 5) |
| AC-10 | Bóng `drain`, đèn được châm lên ≥ 30, Bóng trong 6 m | — | Bóng → `wander`, bị đẩy ra mép vùng ≤ 30 tick, không gây sát thương |
| AC-11 | Bóng `drain` | Trúng Tỏa Sáng | → `stunned`, +15 điểm |
| AC-12 | Đêm 1, thắp đủ 5 đèn ở giây 100 | — | Đêm **không** kết thúc |
| AC-13 | Tick cuối Đêm 2, 4/6 đèn sáng, còn Ngọn Lửa | Bình minh | Thắng, `dawn_survived` |
| AC-14 | Tick cuối Đêm 3, 4/7 đèn sáng | Bình minh | Thua, `dawn` |
| AC-15 | Tick cuối, đủ đèn nhưng mất Ngọn Lửa cuối ở chính tick đó | — | Thua, `no_flames` |
| AC-16 | `successful_lights = 3` | — | `capacity = 16`; `= 6` → `20` (trần) |
| AC-17 | Scenario đặt đèn `lit: true`, không có `fuel` | Load | `fuel = 100`; không tính vào `successful_lights` |
| AC-18 | Bật "Bảng màu dễ phân biệt", tải lại game | — | Cài đặt còn giữ; màu Bóng Mực `#00B3FF` |

---

## 8. Yêu cầu phi chức năng

- Logic chạy 60 tick/giây, đơn vị mét–giây, trục Y hướng lên (như Ticket-02).
- Tính toán dầu tất định (deterministic) — dùng số nguyên 1/60, chỉ làm tròn khi xuất.
- Đầu ra headless chỉ thay đổi theo đúng Contract v1.2; phần sáng tạo riêng phải tắt khi chạy headless nếu ảnh hưởng đầu ra.

## 9. Định nghĩa hoàn thành (DoD)

- [ ] Có bằng chứng game chạy đúng các yêu cầu của phase (định dạng tự chọn).
- [ ] Có ít nhất 1 ghi chú quyết định thiết kế (ADR hoặc tương đương) mô tả cách thay đổi mô hình trạng thái đèn và luật thắng.
- [ ] Test cũ bị luật mới làm sai được **cập nhật hoặc xóa có ghi lý do** — không skip âm thầm.
- [ ] Có changelog liệt kê các breaking changes của Phase 3.
- [ ] Mọi test ẩn Phase 1–2 không bị thay thế vẫn đạt.

## 10. Breaking changes (khung cho changelog)

- `game_over.reason`: bỏ `all_lit`, thêm `dawn_survived`.
- Đèn sáng có thể tắt lại; snapshot đèn thêm `fuel`, `ever_lit`, `relit_count`.
- Bóng Mực có trạng thái mới `drain`, được vào vùng đèn yếu.
- Thời lượng Đêm đổi thành 240/270/300 s; thắp đủ đèn không kết thúc Đêm.
- Công thức điểm thay toàn bộ; bỏ thưởng thời gian.
- Sức chứa đom đóm không còn cố định.
- `contract_version` → `"1.2"`.

## 11. Câu hỏi mở (cần xác nhận với giảng viên)

1. Đom đóm đang mang vượt sức chứa khi sang Đêm mới (sức chứa reset về 10) xử lý thế nào — giữ nguyên hay cắt bớt?
2. `fuel_drain` mỗi 60 tick: đếm từ lúc con Bóng đó vào `drain`, hay theo tick toàn cục?
3. Làm tròn `fuel` khi xuất 1 chữ số thập phân: làm tròn thường hay cắt bớt?
4. Khi **thắp lại** một đèn có Bóng Mực trong vùng 6 m: áp dụng luật đẩy ra 30 tick của Ticket-02 giống như thắp lần đầu? (Giả định: có.)
5. Bóng Mực ở `wander` đang đi tới đèn tắt, giữa chừng xuất hiện đèn sáng `fuel < 30`: có đổi mục tiêu ngay không, hay chỉ chọn lại khi đến nơi?
