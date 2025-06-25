import React, { useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button
} from '@mui/material';

export default function EditPalletDialog({ open, onClose, onSubmit, initialData }) {
    const [newCapacity, setNewCapacity] = useState(initialData?.capacity || '');

    const handleChange = (e) => {
        setNewCapacity(e.target.value);
    };

    const handleSubmit = () => {
        const parsed = parseInt(newCapacity, 10);
        if (!isNaN(parsed) && parsed >= 0) {
            onSubmit(parsed);
            onClose();
        } else {
            alert('Please enter a valid positive number.');
        }
    };

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Edit Pallet Capacity</DialogTitle>
            <DialogContent>
                <TextField
                    autoFocus
                    margin="dense"
                    label="New Capacity"
                    type="number"
                    value={newCapacity}
                    onChange={handleChange}
                    fullWidth
                    variant="standard"
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handleSubmit} variant="contained">Update</Button>
            </DialogActions>
        </Dialog>
    );
}
