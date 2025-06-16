import React, { useEffect, useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Stack,
    Typography
} from '@mui/material';
import generateSmallPngQRCode from '../services/qrcodGenerator';


function QRCodeDialog({ open, onClose, data }) {
    const [qrCodes, setQrCodes] = useState([]);

    useEffect(() => {
        async function generateQRCodes() {
        const codes = await Promise.all(data.map(text => generateSmallPngQRCode(text)));
        setQrCodes(codes);
        }

        if (open) {
        generateQRCodes();
        }
    }, [data, open]);

    const handlePrint = (index) => {
        console.log('Send to printer:', data[index]);
        // TODO: Add actual printing logic here
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>QR Codes</DialogTitle>
        <DialogContent dividers>
            <Stack spacing={4}>
            {qrCodes.map((src, index) => (
                <Stack direction="row" spacing={2} alignItems="center" key={index}>
                <img src={src} alt={`QR code ${index}`} width={100} height={100} />
                <Stack spacing={1}>
                    <Typography variant="body2">{`QR Code for Crate ${index+1}`}</Typography>
                    <Button variant="outlined">
                    Send to Printer
                    </Button>
                </Stack>
                </Stack>
            ))}
            </Stack>
        </DialogContent>
        <DialogActions>
            <Button onClick={onClose}>Close</Button>
        </DialogActions>
        </Dialog>
    );
}

export default QRCodeDialog;
