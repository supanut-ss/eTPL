import { 
  Box, 
  Typography, 
  Grid, 
  Paper, 
  Avatar, 
  Button, 
  Stack, 
  Divider,
  Breadcrumbs,
  Link,
  useTheme,
  useMediaQuery,
  alpha
} from "@mui/material";
import { 
  Home, 
  Groups, 
  EmojiEvents, 
  Public, 
  Diversity3, 
  AutoAwesome, 
  Facebook, 
  Forum, 
  SportsSoccer, 
  Gavel, 
  MilitaryTech, 
  Campaign,
  HistoryEdu,
  Timeline,
  Star,
  Web,
  AccountBalanceWallet,
  RssFeed
} from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";

const timelineData = [
  { 
    year: "2018", 
    color: "#6366f1", 
    title: "The Beginning", 
    game: "PES 2018 & 2019 (PC)", 
    etpl: (
      <span>
        Initiated Knockout Tournaments and the Thai PES League Season 1 (Standard Team category). 
        Operations were conducted via the <b><a href="https://www.facebook.com/iamcrazygamer/" target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1', textDecoration: 'none' }}>'เล่นเกมมันผิดตรงไหน'</a></b> Facebook page, 
        alongside the unveiling of the league's first official logo.
      </span>
    )
  },
  { 
    year: "2019", 
    color: "#8b5cf6", 
    title: "Expanding Horizons", 
    game: "eFootball PES 2020", 
    etpl: (
      <span>
        Officially established the <b><a href="https://www.facebook.com/thaipesleague/" target="_blank" rel="noopener noreferrer" style={{ color: '#8b5cf6', textDecoration: 'none' }}>'Thai PES League'</a></b> Facebook page 
        and expanded the scope of the competition to encompass PlayStation and Mobile platforms. 
        Additionally, pioneered the implementation of a player auction system for team management.
      </span>
    )
  },
  { 
    year: "2020 - 2022", 
    color: "#ec4899", 
    title: "Esports Transition", 
    game: "PES 2021 Season Update", 
    etpl: "Maintained continuous league operations throughout the game's developmental transition period (with the Mobile competition operating independently). The primary objective was to elevate the player community to meet professional Esports standards." 
  },
  { 
    year: "2023", 
    color: "#f59e0b", 
    title: "New Era", 
    game: "eFootball 2023", 
    etpl: "Entered a new chapter by officially launching competitive tournaments on the eFootball 2023 platform." 
  },
  { 
    year: "2024", 
    color: "#0ea5e9", 
    title: "Strategic Rebranding", 
    game: "eFootball 2023-2024", 
    etpl: "Rebranded the competition to 'eTPL by Thai PES League' and restructured operations to sustain competitive integrity. The strategic focus was directed towards the robust PC platform, concurrently assessing the decelerating player engagement within the PlayStation segment." 
  },
  { 
    year: "2025", 
    color: "#10b981", 
    title: "Unified Community", 
    game: "eFootball 2024-2025", 
    etpl: "Fully implemented Cross-platform Integration, seamlessly connecting Console and PC player bases. This strategic move significantly enhanced the scale and standardization of the leaderboard and ranking systems." 
  },
  { 
    year: "2026", 
    color: "#d1ad73", 
    title: "Digital Management", 
    game: "eFootball 2025-2026", 
    etpl: "Transitioned to a fully automated digital management ecosystem via the eTPL Web Platform and officially unveiled the current league logo." 
  }
];

const AboutUsPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Box sx={{ bgcolor: "#f8fafc", minHeight: "100vh", px: { xs: 1, md: 2 }, pb: 4 }}>
      <div id="back-to-top-anchor" />
      
      {/* Top Level Page Header (Matched with UserManualPage) */}
      <Box sx={{ pt: 3, pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Diversity3 color="primary" sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h5" fontWeight="bold">About Us</Typography>
            <Typography variant="body2" color="text.secondary">
              COMMUNITY INFO
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Top Banner - Compact Style */}
      <Box 
        sx={{ 
          mb: 3,
          position: 'relative',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          p: { xs: 2.5, md: 3.5 },
          borderRadius: '40px',
          color: "white",
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.05)",
          boxShadow: '0 40px 100px rgba(0,0,0,0.3)',
        }}
      >
        <Box sx={{ 
          position: 'absolute', 
          top: -100, right: -100, 
          width: 300, height: 300, 
          borderRadius: '50%', 
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 70%)',
          zIndex: 0 
        }} />
        <Box sx={{ 
          position: 'absolute', 
          bottom: -50, left: -50, 
          width: 200, height: 200, 
          borderRadius: '50%', 
          background: 'radial-gradient(circle, rgba(209, 173, 115, 0.05) 0%, transparent 70%)',
          zIndex: 0 
        }} />

        <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Box 
              sx={{ 
                display: 'flex', 
                flexDirection: 'row', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                gap: 4
              }}
            >
            {/* Left Column: Branding & Title */}
            <Box sx={{ textAlign: { xs: 'center', md: 'left' }, flex: 1 }}>
              <Box 
                component="img"
                src="/logo-etpl.png"
                alt="eTPL Logo"
                sx={{ 
                  height: 70, 
                  width: 'auto', 
                  mb: 1.5, 
                  filter: 'drop-shadow(0 0 20px rgba(209, 173, 115, 0.2))',
                  display: 'inline-block',
                }}
              />
              <Typography 
                variant="caption" 
                sx={{ 
                  color: '#d1ad73', 
                  fontWeight: 900, 
                  letterSpacing: 4, 
                  textTransform: 'uppercase',
                  display: 'block',
                  mb: 1,
                  mt: 0.5
                }}
              >
                eTPL By Thai PES League
              </Typography>
              <Typography 
                variant={isMobile ? "h5" : "h4"} 
                fontWeight={1000} 
                sx={{ 
                  color: '#fff', 
                  letterSpacing: -1, 
                  lineHeight: 1.1,
                  mb: 1
                }}
              >
                About <Box component="span" sx={{ color: '#d1ad73' }}>eTPL Community</Box>
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: "rgba(255,255,255,0.6)", 
                  fontSize: "1rem",
                  mt: 1, 
                  maxWidth: 600, 
                  lineHeight: 1.5,
                  mx: { xs: 'auto', md: 0 }
                }}
              >
                A premier eFootball community with over 8 years of heritage, evolving from PES 2018 into a state-of-the-art digital ecosystem.
              </Typography>
            </Box>

          </Box>
        </Box>
      </Box>

      {/* ── Main Content Area ── */}
      <Box sx={{ mt: 3 }}>
        <Paper 
          elevation={0}
          sx={{ 
            p: { xs: 3, md: 4 }, 
            borderRadius: 8, 
            bgcolor: "white",
            border: "1px solid rgba(0,0,0,0.05)",
            boxShadow: "0 20px 50px rgba(0,0,0,0.04)",
            overflow: "hidden"
          }}
        >
          <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" } }}>
        
        {/* Left Col: Timeline */}
        <Box sx={{ 
          width: { xs: '100%', md: '45%' }, 
          borderRight: { xs: 'none', md: '1px solid #f1f5f9' }, 
          borderBottom: { xs: '1px solid #f1f5f9', md: 'none' },
          display: 'flex', 
          flexDirection: 'column', 
          p: { xs: 2, md: 3 } 
        }}>
          <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", mb: 2 }}>Roadmap 2017 - Present</Typography>
          <Box sx={{ flex: 1, overflowY: 'auto', pr: 1 }}>
            <Stack spacing={2}>
              {timelineData.map((item, i) => (
                <Box key={i} sx={{ display: 'flex', gap: 2, p: 1.5, borderRadius: 2, bgcolor: '#fff', border: '1px solid #f1f5f9', transition: 'all 0.2s', '&:hover': { transform: 'translateX(5px)', borderColor: item.color } }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 0.5, minWidth: 70 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: item.color, mb: 0.5 }} />
                    <Typography variant="caption" sx={{ color: item.color, fontWeight: 900, fontSize: 10, whiteSpace: 'nowrap' }}>{item.year}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" fontWeight={800}>{item.title}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>• {item.game}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'flex-start', mt: 0.5 }}>
                      <Box component="span" sx={{ mr: 0.5 }}>•</Box>
                      <Box component="span">{item.etpl}</Box>
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Stack>
          </Box>
        </Box>

        {/* Right Col: Dashboard Sections */}
        <Box sx={{ flex: 1, p: 3, display: 'flex', flexDirection: 'column', gap: 4 }}>
          
          {/* 1. League Highlights (Stats) */}
          <Box>
            <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", mb: 2, display: 'block' }}>League Highlights</Typography>
            <Grid container spacing={2}>
              {[
                { label: "8+ Years", desc: "Heritage Since 2018", color: "#d1ad73" },
                { label: "50+ Seasons", desc: "League Cycles", color: "#d1ad73" },
                { label: "200+", desc: "Active Members", color: "#d1ad73" }
              ].map((s, i) => (
                <Grid item xs={12} sm={6} md={4} key={i}>
                  <Box sx={{ 
                    p: 2, 
                    borderRadius: 2, 
                    bgcolor: '#fff', 
                    textAlign: 'center',
                    border: '1px solid #f1f5f9',
                    borderTop: `3px solid ${s.color}`,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                    height: '100%',
                    minHeight: 110,
                    minWidth: { md: 240 },
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-3px)',
                      boxShadow: '0 12px 24px rgba(0,0,0,0.06)'
                    }
                  }}>
                    <Typography 
                      variant="h5" 
                      fontWeight={1000} 
                      sx={{ 
                        color: s.color, 
                        lineHeight: 1, 
                        letterSpacing: -0.5,
                        textShadow: '0 2px 4px rgba(209, 173, 115, 0.1)'
                      }}
                    >
                      {s.label}
                    </Typography>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        fontSize: 9, 
                        color: '#64748b', 
                        mt: 1, 
                        fontWeight: 800, 
                        textTransform: 'uppercase', 
                        letterSpacing: 1.2,
                        opacity: 0.8
                      }}
                    >
                      {s.desc}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* 2. Unified Grid for Philosophy & Ecosystem */}
          <Box>
            <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", mb: 2, display: 'block' }}>Platform Philosophy & Ecosystem</Typography>
            <Grid container spacing={2} sx={{ alignItems: 'stretch' }}>
              {[
                // Philosophy Items
                { icon: <Diversity3 />, label: "Community", desc: "Fostering sportsmanship.", color: "#6366f1" },
                { icon: <EmojiEvents />, label: "Excellence", desc: "Elite management standards.", color: "#f59e0b" },
                { icon: <Public />, label: "Integrity", desc: "Total fairness & transparency.", color: "#10b981" },
                // Ecosystem Items
                { icon: <Gavel />, label: "Auction System", desc: "Strategic real-time bidding.", color: "#6366f1" },
                { icon: <Groups />, label: "Transfer Market", desc: "Peer-to-peer club trading.", color: "#3b82f6" },
                { icon: <SportsSoccer />, label: "League Ops", desc: "Automated fixtures.", color: "#ec4899" },
                { icon: <AccountBalanceWallet />, label: "Finance Mgmt", desc: "Club budgeting & tracking.", color: "#10b981" },
                { icon: <MilitaryTech />, label: "Hall of Fame", desc: "Archive of champions.", color: "#f59e0b" },
                { icon: <RssFeed />, label: "Live Activity", desc: "Real-time social feeds.", color: "#8b5cf6" }
              ].map((item, i) => (
                <Grid item xs={12} sm={6} md={4} key={i} sx={{ display: 'flex' }}>
                  <Box sx={{ 
                    p: 2, 
                    borderRadius: 2, 
                    bgcolor: '#fff', 
                    border: '1px solid #f1f5f9', 
                    textAlign: 'center',
                    flex: 1,
                    minHeight: 130,
                    minWidth: { md: 240 },
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                    '&:hover': {
                      transform: 'translateY(-5px)',
                      boxShadow: `0 20px 40px ${alpha(item.color || '#6366f1', 0.08)}`,
                      borderColor: alpha(item.color || '#6366f1', 0.2),
                    }
                  }}>
                    <Avatar sx={{ 
                      bgcolor: alpha(item.color || '#6366f1', 0.08), 
                      color: item.color, 
                      width: 36, 
                      height: 36, 
                      mb: 1.5,
                      border: `1px solid ${alpha(item.color || '#6366f1', 0.1)}`
                    }}>
                      {item.icon}
                    </Avatar>
                    <Typography variant="caption" fontWeight={1000} sx={{ display: 'block', mb: 0.5, color: item.color, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
                      {item.label}
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: 9.5, color: '#475569', lineHeight: 1.3, display: 'block', fontWeight: 600 }}>
                      {item.desc}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* 3. Community Connections */}
          <Box>
            <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", mb: 2, display: 'block' }}>Connect with Us</Typography>
            <Grid container spacing={2}>
              {[
                { label: "Facebook", icon: <Facebook sx={{ fontSize: 18 }} />, color: "#1877f2" },
                { label: "Discord", icon: <Forum sx={{ fontSize: 18 }} />, color: "#5865f2" },
                { label: "Line", icon: <Campaign sx={{ fontSize: 18 }} />, color: "#06c755" },
              ].map((s, i) => (
                <Grid item xs={12} sm={4} key={i}>
                  <Button 
                    variant="outlined" 
                    fullWidth
                    startIcon={s.icon} 
                    sx={{ 
                      borderRadius: 3, 
                      fontSize: 12, 
                      fontWeight: 800, 
                      minWidth: { md: 120 },
                      textTransform: "none", 
                      py: 1.5, 
                      borderColor: "#f1f5f9", 
                      color: "#64748b", 
                      bgcolor: 'white',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                      '&:hover': { borderColor: s.color, color: s.color, bgcolor: alpha(s.color, 0.02), transform: 'translateY(-2px)' } 
                    }}
                  >
                    {s.label}
                  </Button>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Box>
      </Box>
    </Paper>
  </Box>
</Box>
  );
};

export default AboutUsPage;
