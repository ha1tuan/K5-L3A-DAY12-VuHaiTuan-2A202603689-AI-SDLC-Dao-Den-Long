# PRD-0 · Đảo Đèn Lồng — Tóm tắt yêu cầu (Phase 1)

> Day 12 · AI SDLC Lab · Phase 1 · Tag nộp: `phase-1` · Contract v1.0 · ~60 phút
> Nguyên tắc: **Đúng yêu cầu > phức tạp.** Phần mô tả game cố ý để tổng quát; **Test Contract v1.0 là bắt buộc và chính xác** vì bài được chạy & chấm tự động.

---

## 1. Sản phẩm

Game **3D** tên **Đảo Đèn Lồng**.

- Người chơi điều khiển **Mây** — người giữ đèn nhỏ tuổi trên một hòn đảo giữa biển mây. Sương đen đã nuốt hết ánh sáng của đảo.
- Mây chạy khắp đảo **thu thập đom đóm (đốm sáng)** rồi mang về **thắp lại các Đèn Lồng Lớn**.
- **Bóng Mực** (sinh vật mực đen trong sương) đuổi theo Mây; bị chạm thì **mất máu (flames)**.
- Mây có thể **tỏa sáng (pulse)** để xua Bóng Mực, nhưng việc đó **tốn ánh sáng**. Bóng Mực **sợ đèn**.
- **Thắng**: thắp hết đèn. **Thua**: mất hết máu (hoặc hết thời gian đêm → `dawn`). Có **điểm số**.

## 2. Phạm vi Phase 1

- [ ] Một màn chơi: **Đêm 1 – Đảo Bến**, đảo tròn có **5 Đèn Lồng Lớn** (`L1`…`L5`).
- [ ] Nhân vật đi lại, nhảy, camera 3D.
- [ ] Đom đóm xuất hiện rải rác trên đảo, nhặt được.
- [ ] Nạp ánh sáng vào đèn để thắp đèn.
- [ ] Bóng Mực xuất hiện và đuổi người chơi.
- [ ] Tỏa sáng để xua Bóng Mực.
- [ ] Thắng, thua, điểm số, HUD hiển thị thông tin cần thiết.
- [ ] Chơi lại được sau khi thắng hoặc thua.

## 3. Cảm giác & phong cách

- Không khí **đêm, ấm áp, cổ tích**; đảo **sáng dần lên** khi thắp đèn.
- **Vàng cam ấm** = thứ tốt; **tím đen** = nguy hiểm.
- Đồ họa **đơn giản nhưng đẹp**, không cần chân thực. Mây đội **nón lá treo một chiếc đèn lồng nhỏ**.
- Không bạo lực, không máu me.

**Tự do sáng tạo (khuyến khích)** — nhân vật phụ, loại Bóng Mực/đom đóm, cơ chế nhỏ, sự kiện, âm thanh, hiệu ứng ánh sáng…, với điều kiện:
- Không phá yêu cầu PRD-0 và Test Contract (vd: thực thể thêm nên **tắt khi chạy headless**).
- Ghi rõ trong README (mục “Sáng tạo của tôi”) + bằng chứng phần cũ vẫn đúng.
- **Làm lõi đúng trước, sáng tạo sau**; tiết kiệm token.

## 4. Công nghệ

Tự chọn engine/ngôn ngữ/framework. Phải chạy được trên **macOS hoặc Linux** (nếu dev trên Windows thì cần cách chạy trên macOS/Linux, vd Docker hoặc bản web).

## 5. Bàn giao Phase 1 (git tag `phase-1`, repo public)

1. Game chơi được Đêm 1 từ đầu tới thắng/thua.
2. `README.md`: cài đặt & chạy (**tối đa 3 lệnh**), điều khiển, cách tính điểm.
3. `game.contract.json` + chế độ headless theo Test Contract v1.0.
4. Bằng chứng game chạy đúng yêu cầu + ghi chép ngắn (giả định, nhật ký dùng AI). Định dạng tự chọn.
5. Harness AI đã dùng (`AGENTS.md` hoặc tương đương, skills, hooks…).

## 6. Lưu ý

- Game tốt = **đúng yêu cầu khách hàng**, không phải phức tạp/đẹp nhất.
- Cân nhắc quota token — đốt nhiều không làm bài tốt hơn.
- **Không có bằng chứng thì chưa xong** (“agent bảo chạy rồi” không phải bằng chứng).
- Chỗ PRD mơ hồ: tự giả định hợp lý **và ghi lại**.

---

# Test Contract v1.0 (BẮT BUỘC)

