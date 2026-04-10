# eTPL System Overview (TH)

เอกสารนี้สรุปภาพรวมระบบ `eTPL` และวิธีการทำงานหลัก ทั้งฝั่ง `backend` และ `frontend` เพื่อใช้เป็นคู่มือทำความเข้าใจระบบอย่างรวดเร็ว

## 1) ภาพรวมสถาปัตยกรรม

ระบบเป็นแบบแยกส่วน 2 ชั้นหลัก:

- **Frontend**: React + Vite + MUI (`frontend/`)
- **Backend**: ASP.NET Core Web API + Entity Framework Core + SignalR (`backend/`)
- **Database**: Microsoft SQL Server ผ่าน `MsSqlDbContext`

ลำดับภาพรวม:

1. ผู้ใช้เข้าเว็บผ่าน Frontend
2. Frontend เรียก API ที่ Backend
3. Backend ประมวลผลผ่าน Service Layer
4. Service ติดต่อฐานข้อมูลผ่าน EF Core DbContext
5. ส่งผลลัพธ์กลับด้วยรูปแบบ `ApiResponse<T>`
6. กรณีประมูลสด ใช้ SignalR push event แบบ real-time

---

## 2) โครงสร้างสำคัญของ Backend

### Entry Point

- ไฟล์หลัก: `backend/Program.cs`
- ตั้งค่า:
  - Controllers + JSON options
  - CORS policy (`AllowFrontend`)
  - JWT Authentication / Authorization
  - Dependency Injection (เช่น `IAuthService`, `IAuctionService`)
  - Static files + SPA fallback (`index.html`)
  - SignalR Hub route: `/hubs/auction`

### ชั้นการทำงาน (Layering)

- **Controller**: รับ/ตอบ HTTP Request
- **Service**: เก็บ Business Logic
- **Data/DbContext**: map entity และ query/update DB

### DbContext หลัก

- ไฟล์: `backend/Data/MsSqlDbContext.cs`
- ตาราง/Entity สำคัญ:
  - ผู้ใช้/สิทธิ์: `Users`, `Permissions`
  - ประมูล: `AuctionSettings`, `AuctionBoards`, `AuctionBidLogs`, `AuctionSquads`, `AuctionUserWallets`, `AuctionTransactions`, `AuctionGradeQuotas`
  - ผู้เล่น PES: `PesPlayerTeams`

---

## 3) โครงสร้างสำคัญของ Frontend

### App Bootstrap

- `frontend/src/main.jsx` เริ่มต้นแอป React
- `frontend/src/App.jsx` กำหนด routing ทั้งระบบ

### Routing และสิทธิ์การเข้าถึง

- Route สาธารณะ: เช่น `/main`, `/matches`, `/standings`
- Route ต้องล็อกอิน: เช่น `/fixtures`, `/auction`, `/my-squad`
- Route สำหรับ admin: เช่น `/users`, `/permissions`, `/announcements`, `/admin/auction`
- ใช้ `ProtectedRoute` (`frontend/src/routes/ProtectedRoute.jsx`) ตรวจ token/user/role

### การจัดการสถานะผู้ใช้

- `frontend/src/store/AuthContext.jsx`
  - เก็บ `token` และ `user` ใน `localStorage`
  - มีฟังก์ชัน `login()` / `logout()`

### การเรียก API

- `frontend/src/api/axiosInstance.js`
  - ใส่ Bearer token อัตโนมัติในทุก request
  - จัดการ `401 Unauthorized` โดยล้าง session แล้ว redirect

---

## 4) Authentication Flow

## 4.1 Login แบบ User/Password

1. ผู้ใช้กรอกฟอร์มที่ `LoginPage`
2. Frontend เรียก `POST /api/auth/login`
3. `AuthController` ส่งต่อไป `AuthService.LoginAsync`
4. ถ้าถูกต้อง: backend สร้าง JWT และคืนข้อมูลผู้ใช้
5. Frontend บันทึก token/user ลง `localStorage`
6. การเรียก API ถัดไปจะแนบ `Authorization: Bearer <token>`

