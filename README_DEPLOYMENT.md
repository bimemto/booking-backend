# Hướng Dẫn Deploy Backend Lên Cloud (Miễn Phí)

## 📋 Mục Lục
- [Option 1: Render.com (Khuyến nghị)](#option-1-rendercom-khuyến-nghị)
- [Option 2: Railway.app](#option-2-railwayapp)
- [Option 3: Fly.io](#option-3-flyio)
- [Setup MongoDB Atlas (Bắt buộc)](#setup-mongodb-atlas-bắt-buộc)

---

## ⚙️ Setup MongoDB Atlas (Bắt buộc)

Trước khi deploy, bạn cần database MongoDB miễn phí:

### Bước 1: Tạo MongoDB Atlas Account
1. Truy cập: https://www.mongodb.com/cloud/atlas/register
2. Đăng ký tài khoản miễn phí
3. Tạo cluster mới (chọn FREE tier - M0)
4. Chọn region gần Việt Nam: **Singapore** hoặc **Hong Kong**

### Bước 2: Lấy Connection String
1. Click **Connect** trên cluster
2. Chọn **Connect your application**
3. Copy connection string, dạng:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/booking-app?retryWrites=true&w=majority
   ```
4. Thay `<username>` và `<password>` bằng thông tin thực tế

### Bước 3: Whitelist IP
1. Vào **Network Access** → **Add IP Address**
2. Chọn **Allow Access from Anywhere** (0.0.0.0/0)
3. Click **Confirm**

---

## 🚀 Option 1: Render.com (Khuyến nghị)

### ✅ Ưu điểm:
- ✨ Hoàn toàn miễn phí (750 giờ/tháng)
- 🔄 Auto deploy từ GitHub
- 📦 Hỗ trợ Node.js tốt
- 🌐 Có SSL certificate miễn phí

### ⚠️ Nhược điểm:
- 💤 Service sleep sau 15 phút không dùng
- 🐌 Khởi động lại mất ~30 giây khi wake up

### 📝 Hướng Dẫn Deploy:

#### Bước 1: Push code lên GitHub
```bash
# Tạo repo mới trên GitHub, sau đó:
git add .
git commit -m "Prepare for deployment"
git branch -M main
git remote add origin https://github.com/<username>/<repo-name>.git
git push -u origin main
```

#### Bước 2: Deploy trên Render
1. Truy cập: https://render.com
2. Đăng ký/Đăng nhập (có thể dùng GitHub)
3. Click **New +** → **Web Service**
4. Connect GitHub repository của bạn
5. Cấu hình:
   - **Name**: `booking-backend` (hoặc tên bạn muốn)
   - **Region**: Singapore (gần VN nhất)
   - **Branch**: `main`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free

#### Bước 3: Thêm Environment Variables
Trong phần **Environment**, thêm:
```
NODE_ENV=production
PORT=10000
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/booking-app
JWT_SECRET=your-super-secret-key-change-this-to-random-string
JWT_EXPIRE=30d
```

#### Bước 4: Deploy
- Click **Create Web Service**
- Đợi 3-5 phút để build và deploy
- URL sẽ có dạng: `https://booking-backend-xxxx.onrender.com`

#### Bước 5: Test API
```bash
curl https://booking-backend-xxxx.onrender.com/health
```

---

## 🚂 Option 2: Railway.app

### ✅ Ưu điểm:
- 💰 $5 credit miễn phí/tháng (~500 giờ)
- ⚡ Không sleep, luôn online
- 🎯 Interface đẹp, dễ dùng

### 📝 Hướng Dẫn:

1. Truy cập: https://railway.app
2. Đăng nhập bằng GitHub
3. Click **New Project** → **Deploy from GitHub repo**
4. Chọn repository của bạn
5. Thêm Environment Variables:
   ```
   NODE_ENV=production
   MONGODB_URI=mongodb+srv://...
   JWT_SECRET=your-secret-key
   JWT_EXPIRE=30d
   ```
6. Railway tự động detect và deploy Node.js app
7. Click **Settings** → **Generate Domain** để có public URL

---

## ✈️ Option 3: Fly.io

### ✅ Ưu điểm:
- 🆓 3 VMs miễn phí
- ⚡ Rất nhanh
- 🌍 Deploy đa vùng

### 📝 Hướng Dẫn:

#### Bước 1: Cài Fly CLI
```bash
# macOS
brew install flyctl

# Windows (PowerShell)
iwr https://fly.io/install.ps1 -useb | iex

# Linux
curl -L https://fly.io/install.sh | sh
```

#### Bước 2: Login
```bash
flyctl auth signup  # Hoặc flyctl auth login nếu đã có tài khoản
```

#### Bước 3: Tạo fly.toml
```bash
flyctl launch
```
Trả lời các câu hỏi:
- App name: `booking-backend` (hoặc tên khác)
- Region: Singapore
- PostgreSQL: **No** (ta dùng MongoDB Atlas)
- Deploy now: **No**

#### Bước 4: Set Environment Variables
```bash
flyctl secrets set NODE_ENV=production
flyctl secrets set MONGODB_URI="mongodb+srv://..."
flyctl secrets set JWT_SECRET="your-secret-key"
flyctl secrets set JWT_EXPIRE=30d
```

#### Bước 5: Deploy
```bash
flyctl deploy
```

#### Bước 6: Open app
```bash
flyctl open
```

---

## 🔒 Bảo Mật - QUAN TRỌNG!

### Tạo JWT_SECRET ngẫu nhiên:
```bash
# macOS/Linux
openssl rand -base64 32

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Không commit .env file
File `.gitignore` đã được cấu hình để bỏ qua `.env`

---

## 🧪 Test API Sau Khi Deploy

```bash
# Health check
curl https://your-app-url.com/health

# Test create booking
curl -X POST https://your-app-url.com/api/booking \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "phone": "0123456789",
    "pickupLocation": "Hotel ABC",
    "dropoffLocation": "Airport",
    "pickupTime": "2025-12-15T10:00:00Z",
    "vehicleType": "sedan"
  }'
```

---

## 📊 So Sánh Các Service

| Feature | Render | Railway | Fly.io |
|---------|--------|---------|--------|
| **Giá** | Miễn phí | $5/tháng | Miễn phí |
| **Sleep** | Có (15 phút) | Không | Không |
| **Deploy** | Auto từ Git | Auto từ Git | CLI |
| **Dễ dùng** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Tốc độ** | Trung bình | Tốt | Rất tốt |
| **Khuyến nghị** | #1 cho bắt đầu | #2 nếu cần 24/7 | #3 nếu biết dùng CLI |

---

## 🆘 Troubleshooting

### Lỗi MongoDB Connection
```
MongoServerError: bad auth
```
**Giải pháp**: Kiểm tra username/password trong MongoDB URI

### App bị sleep
**Giải pháp**:
- Dùng service như UptimeRobot để ping app mỗi 10 phút
- Hoặc chuyển sang Railway/Fly.io

### Port Error
**Giải pháp**: Đảm bảo code dùng `process.env.PORT`:
```javascript
const PORT = process.env.PORT || 3000;
```

---

## 📞 Hỗ Trợ

Nếu gặp vấn đề:
1. Kiểm tra logs trên dashboard của service
2. Verify MongoDB connection string
3. Đảm bảo tất cả dependencies trong package.json
4. Check environment variables đã set đúng chưa

---

## 🎉 Xong!

Backend của bạn giờ đã online 24/7! URL có thể dùng trong mobile app hoặc frontend.

**Next Steps:**
1. Seed admin data: Tạo script để seed admin user vào MongoDB Atlas
2. Setup CORS: Đảm bảo frontend domain được allow
3. Monitoring: Setup logging và error tracking
