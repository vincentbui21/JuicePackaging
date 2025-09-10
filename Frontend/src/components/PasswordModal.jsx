import React, { useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button } from "@mui/material";

/**
 * PasswordModal component
 * 
 * Props:
 * - open: boolean - controls whether the modal is visible
 * - onClose: function - called when modal is closed without confirming
 * - onConfirm: function({ id, password }) - called when user confirms with credentials
 */
export default function PasswordModal({ open, onClose, onConfirm }) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const handleConfirm = () => {
        onConfirm({ id: username, password });
        setUsername("");
        setPassword("");
    };

    const handleCancel = () => {
        onClose();
        setUsername("");
        setPassword("");
    };

    return (
        <Dialog open={open} onClose={handleCancel}>
        <DialogTitle>Enter Admin Credentials</DialogTitle>
        <DialogContent>
            <TextField
            label="Username"
            fullWidth
            margin="dense"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            />
            <TextField
            label="Password"
            type="password"
            fullWidth
            margin="dense"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            />
        </DialogContent>
        <DialogActions>
            <Button onClick={handleCancel}>Cancel</Button>
            <Button variant="contained" onClick={handleConfirm}>Confirm</Button>
        </DialogActions>
        </Dialog>
    );
}
