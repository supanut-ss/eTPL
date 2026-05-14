import { useMemo } from "react";
import {
  Box,
  Typography,
  IconButton,
  keyframes,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  Facebook,
  YouTube,
  SportsSoccer,
  TrendingUp,
  ConfirmationNumber,
} from "@mui/icons-material";
import { LineIcon, DiscordIcon } from "./shared/icons";
import { 
  DESIGN_TOKENS, 
  extractPlayer,
  pulse,
  pulseOutline
} from "./shared/designTokens";

const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-1px); }
  100% { transform: translateY(0px); }
`;

const scanline = keyframes`
  0% { transform: translateY(-100%); }
  100% { transform: translateY(100%); }
`;

const LiveFeed = ({ lastFixtures, marketActivity }) => {
  const feedItems = useMemo(() => [
    ...(lastFixtures || []).map((f) => ({
      type: "RESULT",
      icon: <SportsSoccer sx={{ fontSize: 14 }} />,
      color: "#10b981",
      date: f.matchDate || f.date,
      data: f,
      msg: `${extractPlayer(f.home) || f.homeTeamName || "?"} ${f.HomeScore ?? f.homeScore ?? "-"} - ${f.AwayScore ?? f.awayScore ?? "-"} ${extractPlayer(f.away) || f.awayTeamName || "?"}`,
      detail: null,
      time: (() => {
        const rawDate = f.matchDate || f.MatchDate || f.createDate || f.CreateDate || f.date || f.Date;
        if (!rawDate) return "–";
        const d = new Date(rawDate);
        return d.toLocaleString("en-GB", { 
          day: "2-digit", 
          month: "short", 
          hour: "2-digit", 
          minute: "2-digit", 
          hour12: false,
          timeZone: "Asia/Bangkok" 
        });
      })(),
    })),
    ...(marketActivity || [])
      .filter((m) => {
        const sub = (m.subtitle || "").toLowerCase();
        const type = m.type || "";
        const txType = (m.txType || "").toUpperCase();

        // ซ่อนรายการ Auto และรายการที่เกี่ยวกับ Bid (ประมูล/บิด) เพราะเป็นความลับ
        const isAuto = sub.includes("ออโต้") || sub.includes("อัตโนมัติ") || (sub.includes("auto") && sub.includes("สัญญา"));
        const isBid = sub.includes("bid") || sub.includes("บิด") || sub.includes("ประมูล") || sub.includes("วาง bid") || sub.includes("place bid");
        
        // กรองฝั่ง "คนขาย/คนให้ยืม" ออกจากรายการ DEAL เพราะเราต้องการประกาศแค่ฝั่ง "คนซื้อ/คนยืมไป" เท่านั้น
        // (เช่น ถ้า Chalif ยืมตัวจาก Admin ให้แสดงแค่ Chalif ยืมตัว... ไม่ต้องแสดง Admin ปล่อยยืม...)
        const isOutgoingSide = type === "DEAL" && (
          txType.includes("SELL") || txType.includes("LOAN_OUT") || 
          sub.includes("sold") || sub.includes("ขาย") || 
          sub.includes("loaned out") || sub.includes("ปล่อยยืม")
        );

        return !isAuto && (type === "DEAL" || !isBid) && !isOutgoingSide;
      })
      .map((m) => ({
        type: m.type === "DEAL" ? "DEAL" : "MARKET",
        icon: m.type === "DEAL" ? <TrendingUp sx={{ fontSize: 14 }} /> : <ConfirmationNumber sx={{ fontSize: 14 }} />,
        color: m.type === "DEAL" ? "#6366f1" : "#f59e0b",
        date: m.date,
        data: m,
        msg: m.subtitle || "Market activity",
        isListing: m.isListing,
        detail: (() => {
          if (m.txType?.includes("RELEASE")) return m.title;
          if (m.type === "DEAL") return m.amount ? `${Number(m.amount).toLocaleString()} TP` : null;
          return [m.title, m.amount ? `${Number(m.amount).toLocaleString()} TP` : null].filter(Boolean).join(" • ");
        })(),
        time: m.date ? new Date(m.date).toLocaleString("en-GB", { 
          day: "2-digit", 
          month: "short", 
          hour: "2-digit", 
          minute: "2-digit", 
          hour12: false,
          timeZone: "Asia/Bangkok"
        }) : "–",
      })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 50), [lastFixtures, marketActivity]);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        p: 3,
        borderRadius: 2,
        background: DESIGN_TOKENS.glassSoft,
        border: `1px solid ${DESIGN_TOKENS.border}`,
        position: "relative",
        overflow: "hidden",
        height: { xs: 450, md: 600 },
        boxShadow: "0 10px 25px -15px rgba(0,0,0,0.1)",
        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "200%",
          background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.03), transparent)",
          zIndex: 5,
          pointerEvents: "none",
          animation: `${scanline} 8s linear infinite`,
        }
      }}
    >
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <Box
            className="pulse-dot"
            sx={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              bgcolor: "#fb7185",
              boxShadow: "0 0 12px #fb7185, 0 0 20px rgba(251, 113, 133, 0.4)",
              animation: `${pulse} 2s infinite ease-in-out`,
              position: "relative",
              "&::after": {
                content: '""',
                position: "absolute",
                inset: -4,
                borderRadius: "50%",
                border: "2px solid #fb7185",
                animation: `${pulseOutline} 2s infinite ease-out`,
              }
            }}
          />
          <Typography
            variant="caption"
            fontWeight={1000}
            color="#0f172a"
            sx={{ letterSpacing: 2, fontSize: 11 }}
          >
            LIVE ACTIVITY FEED
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 1.8,
          flex: 1,
          overflowY: "auto",
          "&::-webkit-scrollbar": { display: "none" },
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {feedItems.map((feed, idx) => {
          // Dynamic message generation
          let displayMsg = "";
          if (feed.type === "RESULT") {
            const hName = extractPlayer(feed.data?.home || feed.homeTeamName || "?");
            const aName = extractPlayer(feed.data?.away || feed.awayTeamName || "?");
            const hScore = feed.data?.HomeScore ?? feed.data?.homeScore ?? feed.homeScore ?? 0;
            const aScore = feed.data?.AwayScore ?? feed.data?.awayScore ?? feed.awayScore ?? 0;
            const isDraw = hScore === aScore;
            const diff = Math.abs(hScore - aScore);
            const winner = hScore > aScore ? hName : aName;
            const loser = hScore > aScore ? aName : hName;
            const wScore = Math.max(hScore, aScore);
            const lScore = Math.min(hScore, aScore);

            const drawTemplates = [
              `แบ่งแต้มกันไป! ${hName} เสมอกับ ${aName} ${hScore}-${aScore} แบบสุดระทึก`,
              `ศึกศักดิ์ศรีจบลงที่ ${hScore}-${aScore}! ${hName} และ ${aName} สู้กันได้สมศักดิ์ศรี`,
              `คะแนนเท่ากัน! ${hName} และ ${aName} จบเกมที่สกอร์ ${hScore}-${aScore}`,
              `เกมรับเหนียวแน่น! ${hName} และ ${aName} ทำอะไรกันไม่ได้มากจบที่ ${hScore}-${aScore}`,
              `เจ๊ากันไป! ${hName} และ ${aName} กอดคอแบ่งแต้ม ${hScore}-${aScore}`,
              `สู้กันจนนาทีสุดท้าย! ${hName} เสมอ ${aName} ${hScore}-${aScore}`,
              `ผลเสมอที่น่าทึ่ง! ${hName} และ ${aName} แบ่งแต้มกันไป ${hScore}-${aScore}`,
              `ไม่มีใครยอมใคร! ${hName} และ ${aName} จบที่สกอร์ ${hScore}-${aScore}`,
              `กินกันไม่ลง! ${hName} และ ${aName} จบเกมที่สกอร์ ${hScore}-${aScore}`,
              `จบแมตช์ด้วยผลเสมอ! ${hName} และ ${aName} กินกันไม่ลง ${hScore}-${aScore}`,
              `จบเกมสุดมันส์! ${hName} ${hScore} - ${aScore} ${aName} แบ่งแต้มกันไป`,
              `ศึกบิ๊กแมตช์จบลงแล้ว! ${hName} ${hScore} - ${aScore} ${aName} สู้กันยิบตา`,
              `สรุปผลสดๆ: ${hName} ${hScore} - ${aScore} ${aName} สนุกตื่นเต้นทุกวินาที`
            ];

            const closeWinTemplates = [
              `ชัยชนะเป็นของ ${winner}! เอาชนะ ${loser} ไปได้ ${wScore}-${lScore}`,
              `${winner} เก็บชัยได้สำเร็จ! เฉือนเอาชนะ ${loser} ไปอย่างหวุดหวิด ${wScore}-${lScore}`,
              `ผลการแข่งขัน: ${winner} คว้าชัยเหนือ ${loser} ${wScore}-${lScore}`,
              `ชัยชนะอันล้ำค่า! ${winner} เฉือนเอาชนะ ${loser} ไปได้ ${wScore}-${lScore}`,
              `แฟนบอลเฮลั่น! ${winner} เก็บ 3 แต้มสำคัญเหนือ ${loser} ${wScore}-${lScore}`,
              `เกมคุณภาพ! ${winner} ฮึดสู้จนวินาทีสุดท้ายเอาชนะ ${loser} ${wScore}-${lScore}`,
              `${winner} แกร่งพอที่จะคว้าชัย! ชนะ ${loser} ไปได้ ${wScore}-${lScore}`,
              `จบเกม! ${winner} ทำได้ตามเป้า เอาชนะ ${loser} ${wScore}-${lScore}`,
              `สามแต้มเข้ากระเป๋า! ${winner} เบียดเอาชนะ ${loser} ไปอย่างสนุก ${wScore}-${lScore}`,
              `${winner} เฉือนคม! คว้าชัยเหนือ ${loser} ในแมตช์ที่สูสีที่สุด ${wScore}-${lScore}`
            ];

            const crushingWinTemplates = [
              `${winner} โชว์ฟอร์มดุ! ถล่ม ${loser} เก็บ 3 แต้มสำคัญ ${wScore}-${lScore}`,
              `${winner} แกร่งเกินต้าน! ถล่มเอาชนะ ${loser} ไปได้ ${wScore}-${lScore}`,
              `บุกแหลก! ${winner} ถล่ม ${loser} ไปแบบขาดลอย ${wScore}-${lScore}`,
              `ฟอร์มแชมป์! ${winner} จัดหนักถล่ม ${loser} คาบ้าน ${wScore}-${lScore}`,
              `${winner} ระเบิดฟอร์มเทพ! ถล่มเอาชนะ ${loser} ไปอย่างเหนือชั้น ${wScore}-${lScore}`,
              `ขาดลอย! ${winner} โชว์เหนือชั้นถล่ม ${loser} เละเทะ ${wScore}-${lScore}`,
              `${winner} ไร้ปรานี! เดินหน้าทำสกอร์ถล่ม ${loser} ${wScore}-${lScore}`,
              `วันของ ${winner}! ถล่ม ${loser} เก็บชัยชนะที่ยิ่งใหญ่ที่สุด ${wScore}-${lScore}`,
              `${winner} เครื่องจักรสังหาร! ถล่มเอาชนะ ${loser} ไปได้แบบสบายๆ ${wScore}-${lScore}`,
              `จบเกมที่สกอร์ขาดลอย! ${winner} ถล่ม ${loser} ยับเยิน ${wScore}-${lScore}`
            ];

            if (isDraw) {
              displayMsg = drawTemplates[idx % drawTemplates.length];
            } else if (diff >= 3) {
              displayMsg = crushingWinTemplates[idx % crushingWinTemplates.length];
            } else {
              displayMsg = closeWinTemplates[idx % closeWinTemplates.length];
            }
          } else if (feed.type === "MARKET") {
            const manager = feed.data?.manager || "สโมสร";
            const player = feed.data?.player || "นักเตะ";
            const templates = [
              `${manager} ประกาศขึ้นบัญชีขาย ${player} ลงสู่ตลาด!`,
              `ข่าวร้อน! ${manager} พร้อมเปิดรับข้อเสนอสำหรับ ${player}`,
              `${manager} กำลังมองหาโอกาสปล่อยตัว ${player} ทันที!`,
              `ดีลน่าสนใจ! ${manager} ตัดใจปล่อย ${player} ออกจากทีม`,
              `${manager} ปักป้ายขาย ${player} แฟนๆ รอลุ้นสังกัดใหม่!`,
              `ใครจะคว้าไป? ${manager} ปล่อย ${player} เข้าสู่ตลาดซื้อขาย`,
              `${manager} เตรียมปรับทัพ! ประกาศขาย ${player} เรียบร้อย`,
              `ข้อเสนอต้องโดน! ${manager} รอคนมาดึง ${player} ไปร่วมทีม`,
              `${manager} ประกาศวางตัว ${player} ไว้ในรายการขาย!`,
              `ตลาดเริ่มเดือด! ${manager} ส่ง ${player} ลงชิงชัยในตลาดนักเตะ`,
              `${manager} เปิดไฟเขียว! ${player} พร้อมย้ายสังกัดแล้ว`,
              `ดีลใหญ่กำลังมา? ${manager} ปล่อย ${player} ลงตลาดซื้อขาย`,
              `${manager} ประกาศหาบ้านใหม่ให้ ${player} ทันที!`,
              `โอกาสทอง! ${manager} พร้อมปล่อย ${player} ให้ทีมที่สนใจ`,
              `${manager} ขยับทัพ! ขึ้นป้ายขาย ${player} เรียบร้อย`,
              `จับตาให้ดี! ${manager} ปล่อย ${player} ลงสู่ตลาดนักเตะแล้ว`,
              `${manager} ตัดสินใจเด็ดขาด! ประกาศปล่อย ${player} ออกจากทีม`,
              `ตลาดสั่นสะเทือน! ${manager} พร้อมขาย ${player} ทันที`,
              `${manager} เปิดรับทุกข้อเสนอสำหรับ ${player} ในเวลานี้`,
              `ข่าววงใน! ${manager} เตรียมปล่อย ${player} เพื่อสมทบทุนเสริมทัพ`
            ];
            // If it's an actual listing from transfer board, use templates. 
            // If it's a transaction (like release), use the original message.
            // Filter out Season info for display
            const cleanMsg = (feed.msg || "").replace(/\s*\(Season\s*\d+\)\s*/gi, " ").trim();
            displayMsg = feed.isListing ? templates[(idx * 3) % 20] : cleanMsg;
          } else if (feed.type === "DEAL") {
            const manager = feed.data?.manager || "สโมสร";
            const player = feed.data?.player || "นักเตะ";
            const templates = [
              `ปิดดีลสายฟ้าแลบ! ${manager} คว้าตัว ${player} สำเร็จ!`,
              `ยินดีด้วยกับ ${manager}! เสริมทัพด้วย ${player} เรียบร้อย!`,
              `บอร์ดบริหารปลื้ม! ${manager} เจรจาปิดดีล ${player} สำเร็จ!`,
              `${manager} ประกาศเปิดตัว ${player} เสริมความแข็งแกร่ง!`,
              `ดีลยักษ์จบลงแล้ว! ${manager} สอย ${player} เข้ารังสำเร็จ`,
              `${manager} เดินเกมไว! คว้า ${player} เข้าสู่สโมสรเรียบร้อย`,
              `แฟนคลับเฮ! ${manager} ประกาศความสำเร็จในการคว้า ${player}`,
              `${manager} เสริมคม! ดีล ${player} เข้าทีมอย่างเป็นทางการ`,
              `ปิดจ๊อบ! ${manager} เจรจาลงตัว คว้า ${player} ร่วมทัพ`,
              `ข่าวดีของแฟนๆ! ${manager} จัดหนักคว้าตัว ${player} เสริมทีม`,
              `บอร์ดบริหารเฮ! ${manager} ปิดดีล ${player} ระดับท็อปเสริมทัพ`,
              `${manager} จัดหนัก! คว้าตัว ${player} เข้าสู่ทีมสำเร็จ`,
              `ยินดีด้วยกับ ${manager}! ได้ ${player} มาเติมเต็มส่วนที่ขาด`,
              `ดีลประวัติศาสตร์! ${manager} คว้า ${player} ร่วมทีมอย่างยิ่งใหญ่`,
              `${manager} เสริมความโหด! เปิดตัว ${player} สู่แฟนบอล`,
              `ปิดจ๊อบสุดสวย! ${manager} เจรจาคว้า ${player} สำเร็จเรียบร้อย`,
              `ข่าวดีต่อเนื่อง! ${manager} เสริม ${player} เข้าสู่สโมสร`,
              `${manager} เดินเครื่องเต็มสูบ! ปิดดีล ${player} ได้ทันท่วงที`,
              `แฟนบอลปลื้ม! ${manager} จัดแจงคว้า ${player} เสริมความแข็งแกร่ง`,
              `สำเร็จเสร็จสิ้น! ${manager} ประกาศปิดดีล ${player} เข้าทีม`
            ];
            displayMsg = templates[(idx * 3) % 20];
          }

          return (
            <Box
              key={idx}
              sx={{
                display: "flex",
                gap: 2,
                position: "relative",
                flexShrink: 0,
                animation: `${float} 6s ease-in-out infinite`,
                animationDelay: `${idx * 0.8}s`,
                willChange: "transform",
                "&:not(:last-child)::after": {
                  content: '""',
                  position: "absolute",
                  left: 14,
                  top: 30,
                  bottom: -20,
                  width: 1.5,
                  bgcolor: "rgba(15,23,42,0.06)",
                  zIndex: 0,
                }
              }}
            >
              <Box
                sx={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  bgcolor: alpha(feed.color, 0.12),
                  color: feed.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  border: `1px solid ${alpha(feed.color, 0.2)}`,
                  position: "relative",
                  zIndex: 1,
                }}
              >
                {feed.icon}
              </Box>
              <Box sx={{ flex: 1, minWidth: 0, pt: 0.2 }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: feed.color,
                    fontWeight: 900,
                    fontSize: 9,
                    display: "block",
                    mb: 0.3,
                    letterSpacing: 0.5,
                  }}
                >
                  {feed.type} • {feed.time}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: "#0f172a",
                    fontWeight: 800,
                    fontSize: 12,
                    lineHeight: 1.5,
                    wordBreak: "break-word",
                  }}
                >
                  {displayMsg || feed.msg}
                </Typography>
                {feed.detail && (
                  <Typography
                    variant="caption"
                    sx={{
                      color: "#f59e0b",
                      fontWeight: 800,
                      fontSize: 11,
                      display: "block",
                      mt: 0.2
                    }}
                  >
                    • {feed.detail}
                  </Typography>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>

      <Box
        sx={{
          mt: 2,
          pt: 2,
          borderTop: "1px solid rgba(15,23,42,0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 1,
        }}
      >
        <Typography variant="caption" fontWeight={800} color="text.disabled">
          FOLLOW US
        </Typography>
        <Box display="flex" gap={0.5}>
          {[
            {
              icon: <Facebook sx={{ fontSize: 16 }} />,
              url: "https://www.facebook.com/thaipesleague",
            },
            {
              icon: <LineIcon sx={{ fontSize: 16 }} />,
              url: "https://lin.ee/TxcwFFB",
            },
            {
              icon: <YouTube sx={{ fontSize: 16 }} />,
              url: "https://www.youtube.com/@iamcrazygamerch",
            },
            {
              icon: <DiscordIcon sx={{ fontSize: 16 }} />,
              url: "https://discord.gg/jXsh65jqy",
            },
          ].map((social, i) => (
            <IconButton
              key={i}
              component="a"
              href={social.url}
              target="_blank"
              size="small"
              sx={{
                color: "rgba(15,23,42,0.4)",
                transition: "0.2s",
                "&:hover": {
                  color: "#4f46e5",
                  bgcolor: "rgba(79,70,229,0.05)",
                },
              }}
            >
              {social.icon}
            </IconButton>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default LiveFeed;