Mọi bài nộp phải có **chế độ headless** (không giao diện) để chấm tự động, bất kể công nghệ.

## A. `game.contract.json` ở gốc repo

```json
{
  "contract_version": "1.0",
  "team": "mssv-ho-ten",
  "build_cmd": "lệnh cài đặt/biên dịch",
  "run_cmd": "lệnh mở game có giao diện",
  "headless_cmd": "lệnh chạy headless (sẽ được nối thêm tham số)",
  "tuning": {
    "player_speed": 0,
    "carry_capacity": 0,
    "lantern_cost": 0,
    "lantern_count_night1": 5,
    "pickup_radius": 0,
    "interact_radius": 0,
    "pulse_cost": 0,
    "pulse_radius": 0,
    "night1_duration_s": 0,
    "flames": 0,
    "invuln_s": 0,
    "hit_drop_ratio": 0,
    "pulse_stun_s": 0,
    "pulse_push_m": 0,
    "pulse_cooldown_s": 0,
    "safe_radius": 0,
    "shade_speed": 0,
    "shade_hit_radius": 0,
    "fall_enabled": false,
    "score": { "per_mote": 0, "per_lantern": 0, "per_stun": 0,
               "per_second_left": 0, "per_flame_left": 0 }
  }
}
```

- `tuning`: điền **đúng các số game đang dùng**. Khái niệm không có → `null` (hoặc `false`) + giải thích trong README. Test sinh tình huống từ các số này → khai sai sẽ trượt test.
- `hit_drop_ratio`: tỉ lệ đom đóm đánh rơi khi bị chạm (0 nếu không rơi). `safe_radius`: bán kính quanh đèn Bóng Mực không vào được. `fall_enabled`: rơi khỏi đảo có bị phạt không. `score.*`: điểm cho mỗi sự kiện.
- Lệnh phải chạy được trên macOS/Linux sau `build_cmd`. Docker được phép.

## B. Tham số headless

```
<headless_cmd> --seed <int> --night 1 [--scenario <file.json>] [--inputs <file.json>]
               --ticks <int> --out <file.jsonl> [--snapshot-every <int, mặc định 10>]
```

- Logic chạy **60 tick/giây cố định** (1 tick = 1/60 s), **không cửa sổ, không GPU**, nhanh nhất có thể.
- Dừng khi đủ `--ticks` hoặc game kết thúc (thắng/thua) → exit code **0**.
- Lỗi → exit code ≠ 0, thông báo ra stderr. File inputs/scenario sai định dạng → exit code **2**.
- Đơn vị mét; **trục Y hướng lên**; mặt đất đảo Y = 0; người chơi xuất phát tại (0, 0, 0).

**Mô hình tick**
- Snapshot tick 0 = trạng thái **sau khi dựng scenario, trước khi áp input**.
- Bước k (k = 0…N−1) đọc input của tick k, tạo trạng thái k+1; sự kiện trong bước đó ghi `tick = k+1`. `--ticks N` chạy **đúng N bước**.
- `time_left_s = thời lượng Đêm − (số bước đã chạy) / 60`.

**Quy ước vị trí**
- `player.pos` = **chân** nhân vật; `shade.pos` = **tâm** Bóng Mực; `lantern.pos` = chân cột đèn; đom đóm = điểm trên **mặt đất** (độ cao lơ lửng chỉ là hiển thị).
- Mọi khoảng cách trong `tuning` đo giữa các điểm này **trên mặt phẳng ngang XZ**, không cộng kích thước nhân vật. “Trong bán kính r” nghĩa là khoảng cách **≤ r**.

## C. File inputs

```json
{
  "frames": [
    { "tick": 0,   "move": [0, 1], "cam_yaw_deg": 0 },
    { "tick": 120, "move": [0, 0], "interact": true },
    { "tick": 121, "interact": false },
    { "tick": 200, "pulse": true },
    { "tick": 201, "pulse": false }
  ]
}
```

- Mặc định trước frame đầu: `move [0,0]`, `cam_yaw_deg 0`, mọi nút `false`.
- Mỗi frame chỉ đổi các trường có mặt; trường vắng mặt **giữ giá trị cũ**.
- `tick` các frame **tăng nghiêm ngặt** (không trùng, không giảm).
- `move: [x, z]`, mỗi thành phần ∈ [−1, 1]. Với θ = `cam_yaw_deg` (đổi sang radian): `x' = x·cosθ + z·sinθ`, `z' = −x·sinθ + z·cosθ` (θ = 0 thì x là +X, z là +Z). Vector dài hơn 1 phải chuẩn hóa về độ dài 1.
- `jump`, `interact`, `pulse` (và `dash` nếu có): boolean, kích hoạt khi chuyển **false → true** (cạnh lên).
- Không có file inputs = người chơi đứng yên.

