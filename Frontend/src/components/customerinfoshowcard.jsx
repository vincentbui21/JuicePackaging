import React from "react";
import { Paper, Stack, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

const Row = ({ label, value }) => (
  <Stack direction="row" spacing={2} alignItems="baseline">
    <Typography sx={{ minWidth: 160, fontWeight: 700 }}>{label}</Typography>
    <Typography>:</Typography>
    <Typography>{value ?? "—"}</Typography>
  </Stack>
);

export default function CustomerInfoCard({ customerInfo = {}, countLabel }) {
  const { t } = useTranslation();
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
    countLabel || (hasBoxes ? t('crate_management.box_count') : t('crate_management.crate_count'));
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
        <Row label={t('crate_management.name')} value={name || "—"} />
        <Row label={t('crate_management.date_entry')} value={dateStr} />
        <Row label={t('crate_management.apple_weight')} value={weightStr} />
        <Row label={computedCountLabel} value={countValue ?? "—"} />
        <Row label={t('crate_management.city')} value={city || "—"} />
      </Stack>
    </Paper>
  );
}
