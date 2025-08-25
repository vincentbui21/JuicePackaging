import { useMemo } from "react";
import {
  Drawer, Toolbar, List, ListItemButton, ListItemIcon, ListItemText,
  Box, Typography, Divider, Stack, IconButton, Avatar, Tooltip
} from "@mui/material";
import {
  Home, Users, Package, Droplets, Boxes, Archive, MapPin,
  UserCog, Grid3X3, Layers, Plus, Bell, Settings, Apple as AppleIcon,
  ChevronLeft, ChevronRight, LogOut
} from "lucide-react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import companyLogo from "../assets/company_logo.png";

const EXPANDED_WIDTH = 260;
const COLLAPSED_WIDTH = 72;

const operations = [
  { label: "Dashboard", to: "/dashboard", icon: <Home size={18} /> },
  { label: "Customer Info Entry", to: "/customer-info-entry", icon: <Users size={18} /> },
  { label: "Crate Management", to: "/crate-handling", icon: <Package size={18} /> },
  { label: "Juice Processing", to: "/juice-processing", icon: <Droplets size={18} /> },
  { label: "Load Boxes → Pallet", to: "/load-boxes-to-pallet", icon: <Boxes size={18} /> },
  { label: "Load Pallet → Shelf", to: "/load-pallet-to-shelf", icon: <Archive size={18} /> },
  { label: "Pickup Coordination", to: "/pickup", icon: <MapPin size={18} /> },
];

const management = [
  { label: "Customer Management", to: "/customer-management", icon: <UserCog size={18} /> },
  { label: "Pallets Management", to: "/pallets-management", icon: <Grid3X3 size={18} /> },
  { label: "Shelves Management", to: "/shelve-management", icon: <Layers size={18} /> },
  { label: "Juice Processing Management", to: "/juice-processing-management", icon: <Droplets size={18} /> },
  { label: "Settings", to: "/setting", icon: <Settings size={18} /> },
];

const createNew = [
  { label: "Create Pallet", to: "/create-pallet", icon: <Plus size={18} /> },
  { label: "Create Shelf", to: "/create-shelve", icon: <Plus size={18} /> },
];

export default function AppSidebar({ mobileOpen, onClose, collapsed = false, onToggleCollapsed }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isActive = useMemo(() => (p) => pathname === p, [pathname]);

  const handleLogout = () => {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      sessionStorage.clear();
    } catch {}
    navigate("/");
  };

  const width = collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH;

  const Section = ({ title, items }) => (
    <>
      {!collapsed && (
        <Typography sx={{ px: 2, pt: 2, pb: 0.5, fontSize: 12, color: "text.secondary" }}>
          {title}
        </Typography>
      )}
      <List dense sx={{ py: collapsed ? 0.5 : 0 }}>
        {items.map((it) => {
          const li = (
            <ListItemButton
              key={it.label}
              component={Link}
              to={it.to}
              selected={isActive(it.to)}
              sx={{
                mx: collapsed ? 0.75 : 1,
                mb: 0.5,
                borderRadius: 9999,
                py: 1,
                justifyContent: collapsed ? "center" : "flex-start",
                "&.Mui-selected": {
                  bgcolor: "rgba(46,125,50,0.12)",
                  color: "primary.main",
                  "& .MuiListItemIcon-root": { color: "primary.main" },
                },
                "&:hover": { bgcolor: "action.hover" },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: collapsed ? 0 : 1.25,
                  color: "text.secondary",
                  justifyContent: "center",
                }}
              >
                {it.icon}
              </ListItemIcon>
              {!collapsed && (
                <ListItemText primaryTypographyProps={{ fontSize: 14, fontWeight: 500 }} primary={it.label} />
              )}
            </ListItemButton>
          );

          return collapsed ? (
            <Tooltip key={it.label} title={it.label} placement="right">
              <span>{li}</span>
            </Tooltip>
          ) : (
            li
          );
        })}
      </List>
    </>
  );

  // Shared drawer content
  const DrawerContent = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Toolbar sx={{ px: 1.25 }}>
        <Stack
          direction="row"
          alignItems="center"
          spacing={1.25}
          sx={{ width: "100%", minHeight: 48 }}
        >
          <Avatar
            src={companyLogo}
            sx={{ width: 32, height: 32, display: collapsed ? "none" : "inline-flex" }}
          />
          <Avatar sx={{ width: 32, height: 32, bgcolor: "primary.main" }}>
            <AppleIcon size={18} color="#fff" />
          </Avatar>

          {!collapsed && (
            <Box sx={{ overflow: "hidden", whiteSpace: "nowrap" }}>
              <Typography variant="subtitle2" fontWeight={700}>
                Mehustaja
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Processing Dashboard
              </Typography>
            </Box>
          )}

          <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 0.25 }}>
            {!collapsed && (
              <IconButton aria-label="notifications" size="small">
                <Bell size={16} />
              </IconButton>
            )}
            {!collapsed && (
              <IconButton aria-label="settings" component={Link} to="/setting" size="small">
                <Settings size={16} />
              </IconButton>
            )}
            {/* Collapse/Expand toggle */}
            <IconButton aria-label="collapse sidebar" size="small" onClick={onToggleCollapsed}>
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </IconButton>
          </Box>
        </Stack>
      </Toolbar>

      <Divider />

      <Box sx={{ overflowY: "auto", pb: 1, flexGrow: 1 }}>
        <Section title="Operations" items={operations} />
        <Section title="Management" items={management} />
        <Section title="Create New" items={createNew} />
      </Box>

      <Divider />

      <Box sx={{ p: 1.5 }}>
        <ListItemButton
          onClick={handleLogout}
          sx={{
            mx: collapsed ? 0.75 : 0.5,
            borderRadius: 9999,
            py: 1,
            justifyContent: collapsed ? "center" : "flex-start",
            "&:hover": { bgcolor: "action.hover" },
          }}
        >
          <ListItemIcon sx={{ minWidth: 0, mr: collapsed ? 0 : 1.25, color: "error.main" }}>
            <LogOut size={18} />
          </ListItemIcon>
          {!collapsed && (
            <ListItemText
              primary="Logout"
              primaryTypographyProps={{ fontSize: 14, fontWeight: 600, color: "error.main" }}
            />
          )}
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <>
      {/* Mobile (temporary) */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            width: EXPANDED_WIDTH,
            boxSizing: "border-box",
            borderRight: "1px solid",
            borderColor: "divider",
            backgroundColor: "#fafdf9",
          },
        }}
      >
        {DrawerContent}
      </Drawer>

      {/* Desktop (permanent + collapsible) */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", md: "block" },
          width,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width,
            boxSizing: "border-box",
            borderRight: "1px solid",
            borderColor: "divider",
            backgroundColor: "#fafdf9",
            transition: "width 200ms ease",
          },
        }}
        open
      >
        {DrawerContent}
      </Drawer>
    </>
  );
}



// This code defines the sidebar for the application, including sections for operations, management, and creating new items. 
// I used it to replace the original sidebar code in the AppSidebar component. The sidebar includes links to various pages, each with an icon and label. The active link is highlighted, and the sidebar is styled to fit within the application's layout. 
// The sections are dynamically generated based on the provided arrays of items, making it easy to maintain and update. 