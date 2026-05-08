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
      element.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  };

  const generateId = (children) => {
    const getChildText = (node) => {
      if (!node) return "";
      if (typeof node === "string") return node;
      if (Array.isArray(node)) return node.map(getChildText).join("");
      if (node.props && node.props.children) return getChildText(node.props.children);
      return String(node);
    };

    const text = getChildText(children);
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\u0e00-\u0e7f\s\-]/g, "") // Remove dots, parentheses, etc. but keep dashes
      .replace(/\s+/g, "-"); // Convert spaces to dashes
  };

  const markdownComponents = {
    h1: ({ children }) => (
      <Typography variant="h3" id={generateId(children)} sx={{ 
        fontWeight: 900, 
        mt: 4, mb: 3, 
        color: "#0f172a",
        letterSpacing: -1,
        fontSize: { xs: '2rem', md: '3rem' },
        scrollMarginTop: 100
      }}>
        {children}
      </Typography>
    ),
    h2: ({ children }) => {
      const id = generateId(children);
      return (
        <Box 
          id={id}
          sx={{ 
            mt: 6, mb: 3, 
            display: "flex", 
            alignItems: "center", 
            gap: 1.5,
            scrollMarginTop: 120
          }} 
        >
          <Box sx={{ width: 4, height: 28, bgcolor: "#2563eb", borderRadius: 1 }} />
          <Typography variant="h5" sx={{ fontWeight: 800, color: "#1e293b", letterSpacing: -0.5 }}>
            {children}
          </Typography>
        </Box>
      );
    },
    h3: ({ children }) => (
      <Typography variant="h6" id={generateId(children)} sx={{ 
        fontWeight: 700, mt: 4, mb: 1.5, color: "#334155",
        scrollMarginTop: 100
      }}>
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
    <Box sx={{ bgcolor: "#f8fafc", minHeight: "100vh", px: { xs: 1, md: 2 } }}>
      <div id="back-to-top-anchor" />
      
      {/* Top Level Page Header */}
      <Box sx={{ pt: 3, pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <MenuBook color="primary" sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h5" fontWeight="bold">User Manual</Typography>
            <Typography variant="body2" color="text.secondary">
              SYSTEM DOCUMENTATION
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Top Banner / Breadcrumbs - Modern Split Layout */}
      <Box 
        sx={{ 
          mb: 3,
          position: 'relative',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          p: { xs: 3, md: 5 },
          borderRadius: '40px',
          color: "white",
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.05)",
          boxShadow: '0 40px 100px rgba(0,0,0,0.3)',
        }}
      >
        {/* Abstract Background Decor */}
        <Box sx={{ 
          position: 'absolute', 
          top: -100, right: -100, 
          width: 300, height: 300, 
          borderRadius: '50%', 
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)',
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
              flexDirection: { xs: 'column', md: 'row' }, 
              justifyContent: 'space-between', 
              alignItems: { xs: 'center', md: 'flex-end' },
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
                  height: 100, 
                  width: 'auto', 
                  mb: 2, 
                  filter: 'drop-shadow(0 0 20px rgba(209, 173, 115, 0.2))',
                  display: { xs: 'block', md: 'inline-block' },
                  mx: { xs: 'auto', md: 0 }
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
                  mb: 2,
                  mt: 1
                }}
              >
                Knowledge Base
              </Typography>
              <Typography 
                variant={isMobile ? "h4" : "h3"} 
                fontWeight={1000} 
                sx={{ 
                  color: '#fff', 
                  letterSpacing: -1, 
                  lineHeight: 1.1,
                  mb: 2
                }}
              >
                eTPL <Box component="span" sx={{ color: '#d1ad73' }}>User Manual</Box>
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: "rgba(255,255,255,0.6)", 
                  fontSize: "1.1rem",
                  mt: 2, 
                  maxWidth: 600, 
                  lineHeight: 1.6,
                  mx: { xs: 'auto', md: 0 }
                }}
              >
                คู่มือการใช้งานระบบ eTPL ฉบับสมบูรณ์ ครอบคลุมทุกฟีเจอร์ตั้งแต่การประมูลนักเตะ การจัดการทีม ไปจนถึงการส่งผลการแข่งขัน (ปรับปรุงล่าสุด: พฤษภาคม 2026)
              </Typography>
            </Box>

            {/* Right Column: Breadcrumbs */}
            <Box>
              <Breadcrumbs 
                sx={{ 
                  bgcolor: "rgba(255,255,255,0.03)",
                  px: 3, py: 1.5,
                  borderRadius: 3,
                  border: "1px solid rgba(255,255,255,0.08)",
                  backdropFilter: "blur(10px)",
                  "& .MuiBreadcrumbs-separator": { color: "rgba(255,255,255,0.4)" }
                }}
              >
                <Link 
                  component={RouterLink} 
                  to="/" 
                  underline="none" 
                  sx={{ 
                    color: "rgba(255,255,255,0.6)", 
                    fontSize: 13, 
                    fontWeight: 600, 
                    display: "flex", 
                    alignItems: "center", 
                    gap: 0.5, 
                    "&:hover": { color: "white" } 
                  }}
                >
                  <Home sx={{ fontSize: 16 }} /> Home
                </Link>
                <Typography sx={{ color: "white", fontSize: 13, fontWeight: 700 }}>User Manual</Typography>
              </Breadcrumbs>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Content Area */}
      <Box sx={{ pt: 0, pb: { xs: 4, md: 8 }, px: { xs: 1, md: 2 } }}>
        <Grid container spacing={4}>
          {/* Navigation Sidebar (Hidden on mobile) */}
          <Grid item md={3} sx={{ display: { xs: 'none', md: 'block' } }}>
            <Paper 
              elevation={0}
              sx={{ 
                position: "sticky", 
                top: 100,
                p: 3,
                borderRadius: 4,
                bgcolor: "white",
                border: "1px solid rgba(0,0,0,0.05)",
                boxShadow: "0 10px 40px rgba(0,0,0,0.03)",
                background: "rgba(255,255,255,0.8)",
                backdropFilter: "blur(20px)",
              }}
            >
              <Typography 
                variant="subtitle2" 
                sx={{ 
                  fontWeight: 900, 
                  mb: 3, 
                  color: "#1e293b", 
                  textTransform: "uppercase", 
                  letterSpacing: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
              >
                <MenuBook sx={{ fontSize: 18, color: '#d1ad73' }} /> สารบัญ
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                {[
                  { icon: <Info sx={{ fontSize: 20 }} />, text: "1. ข้อมูลพื้นฐาน", id: "1-ข้อมูลพื้นฐานและเมนูหลัก-public-menus" },
                  { icon: <Gavel sx={{ fontSize: 20 }} />, text: "2. ระบบการประมูล", id: "2-ระบบการประมูลนักเตะ-auction-system" },
                  { icon: <Storefront sx={{ fontSize: 20 }} />, text: "3. ระบบการซื้อขาย", id: "3-ระบบการซื้อขายและตลาดนักเตะ-transfer-market" },
                  { icon: <Handshake sx={{ fontSize: 20 }} />, text: "4. ระบบการยืมตัว", id: "4-ระบบการยืมตัวนักเตะ-loan-system" },
                  { icon: <Groups sx={{ fontSize: 20 }} />, text: "5. การจัดการทีม", id: "5-การจัดการทีม-squad-management" },
                  { icon: <SportsSoccer sx={{ fontSize: 20 }} />, text: "6. การรายงานผล", id: "6-การรายงานผลการแข่งขัน-match-reporting" },
                  { icon: <Lightbulb sx={{ fontSize: 20 }} />, text: "7. Pro-Tips", id: "7-เกร็ดความรู้และเงื่อนไขทางเทคนิค-pro-tips" },
                ].map((item, idx) => (
                  <Button
                    key={idx}
                    fullWidth
                    onClick={() => scrollToId(item.id)}
                    startIcon={item.icon}
                    sx={{
                      justifyContent: "flex-start",
                      py: 1.5,
                      px: 2,
                      borderRadius: 2,
                      color: "#64748b",
                      fontWeight: 600,
                      fontSize: "0.9rem",
                      textTransform: "none",
                      "&:hover": {
                        bgcolor: "rgba(209, 173, 115, 0.08)",
                        color: "#d1ad73",
                      },
                    }}
                  >
                    {item.text}
                  </Button>
                ))}
              </Box>

              <Divider sx={{ my: 3, opacity: 0.5 }} />
              
              <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 500, px: 1 }}>
                ต้องการความช่วยเหลือเพิ่มเติม? ติดต่อ Admin ผ่าน Discord หรือ Line Official
              </Typography>
            </Paper>
          </Grid>

          {/* Main Content Area */}
          <Grid item xs={12} md={9}>
            <Paper 
              elevation={0}
              sx={{ 
                p: { xs: 3, md: 6 }, 
                borderRadius: 6, 
                bgcolor: "white",
                border: "1px solid rgba(0,0,0,0.05)",
                boxShadow: "0 20px 50px rgba(0,0,0,0.04)",
                minHeight: "80vh"
              }}
            >
              <Box className="markdown-body">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({node, ...props}) => <Typography variant="h3" fontWeight={900} gutterBottom sx={{ color: "#0f172a", mt: 4, mb: 3, letterSpacing: -0.5 }} {...props} />,
                    h2: ({node, ...props}) => {
                      const id = generateId(props.children);
                      return <Typography id={id} variant="h4" fontWeight={800} gutterBottom sx={{ color: "#1e293b", mt: 6, mb: 3, scrollMarginTop: "120px", pb: 1, borderBottom: "2px solid #f1f5f9" }} {...props} />;
                    },
                    h3: ({node, ...props}) => <Typography variant="h5" fontWeight={700} gutterBottom sx={{ color: "#334155", mt: 4, mb: 2 }} {...props} />,
                    p: ({node, ...props}) => <Typography variant="body1" paragraph sx={{ color: "#475569", lineHeight: 1.8, fontSize: "1.05rem" }} {...props} />,
                    li: ({node, ...props}) => <Box component="li" sx={{ color: "#475569", mb: 1, lineHeight: 1.7, fontSize: "1.05rem" }} {...props} />,
                    code: ({node, inline, ...props}) => 
                      inline ? 
                      <Box component="code" sx={{ bgcolor: "#f1f5f9", px: 0.8, py: 0.2, borderRadius: 1, color: "#e11d48", fontWeight: 600, fontSize: "0.9em" }} {...props} /> :
                      <Box component="pre" sx={{ bgcolor: "#0f172a", p: 2, borderRadius: 2, overflowX: "auto", my: 3 }}><code {...props} /></Box>
                  }}
                >
                  {content}
                </ReactMarkdown>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>

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
