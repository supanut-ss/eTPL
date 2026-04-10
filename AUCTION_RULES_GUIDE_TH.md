# คู่มือเงื่อนไขการประมูล (Auction Rules Guide)

เอกสารนี้สรุป “กติกาที่ระบบบังคับจริง” ของโมดูลประมูลจากโค้ดปัจจุบัน
(อ้างอิงหลักจาก `backend/Services/AuctionService.cs` และ `backend/Controllers/AuctionController.cs`)

## 1) สิทธิ์การใช้งาน (Access)

- API ใต้เส้นทาง `api/auction` ส่วนใหญ่ต้องล็อกอิน (`[Authorize]`)
- endpoint ที่เปิดสาธารณะ:
  - `GET /api/auction/board`
  - `GET /api/auction/quotas`
- ฟังก์ชันเฉพาะแอดมิน:
  - `PUT /api/auction/settings`
  - `PUT /api/auction/quotas`
  - `POST /api/auction/bonus`

---

## 2) ช่วงเวลาและวันเปิดตลาด (Time Eligibility)

ระบบจะตรวจทุกครั้งก่อนกระทำที่เกี่ยวกับการ bid/start โดยใช้เวลาไทย (UTC+7):

- ต้องไม่ก่อน `AuctionStartDate` (ถ้าตั้งค่าไว้)
- ต้องไม่หลัง `AuctionEndDate` (ถ้าตั้งค่าไว้)
- เวลาปัจจุบันต้องอยู่ระหว่าง `DailyBidStartTime` ถึง `DailyBidEndTime`

ถ้าไม่ผ่าน จะถูกปฏิเสธทันที

---

## 3) Phase ของการประมูลและสถานะที่แสดง

สถานะในระบบคำนวณจาก `DbStatus`, `NormalEndTime`, `FinalEndTime`, และจำนวนผู้เข้าร่วม:

- **Normal Bid**: ขณะ `now < NormalEndTime`
- **Final Bid**: ขณะ `NormalEndTime <= now < FinalEndTime` และมีผู้บิดมากกว่า 1 คน
- **Waiting Confirm**:
  - กรณีอยู่ช่วง Final แต่มีผู้เข้าร่วมไม่เกิน 1 คน หรือ
  - หลัง `FinalEndTime` ไปจนถึง `FinalEndTime + 24 ชั่วโมง`
- **Expired**: หลัง `FinalEndTime + 24 ชั่วโมง`
- ถ้า `DbStatus != Active` จะแสดงตามค่านั้น เช่น `Sold`, `Cancelled`

---

## 4) เงื่อนไขก่อนมีสิทธิ์บิด (Eligibility Rules)

ก่อน start/bid ทุกครั้ง ระบบเช็ค 3 ส่วนหลัก:

1. **Max Squad Size**
   - นับรวมทั้งนักเตะที่มีในทีม + รายการที่ “กำลังมีแนวโน้มชนะ”
   - หากเกิน/ชนเพดาน จะบิดไม่ได้

2. **Budget Lock (เงินสำรองขั้นต่ำ)**
   - หลังหักเงินบิดแล้ว ต้องเหลือเงินพอ reserve สำหรับตำแหน่งที่เหลือ
   - ระบบคำนวณขั้นต่ำจากเกรดล่างสุด (ปกติใช้เกรด `E`) และ `MaxSquadSize`

3. **Grade Quota**
   - จำกัดจำนวนผู้เล่นแต่ละช่วง OVR ต่อผู้ใช้
   - ถ้าโควตาเกรดนั้นเต็ม จะบิดผู้เล่นเกรดนั้นไม่ได้

---

## 5) กติกาเริ่มประมูล (Start Auction)

`POST /api/auction/start/{playerId}`

เงื่อนไขสำคัญ:

- ผู้เล่นต้องมีอยู่จริง และ `OVR >= 60`
- ผู้เล่นต้องไม่อยู่ในรายการประมูล Active อื่น
- ผู้เล่นต้องไม่ถูกซื้อเข้าทีมไปแล้ว
- ผู้เริ่มประมูลต้องผ่าน Eligibility Rules (ข้อ 4)

พฤติกรรมทางการเงิน:

- ราคาเริ่มต้น = `OVR` ของผู้เล่น
- ระบบ lock เงินของผู้เริ่มประมูลทันที (ย้ายจาก `AvailableBalance` ไป `ReservedBalance`)
- ผู้เริ่มประมูลกลายเป็นผู้นำราคาแรก

---

## 6) กติกา Normal Bid

`POST /api/auction/{auctionId}/bid/normal`

เงื่อนไขสำคัญ:

