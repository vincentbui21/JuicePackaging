// src/components/AppSidebar.jsx
import { useMemo, useState, useEffect } from "react";
import {
  Drawer, Toolbar, List, ListItemButton, ListItemIcon, ListItemText,
  Box, Typography, Divider, Stack, IconButton, Avatar, Tooltip
} from "@mui/material";
import {
  Home, Users, Package, Droplets, Boxes, Archive, MapPin,
  UserCog, Grid3X3, Layers, Plus, ChevronLeft, ChevronRight, LogOut, BarChart3, Settings
} from "lucide-react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import companyLogo from "../assets/company_logo.png";
import { useTranslation } from 'react-i18next';

const EXPANDED_WIDTH = 260;
const COLLAPSED_WIDTH = 100;

export default function AppSidebar({
  mobileOpen,
  onClose,
  collapsed = false,
  onToggleCollapsed,
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isActive = useMemo(() => (p) => pathname === p, [pathname]);
  const width = collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH;
  const [canViewReports, setCanViewReports] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const operations = [
    { label: t('sidebar.dashboard'), to: "/dashboard", icon: <Home size={18} /> },
    { label: t('sidebar.customer_info_entry'), to: "/customer-info-entry", icon: <Users size={18} /> },
    { label: t('sidebar.crate_management'), to: "/crate-handling", icon: <Package size={18} /> },
    { label: t('sidebar.juice_processing'), to: "/juice-processing", icon: <Droplets size={18} /> },
    { label: t('sidebar.load_boxes_pallet'), to: "/load-boxes-to-pallet", icon: <Boxes size={18} /> },
    { label: t('sidebar.load_pallet_shelf'), to: "/load-pallet-to-shelf", icon: <Archive size={18} /> },
    { label: t('sidebar.pickup_coordination'), to: "/pickup", icon: <MapPin size={18} /> },
  ];

  const management = [
    { label: t('sidebar.shelves_pallets'), to: "/shelves-pallets-management", icon: <Grid3X3 size={18} /> },
    { label: t('sidebar.unified_management'), to: "/unified-management", icon: <UserCog size={18} /> },
    { label: t('sidebar.delete_bin'), to: "/delete-bin", icon: <Archive size={18} /> },
  ];

  const createNew = [
    { label: t('sidebar.create_pallet'), to: "/create-pallet", icon: <Plus size={18} /> },
    { label: t('sidebar.create_shelf'), to: "/create-shelve", icon: <Plus size={18} /> },
  ];

  const adminItems = [
    { label: t('sidebar.admin_reports'), to: "/admin/reports", icon: <BarChart3 size={18} /> },
    { label: t('sidebar.settings'), to: "/setting", icon: <Settings size={18} /> },
  ];

  useEffect(() => {
    try {
      const permissionsStr = localStorage.getItem("userPermissions");
      if (permissionsStr) {
        const permissions = JSON.parse(permissionsStr);
        setCanViewReports(permissions.can_view_reports === 1 || permissions.role === 'admin');
        setIsAdmin(permissions.role === 'admin');
      }
    } catch (err) {
      console.error("Failed to parse user permissions:", err);
    }
  }, []);

  const handleLogout = () => {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("userId");
      localStorage.removeItem("userPermissions");
      localStorage.removeItem("role");
      sessionStorage.clear();
    } catch {}
    navigate("/");
  };

  const Section = ({ title, items }) => (
    <>
      {!collapsed && (
        <Typography sx={{ px: 2, pt: 2, pb: 0.5, fontSize: 12, color: "text.secondary" }}>
          {title}
        </Typography>
      )}
      <List dense sx={{ py: collapsed ? 0.5 : 0 }}>
        {items.map((it) => {
          const content = (
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
                whiteSpace: "nowrap",
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
                <ListItemText
                  primary={it.label}
                  primaryTypographyProps={{
                    fontSize: 14,
                    fontWeight: 500,
                    noWrap: true,
                  }}
                  sx={{ ".MuiListItemText-primary": { overflow: "hidden", textOverflow: "ellipsis" } }}
                />
              )}
            </ListItemButton>
          );
          return collapsed ? (
            <Tooltip key={it.label} title={it.label} placement="right">
              <span>{content}</span>
            </Tooltip>
          ) : (
            content
          );
        })}
      </List>
    </>
  );

  const DrawerContent = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Toolbar sx={{ px: 1.25 }}>
        <Stack direction="row" alignItems="center" spacing={1.25} sx={{ width: "100%", minHeight: 48 }}>
          {/* Company logo only (Apple icon removed) */}
          <Avatar
            src={companyLogo}
            alt="Company"
            sx={{ width: 32, height: 32, flexShrink: 0 }}
          />

          {/* Name and sublabel (hidden in collapsed mode) */}
          {!collapsed && (
            <Box sx={{ overflow: "hidden", whiteSpace: "nowrap" }}>
              <Typography variant="subtitle2" fontWeight={700} noWrap>
                Mehustaja
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                Processing Dashboard
              </Typography>
            </Box>
          )}

          {/* Only the collapse/expand arrow on the right */}
          <Box sx={{ ml: "auto" }}>
            <IconButton aria-label={collapsed ? t('sidebar.expand') : t('sidebar.collapse')} size="small" onClick={onToggleCollapsed}>
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </IconButton>
          </Box>
        </Stack>
      </Toolbar>

      <Divider />

      <Box sx={{ overflowY: "auto", overflowX: "hidden", pb: 1, flexGrow: 1 }}>
        <Section title={t('sidebar.operations')} items={operations} />
        <Section title={t('sidebar.management')} items={management} />
        {/* <Section title="Create New" items={createNew} /> */}
        {(canViewReports || isAdmin) && (
          <Section 
            title={t('sidebar.admin')} 
            items={adminItems.filter(item => {
              if (item.to === "/admin/reports") return canViewReports;
              if (item.to === "/setting") return isAdmin;
              return false;
            })} 
          />
        )}
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
              primary={t('sidebar.logout')}
              primaryTypographyProps={{ fontSize: 14, fontWeight: 600, color: "error.main", noWrap: true }}
            />
          )}
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <>
      {/* Mobile drawer */}
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
            overflowX: "hidden",
          },
        }}
      >
        {DrawerContent}
      </Drawer>

      {/* Desktop drawer (collapsible) */}
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
            overflowX: "hidden", // prevent horizontal scroll
          },
        }}
        open
      >
        {DrawerContent}
      </Drawer>
    </>
  );
}
