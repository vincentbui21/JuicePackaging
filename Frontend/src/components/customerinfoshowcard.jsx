import React from "react";
import { Paper, Stack, Typography } from "@mui/material";

const Row = ({ label, value }) => (
  <Stack direction="row" spacing={2} alignItems="baseline">
    <Typography sx={{ minWidth: 160, fontWeight: 700 }}>{label}</Typography>
    <Typography>:</Typography>
    <Typography>{value ?? "—"}</Typography>
  </Stack>
);

export default function CustomerInfoCard({ customerInfo = {}, countLabel }) {
  const {
    name,
    created_at,
    weight_kg,
    boxes_count,   // new for boxes flow
    crate_count,   // legacy (crate flow)
    city,
  } = customerInfo;

  // Decide which count + label to show
  const hasBoxes = boxes_count !== undefined && boxes_count !== null;
  const computedCountLabel =
    countLabel || (hasBoxes ? "Box Count" : "Crate Count");
  const countValue = hasBoxes ? boxes_count : crate_count;

  const dateStr = created_at
    ? new Date(created_at).toLocaleDateString()
    : "—";

  const weightStr =
    weight_kg === 0 || weight_kg
      ? Number(weight_kg).toFixed(2)
      : "—";

  return (
    <Paper
      elevation={2}
      sx={{ p: 2.5, borderRadius: 2, width: "100%", maxWidth: 700 }}
    >
      <Stack spacing={1.5}>
        <Row label="Name" value={name || "—"} />
        <Row label="Date Entry" value={dateStr} />
        <Row label="Apple weight" value={weightStr} />
        <Row label={computedCountLabel} value={countValue ?? "—"} />
        <Row label="City" value={city || "—"} />
      </Stack>
    </Paper>
  );
}
