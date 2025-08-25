import { useState } from "react";
import { Box, Toolbar, AppBar, Typography, IconButton, Container } from "@mui/material";
import AppSidebar from "./AppSidebar";
import { Settings, Menu } from "lucide-react";
import { Link, Outlet } from "react-router-dom";
import NotificationsBell from "./NotificationsBell";

export default function DashboardLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "#f3f7f4" }}>
      <AppSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <Box component="main" sx={{ flexGrow: 1 }}>
        <AppBar
          elevation={0}
          position="sticky"
          color="inherit"
          sx={{ borderBottom: "1px solid", borderColor: "divider", bgcolor: "rgba(255,255,255,0.8)", backdropFilter: "blur(6px)" }}
        >
          <Toolbar sx={{ minHeight: 64, gap: 1 }}>
            {/* hamburger shows only on mobile */}
            <IconButton
              sx={{ display: { md: "none" } }}
              onClick={() => setMobileOpen(true)}
              aria-label="open navigation"
            >
              <Menu size={18} />
            </IconButton>

            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Apple Processing Dashboard
            </Typography>
            <Box sx={{ ml: "auto" }}>
              <IconButton aria-label="notifications">
                <NotificationsBell size={18} />
              </IconButton>
              <IconButton aria-label="settings" component={Link} to="/setting">
                <Settings size={18} />
              </IconButton>
            </Box>
          </Toolbar>
        </AppBar>

        <Container maxWidth="xl" sx={{ py: 3 }}>
          {children ?? <Outlet />}
        </Container>
      </Box>
    </Box>
  );
}
