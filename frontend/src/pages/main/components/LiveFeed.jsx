import { useMemo, useState, useEffect } from "react";
import axiosInstance from "../../../api/axiosInstance";
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

const FALLBACK_TEMPLATES = {
  MATCH_DRAW: "แบ่งแต้มกันไป! {home} เสมอกับ {away} {hScore}-{aScore}",
  MATCH_WIN_CLOSE: "ชัยชนะเป็นของ {winner}! เอาชนะ {loser} ไปได้ {wScore}-{lScore}",
  MATCH_WIN_CRUSHING: "{winner} โชว์ฟอร์มดุ! ถล่ม {loser} เก็บ 3 แต้มสำคัญ {wScore}-{lScore}",
  MARKET_ACTIVITY: "{manager} ประกาศขึ้นบัญชีขาย {player} ลงสู่ตลาด!",
  DEAL_ACTIVITY: "ปิดดีลสายฟ้าแลบ! {manager} คว้าตัว {player} สำเร็จ!"
};

const getTemplate = (templates, category, index) => {
  const filtered = templates.filter(t => t.category === category).map(t => t.templateText);
  if (filtered.length > 0) return filtered[index % filtered.length];
  return FALLBACK_TEMPLATES[category] || "";
};

const LiveFeed = ({ lastFixtures, marketActivity }) => {
  const [dbTemplates, setDbTemplates] = useState([]);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await axiosInstance.get("/api/NotificationTemplate?platform=LIVE_FEED");
        setDbTemplates(response.data || []);
      } catch (error) {
        console.error("Failed to fetch notification templates:", error);
        setDbTemplates([]);
      }
    };
    fetchTemplates();
  }, []);

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

            const category = isDraw ? "MATCH_DRAW" : (diff >= 3 ? "MATCH_WIN_CRUSHING" : "MATCH_WIN_CLOSE");
            const template = getTemplate(dbTemplates, category, idx);
            
            displayMsg = template
              .replace("{home}", hName)
              .replace("{away}", aName)
              .replace("{winner}", winner)
              .replace("{loser}", loser)
              .replace("{hScore}", hScore)
              .replace("{aScore}", aScore)
              .replace("{wScore}", wScore)
              .replace("{lScore}", lScore);

          } else if (feed.type === "MARKET") {
            const manager = feed.data?.manager || "สโมสร";
            const player = feed.data?.player || "นักเตะ";
            const cleanMsg = (feed.msg || "").replace(/\s*\(Season\s*\d+\)\s*/gi, " ").trim();
            
            displayMsg = feed.isListing 
              ? getTemplate(dbTemplates, "MARKET_ACTIVITY", idx * 3).replace("{manager}", manager).replace("{player}", player)
              : cleanMsg;

          } else if (feed.type === "DEAL") {
            const manager = feed.data?.manager || "สโมสร";
            const player = feed.data?.player || "นักเตะ";
            displayMsg = getTemplate(dbTemplates, "DEAL_ACTIVITY", idx * 3).replace("{manager}", manager).replace("{player}", player);
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
