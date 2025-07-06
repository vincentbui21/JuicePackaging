import React, { useState } from 'react';
import { IconButton, Menu, MenuItem } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useNavigate  } from 'react-router-dom';

function CornerMenuButton() {
    const navigate = useNavigate()

    const [anchorEl, setAnchorEl] = useState(null);

    const handleOpen = (event) => {
        setAnchorEl(event.target);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleSelect = (section) => {
        navigate(section)
        handleClose();
    };

    return (
        <div style={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 1000
        }}>
        <IconButton color="primary" onClick={handleOpen}>
            <MenuIcon />
        </IconButton>
        <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleClose}
        >
            <MenuItem onClick={() => handleSelect('/loading-management')}>Loading management</MenuItem>
            <MenuItem onClick={() => handleSelect('/customer-management')}>Customer management</MenuItem>
        </Menu>
        </div>
    );
}

export default CornerMenuButton;
