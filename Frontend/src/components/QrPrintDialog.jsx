import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Stack,
    Typography,
  } from "@mui/material";
  
  function QrPrintDialog({ open, onClose, qrCodes, order }) {
    const handlePrint = () => {
      const popup = window.open("", "_blank");
      popup.document.write("<html><head><title>Print QR Codes</title></head><body>");
      qrCodes.forEach((url, index) => {
        popup.document.write(`
          <div style="margin: 20px; text-align: center;">
            <h3>Box ${index + 1}</h3>
            <img src="${url}" width="150" />
          </div>
        `);
      });
      popup.document.write("</body></html>");
      popup.document.close();
      popup.print();
    };
  
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>QR Codes for {order?.name}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} alignItems="center">
            {qrCodes.map((url, index) => (
              <img key={index} src={url} alt={`QR Code ${index + 1}`} width={150} />
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="contained" onClick={handlePrint}>Print</Button>
        </DialogActions>
      </Dialog>
    );
  }
  
  export default QrPrintDialog;
  