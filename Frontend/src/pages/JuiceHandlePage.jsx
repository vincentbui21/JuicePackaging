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
} from "@mui/material";

import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useEffect, useState } from "react";
import axios from "../services/axios";
import backgroundomena from "../assets/backgroundomena.jpg";
import { io } from "socket.io-client";
import { generateSmallPngQRCode } from "../services/qrcodGenerator";
import { TextField } from "@mui/material";

const socket = io("http://localhost:3001");

function JuiceHandlePage() {
  const [orders, setOrders] = useState([]);
  const [qrCodes, setQrCodes] = useState({});
  const [snackbarMsg, setSnackbarMsg] = useState("");
  const [comments, setComments] = useState({});

  useEffect(() => {
    document.body.style.backgroundImage = `url(${backgroundomena})`;
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundRepeat = "no-repeat";
    document.body.style.backgroundPosition = "center";
    document.body.style.height = "100vh";
    document.body.style.margin = "0";
    document.body.style.overflow = "auto";

    fetchProcessingOrders();

    socket.on("order-status-updated", () => {
      fetchProcessingOrders();
    });

    return () => {
      socket.disconnect();
      document.body.style = "";
    };
  }, []);

  const fetchProcessingOrders = async () => {
    try {
      const res = await axios.get("/api/orders?status=processing");
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
    const count = Math.ceil(order.total_pouches / 8);
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
      await axios.post(`/api/orders/${orderId}/done`, { comment });
      setOrders((prev) => prev.filter((o) => o.order_id !== orderId));
      setSnackbarMsg("Order marked as done");
      setComments((prev) => {
        const updated = { ...prev };
        delete updated[orderId];
        return updated;
      });
    } catch (err) {
      console.error("Failed to update status", err);
      setSnackbarMsg("Failed to update order status");
    }
  };
  
  return (
    <Box display="flex" flexDirection="column" alignItems="center" p={2}>
      <Typography
        variant="h4"
        sx={{ background: "#a9987d", p: 2, borderRadius: 2, color: "white" }}
      >
        Apple Juice Processing Station
      </Typography>

      <Box sx={{ width: "100%", maxWidth: 800, mt: 3 }}>
        {orders.map((order) => {
          const qrCount = Math.ceil(order.total_pouches / 8);
          const expiryDate = new Date();
          expiryDate.setFullYear(expiryDate.getFullYear() + 1);

          return (
            <Accordion key={order.order_id}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography sx={{ fontWeight: "bold" }}>
                  {order.name} - {order.total_pouches} pouches
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Card sx={{ backgroundColor: "#f5f5f5" }}>
                  <CardContent>
                    <Stack spacing={2}>
                      <Typography><strong>Order ID:</strong> {order.order_id}</Typography>
                      <Typography><strong>Customer:</strong> {order.name}</Typography>
                      <Typography><strong>Total Pouches:</strong> {order.total_pouches}</Typography>
                      <Typography><strong>QR Codes to Print:</strong> {qrCount}</Typography>
                      <Typography><strong>Expiry Date:</strong> {expiryDate.toISOString().split("T")[0]}</Typography>

                      <Stack direction="row" spacing={2}>

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

                        <Button
                          variant="contained"
                          onClick={() => printPouchLabels(order)}
                        >
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
    </Box>
  );
}

export default JuiceHandlePage;
