import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    Stack,
    MenuItem
} from '@mui/material';
import api from '../services/axios';

function EditCustomerDialog({ open, onClose, initialData, onUpdateSuccess }) {

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        city: '',
        created_at: '',
        weight_kg: '',
        crate_count: '',
        total_cost: '',
        status: '',
        notes: '',
    });

    useEffect(() => {
        if (initialData) {
        setFormData({
            name: initialData.name || '',
            email: initialData.email || '',
            phone: initialData.phone || '',
            city: initialData.city || '',
            created_at: initialData.created_at || '',
            weight_kg: initialData.weight_kg || '',
            crate_count: initialData.crate_count || '',
            total_cost: initialData.total_cost || '',
            status: initialData.status || '',
            notes: initialData.notes || '',
        });
        }
    }, [initialData]);

    const statusOptions = [
    { value: 'Created', label: 'Created' },
    { value: 'Picked up', label: 'Picked up' },
    { value: 'Ready for pickup', label: 'Ready for pickup' },
    { value: 'Processing complete', label: 'processing complete' },
    { value: 'In Progress', label: 'In Progress' },
    ];

    const handleChange = (field) => (event) => {
        setFormData((prev) => ({ ...prev, [field]: event.target.value }));
    };

    const handleSubmit = async () => {
        try {
        await api.put('/customer', {
            customer_id: initialData.customer_id,
            customerInfoChange: {
            Name: formData.name,
            email: formData.email,
            phone: formData.phone,
            city: formData.city,
            },
            orderInfoChange: {
            Date: formData.created_at,
            weight: formData.weight_kg,
            crate: formData.crate_count,
            cost: formData.total_cost,
            Status: formData.status,
            Notes: formData.notes,
            },
        });

        onUpdateSuccess();
        onClose();
        } catch (error) {
        console.error('Update failed:', error);
        alert('Update failed');
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Customer</DialogTitle>
        <DialogContent dividers>
            <Stack spacing={2}>
            <TextField label="Name" value={formData.name} onChange={handleChange('name')} fullWidth />
            <TextField label="Email" value={formData.email} onChange={handleChange('email')} fullWidth />
            <TextField label="Phone" value={formData.phone} onChange={handleChange('phone')} fullWidth />
            
            <TextField 
                select
                required
                label="City"
                value={formData.city}
                name="city"
                onChange={handleChange('city')}
                fullWidth
            >
                <MenuItem value="Kuopio">Kuopio</MenuItem>
                <MenuItem value="Mikkeli">Mikkeli</MenuItem>
                <MenuItem value="Varkaus">Varkaus</MenuItem>
                <MenuItem value="Lapinlahti">Lapinlahti</MenuItem>
                <MenuItem value="Joensuu">Joensuu</MenuItem>
                <MenuItem value="Lahti">Lahti</MenuItem>
            </TextField>

            <TextField
                label="Date"
                type="date"
                value={formData.created_at ? formData.created_at.split('T')[0] : ''}
                onChange={handleChange('created_at')}
                fullWidth
                disabled
            />

            <TextField
                label="Weight (kg)"
                type="number"
                value={formData.weight_kg}
                onChange={handleChange('weight_kg')}
                fullWidth
            />
            <TextField
                label="Crates (kpl)"
                type="number"
                value={formData.crate_count}
                onChange={handleChange('crate_count')}
                fullWidth
            />
            <TextField
                label="Cost (€)"
                type="number"
                value={formData.total_cost}
                onChange={handleChange('total_cost')}
                fullWidth
            />
            {/* <TextField label="Status" value={formData.status} onChange={handleChange('status')} fullWidth /> */}
            <TextField
            select
            label="Status"
            value={formData.status}
            onChange={handleChange('status')}
            fullWidth
            helperText="Please select the order status"
            >
            {statusOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                {option.label}
                </MenuItem>
            ))}
            </TextField>
            <TextField
                label="Notes"
                value={formData.notes}
                onChange={handleChange('notes')}
                multiline
                rows={3}
                fullWidth
            />
            </Stack>
        </DialogContent>
        <DialogActions>
            <Button onClick={onClose} color="inherit">
            Cancel
            </Button>
            <Button onClick={handleSubmit} variant="contained" color="primary">
            OK
            </Button>
        </DialogActions>
        </Dialog>

        );
}

export default EditCustomerDialog;