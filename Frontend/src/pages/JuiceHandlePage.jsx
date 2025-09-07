import {
  Accordion, AccordionSummary, AccordionDetails, Typography, Button,
  Card, CardContent, Stack, Box, Snackbar, TextField, Paper,
  Dialog, DialogTitle, DialogContent, DialogActions, Grid
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useEffect, useState } from "react";
import api from "../services/axios";
import { io } from "socket.io-client";
import generateSmallPngQRCode from "../services/qrcodGenerator";
import DrawerComponent from "../components/drawer";
import printImage from "../services/send_to_printer";

// build socket URL from the same base as axios
const WS_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/").replace(/\/+$/, "");
const socket = io(WS_URL);

function JuiceHandlePage() {
  const [orders, setOrders] = useState([]);
  const [qrCodes, setQrCodes] = useState({}); // { [orderId]: [{index, url}] }
  const [snackbarMsg, setSnackbarMsg] = useState("");
  const [comments, setComments] = useState({});
  const [qrDialog, setQrDialog] = useState({ open: false, order: null }); // popup for QR preview/print

  useEffect(() => {
    fetchProcessingOrders();
    const handleSocketUpdate = () => {
      fetchProcessingOrders();
      setSnackbarMsg("Order status updated!");
    };
    socket.on("order-status-updated", handleSocketUpdate);
    return () => socket.off("order-status-updated", handleSocketUpdate);
  }, []);

  const fetchProcessingOrders = async () => {
    try {
      const res = await api.get("/orders?status=In Progress");
      setOrders(res.data);
    } catch (err) {
      console.error("Error fetching orders:", err);
    }
  };
 
  // Pouch label printing — expiry = 1 year from today
  const printPouchLabels = async (order) => {
    try {
      const customer = order?.name || order?.customer_name || "Unknown";
      const now = new Date();
      const exp = new Date(now);
      exp.setFullYear(exp.getFullYear() + 1);
      const dd = String(exp.getDate()).padStart(2, "0");
      const mm = String(exp.getMonth() + 1).padStart(2, "0");
      const yyyy = exp.getFullYear();
      const expiryDate = `${dd}/${mm}/${yyyy}`;

      const { data } = await api.post("/printer/print-pouch", {
        customer,
        productionDate: expiryDate, // legacy key carries the expiry value
        expiryDate,                 // explicit new key (future-ready)
      });

      console.log("Printer response:", data);
      setSnackbarMsg("Pouch print sent to Videojet (Expiry set +1 year)");
    } catch (err) {
      console.error("Videojet print failed:", err);
      setSnackbarMsg("Failed to print pouch (see console)");
    }
  };

  // Generate QRs and open dialog with preview
  const generateQRCodes = async (order) => {
    const estimatedPouches = Math.floor((order.weight_kg * 0.65) / 3);
    const count = Math.ceil(estimatedPouches / 8); // 8 pouches per box
    const codes = [];
    for (let i = 0; i < count; i++) {
      const text = `BOX_${order.order_id}_${i + 1}`;
      const png = await generateSmallPngQRCode(text);
      codes.push({ index: i + 1, url: png });
    }
    setQrCodes((prev) => ({ ...prev, [order.order_id]: codes }));
    setQrDialog({ open: true, order }); // open popup
    setSnackbarMsg("QR Codes Generated");
  };

  // Print ALL QR codes for the order currently in the dialog via device printer
  const handlePrintAll = async () => {
    const order = qrDialog.order;
    if (!order) return;
    const list = qrCodes[order.order_id] || [];
    try {
      for (const { url, index } of list) {
        // label like b1/5, b2/5, ...
        await printImage(url, order.name, `b${index}/${list.length}`);
      }
      setSnackbarMsg("All QR codes sent to printer");
    } catch (err) {
      console.error("Print all failed", err);
      setSnackbarMsg("Failed to print all QRs (see console)");
    }
  };

  const markOrderDone = async (orderId) => {
    try {
      const comment = comments[orderId] || "";
      const { data } = await api.post(`/orders/${encodeURIComponent(orderId)}/done`, { comment });

      const createdCount = data?.boxes_count ?? null;

      socket.emit("order-status-updated", {
        order_id: orderId,
        status: "processing complete",
        boxes_count: createdCount,
      });

      setOrders((prev) => prev.filter((o) => o.order_id !== orderId));
      setComments((prev) => {
        const { [orderId]: _removed, ...rest } = prev;
        return rest;
      });

      setSnackbarMsg(
        createdCount != null
          ? `Order marked as done. Boxes created: ${createdCount}.`
          : "Order marked as done."
      );
    } catch (err) {
      console.error("Failed to update status", err);
      setSnackbarMsg("Failed to update order status");
    }
  };


  return (

    <>
      <DrawerComponent />
      <Box
        sx={{
          backgroundColor: "#fffff",
          minHeight: "90vh",
          pt: 4,
          pb: 4,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <Paper elevation={3} sx={{ width: "min(90%, 800px)", p: 4, backgroundColor: "#ffffff", borderRadius: 2 }}>
          <Typography variant="h4" sx={{ textAlign: "center", mb: 3, fontWeight: "bold" }}>
            Apple Juice Processing Station
          </Typography>

          <Box sx={{ width: "100%", maxWidth: 800, mt: 3 }}>
            {orders.map((order) => {
              const estimatedPouches = Math.floor((order.weight_kg * 0.65) / 3);
              const qrCount = Math.ceil(estimatedPouches / 8);

              // Expiry date (1 year from today), dd/mm/yyyy for UI display
              const exp = new Date();
              exp.setFullYear(exp.getFullYear() + 1);
              const expiryUi = `${String(exp.getDate()).padStart(2, "0")}/${String(exp.getMonth() + 1).padStart(
                2,
                "0"
              )}/${exp.getFullYear()}`;

              return (
                <Accordion key={order.order_id}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography sx={{ fontWeight: "bold" }}>
                      {order.name} - Est. {estimatedPouches} pouches
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Card sx={{ backgroundColor: "#f5f5f5" }}>
                      <CardContent>
                        <Stack spacing={2}>
                          <Typography>
                            <strong>Order ID:</strong> {order.order_id}
                          </Typography>
                          <Typography>
                            <strong>Customer:</strong> {order.name}
                          </Typography>
                          <Typography>
                            <strong>Apple Weight:</strong> {order.weight_kg} kg
                          </Typography>
                          <Typography>
                            <strong>Estimated Pouches:</strong> {Math.floor((order.weight_kg * 0.65) / 3)}
                          </Typography>
                          <Typography>
                            <strong>QR Codes to Print:</strong> {qrCount}
                          </Typography>
                          <Typography>
                            <strong>Expiry Date:</strong> {expiryUi}
                          </Typography>

                          <TextField
                            label="Comments"
                            fullWidth
                            multiline
                            minRows={2}
                            value={comments[order.order_id] || ""}
                            onChange={(e) =>
                              setComments((prev) => ({ ...prev, [order.order_id]: e.target.value }))
                            }
                          />

                          <Stack direction="row" spacing={2}>
                            <Button variant="contained" onClick={() => printPouchLabels(order)}>
                              Print Pouch Info
                            </Button>
                            <Button
                              variant="contained"
                              color="success"
                              onClick={() => generateQRCodes(order)}
                            >
                              Generate QR Codes
                            </Button>
                            <Button
                              variant="contained"
                              color="error"
                              onClick={() => markOrderDone(order.order_id)}
                            >
                              Mark as Done
                            </Button>
                          </Stack>
                        </Stack>
                      </CardContent>
                    </Card>
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </Box>

          <Snackbar
            open={!!snackbarMsg}
            autoHideDuration={3000}
            onClose={() => setSnackbarMsg("")}
            message={snackbarMsg}
          />
        </Paper>
      </Box>


      {/* QR preview + "Print All" dialog (device printer) */}
      <Dialog
        open={qrDialog.open}
        onClose={() => setQrDialog({ open: false, order: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {qrDialog.order ? `QR Codes – ${qrDialog.order.name}` : "QR Codes"}
        </DialogTitle>
        <DialogContent dividers>
          {qrDialog.order && (qrCodes[qrDialog.order.order_id] || []).length > 0 ? (
            <Grid container spacing={2}>
              {qrCodes[qrDialog.order.order_id].map(({ url, index }) => (
                <Grid item xs={6} key={index}>
                  <Card sx={{ p: 1 }}>
                    <CardContent sx={{ textAlign: "center" }}>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        Box {index}
                      </Typography>
                      <img src={url} alt={`QR ${index}`} style={{ width: 120, height: 120 }} />
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No QR codes generated.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQrDialog({ open: false, order: null })}>Close</Button>
          <Button
            variant="contained"
            onClick={handlePrintAll}
            disabled={!qrDialog.order || !(qrCodes[qrDialog.order.order_id] || []).length}
          >
            Print All
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default JuiceHandlePage;