## 4.2 Login ผ่าน LINE

1. Frontend ขอ URL จาก `GET /api/auth/line-login-url`
2. ผู้ใช้ไป authorize ที่ LINE
3. กลับมาที่ callback route ของระบบ
4. Backend แลก `code` เป็น access token และดึง profile LINE
5. ถ้า LINE ถูก bind แล้ว -> login สำเร็จ
6. ถ้ายังไม่ bind -> ส่ง flow ให้เลือก user เพื่อ bind ก่อน

---

## 5) Auction Module Flow (Business + Realtime)

Controller หลัก: `backend/Controllers/AuctionController.cs`
Service หลัก: `backend/Services/AuctionService.cs`
Realtime Hub: `backend/Hubs/AuctionHub.cs`

### ฟังก์ชันหลัก

- ค้นหา/กรองผู้เล่น: `GET /api/auction/players`, `GET /api/auction/filter-options`
- ดูกระดานประมูล: `GET /api/auction/board` (อนุญาต anonymous)
- เริ่มประมูล: `POST /api/auction/start/{playerId}`
- ลง bid ปกติ: `POST /api/auction/{auctionId}/bid/normal`
- ลง final bid: `POST /api/auction/{auctionId}/bid/final`
- ยืนยันผลประมูล: `POST /api/auction/{auctionId}/confirm`
- ดูสรุป/กระเป๋าเงิน/ทีม: `summary`, `wallet`, `my-squad`

### กฎธุรกิจสำคัญใน AuctionService

- ช่วงเวลาอนุญาตการประมูล (วันและเวลา)
- Budget lock (ต้องเหลือเงินขั้นต่ำสำหรับ slot ที่เหลือ)
- จำกัดโควต้านักเตะแต่ละเกรด (S/A/B/C/D/E)
- ขนาดทีมสูงสุด
- การเคลียร์สถานะ auction หมดอายุและคืนเงินตามเงื่อนไข

### Realtime การอัปเดต

- Frontend (`AuctionPage`) สร้าง SignalR connection ไปที่ `/hubs/auction`
- Backend broadcast event เช่น:
  - `AuctionStarted`
  - `AuctionUpdated`
- Client update state ทันทีโดยไม่ต้อง refresh หน้า

---

## 6) Error Handling และรูปแบบ Response

- Middleware กลาง: `backend/Middleware/ExceptionMiddleware.cs`
- จัดการ exception ที่ไม่ถูกจับและคืนข้อความ error มาตรฐาน
- API ใช้รูปแบบ `ApiResponse<T>` เพื่อให้ frontend parse ได้สม่ำเสมอ

---

## 7) การทดสอบ (Test)

มีโครงการทดสอบ `backend.Tests/` โดยใช้ unit test สำหรับ controller/service หลายส่วน เช่น:

- `AuthControllerTests.cs`
- `AuthServiceTests.cs`
- `UserControllerTests.cs`
- `UserServiceTests.cs`
- `FixtureControllerTests.cs`

---

## 8) การ Deploy

อ้างอิง `deploy/README.md`

สคริปต์หลัก:

- `deploy/deploy-backend.ps1` publish backend และอัปโหลด FTP
- `deploy/deploy-frontend.ps1` build frontend และอัปโหลด FTP
- `deploy/upload-ftp.ps1` helper upload แบบ recursive

รองรับ flag สำคัญ เช่น `-DryRun`, `-BuildOnly` และการ override ค่า FTP

---

## 9) สรุปสั้นที่สุด

`eTPL` คือระบบเว็บจัดการลีกและประมูลนักเตะ โดยใช้ React (frontend) + ASP.NET Core (backend) + SQL Server และมี real-time auction ผ่าน SignalR พร้อมระบบสิทธิ์ผู้ใช้ด้วย JWT/Role และรองรับล็อกอินผ่าน LINE.
