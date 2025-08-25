import { useEffect, useState } from "react";
import { IconButton, Badge, Popover, List, ListItem, ListItemText, Typography, Box } from "@mui/material";
import { Bell } from "lucide-react";
import api from "../services/axios";
import { socket } from "../lib/socket";

export default function NotificationsBell() {
  const [anchor, setAnchor] = useState(null);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let mounted = true;
    api.get("/dashboard/activity?limit=10").then(({ data }) => {
      if (mounted) setItems(data || []);
    });

    const onAct = (evt) => {
      setItems((prev) => [{ ts: evt.ts, message: evt.message, type: evt.type }, ...prev].slice(0, 20));
      setUnread((n) => n + 1);
    };

    socket.on("activity", onAct);
    // also refresh when other broadcasts happen
    socket.on("order-status-updated", () => api.get("/dashboard/activity?limit=10").then(({ data }) => setItems(data || [])));
    socket.on("pallet-updated", () => api.get("/dashboard/activity?limit=10").then(({ data }) => setItems(data || [])));

    return () => {
      mounted = false;
      socket.off("activity", onAct);
      socket.off("order-status-updated");
      socket.off("pallet-updated");
    };
  }, []);

  const open = Boolean(anchor);
  const handleOpen = (e) => { setAnchor(e.currentTarget); setUnread(0); };
  const handleClose = () => setAnchor(null);

  return (
    <>
      <IconButton aria-label="notifications" onClick={handleOpen}>
        <Badge color="error" badgeContent={unread}><Bell size={18} /></Badge>
      </IconButton>
      <Popover
        open={open}
        anchorEl={anchor}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{ sx: { width: 360, maxHeight: 420 } }}
      >
        <Box sx={{ p: 1.5, pb: 0 }}>
          <Typography variant="subtitle2" fontWeight={700}>Notifications</Typography>
          <Typography variant="caption" color="text.secondary">Latest events in your plant</Typography>
        </Box>
        <List dense>
          {items.length === 0 ? (
            <ListItem><ListItemText primary="No recent activity yet." /></ListItem>
          ) : items.map((it, i) => (
            <ListItem key={i} divider>
              <ListItemText
                primary={it.message}
                secondary={new Date(it.ts).toLocaleString()}
                primaryTypographyProps={{ sx: { fontSize: 14 } }}
                secondaryTypographyProps={{ sx: { fontSize: 12, color: "text.secondary" } }}
              />
            </ListItem>
          ))}
        </List>
      </Popover>
    </>
  );
}
