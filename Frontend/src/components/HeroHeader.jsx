import { Stack, Box, Typography, Chip } from "@mui/material";
import { Apple, CheckCircle } from "lucide-react";
import SystemStatusBadge from "../components/SystemStatusBadge";


export default function HeroHeader() {
  return (
    <Box
      sx={{
        p: { xs: 2, md: 3 },
        mb: 2,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "linear-gradient(180deg, #f1fbf3 0%, #f6fbf6 100%)",
        background:
          "linear-gradient(180deg, rgba(46,125,50,0.06) 0%, rgba(46,125,50,0.03) 100%)",
        borderRadius: 2.5,
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              bgcolor: "primary.main",
              display: "grid",
              placeItems: "center",
            }}
          >
            <Apple size={18} color="#fff" />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={800}>
              Processing Dashboard
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Monitor your apple juice processing operations in real-time
            </Typography>
          </Box>
        </Stack>

        <Box sx={{ ml: "auto" }}>
          <SystemStatusBadge />
        </Box>
      </Stack>
    </Box>
  );
}
