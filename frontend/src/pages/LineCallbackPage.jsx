import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Box,
  CircularProgress,
  Typography,
  Alert,
  Button,
  Avatar,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { useAuth } from "../store/AuthContext";
import {
  lineAuth as lineAuthApi,
  lineBind as lineBindApi,
} from "../api/authApi";

const LINE_OAUTH_STATE_SESSION_KEY = "line_oauth_state";
const LINE_OAUTH_STATE_LOCAL_KEY = "line_oauth_state_fallback";

const LineCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [binding, setBinding] = useState(false);
  const [bindContext, setBindContext] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState("");

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const savedStateFromSession = sessionStorage.getItem(
      LINE_OAUTH_STATE_SESSION_KEY,
    );
    const savedStateFromLocal = localStorage.getItem(LINE_OAUTH_STATE_LOCAL_KEY);
    const savedState = savedStateFromSession || savedStateFromLocal;

    if (!code) {
      setError("ไม่พบ authorization code จาก LINE");
      return;
    }

    if (state !== savedState) {
      setError("State ไม่ตรงกัน กรุณาลองใหม่");
      return;
    }

    sessionStorage.removeItem(LINE_OAUTH_STATE_SESSION_KEY);
    localStorage.removeItem(LINE_OAUTH_STATE_LOCAL_KEY);

    const redirectUri = `${window.location.origin}/auth/line/callback`;

    lineAuthApi({ code, redirectUri })
      .then((res) => {
        const payload = res.data.data;

        if (payload?.isLinked && payload?.login?.token) {
          login(payload.login.token, payload.login.user);
          navigate("/main");
          return;
        }

        if (!payload?.isLinked && payload?.bindToken) {
          setBindContext(payload);
          const firstUserId = payload?.availableUsers?.[0]?.userId || "";
          setSelectedUserId(firstUserId);
          return;
        }

        setError("ไม่สามารถยืนยันตัวตนด้วย LINE ได้");
      })
      .catch((err) => {
        setError(
          err.response?.data?.message || "เข้าสู่ระบบด้วย LINE ไม่สำเร็จ",
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleBindAndLogin = async () => {
    if (!bindContext?.bindToken || !selectedUserId) {
      setError("กรุณาเลือกผู้ใช้ที่ต้องการผูกบัญชี");
      return;
    }

    setBinding(true);
    setError("");

    try {
      const res = await lineBindApi({
        bindToken: bindContext.bindToken,
        userId: selectedUserId,
      });

      login(res.data.data.token, res.data.data.user);
      navigate("/main");
    } catch (err) {
      setError(err.response?.data?.message || "ผูกบัญชี LINE ไม่สำเร็จ");
    } finally {
      setBinding(false);
    }
  };

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

  if (!loading && bindContext && !bindContext.isLinked) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        px={2}
      >
        <Card sx={{ width: 420, maxWidth: "100%" }}>
          <CardContent>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              ผูกบัญชี LINE กับผู้ใช้
            </Typography>

            <Box display="flex" alignItems="center" gap={1.5} mb={2}>
              <Avatar src={bindContext?.lineProfile?.pictureUrl || ""} />
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  {bindContext?.lineProfile?.displayName || "LINE User"}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  LINE ID: {bindContext?.lineProfile?.lineId}
                </Typography>
              </Box>
            </Box>

            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel id="line-user-select-label">
                เลือกผู้ใช้ที่ยังว่าง
              </InputLabel>
              <Select
                labelId="line-user-select-label"
                value={selectedUserId}
                label="เลือกผู้ใช้ที่ยังว่าง"
                onChange={(e) => setSelectedUserId(e.target.value)}
              >
                {(bindContext?.availableUsers || []).map((user) => (
                  <MenuItem key={user.userId} value={user.userId}>
                    {user.userId}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Button
              fullWidth
              variant="contained"
              onClick={handleBindAndLogin}
              disabled={binding || !selectedUserId}
            >
              {binding ? "กำลังผูกบัญชี..." : "ผูกบัญชีและเข้าสู่ระบบ"}
            </Button>

            {(!bindContext?.availableUsers ||
              bindContext.availableUsers.length === 0) && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                ไม่พบผู้ใช้ที่ยังไม่ได้ผูก LINE กรุณาติดต่อผู้ดูแลระบบ
              </Alert>
            )}
          </CardContent>
        </Card>
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
        กำลังตรวจสอบบัญชี LINE...
      </Typography>
    </Box>
  );
};

export default LineCallbackPage;
