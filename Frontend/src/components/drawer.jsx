import React, { useState } from 'react';
import {
  Drawer, IconButton, List, ListItem, ListItemText, ListItemIcon,
  Box, Typography, Divider
} from '@mui/material';
import { Link } from 'react-router-dom';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import HomeIcon from '@mui/icons-material/Home';
import ManageSearchIcon from '@mui/icons-material/ManageSearch';
import BlenderIcon from '@mui/icons-material/Blender';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import SellIcon from '@mui/icons-material/Sell';
import PlaceIcon from '@mui/icons-material/Place';
import PeopleIcon from '@mui/icons-material/People';
import CasesIcon from '@mui/icons-material/Cases';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import GridViewIcon from '@mui/icons-material/GridView';
import AddBoxIcon from '@mui/icons-material/AddBox';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';

function DrawerComponent() {
  const [open, setOpen] = useState(true);
  const toggleDrawer = (state) => () => setOpen(state);

  // Operations (day-to-day)
  const ops = [
    { text: 'Customer Info Entry', icon: <HomeIcon/>, to: '/customer-info-entry' },
    { text: 'Crate Management', icon: <ManageSearchIcon/>, to: '/crate-handling' },
    { text: 'Juice Processing', icon: <BlenderIcon/>, to: '/juice-handle' },
    // ⬇️ Split loading flow (replaces old single "Box Loading")
    { text: 'Load Boxes → Pallet', icon: <Inventory2Icon/>, to: '/load-boxes-to-pallet' },
    { text: 'Load Pallet → Shelf', icon: <SellIcon/>, to: '/load-pallet-to-shelf' },
    { text: 'Pickup Coordination', icon: <PlaceIcon/>, to: '/pickup' },
  ];

  // Admin / management views
  const admin = [
    { text: 'Customer Management', icon: <PeopleIcon/>, to: '/customer-management' },
    { text: 'Order Management', icon: <CasesIcon/>, to: '/juice-management' },
    { text: 'Pallets Management', icon: <WarehouseIcon/>, to: '/pallets-management' },
    { text: 'Shelves Management', icon: <GridViewIcon/>, to: '/shelve-management' },
  ];

  // Utilities / config
  const util = [
    { text: 'Create Pallet', icon: <AddBoxIcon/>, to: '/create-pallet' },
    { text: 'Create Shelf', icon: <AddBoxIcon/>, to: '/create-shelve' },
    { text: 'Setting', icon: <SettingsIcon/>, to: '/setting' },
    { text: 'Logout', icon: <LogoutIcon/>, to: '/' },
  ];

  return (
    <>
      <IconButton
        edge="start"
        color="inherit"
        aria-label="menu"
        onClick={toggleDrawer(true)}
        sx={{ position: 'fixed', top: 16, left: 16, zIndex: 1500 }}
      >
        <MenuIcon />
      </IconButton>

      <Drawer
        variant="persistent"
        anchor="left"
        open={open}
        ModalProps={{ hideBackdrop: true }}
      >
        <Box sx={{ width: 260 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, py: 1, pt: '25px' }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>🍎 Mehustaja</Typography>
            <IconButton onClick={toggleDrawer(false)} size="small">
              <ChevronLeftIcon />
            </IconButton>
          </Box>

          <List>
            {ops.map((item) => (
              <ListItem button key={item.to} component={Link} to={item.to} sx={{ mb: 1 }}>
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} primaryTypographyProps={{ color: 'black' }} />
              </ListItem>
            ))}
          </List>

          <Divider />

          <List>
            {admin.map((item) => (
              <ListItem button key={item.to} component={Link} to={item.to} sx={{ mb: 1 }}>
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} primaryTypographyProps={{ color: 'black' }} />
              </ListItem>
            ))}
          </List>

          <Divider />

          <List>
            {util.map((item) => (
              <ListItem button key={item.to} component={Link} to={item.to} sx={{ mb: 1 }}>
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} primaryTypographyProps={{ color: 'black' }} />
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>
    </>
  );
}

export default DrawerComponent;
