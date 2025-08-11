import React from "react";
import {
  Paper,
  Stack,
  Typography,
  Divider,
  Chip,
  LinearProgress,
  Box,
} from "@mui/material";

const short = (id) =>
  id ? `${String(id).slice(0, 8)}…${String(id).slice(-6)}` : "—";

export default function BoxInfoCard({
  palletId,
  orderId,
  customerName,     // optional
  city,             // optional
  expected = 0,
  scanned = 0,
}) {
  const remaining = Math.max((Number(expected) || 0) - (Number(scanned) || 0), 0);
  const pct =
    Number(expected) > 0
      ? Math.min(100, Math.round((Number(scanned) / Number(expected)) * 100))
      : 0;

  return (
    <Paper
      elevation={2}
      sx={{
        p: 2.5,
        borderRadius: 2,
        width: "100%",
        maxWidth: 640,
      }}
    >
      <Stack spacing={1.25}>
        {/* Top rows like your Crate card */}
        <Stack direction="row" spacing={1}>
          <Typography sx={{ minWidth: 140, color: "text.secondary" }}>
            Pallet
          </Typography>
          <Typography fontWeight={600}>{short(palletId)}</Typography>
        </Stack>

        <Stack direction="row" spacing={1}>
          <Typography sx={{ minWidth: 140, color: "text.secondary" }}>
            Order
          </Typography>
          <Typography fontWeight={600}>{short(orderId)}</Typography>
        </Stack>

        {customerName && (
          <Stack direction="row" spacing={1}>
            <Typography sx={{ minWidth: 140, color: "text.secondary" }}>
              Customer
            </Typography>
            <Typography>{customerName}</Typography>
          </Stack>
        )}

        {city && (
          <Stack direction="row" spacing={1}>
            <Typography sx={{ minWidth: 140, color: "text.secondary" }}>
              City
            </Typography>
            <Typography>{city}</Typography>
          </Stack>
        )}

        <Divider sx={{ my: 1 }} />

        {/* Progress */}
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Chip
            size="small"
            label={`Scanned ${scanned} / Expected ${expected}`}
          />
          {remaining > 0 ? (
            <Chip
              size="small"
              label={`${remaining} to go`}
              variant="outlined"
            />
          ) : (
            <Chip size="small" color="success" label="Ready to submit" />
          )}
        </Stack>

        <Box sx={{ mt: 0.5 }}>
          <LinearProgress
            variant={expected > 0 ? "determinate" : "indeterminate"}
            value={expected > 0 ? pct : undefined}
          />
        </Box>
      </Stack>
    </Paper>
  );
}
