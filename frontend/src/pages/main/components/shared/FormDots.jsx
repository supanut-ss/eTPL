import { Box } from "@mui/material";

const FormDots = ({ last, max = 5 }) => {
  if (!last) return null;
  const results = last.trim().split(/\s+/).slice(-max);
  const colorMap = { W: "#22c55e", D: "#f59e0b", L: "#ef4444" };
  return (
    <Box display="flex" gap={0.4}>
      {results.map((r, i) => (
        <Box
          key={i}
          title={r === "W" ? "Win" : r === "D" ? "Draw" : "Loss"}
          sx={{
            width: 14,
            height: 14,
            borderRadius: "50%",
            bgcolor: colorMap[r] || "grey.300",
            flexShrink: 0,
          }}
        />
      ))}
    </Box>
  );
};

export default FormDots;
