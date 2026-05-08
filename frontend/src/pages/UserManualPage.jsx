import { useState, useEffect } from "react";
import { 
  Box, 
  Container, 
  Paper, 
  Typography, 
  Divider, 
  Breadcrumbs, 
  Link, 
  CircularProgress,
  IconButton,
  Tooltip,
  Fab,
  Zoom,
  useScrollTrigger,
  useTheme,
  useMediaQuery,
  Grid,
  Button
} from "@mui/material";
import { 
  Home, 
  MenuBook, 
  KeyboardArrowUp, 
  Article,
  Info,
  TableChart,
  TipsAndUpdates,
  Gavel, 
  Storefront, 
  Handshake, 
  Groups, 
  SportsSoccer, 
  Lightbulb
} from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const ScrollTop = (props) => {
  const { children } = props;
  const trigger = useScrollTrigger({
    disableHysteresis: true,
    threshold: 100,
  });

  const handleClick = (event) => {
    const anchor = (event.target.ownerDocument || document).querySelector(
      "#back-to-top-anchor"
    );

    if (anchor) {
      anchor.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
    }
  };

  return (
    <Zoom in={trigger}>
      <Box
        onClick={handleClick}
        role="presentation"
        sx={{ position: "fixed", bottom: 32, right: 32, zIndex: 10 }}
      >
        {children}
      </Box>
    </Zoom>
  );
};

import manualContent from "../../../USER_MANUAL_TH.md?raw";

