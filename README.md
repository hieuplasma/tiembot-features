# Tiệm Bot: code feature

Code các feature của bot khách, tách khỏi repo nền tảng [`hieuplasma/tiembot`](https://github.com/hieuplasma/tiembot).
Thêm hoặc sửa feature cho khách chỉ cần commit vào repo này rồi deploy riêng, không đụng tới code nền tảng.

## Đặt ở đâu

Repo này phải được clone vào thư mục `features/` **bên trong** repo `tiembot`. Code feature import `@tiembot/runtime` và
`grammy` từ `node_modules` của `tiembot`.

```bash
cd tiembot
git clone https://github.com/hieuplasma/tiembot-features.git features
```

Trên server, repo nằm ở `/home/bots/tiembot/features` (bước `clone` của `deploy/server-setup.sh`).

## Cấu trúc

```
core/<key>/index.ts          feature dùng chung, bot nào cũng thêm được (basic, giavang, notes...)
bots/<slug>/<key>/index.ts   feature riêng của một bot; trùng key với core thì bản riêng được dùng
```

- `<key>`: chữ thường, số, gạch dưới (vd `cannang`). Tên thư mục phải trùng `key` trong `defineFeature`.
- Mỗi feature `export default defineFeature({...})`. Cách viết xem `docs/08-van-hanh-bot.md` mục "Feature" của
  repo `tiembot`, và mẫu `core/notes/index.ts`.
- Thư viện dùng chung giữa các feature thì đặt ở `core/_lib/...`. Thư mục bắt đầu bằng `_` không phải feature.

## Kiểm tra trước khi commit

Chạy từ gốc repo `tiembot`:

```bash
yarn workspace @tiembot/runtime typecheck   # gồm cả features/
yarn lint
yarn bot:dev <slug>                         # chạy thử bot trên máy dev
```

## Deploy

1. Commit và push repo này (nhánh `main`).
2. Từ gốc repo `tiembot`, chạy `./deploy-features.sh`. Muốn xem trước thì thêm `--dry-run`.
   - hieutm: chỉ cập nhật code. Console thấy ngay feature key mới, không restart api.
   - vhhl: đổi `bots/<slug>/` thì restart bot đó; đổi `core/<key>/` thì restart các bot đang dùng feature đó.
     Bot nào không có heartbeat trong 45 giây thì tự quay lại bản trước.
3. Lỗi thì chạy `./deploy-features.sh --rollback`.

## Với yêu cầu của khách

1. Admin bấm "Bắt đầu làm" trên console.
2. Viết feature ở `bots/<slug>/<key>/` (riêng khách) hoặc `core/<key>/` (dùng lại được), commit, push, deploy.
3. Bấm "Đưa lên test", chọn key. Khách test xong thì bấm "Kích hoạt", ô phiên bản ghi commit của repo này.
