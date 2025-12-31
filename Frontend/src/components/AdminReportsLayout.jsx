import { useEffect, useState } from "react";
import { Box, Toolbar, AppBar, Typography, IconButton, Container, Chip } from "@mui/material";
import { Settings, Menu, User } from "lucide-react";
import { Link, Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import NotificationsBell from "./NotificationsBell";

export default function AdminReportsLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem("sidebarCollapsed") === "1";
  });
  const [loggedInUserId, setLoggedInUserId] = useState("");

  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", sidebarCollapsed ? "1" : "0");
  }, [sidebarCollapsed]);

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    setLoggedInUserId(userId || "");
  }, []);

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default", overflowX: "hidden" }}>
      <AppSidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
      />

      <Box component="main" sx={{ flexGrow: 1, minWidth: 0 }}>
        <AppBar
          elevation={0}
          position="sticky"
          color="inherit"
          sx={{ borderBottom: "1px solid", borderColor: "divider", bgcolor: "background.paper", backdropFilter: "blur(6px)" }}
        >
          <Toolbar sx={{ minHeight: 64, gap: 1 }}>
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

            <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 1 }}>
              {loggedInUserId && (
                <Chip
                  icon={<User size={14} />}
                  label={loggedInUserId}
                  size="small"
                  color="primary"
                  sx={{
                    fontWeight: 600,
                    display: { xs: 'none', sm: 'flex' }
                  }}
                />
              )}
              <NotificationsBell />
              <IconButton aria-label="settings" component={Link} to="/setting">
                <Settings size={18} />
              </IconButton>
            </Box>
          </Toolbar>
        </AppBar>

        <Container maxWidth={false} sx={{ py: 3, px: { xs: 2, md: 3 } }}>
          {children ?? <Outlet />}
        </Container>
      </Box>
    </Box>
  );
}
