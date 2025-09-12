import { useEffect, useState, memo } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { Box, TextField, Stack, Button, Tooltip, Paper } from '@mui/material';
import { Edit, Delete, QrCode, Send } from "@mui/icons-material";
import api from '../services/axios';
import EditCustomerDialog from './EditCustomerDialog';
import QRCodeDialog from './qrcodeDialog';
import PasswordModal from './PasswordModal';

export default function CustomerInfoManagementCard() {
  const [CustomerForwardName, setCustomerForwardName] = useState('');
  const [maxCrates, setMaxCrates] = useState('');

  const isReadyForPickup = (s) => String(s || '').toLowerCase() === 'ready for pickup';

  const [rows, setRows] = useState([]);
  const [rowCount, setRowCount] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [buttonClicked, setButtonClicked] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [crateIds, setCrateIds] = useState([]);

  // Password modal state
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [rowToDelete, setRowToDelete] = useState(null);

  useEffect(() => {
    setLoading(true);
    api
      .get('/customer', {
        params: {
          page: page + 1,
          limit: pageSize,
          customerName: customerName || undefined,
        },
      })
      .then((res) => {
        const data = res.data;
        setRows(data.rows);
        setRowCount(data.total);
        setLoading(false);
        setButtonClicked(false);
      })
      .catch((err) => {
        console.error('API error:', err);
        setLoading(false);
      });
  }, [page, pageSize, buttonClicked]);

  // Edit handlers
  const handleEdit = (row) => {
    setSelectedRow(row);
    setEditOpen(true);
  };

  const handleEditClose = () => {
    setEditOpen(false);
    setSelectedRow(null);
  };

  const handleUpdateSuccess = () => {
    setButtonClicked(true);
  };

  // QR code handlers
  const handleCrateQRPrint = async (row) => {
    setMaxCrates(row.crate_count);

    try {
      const response = await api.get('/crates', { params: { customer_id: row.customer_id } });

      if (response.data && Array.isArray(response.data.crates)) {
        setCrateIds(response.data.crates.map(c => c.crate_id));
        setCustomerForwardName(row.name);
        setQrDialogOpen(true);
      } else {
        console.error('Unexpected response format', response.data);
      }
    } catch (error) {
      console.error('Failed to fetch crate IDs:', error);
    }
  };

  // SMS handler
  const handleNotifySMS = async (row) => {
    if (!isReadyForPickup(row?.status)) {
      alert("Can only send SMS when status is 'Ready for pickup'.");
      return;
    }
    try {
      const res = await api.post(`/customers/${row.customer_id}/notify`, {});
      alert(res.data?.message || "SMS attempted");
    } catch (e) {
      console.error("Notify failed", e);
      alert("SMS failed – check server logs");
    }
  };

  // Delete handlers
  const handleDeleteClick = (row) => {
    setRowToDelete(row);
    setPasswordModalOpen(true);
  };

  const handlePasswordConfirm = async ({ id, password }) => {
    try {
      await api.post('/auth/login', { id, password }); // backend expects id='admin'

      if (rowToDelete) {
        await api.delete('/customer', { data: { customer_id: rowToDelete.customer_id } });
        setRowToDelete(null);
        setButtonClicked(true);
        alert('Customer deleted successfully!');
      }
    } catch (err) {
      console.error('Admin verification failed:', err);
      alert('Invalid admin password!');
    } finally {
      setPasswordModalOpen(false);
    }
  };

  const handlePasswordCancel = () => {
    setRowToDelete(null);
    setPasswordModalOpen(false);
  };

  const columns = [
    { field: 'name', headerName: 'Name', width: 150 },
    { field: 'email', headerName: 'Email', width: 200 },
    { field: 'phone', headerName: 'Phone', width: 150 },
    { field: 'city', headerName: 'City', width: 120 },
    { field: 'created_at', headerName: 'Date', width: 150 },
    { field: 'weight_kg', headerName: 'Weight (kg)', width: 100 },
    { field: 'crate_count', headerName: 'Crates (kpl)', width: 100 },
    { field: 'total_cost', headerName: 'Cost (€)', width: 100 },
    { field: 'status', headerName: 'Status', width: 130 },
    { field: 'notes', headerName: 'Notes', width: 200 },

    // NEW: SMS status column (uses order_id on each row)
    {
      field: 'sms_status',
      headerName: 'SMS',
      width: 130,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <SmsStatusChip row={params.row} refresh={smsRefreshTick} />
      ),
    },

    {
      field: 'actions',
      headerName: 'Actions',
      width: 360,
      sortable: false,
      filterable: false,
      renderCell: (params) => {
        const ready = isReadyForPickup(params.row?.status);

        return (
          <Stack direction="row" spacing={1} sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
            <Button variant="outlined" size="small" color="primary" onClick={() => handleEdit(params.row)}>
              <Edit />
            </Button>

            <Button variant="outlined" size="small" color="error" onClick={() => handleDeleteClick(params.row)}>
              <Delete />
            </Button>

            <Button variant="outlined" size="small" color="warning" onClick={() => handleCrateQRPrint(params.row)}>
              <QrCode />
            </Button>

            <Tooltip title={ready ? "Send SMS" : "Only available when status is 'Ready for pickup'."}>
              <span>
                <Button
                  variant="outlined"
                  size="small"
                  color="success"
                  disabled={!ready}
                  onClick={() => handleNotifySMS(params.row)}
                >
                  <Send />
                </Button>
              </span>
            </Tooltip>
          </Stack>
        );
      },
    }
  ];

  return (
    <>
      <Box sx={{ width: '100%', overflowX: 'hidden' }}>
  <Box sx={{ width: "100%", maxWidth: 1200, mt: 2 }}>
    <Stack direction="row" spacing={2} sx={{ mb: 2, justifyContent: "flex-start", alignItems: "center" }}>
      <TextField
        label="Customer name"
        variant="filled"
        value={customerName}
        onChange={(e) => setCustomerName(e.target.value)}
        size="small"
        fullWidth
        placeholder="Search by customer Name"
      />
      <Button variant="contained" onClick={() => setButtonClicked(true)}>OK</Button>
    </Stack>

    <DataGrid
      rows={rows}
      columns={columns}
      rowCount={rowCount}
      loading={loading}
      pagination
      paginationMode="server"
      paginationModel={{ page, pageSize }}
      onPaginationModelChange={(model) => {
        setPage(model.page);
        setPageSize(model.pageSize);
      }}
      getRowId={(row) => row.customer_id}
      autoHeight={false}
      disableRowSelectionOnClick
      hideFooterSelectedRowCount
      sx={{
        width: '100%',
        '& .MuiDataGrid-viewport': { overflowX: 'auto' },
      }}
    />
  </Box>
</Box>


      <EditCustomerDialog
        open={editOpen}
        onClose={handleEditClose}
        initialData={selectedRow}
        onUpdateSuccess={handleUpdateSuccess}
      />

      <QRCodeDialog
        open={qrDialogOpen}
        onClose={() => setQrDialogOpen(false)}
        data={crateIds}
        name={CustomerForwardName}
        max={maxCrates}
      />

      <PasswordModal
        open={passwordModalOpen}
        onClose={handlePasswordCancel}
        onConfirm={handlePasswordConfirm}
      />
    </>
  );
}
