# Quick Start Guide

## Start Backend API trong 3 bước

### 1. Cài đặt dependencies
```bash
npm install
```

### 2. Khởi động MongoDB
```bash
docker-compose up -d
```

### 3. Khởi động server
```bash
npm start
```

API sẽ chạy tại: **http://localhost:3001**

## Test nhanh với cURL

### Tạo booking:
```bash
curl -X POST http://localhost:3001/api/booking \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Nguyen Van A",
    "phoneNumber": "0901234567",
    "pickupLocation": "123 Main St, District 1, HCMC",
    "dropoffLocation": "456 Second St, District 3, HCMC",
    "numberOfBags": 3
  }'
```

### Lấy danh sách bookings:
```bash
curl http://localhost:3001/api/bookings
```

## Dừng services

### Dừng server:
`Ctrl + C` trong terminal

### Dừng MongoDB:
```bash
docker-compose down
```

## Endpoints chính

- `POST /api/booking` - Tạo booking mới
- `GET /api/bookings` - Lấy tất cả bookings
- `GET /api/booking/:id` - Lấy booking theo ID
- `PATCH /api/booking/:id/status` - Cập nhật trạng thái picked up

Xem chi tiết trong [README.md](README.md)