- ต้องอยู่ในช่วง `Normal Bid`
- ห้ามบิดทับตัวเองเมื่อกำลังเป็นผู้นำอยู่
- ราคาที่บิดต้อง:
  - มากกว่าราคาปัจจุบัน
  - และต้อง `+1` เท่านั้น (strict increment)
- ต้องผ่าน Eligibility Rules (ข้อ 4)

พฤติกรรมทางการเงิน:

- คืนเงินผู้นำเดิมเต็มจำนวนที่ lock ไว้
- lock เงินผู้บิดใหม่ตามราคาที่บิด

---

## 7) กติกา Final Bid (ปิดผนึก)

`POST /api/auction/{auctionId}/bid/final`

เงื่อนไขสำคัญ:

- ต้องอยู่ในช่วง `Final Bid`
- เฉพาะผู้ที่ “เคยบิดใน Normal ของ auction นี้” เท่านั้น
- 1 ผู้ใช้ส่ง Final ได้เพียง 1 ครั้งต่อ auction
- ราคาปิดผนึกต้องมากกว่าราคาปัจจุบัน
- ต้องผ่าน Eligibility Rules (ข้อ 4)

พฤติกรรมทางการเงิน:

- ผู้ใช้ทั่วไป: lock ตามราคา Final เต็มจำนวน
- ถ้าเป็นผู้นำ Normal เดิม: lock เฉพาะส่วนต่าง `Final - CurrentPrice`

---

## 8) กติกาการหาผู้ชนะและ Confirm

`POST /api/auction/{auctionId}/confirm`

เงื่อนไขสำคัญ:

- ต้องอยู่ในช่วง `Waiting Confirm`
- ผู้ที่กดยืนยันต้องเป็น “ผู้ชนะ” เท่านั้น

การตัดสินผู้ชนะ:

1. ถ้ามี Final bids:
   - เรียงจากราคา Final มากสุด
   - ถ้าราคาเท่ากัน ให้คนที่เป็นผู้นำ Normal เดิมชนะก่อน
   - ถ้ายังเท่ากัน ดูเวลาส่งก่อน
2. ถ้าไม่มี Final bids:
   - ผู้นำ Normal เป็นผู้ชนะ

หลังยืนยันสำเร็จ:

- คืนเงินผู้แพ้ทั้งหมดตามสิทธิ์
- ปิดรายการเป็น `Sold`
- เพิ่มผู้เล่นเข้าทีมผู้ชนะ (`AuctionSquad`)

---

## 9) หมดเวลาแล้วยังไม่ Confirm

ระบบมี lazy sweep (`RunLazySweepAsync`) สำหรับรายการที่เลย `FinalEndTime + 24 ชม.` แล้ว:

- เปลี่ยนสถานะเป็น `Cancelled`
- คืนเงินที่ lock ไว้ตามเงื่อนไขให้ผู้เกี่ยวข้อง

หมายเหตุ: เป็น **lazy** หมายถึงจะทำงานเมื่อมีการเรียกบาง API (เช่นโหลดกระดานหรือเริ่มประมูลใหม่)

---

## 10) ข้อควรรู้ด้าน Wallet

- `AvailableBalance`: เงินที่ใช้บิดได้ทันที
- `ReservedBalance`: เงินที่ถูก lock จากการนำประมูล/ส่ง Final
- การบิดทุกครั้งมีการบันทึกธุรกรรม (`AuctionTransactions`) เช่น
  - `AUCTION_BID`
  - `AUCTION_REFUND`
  - `AUCTION_WIN`

---

## 11) API ที่ใช้บ่อยในโมดูลประมูล

- ค้นหาผู้เล่น: `GET /api/auction/players`
- ตัวเลือกตัวกรอง: `GET /api/auction/filter-options`
- กระดานประมูล: `GET /api/auction/board`
- เริ่มประมูล: `POST /api/auction/start/{playerId}`
- Normal bid: `POST /api/auction/{auctionId}/bid/normal`
- Final bid: `POST /api/auction/{auctionId}/bid/final`
- Confirm: `POST /api/auction/{auctionId}/confirm`
- สรุปผู้ใช้: `GET /api/auction/summary`
- กระเป๋าเงิน: `GET /api/auction/wallet`
- ทีมของฉัน: `GET /api/auction/my-squad`
- ประวัติธุรกรรม: `GET /api/auction/transactions`

---

## 12) ข้อแนะนำการใช้งานสำหรับผู้เล่น

- ก่อนบิด ตรวจ `AvailableBalance` และโควตาเกรดให้พอ
- ช่วง Normal ต้องบิดทีละ 1 เท่านั้น
- อย่าลืมว่า Final bid ส่งได้ครั้งเดียว และแก้ไม่ได้
- หลังชนะแล้ว ต้องเข้าไปกด Confirm ภายในเวลา ไม่เช่นนั้นเสี่ยงถูกยกเลิกอัตโนมัติ
