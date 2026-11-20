# Kịch bản quay video demo (dưới 5 phút)

Quay màn hình 1280×720 trở lên (OBS hoặc công cụ quay màn hình của hệ điều hành), xuất `.mp4` dưới 100 MB, đặt ở `docs/demo/demo.mp4` hoặc đính vào Release `v1.0.0`, rồi thay link ở đầu README.

| Thời điểm | Nội dung | Lệnh / thao tác |
|---|---|---|
| 0:00–0:20 | Giới thiệu: repo, README, `game.contract.json` v1.3 | mở README trên GitHub |
| 0:20–0:45 | Cài từ clone sạch, đúng 3 lệnh | `git clone … && cd …`, `npm ci && npm run build`, `npm start` |
| 0:45–2:15 | **Chơi trực tiếp** Đêm 1: nghe Ông Đăng, đi bằng chuột và phím mũi tên, nhặt đom đóm, thắp 1–2 đèn, châm dầu, tỏa sáng xua Bóng Mực, thấy phụ đề "Bóng Mực xuất hiện" và mũi tên đỏ | chơi |
| 2:15–2:45 | Menu Tạm dừng: đổi phím (thử gán trùng để thấy cảnh báo, rồi Khôi phục mặc định), bật Chữ lớn, Giảm chuyển động, Bảng màu dễ phân biệt | Esc |
| 2:45–3:10 | Thua hoặc mở `?demo=end`, nhập tên lưu điểm, mở Bảng xếp hạng từ menu, xuất JSON | `npm start -- --export-leaderboard out.json` |
| 3:10–3:40 | Test và kiểm chứng contract | `npm test`, `npm run verify` (70/70) |
| 3:40–4:20 | Benchmark và soak | `npm run bench -- --seed 42 --duration 30 --out bench.json` (cắt bớt đoạn chờ), `npm run soak -- --seed 7 --nights 10 --out soak.json` |
| 4:20–4:50 | Bằng chứng và lịch sử: `docs/evidence/phase-4/`, tag `phase-1`…`phase-4`, Release `v1.0.0` | GitHub |
