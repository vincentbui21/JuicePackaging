import { useEffect, useState } from "react";
import { Chip, Tooltip } from "@mui/material";
import { CheckCircle, XCircle } from "lucide-react";
import api from "../services/axios";

export default function SystemStatusBadge() {
  const [state, setState] = useState({ ok: true, label: "Checking…" });

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const { data } = await api.get("/health");
        if (cancelled) return;
        setState(
          data?.ok
            ? { ok: true, label: "All Systems Operational" }
            : { ok: false, label: "Degraded" }
        );
      } catch {
        if (cancelled) return;
        setState({ ok: false, label: "Offline" });
      }
    };

    check();
    const id = setInterval(check, 30000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const Icon = state.ok ? CheckCircle : XCircle;

  return (
    <Tooltip title={state.ok ? "Backend reachable" : "Backend not reachable"}>
      <Chip
        variant="outlined"
        color={state.ok ? "success" : "error"}  // green vs red
        icon={<Icon size={16} />}
        label={state.label}
        sx={{
          fontWeight: 600,
          borderRadius: 9999,
          "& .MuiChip-icon": {
            color: state.ok ? "success.main" : "error.main", // color the icon itself
          },
        }}
      />
    </Tooltip>
  );
}