const UserManualPage = () => {
  const [content] = useState(manualContent);
  const [loading, setLoading] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // useEffect removed as we use raw import now

  const scrollToId = (id) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 100;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  const generateId = (text) => {
    if (!text || typeof text !== 'string') return '';
    return text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\u0e00-\u0e7f-]/g, '');
  };

  const markdownComponents = {
    h1: ({ children }) => (
      <Typography variant="h3" id={generateId(children)} sx={{ 
        fontWeight: 900, 
        mt: 4, mb: 3, 
        color: "#0f172a",
        letterSpacing: -1,
        fontSize: { xs: '2rem', md: '3rem' }
      }}>
        {children}
      </Typography>
    ),
    h2: ({ children }) => {
      const id = generateId(children);
      return (
        <Box sx={{ mt: 6, mb: 3, display: "flex", alignItems: "center", gap: 1.5 }} id={id}>
          <Box sx={{ width: 4, height: 28, bgcolor: "#2563eb", borderRadius: 1 }} />
          <Typography variant="h5" sx={{ fontWeight: 800, color: "#1e293b", letterSpacing: -0.5 }}>
            {children}
          </Typography>
        </Box>
      );
    },
    h3: ({ children }) => (
      <Typography variant="h6" id={generateId(children)} sx={{ fontWeight: 700, mt: 4, mb: 1.5, color: "#334155" }}>
        {children}
      </Typography>
    ),
    p: ({ children }) => (
      <Typography variant="body1" sx={{ 
        mb: 2.5, 
        color: "#475569", 
        lineHeight: 1.8, 
        fontSize: "1.05rem" 
      }}>
        {children}
      </Typography>
    ),
    li: ({ children }) => (
      <Box component="li" sx={{ 
        mb: 1.5, 
        color: "#475569", 
        lineHeight: 1.7, 
        fontSize: "1.05rem",
        "& strong": { color: "#0f172a", fontWeight: 700 }
      }}>
        {children}
      </Box>
    ),
    ul: ({ children }) => (
      <Box component="ul" sx={{ mb: 4, pl: 3 }}>
        {children}
      </Box>
    ),
    hr: () => <Divider sx={{ my: 6, borderColor: "rgba(0,0,0,0.06)" }} />,
    table: ({ children }) => (
      <Paper elevation={0} sx={{ 
        my: 4, 
        overflow: "hidden", 
        border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: 3,
        boxShadow: "0 4px 12px rgba(0,0,0,0.03)"
      }}>
        <Box sx={{ overflowX: "auto" }}>
          <Box component="table" sx={{ 
            width: "100%", 
            borderCollapse: "collapse",
            "& th": { 
              bgcolor: "#f8fafc", 
              p: 2, 
              textAlign: "center", 
              fontSize: "0.85rem", 
              fontWeight: 800, 
              color: "#64748b",
              borderBottom: "2px solid #f1f5f9"
            },
            "& td": { 
              p: 2, 
              textAlign: "center", 
              fontSize: "0.95rem", 
              color: "#334155",
              borderBottom: "1px solid #f1f5f9"
            }
          }}>
            {children}
          </Box>
        </Box>
      </Paper>
    ),
    strong: ({ children }) => (
      <Box component="strong" sx={{ fontWeight: 800, color: "#0f172a" }}>
        {children}
      </Box>
    ),
    blockquote: ({ children }) => (
      <Paper elevation={0} sx={{ 
        my: 4, p: 3, 
        bgcolor: "#eff6ff", 
        borderLeft: "6px solid #2563eb", 
        borderRadius: "0 16px 16px 0",
        display: "flex",
        alignItems: "center",
        gap: 2
      }}>
        <TipsAndUpdates sx={{ color: "#2563eb", fontSize: 28, flexShrink: 0 }} />
        <Box sx={{ "& p": { mb: 0, color: "#1e40af", fontWeight: 600, fontStyle: "italic" } }}>
          {children}
        </Box>
      </Paper>
    )
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress size={40} />
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: "#f8fafc", minHeight: "100vh" }}>
      <div id="back-to-top-anchor" />
      
      {/* Top Banner / Breadcrumbs */}
      <Box sx={{ 
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", 
        py: { xs: 4, md: 8 }, 
        px: 2,
        color: "white",
        textAlign: "center",
        position: "relative",
        overflow: "hidden"
      }}>
        <Box sx={{
          position: "absolute",
          top: -50,
          right: -50,
          width: 200,
          height: 200,
          background: "radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)",
        }} />
        
        <Container maxWidth="lg">
          <Breadcrumbs 
            sx={{ 
              mb: 2, 
              display: "flex", 
              justifyContent: "center",
              "& .MuiBreadcrumbs-separator": { color: "rgba(255,255,255,0.4)" }
            }}
          >
            <Link component={RouterLink} to="/" underline="none" sx={{ color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 0.5, "&:hover": { color: "white" } }}>
              <Home sx={{ fontSize: 16 }} /> Home
            </Link>
            <Typography sx={{ color: "white", fontSize: 13, fontWeight: 700 }}>User Manual</Typography>
          </Breadcrumbs>
          
          <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -0.5 }}>
            eTPL User Manual
          </Typography>
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.6)", mt: 1, fontWeight: 500 }}>
            ฉบับภาษาไทย | ปรับปรุงล่าสุด พฤษภาคม 2026
          </Typography>
        </Container>
      </Box>

      {/* Content Area */}
      <Container maxWidth="lg" sx={{ py: 6, position: "relative" }}>
        <Grid container spacing={4}>
          {/* Navigation Sidebar (Hidden on mobile) */}
          <Grid item md={3} sx={{ display: { xs: 'none', md: 'block' } }}>
            <Box sx={{ position: "sticky", top: 100 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 2, color: "#64748b", textTransform: "uppercase", letterSpacing: 1.5 }}>
                Sections
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {[
                  { icon: <Info />, text: "1. ข้อมูลพื้นฐาน", id: "1-ข้อมูลพื้นฐานและเมนูหลัก-public-menus" },
                  { icon: <Gavel />, text: "2. ระบบการประมูล", id: "2-ระบบการประมูลนักเตะ-auction-system" },
                  { icon: <Storefront />, text: "3. ตลาดนักเตะ", id: "3-ตลาดนักเตะ-transfer-market" },
                  { icon: <Handshake />, text: "4. ระบบการยืมตัว", id: "4-ระบบการยืมตัว-loan-system" },
                  { icon: <Groups />, text: "5. การจัดการทีม", id: "5-การจัดการทีม-squad-management" },
                  { icon: <SportsSoccer />, text: "6. การรายงานผล", id: "6-การส่งผลการแข่งขัน-match-reporting" },
                  { icon: <Lightbulb />, text: "7. Pro-Tips", id: "7-เทคนิคการบริหารทีมอย่างมืออาชีพ-pro-tips" },
                ].map((item, idx) => (
                  <Button 
                    key={idx}
                    startIcon={item.icon}
                    onClick={() => scrollToId(item.id)}
                    sx={{ 
                      justifyContent: "flex-start", 
                      color: "#64748b", 
                      fontWeight: 600, 
                      textTransform: "none",
                      borderRadius: 2,
                      py: 1,
                      "&:hover": { bgcolor: "white", color: "#2563eb", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }
                    }}
                  >
                    {item.text}
                  </Button>
                ))}
              </Box>
            </Box>
          </Grid>

          {/* Main Manual Content */}
          <Grid item xs={12} md={9}>
            <Paper elevation={0} sx={{ 
              p: { xs: 3, md: 8 }, 
              borderRadius: 4, 
              border: "1px solid rgba(0,0,0,0.06)",
              boxShadow: "0 20px 40px rgba(0,0,0,0.02)",
              bgcolor: "white"
            }}>
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={markdownComponents}
              >
                {content}
              </ReactMarkdown>
            </Paper>
          </Grid>
        </Grid>
      </Container>

      <ScrollTop>
        <Fab 
          size="small" 
          aria-label="scroll back to top" 
          sx={{ 
            bgcolor: "#0f172a", 
            color: "white", 
            "&:hover": { bgcolor: "#1e293b" } 
          }}
        >
          <KeyboardArrowUp />
        </Fab>
      </ScrollTop>
      
      {/* Icons Import Fix */}
      <Box sx={{ display: "none" }}>
        <Article /><Info /><TableChart /><TipsAndUpdates />
        <Gavel /><Storefront /><Handshake /><Groups /><SportsSoccer /><Lightbulb />
      </Box>
    </Box>
  );
};

export default UserManualPage;
