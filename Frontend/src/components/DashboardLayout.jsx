import { useEffect, useState } from "react";
import { Box, Toolbar, AppBar, Typography, IconButton, Container, Chip } from "@mui/material";
import AppSidebar from "./AppSidebar";
import { Settings, Menu, User } from "lucide-react";
import { Link, Outlet } from "react-router-dom";
import NotificationsBell from "./NotificationsBell";
import LanguageSelector from "./LanguageSelector";
import ThemeModeToggle from "./ThemeModeToggle";
import { useTranslation } from "react-i18next";

export default function DashboardLayout({ children }) {
  const { t } = useTranslation();
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
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      <AppSidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
      />

      <Box component="main" sx={{ flexGrow: 1 }}>
        <AppBar
          elevation={0}
          position="sticky"
          color="inherit"
          sx={{ 
            borderBottom: "1px solid", 
            borderColor: "divider", 
            bgcolor: "background.paper",
            backdropFilter: "blur(6px)" 
          }}
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
              {t('app.title')}
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
              <ThemeModeToggle />
              <LanguageSelector />
              <NotificationsBell />
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
