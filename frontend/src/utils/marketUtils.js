/**
 * Checks if the market is currently open based on the auction settings.
 * @param {Object} summary - The summary object containing market start/end times and dates.
 * @returns {Object} { isOpen: boolean, message: string }
 */
export const checkMarketOpen = (summary) => {
  if (!summary) return { isOpen: true, message: "" }; // If not loaded center open by default or handle loading state

  const { marketStartTime, marketEndTime, marketStartDate, marketEndDate } = summary;
  
  // Current Thailand Time (UTC+7)
  const now = new Date();
  const thailandTime = new Date(now.getTime() + (now.getTimezoneOffset() + 420) * 60000);
  
  // 1. Date Check (Backend format is "dd/MM")
  // Note: Since we only have dd/MM, we assume the current year.
  // This is a bit fragile if the season spans multiple years, but follows backend DTO pattern.
  const currentYear = thailandTime.getFullYear();
  
  if (marketStartDate && marketStartDate !== "N/A") {
    const [day, month] = marketStartDate.split('/').map(Number);
    const startDate = new Date(currentYear, month - 1, day, 0, 0, 0);
    if (thailandTime < startDate) {
      return { isOpen: false, message: `ตลาดยังไม่เปิด จนกว่าจะถึงวันที่ ${marketStartDate}` };
    }
  }

  if (marketEndDate && marketEndDate !== "N/A") {
    const [day, month] = marketEndDate.split('/').map(Number);
    const endDate = new Date(currentYear, month - 1, day, 23, 59, 59);
    if (thailandTime > endDate) {
      return { isOpen: false, message: `ตลาดปิดตัวลงแล้วเมื่อวันที่ ${marketEndDate}` };
    }
  }

  // 2. Daily Time Check (Format is "hh:mm")
  if (marketStartTime && marketEndTime) {
    const [startH, startM] = marketStartTime.split(':').map(Number);
    const [endH, endM] = marketEndTime.split(':').map(Number);
    
    const startTimeInMins = startH * 60 + startM;
    const endTimeInMins = endH * 60 + endM;
    const currentTimeInMins = thailandTime.getHours() * 60 + thailandTime.getMinutes();
    
    if (currentTimeInMins < startTimeInMins || currentTimeInMins > endTimeInMins) {
      return { isOpen: false, message: `ตลาดเปิดให้บริการระหว่างเวลา ${marketStartTime} - ${marketEndTime} น.` };
    }
  }

  return { isOpen: true, message: "" };
};
