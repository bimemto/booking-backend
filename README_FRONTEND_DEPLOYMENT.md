# Hướng Dẫn Deploy Admin Panel (React + Vite) Lên Cloud

## 📋 Mục Lục
- [Option 1: Vercel (Khuyến nghị #1)](#option-1-vercel-khuyến-nghị-1)
- [Option 2: Netlify (Khuyến nghị #2)](#option-2-netlify-khuyến-nghị-2)
- [Option 3: Cloudflare Pages](#option-3-cloudflare-pages)
- [Cấu hình CORS Backend](#cấu-hình-cors-backend)

---

## 🔗 Cấu hình CORS Backend

### ✅ Đã được cập nhật!

Backend đã được cấu hình để hỗ trợ CORS cho frontend deploy riêng:

1. **File [src/server.js](src/server.js)** đã có CORS config động
2. **Environment variable mới**: `ALLOWED_ORIGINS`

### Cách thêm Frontend URL vào Backend:

Sau khi deploy frontend, bạn sẽ có URL (ví dụ: `https://booking-admin.vercel.app`), thêm vào **Render Environment Variables**:

1. Vào Render Dashboard → **booking-backend** service
2. Vào **Environment** tab
3. Thêm/Cập nhật variable:
   ```
   Key: ALLOWED_ORIGINS
   Value: https://booking-admin.vercel.app,https://booking-admin.netlify.app
   ```
   (Có thể thêm nhiều domain, phân cách bằng dấu phẩy)
4. Click **Save Changes**
5. Service sẽ tự động redeploy

---

## 🚀 Option 1: Vercel (Khuyến nghị #1)

### ✅ Ưu điểm:
- ✨ **100% miễn phí** (hobby plan)
- ⚡ **Cực nhanh** - Edge Network toàn cầu
- 🔄 **Auto deploy** từ Git push
- 🎯 **Perfect cho React/Vite** - zero config
- 🌐 **Free SSL** + Custom domain miễn phí
- 🔥 **Preview deploys** cho mỗi PR

### 📝 Hướng Dẫn Deploy:

#### Bước 1: Chuẩn bị Project

Trong project admin React, tạo file `.env.example`:
```bash
VITE_API_URL=http://localhost:3000/api
```

Tạo file `.env.production`:
```bash
VITE_API_URL=https://your-backend.onrender.com/api
```

**Quan trọng:** Thêm vào `.gitignore`:
```
.env.local
.env.production.local
```

#### Bước 2: Cấu hình Vite

Đảm bảo `vite.config.js` có:
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173
  }
})
```

#### Bước 3: Cấu hình API Base URL

Trong code React (ví dụ: `src/api/config.js`):
```javascript
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
```

#### Bước 4: Push lên GitHub

```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push
```

#### Bước 5: Deploy trên Vercel

1. Truy cập: https://vercel.com
2. Đăng nhập bằng GitHub
3. Click **Add New** → **Project**
4. Import GitHub repository của admin panel
5. Vercel tự động detect Vite:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build` (hoặc `vite build`)
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

6. **Environment Variables** - Thêm:
   ```
   VITE_API_URL = https://your-backend.onrender.com/api
   ```

7. Click **Deploy**

#### Bước 6: Lấy URL và Cập nhật Backend

1. Sau khi deploy xong, copy URL (ví dụ: `https://booking-admin.vercel.app`)
2. Vào Render Dashboard → Backend service → Environment
3. Thêm vào `ALLOWED_ORIGINS`:
   ```
   ALLOWED_ORIGINS=https://booking-admin.vercel.app
   ```

#### Bước 7: Test

Mở admin panel trên Vercel URL và kiểm tra:
- Login có hoạt động không
- API calls có success không
- Check DevTools Console → Network tab

---

## 🌐 Option 2: Netlify (Khuyến nghị #2)

### ✅ Ưu điểm:
- 🆓 **Miễn phí** 100GB bandwidth/tháng
- 🚀 **Nhanh** - Global CDN
- 📦 **Form handling** built-in
- 🔄 **Auto deploy** từ Git
- 🎁 **Serverless functions** miễn phí

### 📝 Hướng Dẫn Deploy:

#### Bước 1: Chuẩn bị Project (giống Vercel)

Tạo `.env.production`:
```bash
VITE_API_URL=https://your-backend.onrender.com/api
```

#### Bước 2: Tạo file `netlify.toml`

Trong root project admin:
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.environment]
  NODE_VERSION = "18"
```

#### Bước 3: Push lên Git

```bash
git add netlify.toml .env.production
git commit -m "Add Netlify config"
git push
```

#### Bước 4: Deploy trên Netlify

1. Truy cập: https://app.netlify.com
2. Đăng nhập bằng GitHub
3. Click **Add new site** → **Import an existing project**
4. Chọn GitHub → Chọn repo admin panel
5. Netlify tự động detect Vite:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`

6. **Environment variables**:
   ```
   VITE_API_URL = https://your-backend.onrender.com/api
   ```

7. Click **Deploy site**

#### Bước 5: Cập nhật Backend CORS

Copy Netlify URL (ví dụ: `https://booking-admin.netlify.app`) và thêm vào `ALLOWED_ORIGINS` trên Render.

---

## ☁️ Option 3: Cloudflare Pages

### ✅ Ưu điểm:
- 🆓 **Unlimited bandwidth** miễn phí
- ⚡ **Cực nhanh** - Cloudflare network
- 🔒 **Bảo mật tốt** - DDoS protection

### 📝 Hướng Dẫn:

#### Bước 1: Tạo file `.node-version`

```
18
```

#### Bước 2: Push lên Git

```bash
git add .
git commit -m "Prepare for Cloudflare Pages"
git push
```

#### Bước 3: Deploy

1. Truy cập: https://dash.cloudflare.com
2. **Pages** → **Create a project**
3. Connect GitHub repo
4. Cấu hình:
   - **Framework preset**: Vite
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Environment variables**:
     ```
     VITE_API_URL = https://your-backend.onrender.com/api
     NODE_VERSION = 18
     ```

5. Click **Save and Deploy**

#### Bước 4: Cấu hình Redirects

Tạo file `public/_redirects`:
```
/*  /index.html  200
```

Push changes và Cloudflare sẽ auto redeploy.

---

## 🔒 Bảo Mật - Checklist

### ✅ Backend:
- [x] CORS đã được config với `ALLOWED_ORIGINS`
- [x] JWT_SECRET đã được tạo random
- [x] `.env` không được commit

### ✅ Frontend:
- [ ] Không lưu sensitive data trong localStorage
- [ ] Token được lưu secure (httpOnly cookies nếu có thể)
- [ ] API URL dùng environment variables
- [ ] `.env.local` không được commit

---

## 📊 So Sánh Các Service

| Feature | Vercel | Netlify | Cloudflare Pages |
|---------|--------|---------|------------------|
| **Giá** | Miễn phí | Miễn phí | Miễn phí |
| **Bandwidth** | 100GB/tháng | 100GB/tháng | Unlimited |
| **Build time** | 6000 phút/tháng | 300 phút/tháng | 500 builds/tháng |
| **Deploy** | Auto từ Git | Auto từ Git | Auto từ Git |
| **Tốc độ** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Dễ dùng** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Preview URLs** | ✅ | ✅ | ✅ |
| **Functions** | ✅ (Pro) | ✅ Free | ✅ Free |
| **Khuyến nghị** | #1 Best | #2 Good | #3 Fast |

---

## 🆘 Troubleshooting

### Lỗi CORS
```
Access to fetch at 'https://backend.com/api' from origin 'https://frontend.com'
has been blocked by CORS policy
```

**Giải pháp:**
1. Kiểm tra `ALLOWED_ORIGINS` trên Render có đúng frontend URL không
2. Đảm bảo không có trailing slash: `https://frontend.com` (không phải `https://frontend.com/`)
3. Check backend logs trên Render để xem origin nào đang bị reject

### Build fails: "VITE_API_URL is not defined"
**Giải pháp:**
1. Thêm environment variable trên hosting dashboard
2. Redeploy sau khi thêm env vars

### 404 khi refresh trang
**Giải pháp:**
- **Netlify**: Thêm file `netlify.toml` với redirects (xem trên)
- **Vercel**: Tạo file `vercel.json`:
  ```json
  {
    "rewrites": [{ "source": "/(.*)", "destination": "/" }]
  }
  ```
- **Cloudflare**: Thêm `public/_redirects`

### API calls fail với mixed content error
**Giải pháp:**
Đảm bảo backend URL dùng HTTPS, không phải HTTP.

---

## 🎯 Workflow Hoàn Chỉnh

### 1️⃣ Lần đầu deploy:
```bash
# Frontend
cd booking-admin
git add .
git commit -m "Deploy frontend"
git push

# Deploy trên Vercel/Netlify (follow steps trên)
# Lấy URL: https://booking-admin.vercel.app
```

### 2️⃣ Cập nhật Backend CORS:
```bash
# Trên Render Dashboard
ALLOWED_ORIGINS=https://booking-admin.vercel.app

# Đợi backend redeploy (~2 phút)
```

### 3️⃣ Test:
```bash
# Mở admin panel
curl -X POST https://booking-admin.vercel.app

# Test API call
# Mở DevTools → Network → Check API requests có success không
```

### 4️⃣ Các lần sau:
```bash
# Chỉ cần push code
git add .
git commit -m "Update feature"
git push

# Vercel/Netlify tự động build & deploy trong ~2-3 phút
```

---

## 🎉 Hoàn Tất!

Giờ bạn đã có:
- ✅ Backend trên Render: `https://booking-backend-xxxx.onrender.com`
- ✅ Admin Panel trên Vercel/Netlify: `https://booking-admin.vercel.app`
- ✅ CORS đã được config đúng
- ✅ Auto deploy từ Git push

**Next Steps:**
1. Setup custom domain (nếu muốn)
2. Add analytics tracking
3. Setup error monitoring (Sentry)
4. Configure environment-specific settings
