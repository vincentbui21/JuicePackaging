import { useEffect, useState } from "react";
import { Box, Typography, Stack, Card, CardContent, Button } from "@mui/material";
import axios from "axios";
import { io } from "socket.io-client";
import backgroundomena from "../assets/backgroundomena.jpg";

function JuiceHandlePage() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    document.body.style.backgroundImage = `url(${backgroundomena})`;
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundRepeat = "no-repeat";
    document.body.style.backgroundPosition = "center";
    document.body.style.height = "100vh";
    document.body.style.margin = "0";
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style = "";
    };
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await axios.get("http://localhost:3001/api/orders?status=processing");
      setOrders(res.data);
    } catch (err) {
      console.error("Failed to fetch processing orders:", err);
    }
  };

  useEffect(() => {
    fetchOrders();
    const socket = io("http://localhost:3001");
    socket.on("orderProcessing", () => {
      fetchOrders();
    });
    return () => socket.disconnect();
  }, []);

  const markOrderDone = async (orderId) => {
    try {
      await axios.post(`http://localhost:3001/api/orders/${orderId}/done`);
      setOrders(prev => prev.filter(o => o.order_id !== orderId));
    } catch (err) {
      console.error("Failed to mark done:", err);
    }
  };

  return (
    <Box display="flex" flexDirection="column" alignItems="center" p={2}>
      <Typography variant="h4" sx={{ background: "#a9987d", p: 2, borderRadius: 2, color: "white" }}>
        Juice Handling Station
      </Typography>

      <Stack spacing={2} sx={{ mt: 3, width: "min(1000px, 90%)" }}>
        {orders.map((order) => (
          <Card key={order.order_id} sx={{ bgcolor: "#d6d0b1", borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h6">Customer: {order.customer_name}</Typography>
              <Typography variant="body1">Total Pouches: {order.total_pouches}</Typography>
              <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                <Button variant="contained" disabled>Send to Printer</Button>
                <Button variant="contained" color="success" onClick={() => markOrderDone(order.order_id)}>
                  Mark as Done
                </Button>
              </Stack>
            </CardContent>
          </Card>
        ))}

        {orders.length === 0 && (
          <Typography variant="body1" sx={{ textAlign: 'center', mt: 4, color: "white" }}>
            No orders in processing currently.
          </Typography>
        )}
      </Stack>
    </Box>
  );
}

export default JuiceHandlePage;
