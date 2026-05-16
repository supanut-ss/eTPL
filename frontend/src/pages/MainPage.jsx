import { useState, useEffect, useMemo } from "react";
import {
  Typography,
  Box,
  Paper,
  Divider,
  Alert,
  Skeleton,
  IconButton,
  Avatar,
  Grid,
} from "@mui/material";
import {
  Facebook,
  YouTube,
} from "@mui/icons-material";
import { useAuth } from "../store/AuthContext";
import { getStandings } from "../api/standingApi";
import {
  getFixtures,
  getPublicFixtures,
  getPublicLastFixtures,
} from "../api/fixtureApi";
import { getPublicAnnouncements } from "../api/announcementApi";
import { getUsers } from "../api/userApi";
import { hofApi } from "../api/hofApi";
import auctionService from "../services/auctionService";

// Components
import AiMagazineBox from "./main/components/AiMagazine";
import EventUpdateBox from "./main/components/EventUpdate";
import TopStandingBox from "./main/components/TopStanding";
import LatestResultBox from "./main/components/LatestResult";
import TopScorerBox from "./main/components/TopScorer";
import HofBox from "./main/components/HallOfFame";
import EliteShowcaseBox from "./main/components/EliteShowcase";
import ActiveMemberBox from "./main/components/ActiveMember";
import HeroBanner from "./main/components/HeroBanner";
import LiveFeed from "./main/components/LiveFeed";

// Shared Components
import { LineIcon, DiscordIcon } from "./main/components/shared/icons";
import { 
  DESIGN_TOKENS, 
  panelSx, 
  DASHBOARD_ROW_HEIGHT 
} from "./main/components/shared/designTokens";



