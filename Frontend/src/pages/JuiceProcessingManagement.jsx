import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  TextField,
  Button,
  IconButton,
  Stack,
  Grid,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { Delete, Edit, QrCode, Print } from "@mui/icons-material";
import api from "../services/axios";
import Papa from "papaparse";
import backgroundomena from "../assets/backgroundomena.jpg";
import dayjs from "dayjs";
import generateSmallPngQRCode from "../services/qrcodGenerator";
import sendToPrinter from "../services/send_to_printer";

function JuiceProcessingManagement() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchName, setSearchName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrImage, setQrImage] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    document.body.style.backgroundImage = `url(${backgroundomena})`;
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundRepeat = "no-repeat";
    document.body.style.backgroundAttachment = "fixed";

    fetchCompletedOrders();

    return () => {
      document.body.style = "";
    };
  }, []);

  const fetchCompletedOrders = async () => {
    try {
      const res = await api.get("/orders?status=processing complete");
      setOrders(res.data || []);
    } catch (error) {
      console.error("Failed to fetch completed orders", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/orders/${selectedOrder.order_id}`);
      setOrders((prev) => prev.filter((o) => o.order_id !== selectedOrder.order_id));
    } catch (err) {
      console.error("Failed to delete order", err);
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  const handleEdit = async () => {
    try {
      const { order_id, weight_kg, estimated_pouches, estimated_boxes } = selectedOrder;
      await api.put(`/orders/${order_id}`, {
        weight_kg,
        estimated_pouches,
        estimated_boxes
      });
      fetchCompletedOrders();
    } catch (err) {
      console.error("Failed to update order", err);
    } finally {
      setEditDialogOpen(false);
    }
  };

  const handleShowQR = async (orderId) => {
    const img = await generateSmallPngQRCode(orderId);
    setQrImage(img);
    setQrDialogOpen(true);
  };

  const handlePrint = () => {
    if (qrImage) sendToPrinter(qrImage);
  };

  const filteredOrders = orders.filter((order) => {
    const nameMatch = order?.name?.toLowerCase().includes(searchName.toLowerCase());
    const dateMatch = (!startDate || dayjs(order.created_at).isAfter(dayjs(startDate).subtract(1, 'day')))
      && (!endDate || dayjs(order.created_at).isBefore(dayjs(endDate).add(1, 'day')));
    return nameMatch && dateMatch;
  });

  const exportToCSV = () => {
    const csv = Papa.unparse(filteredOrders);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "juice_orders.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns = [
    { field: "order_id", headerName: "Order ID", flex: 1 },
    { field: "name", headerName: "Customer", flex: 1.5 },
    { field: "weight_kg", headerName: "Weight (kg)", flex: 1 },
    { field: "estimated_pouches", headerName: "Pouches", flex: 1 },
    { field: "estimated_boxes", headerName: "Boxes", flex: 1 },
    { field: "status", headerName: "Status", flex: 1 },
    {
      field: "actions",
      headerName: "Actions",
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={1}>
          <IconButton color="primary" onClick={() => { setSelectedOrder(params.row); setEditDialogOpen(true); }}>
            <Edit fontSize="small" />
          </IconButton>
          <IconButton color="error" onClick={() => { setSelectedOrder(params.row); setDeleteDialogOpen(true); }}>
            <Delete fontSize="small" />
          </IconButton>
          <IconButton color="secondary" onClick={() => handleShowQR(params.row.order_id)}>
            <QrCode fontSize="small" />
          </IconButton>
        </Stack>
      ),
      flex: 1.2,
    },
  ];

  return (
    <>
      <Box display="flex" justifyContent="center">
        <Typography
          variant="h6"
          sx={{
            fontSize: "clamp(20px, 5vw, 40px)",
            textAlign: "center",
            paddingTop: "10px",
            paddingBottom: "10px",
            marginBottom: "10px",
            color: "black",
            background: "#a9987d",
            width: "min(1200px, 90%)",
            borderRadius: "10px",
          }}
        >
          Juice Processing Management
        </Typography>
      </Box>

      <Box component={Paper} elevation={3} sx={{ p: 2, mb: 2, mx: 'auto', backgroundColor: '#dcd2ae', borderRadius: 2, width: 'min(1200px, 95%)' }}>
        <Grid container spacing={2} alignItems="center" justifyContent="center">
          <Grid item xs={12} sm={6} md={4}>
            <TextField fullWidth label="Customer name" value={searchName} onChange={(e) => setSearchName(e.target.value)} sx={{ backgroundColor: "white", borderRadius: 1 }} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField fullWidth type="date" label="Start Date" InputLabelProps={{ shrink: true }} value={startDate} onChange={(e) => setStartDate(e.target.value)} sx={{ backgroundColor: "white", borderRadius: 1 }} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField fullWidth type="date" label="End Date" InputLabelProps={{ shrink: true }} value={endDate} onChange={(e) => setEndDate(e.target.value)} sx={{ backgroundColor: "white", borderRadius: 1 }} />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Button fullWidth variant="contained" onClick={exportToCSV} sx={{ height: '100%' }}>Export</Button>
          </Grid>
        </Grid>
      </Box>

      {loading ? <CircularProgress /> : (
        <DataGrid
          rows={filteredOrders.map((o, i) => ({ ...o, id: i }))}
          columns={columns}
          autoHeight
          pageSize={10}
          rowsPerPageOptions={[10, 20, 50]}
          sx={{ backgroundColor: "white", borderRadius: 2, boxShadow: 3, mt: 2, width: '100%' }}
        />
      )}

      <Dialog open={qrDialogOpen} onClose={() => setQrDialogOpen(false)}>
        <DialogTitle>QR Code</DialogTitle>
        <DialogContent>
          <Box display="flex" justifyContent="center">
            <img src={qrImage} alt="QR Code" style={{ width: '200px' }} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQrDialogOpen(false)}>Close</Button>
          <Button onClick={handlePrint} startIcon={<Print />} variant="contained">Print</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Order</DialogTitle>
        <DialogContent>
          <DialogContentText>Are you sure you want to delete this order?</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error">Delete</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
        <DialogTitle>Edit Order</DialogTitle>
        <DialogContent>
          <TextField label="Weight (kg)" fullWidth type="number" value={selectedOrder?.weight_kg || ""} onChange={(e) => setSelectedOrder({ ...selectedOrder, weight_kg: e.target.value })} sx={{ my: 1 }} />
          <TextField label="Pouches" fullWidth type="number" value={selectedOrder?.estimated_pouches || ""} onChange={(e) => setSelectedOrder({ ...selectedOrder, estimated_pouches: e.target.value })} sx={{ my: 1 }} />
          <TextField label="Boxes" fullWidth type="number" value={selectedOrder?.estimated_boxes || ""} onChange={(e) => setSelectedOrder({ ...selectedOrder, estimated_boxes: e.target.value })} sx={{ my: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleEdit} color="primary">Save</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default JuiceProcessingManagement;
