# Hướng Dẫn Seed Admin Accounts Trên Production (Render.com)

## 📋 Tổng Quan

Có 2 cách để seed admin accounts trên Render.com:
1. **Cách 1**: Dùng Render Shell (Nhanh - Khuyến nghị cho lần đầu)
2. **Cách 2**: Dùng API Endpoint (An toàn - Có thể gọi từ bất kỳ đâu)

---

## 🚀 Cách 1: Dùng Render Shell (Khuyến nghị)

### Bước 1: Truy cập Render Dashboard
1. Đăng nhập: https://dashboard.render.com
2. Chọn service **booking-backend**

### Bước 2: Mở Shell
1. Click tab **Shell** (góc phải trên, cạnh "Events")
2. Đợi shell khởi động (~10-20 giây)
3. Bạn sẽ thấy terminal prompt: `~ $`

### Bước 3: Chạy Seed Script
```bash
node scripts/seedAdmins.js
```

### Bước 4: Xem Kết Quả
Script sẽ hiển thị:
```
✅ Connected to MongoDB
✅ Cleared existing admin accounts
✅ Created super_admin: superadmin@booking.com
✅ Created admin: admin1@booking.com
✅ Created admin: admin2@booking.com

✅ Successfully seeded admin accounts!

Admin login credentials:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Super Admin (super_admin):
  Email: superadmin@booking.com
  Password: SuperAdmin@123

Admin User 1 (admin):
  Email: admin1@booking.com
  Password: Admin@123

Admin User 2 (admin):
  Email: admin2@booking.com
  Password: Admin@123

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### ⚠️ Lưu Ý:
- **LƯU LẠI CREDENTIALS** này ngay!
- Shell session sẽ timeout sau 5-10 phút không dùng
- Có thể chạy script nhiều lần, mỗi lần sẽ xóa admin cũ và tạo mới

---

## 🔐 Cách 2: Dùng API Endpoint (An toàn hơn)

Cách này cho phép seed admin qua HTTP request, có bảo mật bằng secret key.

### Bước 1: Push Code Mới Lên Git

```bash
git add .
git commit -m "Add seed API endpoint"
git push
```

Render sẽ tự động redeploy (~2-3 phút).

### Bước 2: Lấy SEED_SECRET từ Render

1. Vào **Render Dashboard** → **booking-backend**
2. Tab **Environment**
3. Tìm `SEED_SECRET` → Click **Copy** (Render đã tự động generate)
4. Lưu lại secret này, ví dụ: `a8f3c9d2e4b7f1a6c3e8d9f2b5a1c7e4`

### Bước 3: Gọi API Seed

**Option A: Dùng curl**
```bash
curl -X POST "https://your-backend.onrender.com/api/seed/admins?secret=a8f3c9d2e4b7f1a6c3e8d9f2b5a1c7e4"
```

**Option B: Dùng Postman**
```
Method: POST
URL: https://your-backend.onrender.com/api/seed/admins
Query Params:
  - secret: a8f3c9d2e4b7f1a6c3e8d9f2b5a1c7e4
