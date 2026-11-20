# Changelog

Thay đổi theo từng phase. Mỗi phase là một tag (`phase-N`). Mục **Breaking** liệt kê thay đổi làm output headless hoặc luật chơi khác phase trước.

## Phase 3 — Đèn cạn dầu (Test Contract v1.2) · _đang làm_

Nguồn: `PRD_v3.md`. Quyết định: `docs/adr/0003-lantern-fuel-and-dawn-win.md`. Giả định: A32–A45 trong `docs/NOTES.md`.

### Breaking

- `contract_version` → `"1.2"`.
- `game_over.reason`: bỏ `all_lit`, thêm `dawn_survived`. Thắp đủ đèn **không** kết thúc Đêm; thắng chỉ xét ở bình minh khi số đèn đang sáng ≥ `ceil(0.6 × tổng)` (3/5, 4/6, 5/7).
- Thời lượng Đêm 1/2/3: 300/330/360 s → **240/270/300 s**.
- Đèn đã sáng có dầu, cạn dầu thì tắt lại (`lantern_out`, `deposited = 0`). Thắp lại cần 5 đom đóm. Đèn sáng nhận châm dầu (`refuel`).
- Snapshot đèn thêm `fuel` (1 chữ số), `ever_lit`, `relit_count`; `player` thêm `capacity`.
- Bóng Mực có trạng thái mới `drain`, được vào vùng của đèn yếu (`fuel < 30`). Sự kiện mới `fuel_drain`.
- `lantern_lit` thêm `relight: true | false`.
- Công thức điểm thay toàn bộ: +5 mỗi đom đóm nạp/châm, +100 thắp lần đầu, +40 thắp lại, +5 hoặc +15 (Bóng đang `drain`) mỗi lần Tỏa Sáng trúng, bình minh +50 + `floor(fuel)` mỗi đèn sáng và +50 mỗi Ngọn Lửa. **Bỏ** thưởng thời gian.
- Sức chứa đom đóm không còn cố định: `min(20, 10 + 2 × successful_lights)`.
- Tuning thêm `fuel_max`, `fuel_decay_per_s`, `fuel_per_mote`, `relight_cost`, `win_ratio`, `drain_per_s`, `low_fuel_threshold`, `capacity_max`.
- Scenario thêm `lit`/`fuel`/`ever_lit` cho đèn, `player.successful_lights`, `shades[].target_lantern_id`.

### Thêm

- Cài đặt "Bảng màu dễ phân biệt" (lưu lại).

## Phase 2 — Ba hòn đảo (Test Contract v1.1) · tag `phase-2`

Nguồn: `PRD_v2.md`. Quyết định: `docs/adr/0002-tick-step-order-v1-1.md`.

### Breaking

- Bộ số chuẩn §6.1 thay số tự chọn của Phase 1 (sức chứa 10, giá đèn 10, Tỏa Sáng 3 / 5 m / hồi 3 s, …).
- Điểm tính lúc nạp (+10 mỗi đom đóm) thay vì lúc nhặt; `per_stun` 5.
- Thứ tự tick theo PRD v2 §3.9; hết Ngọn Lửa luôn thua kể cả cùng tick thắp đèn cuối.
- `fall_enabled: true`: mép đảo không còn tường, rơi xuống phát `player_hit {by: "fall", lost}`.
- `--night 1|2|3`; inputs thêm `dash`, `pause`; snapshot thêm `night`, `wind`, trường mới của `player`, `motes`, `drifters`, `charms`; trạng thái `paused`.
- Sự kiện mới `night_start`, `dash`, `charm_picked`, `drifter_steal`, `drifter_drop`, `paused`, `resumed`.

### Thêm

- Đêm 2 (Đảo Cau), Đêm 3 (Đảo Chuông), Lướt, Tạm dừng, Gió Lạc, Bùa Gió, gió mạnh.
- Client WebGL cho 3 Đêm, Chuỗi 3 Đêm, lời Ông Đăng, HUD đầy đủ, âm thanh WebAudio, menu Tạm dừng và Cài đặt.

## Phase 1 — Đêm 1: Đảo Bến (Test Contract v1.0) · tag `phase-1`

Nguồn: `PRD.md`. Bản đầu tiên: sim tất định, headless, client Three.js cho Đêm 1.
