import React, { useEffect, useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Typography,
  LinearProgress
} from '@mui/material';
import generateSmallPngQRCode from '../services/qrcodGenerator';
import printImage from '../services/send_to_printer';

function QRCodeDialog({ open, onClose, data, name, max }) {
  const [qrCodes, setQrCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);

  // Defensive: normalize incoming data to an array of strings
  const items = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return [String(data)];
  }, [data]);

  useEffect(() => {
    let cancelled = false;

    async function generateQRCodes() {
      try {
        setLoading(true);
        const codes = await Promise.all(items.map(text => generateSmallPngQRCode(text)));
        if (!cancelled) setQrCodes(codes);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (open && items.length) {
      generateQRCodes();
    } else {
      setQrCodes([]);
    }

    return () => { cancelled = true; };
  }, [items, open]);

  // Print ALL QR codes via your device print management
  const handlePrintAll = async () => {
    if (!qrCodes.length || printing) return;

    setPrinting(true);
    try {
      const total = max || qrCodes.length;
      // Print sequentially with a tiny delay (helps some print subsystems)
      for (let i = 0; i < qrCodes.length; i++) {
        await printImage(qrCodes[i], name || '', `c${i + 1}/${total}`);
        await new Promise(r => setTimeout(r, 150));
      }
    } catch (e) {
      console.error('Print all failed:', e);
      alert('Printing failed. Check printer connection and try again.');
    } finally {
      setPrinting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>QR Codes</DialogTitle>

      <DialogContent dividers>
        {loading && (
          <Stack spacing={2} sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Generating QR codes…
            </Typography>
            <LinearProgress />
          </Stack>
        )}

        <Stack spacing={3}>
          {qrCodes.map((src, index) => (
            <Stack key={index} spacing={1} alignItems="center">
              <Typography variant="body2">
                {name ? `${name} — ` : ''}Crate {index + 1}{max ? ` / ${max}` : ''}
              </Typography>
              <img
                src={src}
                alt={`QR code ${index + 1}`}
                width={100}
                height={100}
                style={{ imageRendering: 'pixelated' }}
              />
            </Stack>
          ))}
          {!qrCodes.length && !loading && (
            <Typography variant="body2" color="text.secondary">
              No QR codes to display.
            </Typography>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button
          onClick={handlePrintAll}
          variant="contained"
          disabled={!qrCodes.length || printing}
        >
          {printing ? 'Printing…' : 'Print all'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default QRCodeDialog;