## D. File scenario (dựng tình huống test)

```json
{
  "player": { "pos": [0, 0, 0], "carried": 0, "flames": 3 },
  "random_motes": false,
  "random_shades": false,
  "motes": [[0, 0, 5]],
  "shades": [{ "pos": [10, 0, 0] }],
  "lanterns": [{ "id": "L1", "pos": [0, 0, 25], "deposited": 0 }],
  "time_left_s": 300
}
```

- `random_motes: false`: không tự sinh đom đóm, chỉ có những con được liệt kê.
- `random_shades: false`: không tự sinh Bóng Mực, chỉ có những con được liệt kê (ở trạng thái hoạt động bình thường ngay lập tức).
- `lanterns`: **cập nhật theo id** (`L1`…`L5`); đèn không nhắc tới giữ nguyên; có `pos` thì đổi vị trí; có thể đặt `lit: true`.
- `motes`, `shades`: **thay thế** danh sách ban đầu; mảng rỗng = không có con nào. `shades[]` có thể kèm `id` để test tham chiếu.
- Trường không có → dùng mặc định của game.
- Dựng scenario **không** phát sự kiện và **không** cộng điểm (vd đèn đặt sẵn `lit: true` không được cộng điểm thắp đèn).

## E. Output JSONL (mỗi dòng 1 object JSON, 3 loại)

**Snapshot** — mỗi `--snapshot-every` tick, bắt đầu từ tick 0:

```json
{"type":"snapshot","tick":120,"sim_tick":120,"state":"playing","time_left_s":298.0,"score":20,
 "player":{"pos":[0.0,0.0,12.0],"flames":3,"carried":2},
 "lanterns":[{"id":"L1","pos":[0,0,25],"lit":false,"deposited":0}],
 "shades":[{"id":"S1","pos":[30.1,1.0,2.0],"state":"chase"}],
 "motes_active":19}
```

**Event** — ghi ngay khi xảy ra, vd: `{"type":"event","tick":131,"name":"mote_picked","data":{"carried":3}}`

| name | data |
|---|---|
| `mote_picked` | `{"carried": n}` |
| `deposit` | `{"lantern_id": "L1", "amount": n, "deposited": n}` |
| `lantern_lit` | `{"lantern_id": "L1"}` |
| `pulse` | `{"stunned_ids": ["S1"]}` |
| `player_hit` | `{"by": "shade" \| "fall", "flames": n, "dropped": n}` |
| `shade_spawned` | `{"id": "S3"}` |
| `game_over` | `{"result": "won" \| "lost", "reason": "all_lit" \| "dawn" \| "no_flames"}` |

**End** — dòng cuối cùng, bắt buộc: `{"type":"end","ticks":4800,"state":"won","score":1730}`

**Quy tắc output**
- `state` ∈ `playing`, `won`, `lost`. Trạng thái Bóng Mực tối thiểu phải có `stunned`; các trạng thái khác tự đặt tên.
- Tọa độ làm tròn **3 chữ số thập phân**.
- **Tính tất định**: cùng `--seed` + scenario + inputs → output **giống hệt** giữa 2 lần chạy, kể cả id tự sinh (không cần cùng chuỗi ngẫu nhiên với bài khác).
- `sim_tick` = số bước gameplay đã chạy (Phase 1 bằng `tick`).
- Mảng `motes` (mỗi phần tử `id`, `pos`) trong snapshot là **khuyến nghị** ở v1.0.
- Sự kiện không tồn tại trong game (vd không có rơi khỏi đảo) thì không ghi.

---

## Checklist nộp nhanh

- [ ] Chơi được Đêm 1 tới thắng/thua, chơi lại được
- [ ] README: ≤ 3 lệnh cài/chạy, điều khiển, cách tính điểm, mục “Sáng tạo của tôi”, giải thích các `tuning` = `null`
- [ ] `game.contract.json` ở gốc repo, `tuning` khớp số thật trong game
- [ ] Headless: đúng tham số, 60 tick/s, exit code 0 / 2 / ≠0, JSONL có snapshot tick 0 + events + dòng `end`
- [ ] Chạy 2 lần cùng seed → output giống hệt
- [ ] Bằng chứng chạy đúng + ghi chép giả định & nhật ký dùng AI
- [ ] Harness AI (`AGENTS.md`, skills, hooks…)
- [ ] Gắn tag `phase-1` trên repo public
