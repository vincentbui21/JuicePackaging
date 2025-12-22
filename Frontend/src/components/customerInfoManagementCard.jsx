import { useEffect, useState } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import {
  Box, TextField, Stack, Button, Tooltip, Chip, CircularProgress,
} from '@mui/material';
import { Edit, Delete, QrCode, Send } from '@mui/icons-material';
import api from '../services/axios';
import EditCustomerDialog from './EditCustomerDialog';
import QRCodeDialog from './qrcodeDialog';
import PasswordModal from './PasswordModal';

const isReadyForPickup = (s) => String(s || '').toLowerCase() === 'ready for pickup';

// Small chip component that fetches /customers/:id/sms-status
function SmsStatusChip({ customerId, refreshKey }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/customers/${customerId}/sms-status`);
      setStatus(data);
    } catch (e) {
      console.error('sms-status fetch failed:', e);
      setStatus({ last_status: 'not_sent', sent_count: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // re-fetch when parent toggles the key
  }, [customerId, refreshKey]);

  if (loading) {
    return <CircularProgress size={18} />;
  }

  const sent = String(status?.last_status || '').toLowerCase() === 'sent';
  const count = Number(status?.sent_count || 0);

  return (
    <Chip
      size="small"
      color={sent ? 'success' : 'default'}
      variant={sent ? 'filled' : 'outlined'}
      label={sent ? `Sent (${count})` : 'Not sent'}
    />
  );
}

export default function CustomerInfoManagementCard() {
  const [rows, setRows] = useState([]);
  const [rowCount, setRowCount] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [customerName, setCustomerName] = useState('');

  const [editOpen, setEditOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [crateIds, setCrateIds] = useState([]);
  const [customerForwardName, setCustomerForwardName] = useState('');
  const [maxCrates, setMaxCrates] = useState('');

  // Password modal state
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [rowToDelete, setRowToDelete] = useState(null);

  // force chips to refresh after manual sends
  const [smsRefreshTick, setSmsRefreshTick] = useState(0);

  const reload = () => setSmsRefreshTick((n) => n + 1);

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
      })
      .catch((err) => {
        console.error('API error:', err);
        setLoading(false);
      });
  }, [page, pageSize, customerName]);

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
    // after dialog save, reload the list
    setCustomerName((v) => v); // no-op triggers effect if you prefer; or just call same GET again
  };

  // QR code handlers
  const handleCrateQRPrint = async (row) => {
    setMaxCrates(row.crate_count);
    try {
      const response = await api.get('/crates', { params: { customer_id: row.customer_id } });
      if (response.data && Array.isArray(response.data.crates)) {
        setCrateIds(response.data.crates.map((c) => c.crate_id));
        setCustomerForwardName(row.name);
        setQrDialogOpen(true);
      } else {
        console.error('Unexpected response format', response.data);
      }
    } catch (error) {
      console.error('Failed to fetch crate IDs:', error);
    }
  };

  /// Manual SMS button
const handleNotifySMS = async (row) => {
  if (!isReadyForPickup(row?.status)) {
    alert("Can only send SMS when status is 'Ready for pickup'.");
    return;
  }
  try {
    // fire the SMS (server also updates SmsStatus counters)
    const res = await api.post(`/customers/${row.customer_id}/notify`, {});
    alert(res.data?.message || 'SMS attempted');

    // update the chip
    reload();
  } catch (e) {
    console.error('Notify failed', e);
    alert('SMS failed – check server logs');
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
        // re-fetch table
        setCustomerName((v) => v);
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

    // NEW: SMS status column
    {
      field: 'sms_status',
      headerName: 'SMS',
      width: 140,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <SmsStatusChip
          customerId={params.row.customer_id}
          refreshKey={smsRefreshTick}
        />
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
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Button variant="outlined" size="small" color="primary" onClick={() => handleEdit(params.row)}>
              <Edit />
            </Button>

            <Button variant="outlined" size="small" color="error" onClick={() => handleDeleteClick(params.row)}>
              <Delete />
            </Button>

            <Button variant="outlined" size="small" color="warning" onClick={() => handleCrateQRPrint(params.row)}>
              <QrCode />
            </Button>

            <Tooltip title={ready ? 'Send SMS' : "Only available when status is 'Ready for pickup'."}>
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
    },
  ];

  return (
    <>
      <Box sx={{ width: '100%', overflowX: 'hidden' }}>
        <Box sx={{ width: '100%', maxWidth: 1200, mt: 2 }}>
          <Stack direction="row" spacing={2} sx={{ mb: 2, alignItems: 'center' }}>
            <TextField
              label="Customer name"
              variant="filled"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              size="small"
              fullWidth
              placeholder="Search by customer Name"
            />
            <Button variant="contained" onClick={() => setCustomerName((v) => v)}>OK</Button>
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
            sx={{ width: '100%', '& .MuiDataGrid-viewport': { overflowX: 'auto' } }}
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
        name={customerForwardName}
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
