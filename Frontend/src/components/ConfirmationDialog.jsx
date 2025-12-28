import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from "@mui/material";

/**
 * Props:
 *  - open: boolean
 *  - onClose: () => void
 *  - onConfirm: () => void
 *  - title?: string
 *  - message?: string
 *  - confirmText?: string
 *  - cancelText?: string
 */
export default function ConfirmationDialog({ open, onClose, onConfirm, title, message, confirmText, cancelText }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title || "Are you sure?"}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary">
          {message || "Do you want to proceed with this action?"}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="outlined">{cancelText || 'Cancel'}</Button>
        <Button onClick={onConfirm} variant="contained" color="error">{confirmText || 'Confirm'}</Button>
      </DialogActions>
    </Dialog>
  );
}
