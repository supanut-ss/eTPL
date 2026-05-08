
function generateId(text) {
  if (!text) return "";
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\u0e00-\u0e7f-]/g, "");
}

const headers = [
  "1. ข้อมูลพื้นฐานและเมนูหลัก (Public Menus)",
  "2. ระบบการประมูลนักเตะ (Auction System)",
  "3. ระบบการซื้อขายและตลาดนักเตะ (Transfer Market)",
  "4. ระบบการยืมตัวนักเตะ (Loan System)",
  "5. การจัดการทีม (Squad Management)",
  "6. การรายงานผลการแข่งขัน (Match Reporting)",
  "7. เกร็ดความรู้และเงื่อนไขทางเทคนิค (Pro-Tips)"
];

headers.forEach(h => {
  console.log(`'${h}' -> '${generateId(h)}'`);
});
