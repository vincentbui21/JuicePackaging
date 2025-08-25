import { Stack, Typography, Chip } from "@mui/material";

export default function PageHeader({ icon: Icon, title, subtitle, badge }) {
  return (
    <Stack
      direction="row"
      justifyContent="space-between"
      alignItems="center"
      sx={{ mb: 2 }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center">
        {Icon ? <Icon size={26} color="#2e7d32" /> : null}
        <Stack>
          <Typography variant="h5" fontWeight={700}>{title}</Typography>
          {subtitle ? (
            <Typography variant="body2" color="text.secondary">{subtitle}</Typography>
          ) : null}
        </Stack>
      </Stack>

      {badge ? (
        <Chip
          color="success"
          variant="outlined"
          label={badge}
          sx={{ fontSize: 12, height: 28 }}
        />
      ) : null}
    </Stack>
  );
}
