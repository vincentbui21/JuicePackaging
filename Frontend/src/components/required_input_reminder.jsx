import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button, Stack } from "@mui/material";
import generateSmallPngQRCode from "../services/qrcodGenerator";

function RequiredInputReminder({ open, setOpen }) {
    return (
    <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Error!</DialogTitle>
        <DialogContent>
            <DialogContentText>
                Please complete all required fields before submitting the form.
            </DialogContentText>

        </DialogContent>
        <DialogActions>
        <Button onClick={() => setOpen(false)}>Confirm</Button>
        </DialogActions>
    </Dialog>
    );
}

export default RequiredInputReminder;
