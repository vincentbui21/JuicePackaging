import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from "@mui/material";

/**
 * Props:
 *  - open: boolean
 *  - onClose: () => void
 *  - onChoice: (sendNow: boolean) => void
 *  - title?: string
 *  - message?: string
 */
export default function SmsConfirmDialog({ open, onClose, onChoice, title, message }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title || "Send SMS now?"}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary">
          {message || "Do you want to send pickup SMS to the customer(s) right now?"}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onChoice(false)} variant="outlined">No, later</Button>
        <Button onClick={() => onChoice(true)} variant="contained">Yes, send now</Button>
      </DialogActions>
    </Dialog>
  );
}
