
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Button,
  Card,
  CardContent,
  Stack,
  Box,
  Snackbar,
  TextField,
  Paper,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useEffect, useState } from "react";
import api from "../services/axios";
import backgroundomena from "../assets/backgroundomena.jpg";
import { io } from "socket.io-client";
import generateSmallPngQRCode from '../services/qrcodGenerator';
import DrawerComponent from "../components/drawer";

const socket = io("http://localhost:5001");

function JuiceHandlePage() {
  const [orders, setOrders] = useState([]);
  const [qrCodes, setQrCodes] = useState({});
  const [snackbarMsg, setSnackbarMsg] = useState("");
  const [comments, setComments] = useState({});

  useEffect(() => {
    fetchProcessingOrders();

    const handleSocketUpdate = () => {
      fetchProcessingOrders();
      setSnackbarMsg("Order status updated!");
    };

    socket.on("order-status-updated", handleSocketUpdate);

    return () => {
      socket.off("order-status-updated", handleSocketUpdate);
      // document.body.style = "";
    };
  }, []);

  const fetchProcessingOrders = async () => {
    try {
      const res = await api.get("/orders?status=In Progress");
      setOrders(res.data);
    } catch (err) {
      console.error("Error fetching orders:", err);
    }
  };

  const printPouchLabels = (order) => {
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    const popup = window.open("", "_blank");
    popup.document.write(`
      <html><head><title>Print Pouch Info</title></head><body>
      <h2>Pouch Info</h2>
      <p><strong>Customer:</strong> ${order.name}</p>
      <p><strong>Expiry:</strong> ${expiryDate.toISOString().split("T")[0]}</p>
      </body></html>
    `);
    popup.document.close();
    popup.print();
  };

  const generateQRCodes = async (order) => {
    const estimatedPouches = Math.floor((order.weight_kg * 0.65) / 3);
    const count = Math.ceil(estimatedPouches / 8);
    const codes = [];

    for (let i = 0; i < count; i++) {
      const text = `CRATE_${order.order_id}_${i + 1}`;
      const png = await generateSmallPngQRCode(text);
      codes.push({ index: i + 1, url: png });
    }

    setQrCodes((prev) => ({ ...prev, [order.order_id]: codes }));
    setSnackbarMsg("QR Codes Generated");
  };

  const printSingleQRCode = (url, index) => {
    const popup = window.open("", "_blank");
    popup.document.write(`
      <html><head><title>Print QR Code</title></head><body>
      <p>Box ${index}</p>
      <img src="${url}" style="width:150px;" />
      </body></html>
    `);
    popup.document.close();
    popup.print();
  };

  const markOrderDone = async (orderId) => {
    try {
      const comment = comments[orderId] || "";
      await api.post(`/orders/${orderId}/done`, { comment });
      socket.emit("order-completed", { order_id: orderId, status: "Loading" });
      setOrders((prev) => prev.filter((o) => o.order_id !== orderId));
      setComments((prev) => {
        const updated = { ...prev };
        delete updated[orderId];
        return updated;
      });
      setSnackbarMsg("Order marked as done");
    } catch (err) {
      console.error("Failed to update status", err);
      setSnackbarMsg("Failed to update order status");
    }
  };

  return (
    <>
      <DrawerComponent></DrawerComponent>
      
    <Box
      sx={
          {
              backgroundColor: "#fffff",
              minHeight: "90vh",
              paddingTop: 4,
              paddingBottom: 4,
              display: "flex",
              justifyContent: "center"
          }
      }>
          <Paper elevation={3} sx={{
              width: "min(90%, 800px)",
              padding: 4,
              backgroundColor: "#ffffff",
              borderRadius: 2
          }}>
            <Typography
              variant="h4" sx={{ textAlign: "center", marginBottom: 3, fontWeight: 'bold' }}>
              Apple Juice Processing Station
            </Typography>

            <Box sx={{ width: "100%", maxWidth: 800, mt: 3 }}>
              {orders.map((order) => {
                const estimatedPouches = Math.floor((order.weight_kg * 0.65) / 3);
                const qrCount = Math.ceil(estimatedPouches / 8);
                const expiryDate = new Date();
                expiryDate.setFullYear(expiryDate.getFullYear() + 1);

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
                        <Typography><strong>Order ID:</strong> {order.order_id}</Typography>
                        <Typography><strong>Customer:</strong> {order.name}</Typography>
                        <Typography><strong>Apple Weight:</strong> {order.weight_kg} kg</Typography>
                        <Typography><strong>Estimated Pouches:</strong> {estimatedPouches}</Typography>
                        <Typography><strong>QR Codes to Print:</strong> {qrCount}</Typography>
                        <Typography><strong>Expiry Date:</strong> {expiryDate.toISOString().split("T")[0]}</Typography>

                        <TextField
                          label="Comments"
                          fullWidth
                          multiline
                          minRows={2}
                          value={comments[order.order_id] || ""}
                          onChange={(e) =>
                            setComments((prev) => ({
                              ...prev,
                              [order.order_id]: e.target.value,
                            }))
                          }
                        />

                        <Stack direction="row" spacing={2}>
                          <Button variant="contained" onClick={() => printPouchLabels(order)}>Print Pouch Info</Button>
                          <Button variant="contained" color="success" onClick={() => generateQRCodes(order)}>Generate QR Codes</Button>
                          <Button variant="contained" color="error" onClick={() => markOrderDone(order.order_id)}>Mark as Done</Button>
                        </Stack>

                        {qrCodes[order.order_id] && (
                          <Box mt={3}>
                            <Typography variant="subtitle1">Generated QR Codes:</Typography>
                            <Stack direction="row" spacing={2} flexWrap="wrap">
                              {qrCodes[order.order_id].map(({ url, index }) => (
                                <Card key={index} sx={{ p: 1, backgroundColor: "#fff" }}>
                                  <CardContent sx={{ textAlign: "center" }}>
                                    <Typography variant="body2">Box {index}</Typography>
                                    <img src={url} alt={`QR ${index}`} style={{ width: 120, height: 120 }} />
                                    <Button
                                      size="small"
                                      sx={{ mt: 1 }}
                                      variant="outlined"
                                      onClick={() => printSingleQRCode(url, index)}
                                    >
                                      Print
                                    </Button>
                                  </CardContent>
                                </Card>
                              ))}
                            </Stack>
                          </Box>
                        )}
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
    </>
  );
}

export default JuiceHandlePage;
