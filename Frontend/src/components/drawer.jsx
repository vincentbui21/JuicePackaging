import React, { useState } from 'react';
import {
    Drawer,
    IconButton,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Box,
    Typography,
    Divider
} from '@mui/material';
import { Link } from 'react-router-dom';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import HomeIcon from '@mui/icons-material/Home';
import ManageSearchIcon from '@mui/icons-material/ManageSearch';
import BlenderIcon from '@mui/icons-material/Blender';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import PlaceIcon from '@mui/icons-material/Place';
import PeopleIcon from '@mui/icons-material/People';
import CasesIcon from '@mui/icons-material/Cases';
import PalletIcon from '@mui/icons-material/Pallet';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';

function DrawerComponent() {
    const [open, setOpen] = useState(true);

    const toggleDrawer = (state) => () => {
        setOpen(state);
    };

    const listItems = [
        { text: 'Customer Info Entry', icon: <HomeIcon /> , to: '/customer-info-entry'},
        { text: 'Crate Management', icon: <ManageSearchIcon /> , to: '/crate-handling'},
        { text: 'Juice Processing', icon: <BlenderIcon /> , to: '/juice-handle'},
        { text: 'Box Loading', icon: <Inventory2Icon /> , to: '/loading-handle'},
        { text: 'Pickup Coordination', icon: <PlaceIcon /> , to: '/pickup'},
    ];

    const adminListItems =[
        { text: 'Customer Management', icon: <PeopleIcon /> , to: '/customer-management'},
        { text: 'Order Management', icon: <CasesIcon /> , to: '/juice-management'},
        { text: 'Pallet Management', icon: <PalletIcon /> , to: '/pallet-management'},
    ]

    const settingAndAuthListItems = [
        { text: 'Setting', icon: <SettingsIcon /> , to: '/setting'},
        { text: 'Logout', icon: <LogoutIcon /> , to: '/'},
    ]

    return (
        <>
            <IconButton
                edge="start"
                color="inherit"
                aria-label="menu"
                onClick={toggleDrawer(true)}
                sx={{
                    position: 'fixed',
                    top: 16,
                    left: 16,
                }}
            >
                <MenuIcon />
            </IconButton>

            <Drawer
                variant="persistent"
                anchor="left"
                open={open}
                onClose={() => {}} // disable closing on backdrop click
                ModalProps={{ hideBackdrop: true }} 
            >
                <Box sx={{ width: 250 }}>
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            px: 2,
                            py: 1,
                            paddingTop: "25px"
                        }}
                    >
                        <Typography variant="h6" sx={{fontWeight: 'bold' }}>🍎 Mehustaja</Typography>

                        <IconButton onClick={toggleDrawer(false)} size="small">
                            <ChevronLeftIcon />
                        </IconButton>
                    </Box>
                    <List>
                        {listItems.map((item, index) => (
                            <ListItem 
                                button 
                                key={index}
                                component={Link}
                                to={item.to} 
                                sx={{ mb: 1 }}>
                                <ListItemIcon>{item.icon}</ListItemIcon>
                                <ListItemText primary={item.text} primaryTypographyProps={{ color: 'black' }}/>
                            </ListItem>
                        ))}
                    </List>
                    <Divider></Divider>
                    <List>
                        {adminListItems.map((item, index) => (
                            <ListItem 
                                button 
                                key={index}
                                component={Link}
                                to={item.to} 
                                sx={{ mb: 1 }}>
                                <ListItemIcon>{item.icon}</ListItemIcon>
                                <ListItemText primary={item.text} primaryTypographyProps={{ color: 'black' }}/>
                            </ListItem>
                        ))}
                    </List>

                    <Divider></Divider>
                    
                    <List>
                        {settingAndAuthListItems.map((item, index) => (
                            <ListItem 
                                button 
                                key={index}
                                component={Link}
                                to={item.to} 
                                sx={{ mb: 1 }}>
                                <ListItemIcon>{item.icon}</ListItemIcon>
                                <ListItemText primary={item.text} primaryTypographyProps={{ color: 'black' }}/>
                            </ListItem>
                        ))}
                    </List>
                    
                </Box>
            </Drawer>
        </>
    );
}

export default DrawerComponent;
