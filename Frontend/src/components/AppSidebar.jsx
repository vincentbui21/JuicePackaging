import { useMemo } from "react";
import {
  Drawer, Toolbar, List, ListItemButton, ListItemIcon, ListItemText,
  Box, Typography, Divider, Stack, IconButton, Avatar
} from "@mui/material";
import {
  Home, Users, Package, Droplets, Boxes, Archive, MapPin,
  UserCog, Grid3X3, Layers, Plus, Bell, Settings, Apple as AppleIcon,
  LogOut
} from "lucide-react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import companyLogo from "../assets/company_logo.png"; // make sure path matches your tree

const drawerWidth = 260;

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

export default function AppSidebar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isActive = useMemo(() => (p) => pathname === p, [pathname]);

  const handleLogout = () => {
    try {
      // clear anything your app might have stored
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      sessionStorage.clear();
    } catch (_) {}
    navigate("/"); // back to LoginPage
  };

  const Section = ({ title, items }) => (
    <>
      <Typography sx={{ px: 2, pt: 2, pb: 0.5, fontSize: 12, color: "text.secondary" }}>
        {title}
      </Typography>
      <List dense sx={{ py: 0 }}>
        {items.map((it) => (
          <ListItemButton
            key={it.label}
            component={Link}
            to={it.to}
            selected={isActive(it.to)}
            sx={{
              mx: 1,
              mb: 0.5,
              borderRadius: 9999,
              py: 1,
              "&.Mui-selected": {
                bgcolor: "rgba(46,125,50,0.12)",
                color: "primary.main",
                "& .MuiListItemIcon-root": { color: "primary.main" },
              },
              "&:hover": { bgcolor: "action.hover" },
            }}
          >
            <ListItemIcon sx={{ minWidth: 34, color: "text.secondary" }}>
              {it.icon}
            </ListItemIcon>
            <ListItemText primaryTypographyProps={{ fontSize: 14, fontWeight: 500 }} primary={it.label} />
          </ListItemButton>
        ))}
      </List>
    </>
  );

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: drawerWidth,
          boxSizing: "border-box",
          borderRight: "1px solid",
          borderColor: "divider",
          backgroundColor: "#fafdf9",
        },
      }}
    >
      {/* make the inside a column so we can pin Logout at the bottom */}
      <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <Toolbar sx={{ px: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1.25}>
            <Avatar src={companyLogo} sx={{ width: 32, height: 32 }} />
            <Avatar sx={{ width: 32, height: 32, bgcolor: "primary.main" }}>
              <AppleIcon size={18} color="#fff" />
            </Avatar>
            <Box>
              <Typography variant="subtitle2" fontWeight={700}>Mehustaja</Typography>
              <Typography variant="caption" color="text.secondary">Processing Dashboard</Typography>
            </Box>
          </Stack>
          <Box sx={{ ml: "auto" }}>
            <IconButton aria-label="notifications" size="small"><Bell size={16} /></IconButton>
            <IconButton aria-label="settings" component={Link} to="/setting" size="small">
              <Settings size={16} />
            </IconButton>
          </Box>
        </Toolbar>

        <Divider />

        {/* main nav scrolls, takes leftover space */}
        <Box sx={{ overflowY: "auto", pb: 1, flexGrow: 1 }}>
          <Section title="Operations" items={operations} />
          <Section title="Management" items={management} />
          <Section title="Create New" items={createNew} />
        </Box>

        <Divider />

        {/* pinned logout */}
        <Box sx={{ p: 1.5 }}>
          <ListItemButton
            onClick={handleLogout}
            sx={{
              mx: 0.5,
              borderRadius: 9999,
              py: 1,
              "&:hover": { bgcolor: "action.hover" },
            }}
          >
            <ListItemIcon sx={{ minWidth: 34, color: "error.main" }}>
              <LogOut size={18} />
            </ListItemIcon>
            <ListItemText
              primary="Logout"
              primaryTypographyProps={{ fontSize: 14, fontWeight: 600, color: "error.main" }}
            />
          </ListItemButton>
        </Box>
      </Box>
    </Drawer>
  );
}


// This code defines the sidebar for the application, including sections for operations, management, and creating new items. 
// I used it to replace the original sidebar code in the AppSidebar component. The sidebar includes links to various pages, each with an icon and label. The active link is highlighted, and the sidebar is styled to fit within the application's layout. 
// The sections are dynamically generated based on the provided arrays of items, making it easy to maintain and update. 