import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#0f172a",
      light: "#1e293b",
      dark: "#020617",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#6366f1",
      light: "#818cf8",
      dark: "#4338ca",
      contrastText: "#ffffff",
    },
    background: {
      default: "#f8fafc",
      paper: "#ffffff",
    },
    text: {
      primary: "#0f172a",
      secondary: "#64748b",
    },
    divider: "#e2e8f0",
    success: { main: "#22c55e" },
    warning: { main: "#f59e0b" },
    error: { main: "#ef4444" },
    info: { main: "#3b82f6" },
  },
  typography: {
    fontFamily: "'Inter', 'Roboto', sans-serif",
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
    subtitle1: { fontWeight: 600 },
  },
  shape: {
    borderRadius: 10,
  },
  shadows: [
    "none",
    "0 1px 3px 0 rgb(0 0 0 / 0.07), 0 1px 2px -1px rgb(0 0 0 / 0.07)",
    "0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.07)",
    "0 10px 15px -3px rgb(0 0 0 / 0.07), 0 4px 6px -4px rgb(0 0 0 / 0.07)",
    "0 20px 25px -5px rgb(0 0 0 / 0.07), 0 8px 10px -6px rgb(0 0 0 / 0.07)",
    "0 25px 50px -12px rgb(0 0 0 / 0.1)",
    ...Array(19).fill("none"),
  ],
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: "#0f172a",
          backgroundImage: "none",
          boxShadow: "0 1px 0 0 #1e293b",
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: "#ffffff",
          borderRight: "1px solid #e2e8f0",
          boxShadow: "none",
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          marginLeft: 8,
          marginRight: 8,
          marginBottom: 2,
          paddingTop: 8,
          paddingBottom: 8,
          "&.Mui-selected": {
            backgroundColor: "#eef2ff",
            color: "#4338ca",
            "& .MuiListItemIcon-root": {
              color: "#4338ca",
            },
            "&:hover": {
              backgroundColor: "#e0e7ff",
            },
          },
          "&:hover": {
            backgroundColor: "#f1f5f9",
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          borderRadius: 8,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 600,
        },
      },
    },
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: "none",
          fontSize: 16,
        },
        columnHeader: {
          backgroundColor: "#f8fafc",
          color: "#64748b",
          fontSize: 17,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        },
        columnHeaders: {
          borderBottom: "2px solid #e2e8f0",
        },
        cell: {
          borderBottom: "1px solid #f1f5f9",
          display: "flex",
          alignItems: "center",
        },
        row: {
          "&:hover": {
            backgroundColor: "#f8fafc",
          },
          "&:nth-of-type(even)": {
            backgroundColor: "#fafafa",
          },
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          borderRadius: "8px !important",
          fontSize: 13,
          padding: "4px 16px",
          border: "1px solid #e2e8f0 !important",
          color: "#64748b",
          "&.Mui-selected": {
            backgroundColor: "#0f172a",
            color: "#ffffff",
            "&:hover": {
              backgroundColor: "#1e293b",
            },
          },
        },
      },
    },
    MuiToggleButtonGroup: {
      styleOverrides: {
        root: {
          gap: 4,
        },
      },
    },
  },
});

export default theme;
