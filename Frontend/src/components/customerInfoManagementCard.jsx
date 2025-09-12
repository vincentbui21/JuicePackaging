import { useEffect, useState, memo } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { Box, TextField, Stack, Button, Tooltip, Chip } from '@mui/material';
import api from '../services/axios';
import EditCustomerDialog from './EditCustomerDialog';
import QRCodeDialog from './qrcodeDialog';
import { Edit, Delete, QrCode, Send } from "@mui/icons-material";

/** Tiny cell component to show SMS status for an order. */
const SmsStatusChip = memo(function SmsStatusChip({ row, refresh }) {
  const [status, setStatus] = useState({ last_status: 'not_sent', sent_count: 0, updated_at: null });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const cid = row?.customer_id;
        if (!cid) return;
        const { data } = await api.get(`/customers/${encodeURIComponent(cid)}/sms-status`);
        if (!cancelled && data) {
          setStatus({
            last_status: data.last_status || 'not_sent',
            sent_count: Number(data.sent_count || 0),
            updated_at: data.updated_at || null,
          });
        }
      } catch {
        // keep default "Not sent"
      }
    }

    load();
    return () => { cancelled = true; };
  }, [row?.customer_id, refresh]);

  const sent = String(status.last_status || '').toLowerCase() === 'sent';
  return (
    <Tooltip title={sent ? (status.updated_at ? `Last sent: ${status.updated_at}` : 'SMS sent') : 'No SMS sent yet'}>
      <Chip
        size="small"
        variant="outlined"
        color={sent ? "success" : "default"}
        label={sent ? `Sent (${status.sent_count || 0})` : 'Not sent'}
        sx={{ fontWeight: 600 }}
      />
    </Tooltip>
  );
});


export default function CustomerTable() {
  const [CustomerForwardName, setCustomerForwardName] = useState('');
  const [maxCrates, setMaxCrates] = useState('');

  // NEW: used to force-refresh SmsStatusChip after manual sends
  const [smsRefreshTick, setSmsRefreshTick] = useState(0);

  // helper: strict check (adjust here if your spelling varies)
  const isReadyForPickup = (s) => String(s || '').toLowerCase() === 'ready for pickup';

  const handleDelete = async (row) => {
    try {
      const response = await api.delete('/customer', {
        data: { customer_id: row.customer_id },
      });
      console.log('Deleted successfully:', response.data);
      setButtonClicked(true);
      return response.data;
    } catch (error) {
      console.error('Delete failed:', error);
      throw error;
    }
  };

  function handleEdit(row) {
    setSelectedRow(row);
    setEditOpen(true);
  }

  const handleEditClose = () => {
    setEditOpen(false);
    setSelectedRow(null);
  };

  const handleUpdateSuccess = () => {
    // reload table after update
    setButtonClicked(true);
  };

  const handleCrateQRPrint = async (row) => {
    setMaxCrates(row.crate_count);

    try {
      // Fetch crate IDs for this customer from your API
      const response = await api.get('/crates', {
        params: { customer_id: row.customer_id }
      });

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

  const handleNotifySMS = async (row) => {
    if (!isReadyForPickup(row?.status)) {
      alert("Can only send SMS when status is 'Ready for pickup'.");
      return;
    }
    try {
      // No message in body → server uses location-based template
      const res = await api.post(`/customers/${row.customer_id}/notify`, {});
      console.log("SMS notify:", res.data);

      // If backend already records SMS status, just refresh the chip:
      setSmsRefreshTick((t) => t + 1);

      alert(res.data?.message || "SMS attempted");
    } catch (e) {
      console.error("Notify failed", e);
      alert("SMS failed – check server logs");
    }
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
          <Stack direction="row" spacing={1} sx={{ display: "center", justifyContent: "center", alignItems: "center" }}>
            <Button variant="outlined" size="small" color="primary" onClick={() => handleEdit(params.row)}>
              <Edit />
            </Button>

            <Button variant="outlined" size="small" color="error" onClick={() => handleDelete(params.row)}>
              <Delete />
            </Button>

            <Button variant="outlined" size="small" color="warning" onClick={() => handleCrateQRPrint(params.row)}>
              <QrCode />
            </Button>

            {/* Message button only active when status is "Ready for pickup" */}
            <Tooltip title={ready ? "Send SMS" : "Only available when status is 'Ready for pickup'."}>
              <span> {/* span wrapper so Tooltip works with disabled Button */}
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

  const [rows, setRows] = useState([]);
  const [rowCount, setRowCount] = useState(0);
  const [page, setPage] = useState(0);         // 0-based for MUI
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [buttonClicked, setButtonClicked] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [crateIds, setCrateIds] = useState([]);

  useEffect(() => {
    setLoading(true);
    api
      .get('/customer', {
        params: {
          page: page + 1, // backend expects 1-based
          limit: pageSize,
          customerName: customerName || undefined, // skip param if empty
        },
      })
      .then((res) => {
        const data = res.data;
        setRows(data.rows);
        setRowCount(data.total);
        setLoading(false);
        setButtonClicked(false);
        // also refresh chips on reload
        setSmsRefreshTick((t) => t + 1);
      })
      .catch((err) => {
        console.error('API error:', err);
        setLoading(false);
      });
  }, [page, pageSize, buttonClicked]);

  return (
    <>
      <Box sx={{ width: 'auto' }}>
        <Stack
          direction="row"
          spacing={2}
          sx={{
            justifySelf: "center",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            width: "min(1200px, 90%)",
            padding: "5px",
            borderRadius: "10px",
            marginBottom: "10px"
          }}
        >
          <TextField
            label="Customer name"
            variant="filled"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            size="small"
            sx={{ mb: 2, width: "80%" }}
            fullWidth
            placeholder="Search by customer Name"
          />

          <Button variant="contained" onClick={() => { setButtonClicked(true); }}>OK</Button>
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
          getRowId={(row) => row.customer_id} // very important
          checkboxSelection={false}
          disableRowSelectionOnClick={true}
          hideFooterSelectedRowCount={true}
        />
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
    </>
  );
}
