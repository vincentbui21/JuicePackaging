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
import printImage from '../services/send_to_printer'


function QRCodeDialog({ open, onClose, data, name }) {
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

    const handlePrint = (src) => {
        // console.log('Send to printer:');
        printImage(src, name)
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
                    <Typography variant="body2">{`QR Code for Crate/Pallete ${index+1}`}</Typography>
                    <Button variant="outlined" onClick={ ()=> handlePrint(qrCodes[index])}>
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