```

**Option C: Dùng browser**
Mở browser và paste URL:
```
https://your-backend.onrender.com/api/seed/admins?secret=a8f3c9d2e4b7f1a6c3e8d9f2b5a1c7e4
```

### Bước 4: Xem Response

**Success Response (201)**:
```json
{
  "success": true,
  "message": "Successfully seeded 3 admin accounts",
  "admins": [
    {
      "name": "Super Admin",
      "email": "superadmin@booking.com",
      "role": "super_admin",
      "originalPassword": "SuperAdmin@123"
    },
    {
      "name": "Admin User 1",
      "email": "admin1@booking.com",
      "role": "admin",
      "originalPassword": "Admin@123"
    },
    {
      "name": "Admin User 2",
      "email": "admin2@booking.com",
      "role": "admin",
      "originalPassword": "Admin@123"
    }
  ],
  "warning": "SAVE THESE CREDENTIALS! This endpoint will not work again."
}
```

**⚠️ LƯU Ý QUAN TRỌNG:**
- Endpoint này **CHỈ CHẠY ĐƯỢC 1 LẦN**
- Sau khi có admin trong database, sẽ trả về lỗi 400
- Lưu lại credentials ngay sau khi seed thành công!

---

## 🔒 Bảo Mật

### API Endpoint có các lớp bảo vệ:

1. **Secret Key Protection**:
   - Phải có `SEED_SECRET` đúng mới chạy được
   - Secret được generate random bởi Render

2. **One-Time Use**:
   - Chỉ chạy được khi database CHƯA có admin
   - Sau khi seed xong, không thể seed lại

3. **Query hoặc Header**:
   ```bash
   # Via query param
   ?secret=YOUR_SECRET

   # Via header
   -H "x-seed-secret: YOUR_SECRET"
   ```

---

## 🆘 Troubleshooting

### Lỗi: "Unauthorized: Invalid seed secret"
**Nguyên nhân**: Secret key sai hoặc không có

**Giải pháp**:
1. Kiểm tra lại `SEED_SECRET` trên Render Environment
2. Copy đúng secret (không có khoảng trắng thừa)
3. Đảm bảo Render đã redeploy sau khi thêm env var

### Lỗi: "Admins already exist"
**Nguyên nhân**: Database đã có admin accounts

**Giải pháp**:
- **Option 1**: Xóa admin cũ qua Render Shell:
  ```bash
  # Trong Render Shell
  node -e "
  require('dotenv').config();
  const mongoose = require('mongoose');
  const Admin = require('./src/models/Admin');
  mongoose.connect(process.env.MONGODB_URI).then(async () => {
    await Admin.deleteMany({});
    console.log('Deleted all admins');
    process.exit(0);
  });
  "
  ```

- **Option 2**: Xóa qua MongoDB Atlas:
  1. Vào MongoDB Atlas Dashboard
  2. Collections → `admins` collection
  3. Delete documents

### Lỗi: Shell timeout
**Giải pháp**: Refresh shell hoặc dùng Cách 2 (API Endpoint)

### Backend đang sleep (Render free tier)
**Giải pháp**:
1. Gọi `/health` endpoint trước để wake up:
   ```bash
   curl https://your-backend.onrender.com/health
   ```
2. Đợi 30 giây
3. Chạy lại seed command

---

## 📊 So Sánh 2 Cách

| Feature | Cách 1: Shell | Cách 2: API |
|---------|---------------|-------------|
| **Tốc độ** | Nhanh | Trung bình |
| **Dễ dùng** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Bảo mật** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Chạy lại** | Có | Không (chỉ 1 lần) |
| **Yêu cầu** | Render access | Secret key |
| **Remote** | Không | Có (từ bất kỳ đâu) |

---

## 🎯 Workflow Khuyến Nghị

### Lần đầu deploy:
1. Deploy backend lên Render
2. Đợi deploy xong (~3-5 phút)
3. Dùng **Cách 1 (Shell)** để seed admin nhanh
4. Save credentials vào password manager
5. Test login trên admin panel

### Sau này cần reset admin:
1. Xóa admin cũ (qua Shell hoặc MongoDB Atlas)
2. Dùng **Cách 1 (Shell)** để seed lại

### Nếu cần seed từ CI/CD:
1. Dùng **Cách 2 (API)** với secret trong CI/CD secrets
2. Gọi API sau khi deploy xong

---

## 🎉 Xong!

Sau khi seed thành công, bạn có thể login với:

**Super Admin:**
- Email: `superadmin@booking.com`
- Password: `SuperAdmin@123`

**Các Admin khác:**
- Email: `admin1@booking.com` / `admin2@booking.com`
- Password: `Admin@123`

**⚠️ BẮT BUỘC**: Đổi password ngay sau lần đầu login!

---

## 📞 Admin Credentials Mặc Định

| Role | Email | Password |
|------|-------|----------|
| Super Admin | superadmin@booking.com | SuperAdmin@123 |
| Admin | admin1@booking.com | Admin@123 |
| Admin | admin2@booking.com | Admin@123 |

**Lưu ý**: Nên thay đổi passwords và email sau khi login thành công!
