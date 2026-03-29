import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Box, CircularProgress, Typography, Alert, Button } from "@mui/material";
import { useAuth } from "../store/AuthContext";
import { lineLogin as lineLoginApi } from "../api/authApi";

const LineCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState("");

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const savedState = sessionStorage.getItem("line_oauth_state");

    if (!code) {
      setError("ไม่พบ authorization code จาก LINE");
      return;
    }

    if (state !== savedState) {
      setError("State ไม่ตรงกัน กรุณาลองใหม่");
      return;
    }

    sessionStorage.removeItem("line_oauth_state");

    const redirectUri = `${window.location.origin}/auth/line/callback`;

    lineLoginApi({ code, redirectUri })
      .then((res) => {
        login(res.data.data.token, res.data.data.user);
        navigate("/main");
      })
      .catch((err) => {
        setError(
          err.response?.data?.message || "เข้าสู่ระบบด้วย LINE ไม่สำเร็จ"
        );
      });
  }, []);

  if (error) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        flexDirection="column"
        gap={2}
      >
        <Alert severity="error">{error}</Alert>
        <Button variant="text" onClick={() => navigate("/login")}>
          กลับไปหน้าเข้าสู่ระบบ
        </Button>
      </Box>
    );
  }

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      flexDirection="column"
      gap={2}
    >
      <CircularProgress />
      <Typography variant="body2" color="text.secondary">
        กำลังเข้าสู่ระบบด้วย LINE...
      </Typography>
    </Box>
  );
};

export default LineCallbackPage;