const MainPage = () => {
  const { user } = useAuth();
  const [standings, setStandings] = useState([]);
  const [fixtures, setFixtures] = useState([]);
  const [lastFixtures, setLastFixtures] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [members, setMembers] = useState([]);
  const [memberBannerIndex, setMemberBannerIndex] = useState(0);
  const [marketActivity, setMarketActivity] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [magazineData, setMagazineData] = useState([]);
  const [eventData, setEventData] = useState([]);
  const [hofData, setHofData] = useState([]);
  const [elitePlayers, setElitePlayers] = useState([]);

  const fetchDashboardData = (isSilent = false) => {
    if (!isSilent) setLoading(true);
    const fixtureRequest = user ? getFixtures({}) : getPublicFixtures();
    
    return Promise.all([
      fixtureRequest,
      getPublicLastFixtures(),
      getPublicAnnouncements("News"),
      auctionService.getClubs().catch(() => ({ data: [] })),
      getPublicAnnouncements("Magazine").catch(() => ({ data: { data: [] } })),
      getPublicAnnouncements("Event").catch(() => ({ data: { data: [] } })),
      auctionService.getCompletedAuctions().catch(() => ({ data: [] })),
      getUsers().catch(() => ({ data: { data: [] } })),
    ])
      .then(([fRes, lastRes, aRes, cRes, hRes, eRes, ePlayersRes, uRes]) => {
        setFixtures(fRes.data.data || []);
        setLastFixtures(lastRes.data.data || []);
        setAnnouncements((aRes.data.data || []).sort((a, b) => new Date(b.createDate) - new Date(a.createDate)));
        setClubs(cRes.data || cRes || []);
        setMagazineData((hRes.data?.data || []).sort((a, b) => new Date(b.createDate) - new Date(a.createDate)));
        setEventData((eRes.data?.data || []).sort((a, b) => new Date(b.createDate) - new Date(a.createDate)));
        setMembers(uRes.data.data || []);

        // Elite Players (Top Unique by Price)
        let allElite = [];
        if (ePlayersRes) {
          if (Array.isArray(ePlayersRes.data)) {
            allElite = ePlayersRes.data;
          } else if (Array.isArray(ePlayersRes)) {
            allElite = ePlayersRes;
          }
        }

        const uniqueEliteMap = new Map();
        allElite.forEach(player => {
          const pId = player.playerId || player.idPlayer || player.id;
          if (!pId) return;
          const existing = uniqueEliteMap.get(pId);
          const currentPrice = player.currentPrice || player.CurrentPrice || player.pricePaid || 0;
          const existingPrice = existing ? (existing.currentPrice || existing.CurrentPrice || existing.pricePaid || 0) : -1;
          
          if (!existing || currentPrice > existingPrice) {
            uniqueEliteMap.set(pId, player);
          }
        });

        const sortedElite = Array.from(uniqueEliteMap.values())
          .sort((a, b) => {
            const bPrice = b.currentPrice || b.CurrentPrice || b.pricePaid || 0;
            const aPrice = a.currentPrice || a.CurrentPrice || a.pricePaid || 0;
            if (bPrice !== aPrice) return bPrice - aPrice;
            return (b.playerOvr || b.PlayerOvr || 0) - (a.playerOvr || a.PlayerOvr || 0);
          })
          .slice(0, 12);
        setElitePlayers(sortedElite);

        // --- Live Activity Feed Data ---
        return Promise.all([
          auctionService.getGlobalTransactions(1, 100).catch(() => ({ data: [] })),
          auctionService.getTransferBoard().catch(() => ({ data: [] })),
        ]).then(([tRes, bRes]) => {
          const txs = tRes.data?.items || tRes.items || (Array.isArray(tRes.data) ? tRes.data : []);
          const listings = bRes.data || bRes || (Array.isArray(bRes.data) ? bRes.data : []);
          const combined = [];

          // Add Transactions (Deals & Market Activity)
          txs.forEach((tx) => {
            const pName = tx.playerName || tx.PlayerName || tx.relatedPlayerName || "นักเตะ";
            const uName = tx.userName || tx.UserName || tx.highestBidderName || "ระบบ";
            const rawDesc = tx.description || tx.Description || "ทำรายการสำเร็จ";
            const txDate = tx.createdAt || tx.CreatedAt || tx.createDate || tx.CreateDate || tx.date || tx.Date;
            const txType = tx.type || tx.Type || "";
            
            // HIDE sensitive/secret items from Live Feed
            const secretTypes = ["AUCTION_BID", "AUCTION_REFUND", "CONTRACT_RENEWAL", "CONTRACT_RENEWAL_AUTO", "BONUS"];
            if (secretTypes.includes(txType)) return;

            if (txDate) {
              const lowerDesc = rawDesc.toLowerCase();
              const isDeal = txType.includes("WIN") || txType.includes("BUY") || txType.includes("SELL") || 
                             lowerDesc.includes("won") || lowerDesc.includes("ชนะ") || lowerDesc.includes("signed") || lowerDesc.includes("ปิดดีล");

              combined.push({
                id: `tx-${tx.transactionId || tx.id || Math.random()}`,
                type: isDeal ? "DEAL" : "MARKET",
                title: pName,
                subtitle: `${uName} ${rawDesc}`,
                amount: tx.amount || tx.Amount || tx.currentPrice || tx.CurrentPrice || 0,
                date: txDate,
                player: pName,
                manager: uName,
                isListing: false,
                txType: txType,
              });
            }
          });

          // Add Active Auctions / Market Listings
          listings.forEach((player) => {
            const pName = player.playerName || player.PlayerName || player.idPlayer || "นักเตะ";
            const owner = player.ownerName || player.OwnerName || player.sellerName || "สโมสร";
            const pDate = player.createDate || player.CreateDate || player.createdAt || player.CreatedAt || player.updatedAt || player.UpdatedAt || player.listedAt || player.ListedAt || player.date || player.Date;
            
            if (pDate) {
              combined.push({
                id: `listing-${player.auctionId || player.id || player.squadId || Math.random()}`,
                type: "MARKET",
                title: pName,
                subtitle: `${owner} ประกาศปล่อย ${pName} ลงสู่ตลาด!`,
                amount: player.listingPrice || player.price || player.currentPrice || player.CurrentPrice || player.valuation || 0,
                date: pDate,
                player: pName,
                manager: owner,
                isListing: true,
              });
            }
          });

          setMarketActivity(combined.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 50));
        });
      })
      .catch((err) => {
        if (!isSilent) setError(err.response?.data?.message || err.message || "Failed to load dashboard data");
      })
      .finally(() => {
        if (!isSilent) setLoading(false);
      });
  };

  const fetchStaticData = () => {
    getStandings().then(sRes => setStandings(sRes.data.data || []));
    hofApi.getHof().then(hfRes => setHofData(hfRes || []));
  };

  useEffect(() => {
    fetchDashboardData();
    fetchStaticData();

    // Auto-reload dynamic data every 60 seconds
    const dynamicIntervalId = setInterval(() => {
      fetchDashboardData(true);
    }, 60000);

    // Auto-reload standings/static data every 5 minutes
    const staticIntervalId = setInterval(() => {
      fetchStaticData();
    }, 300000);

    return () => {
      clearInterval(dynamicIntervalId);
      clearInterval(staticIntervalId);
    };
  }, [user]);




  const season = standings[0]?.season || "";

  const enrichedStandings = useMemo(() => {
    return (standings || []).map((row) => {
      // Improve matching with trim and case-insensitivity
      const club = (clubs || []).find(
        (c) => (c.teamName || "").trim().toLowerCase() === (row.teamName || "").trim().toLowerCase()
      );
      return {
        ...row,
        linePic: club?.linePic || null,
        lineName: club?.lineName || null,
      };
    });
  }, [standings, clubs]);

  const recentMatches = useMemo(() => (lastFixtures || []).slice(0, 25), [lastFixtures]);

  const sortedMembers = members
    .filter((member) => member.userLevel !== "admin")
    .sort((a, b) => {
      return (a.userId || "").localeCompare(b.userId || "");
    });
  const memberBannerSize = 4;
  const memberBannerCount = Math.ceil(sortedMembers.length / memberBannerSize);
  const visibleMembers = sortedMembers.slice(
    memberBannerIndex * memberBannerSize,
    memberBannerIndex * memberBannerSize + memberBannerSize,
  );

  useEffect(() => {
    setMemberBannerIndex(0);
  }, [sortedMembers.length]);

  useEffect(() => {
    if (memberBannerCount <= 1) return undefined;

    const timerId = setInterval(() => {
      setMemberBannerIndex((prev) => (prev + 1) % memberBannerCount);
    }, 4500);

    return () => clearInterval(timerId);
  }, [memberBannerCount]);

  // Market activity is static list in sidebar, no auto-index needed




  // recentMatches rotation is handled internally in LatestResultBox


  return (
    <>
      <Box
        sx={{
          width: "100%",
          px: { xs: 2, md: 4 },
          pt: { xs: 2, md: 4 },
          pb: 4,
          minHeight: "100vh",
          background: DESIGN_TOKENS.background,
          backgroundImage: `radial-gradient(circle at 14% 46%, ${DESIGN_TOKENS.glowA}, transparent 38%), radial-gradient(circle at 86% 28%, ${DESIGN_TOKENS.glowB}, transparent 36%)`,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: 0,
            mb: 4,
            borderRadius: 0,
            background: "transparent",
            position: "relative",
            overflow: "visible",
            boxShadow: "none",
            border: "none",
          }}
        >
          {/* TOP SECTION: Hero Banner + Live Feed */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "8fr 4fr",
              },
              gap: { xs: 2, md: 3 },
              alignItems: "stretch",
              position: "relative",
              zIndex: 1,
            }}
          >
            {/* LEFT: Hero Banner (News Showcase) */}
            <HeroBanner announcements={announcements} />

            {/* RIGHT: Live Feed Center */}
            <LiveFeed lastFixtures={lastFixtures} marketActivity={marketActivity} />
          </Box>
        </Paper>


        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, 1fr)",
              md: "repeat(4, 1fr)",
            },
            gap: { xs: 2.5, md: 3 },
            mb: 3,
          }}
        >
          {/* Row 1: Ai Magazine, Event, Standing, Latest */}
          <Paper elevation={0} sx={{ ...panelSx, p: 0, height: 395, overflow: "hidden" }}>
            <AiMagazineBox magazineData={magazineData.slice(0, 5)} loading={loading} />
          </Paper>

          <Paper elevation={0} sx={{ ...panelSx, p: 0, height: 395, overflow: "hidden" }}>
            <EventUpdateBox announcements={eventData.slice(0, 5)} loading={loading} />
          </Paper>

          <Paper
            elevation={0}
            sx={{ ...panelSx, p: 0, height: 395, display: "flex", flexDirection: "column" }}
          >
            <TopStandingBox standings={standings} loading={loading} />
          </Paper>

          <Paper
            elevation={0}
            sx={{ ...panelSx, p: 0, height: 395, display: "flex", flexDirection: "column" }}
          >
            <LatestResultBox recentMatches={recentMatches} loading={loading} />
          </Paper>

          {/* Row 2: Elite showcase, Top Score, Hof, Active Member */}
          <Paper elevation={0} sx={{ ...panelSx, p: 0, height: 395 }}>
            <EliteShowcaseBox elitePlayers={elitePlayers} loading={loading} clubs={clubs} />
          </Paper>

          <Paper elevation={0} sx={{ ...panelSx, p: 0, minHeight: DASHBOARD_ROW_HEIGHT * 6 }}>
            <TopScorerBox standings={enrichedStandings} loading={loading} />
          </Paper>

          <Paper elevation={0} sx={{ ...panelSx, p: 0, minHeight: DASHBOARD_ROW_HEIGHT * 6 }}>
            <HofBox hofData={hofData} loading={loading} />
          </Paper>

          <Paper elevation={0} sx={{ ...panelSx, p: 0, minHeight: DASHBOARD_ROW_HEIGHT * 6 }}>
            <ActiveMemberBox
              visibleMembers={visibleMembers}
              loading={loading}
              currentIndex={memberBannerIndex}
              totalCount={sortedMembers.length}
              pageSize={memberBannerSize}
              onPageChange={setMemberBannerIndex}
            />
          </Paper>
        </Box>



        {/* ─── Super Minimal Footer ─── */}
        <Box
          component="footer"
          sx={{
            mt: 4,
            background:
              "linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(241, 245, 249, 0.96) 100%)",
            borderTop: `1px solid ${DESIGN_TOKENS.border}`,
            pt: 4,
            pb: 3,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {/* Subtle Partners List */}
          <Box
            sx={{
              width: "100%",
              maxWidth: 1000,
              px: 4,
              mb: 4,
              display: "flex",
              justifyContent: "space-around",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 3,
              opacity: 0.62,
            }}
          >
            {[
              "eFOOTBALL",
              "KONAMI",
              "THAI PES LEAGUE",
              "eTPL",
              "เล่นเกมมันผิดตรงไหน",
            ].map((name, i) => (
              <Typography
                key={i}
                variant="caption"
                fontWeight={900}
                sx={{
                  color: "rgba(15,23,42,0.62)",
                  letterSpacing: 2,
                  fontSize: 10,
                }}
              >
                {name}
              </Typography>
            ))}
          </Box>

          <Divider
            sx={{
              width: "100%",
              maxWidth: 1100,
              borderColor: "rgba(15,23,42,0.12)",
              mb: 3,
            }}
          />

          {/* Clean Bottom Bar */}
          <Box
            sx={{
              width: "100%",
              maxWidth: 1100,
              px: 4,
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              justifyContent: "space-between",
              alignItems: "center",
              gap: { xs: 3, sm: 0 }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexDirection: { xs: "column", sm: "row" }, textAlign: { xs: "center", sm: "left" } }}>
              <Box 
                component="img"
                src="/logo-etpl.png"
                alt="eTPL Logo"
                sx={{ 
                  height: 35, 
                  width: 'auto',
                  filter: 'grayscale(1) opacity(0.4)',
                  transition: '0.3s',
                  '&:hover': { filter: 'grayscale(0) opacity(0.8)' }
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  color: "rgba(15,23,42,0.56)",
                  fontWeight: 600,
                  letterSpacing: 0.5,
                }}
              >
                © {new Date().getFullYear()} THAI PES LEAGUE. ALL RIGHTS
                RESERVED.
              </Typography>
            </Box>

            <Box display="flex" gap={1}>
              {[
                {
                  icon: <Facebook sx={{ fontSize: 18 }} />,
                  url: "https://www.facebook.com/thaipesleague",
                },
                {
                  icon: <LineIcon sx={{ fontSize: 18 }} />,
                  url: "https://lin.ee/TxcwFFB",
                },
                {
                  icon: <YouTube sx={{ fontSize: 18 }} />,
                  url: "https://www.youtube.com/@iamcrazygamerch",
                },
                {
                  icon: <DiscordIcon sx={{ fontSize: 18 }} />,
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
                    color: "rgba(15,23,42,0.48)",
                    transition: "0.2s",
                    "&:hover": { color: "#4f46e5", bgcolor: "transparent" },
                  }}
                >
                  {social.icon}
                </IconButton>
              ))}
            </Box>
          </Box>
        </Box>
      </Box>
    </>
  );
};

export default MainPage;
