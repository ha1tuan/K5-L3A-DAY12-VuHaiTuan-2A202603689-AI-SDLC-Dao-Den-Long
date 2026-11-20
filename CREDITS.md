# Credits

## Asset

Game không dùng asset ngoài: không có file ảnh, mô hình 3D hay âm thanh nào tải về.

- **Hình 3D** (đảo, cây, đèn lồng, Mây, Bóng Mực, Gió Lạc, đom đóm, bùa) dựng bằng khối hình học của Three.js ngay trong code (`src/client/scene.ts`).
- **Âm thanh** (nhạc ru ngũ cung, tiếng nạp đèn, châm dầu, đèn tắt, tỏa sáng, gió, đếm ngược) tổng hợp lúc chạy bằng WebAudio (`src/client/audio.ts`), không có file âm thanh.
- **Ảnh chụp** trong `docs/evidence/` do chính game chụp ra.

## Thư viện

| Thư viện | Phiên bản | Giấy phép | Dùng cho |
|---|---|---|---|
| [three](https://threejs.org) | 0.187.0 | MIT | Hiển thị 3D |
| [Vite](https://vite.dev) | 8.3.8 | MIT | Build và chạy bản web |
| [esbuild](https://esbuild.github.io) | 0.28.2 | MIT | Đóng gói bản headless |
| [Vitest](https://vitest.dev) | 5.1.1 | MIT | Test |
| [TypeScript](https://www.typescriptlang.org) | 7.0.2 | Apache-2.0 | Ngôn ngữ |
| [playwright-core](https://playwright.dev) | 1.49.1 | Apache-2.0 | Điều khiển Chrome cho benchmark và ảnh chụp kiểm tra giao diện (chỉ dùng khi phát triển, không nằm trong bản chơi) |

## Phông chữ

[Baloo 2](https://fonts.google.com/specimen/Baloo+2) (Ek Type), giấy phép SIL Open Font License 1.1, tải từ Google Fonts. Khi không có mạng, game dùng phông hệ thống.

## Công cụ AI

Code, test, tài liệu, thiết kế giao diện, hình khối 3D và âm thanh tổng hợp được làm cùng **Claude Code** (Anthropic, model Claude Opus). Lời thoại của Ông Đăng và chữ trong game cũng do AI soạn rồi được chỉnh. Không dùng công cụ AI tạo ảnh hay tạo nhạc. Chi tiết từng phase xem nhật ký dùng AI trong [docs/NOTES.md](docs/NOTES.md) và [docs/RETRO.md](docs/RETRO.md). Nhân vật và bối cảnh là bản gốc của lab.

## Giấy phép

Mã nguồn phát hành theo giấy phép MIT, xem [LICENSE](LICENSE).
