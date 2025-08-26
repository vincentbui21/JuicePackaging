import { useEffect, useState } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { Box, TextField, Stack, Button } from '@mui/material';
import api from '../services/axios';
import EditCustomerDialog from './EditCustomerDialog';
import QRCodeDialog from './qrcodeDialog';
import { Edit, Delete, QrCode, Send } from "@mui/icons-material";



export default function CustomerTable() {

    const [CustomerForwardName, setCustomerForwardName] = useState('')
    const [maxCrates, setMaxCrates] = useState('')

    
    const handleDelete = async (row) => {
        try {
            const response = await api.delete('/customer', {
                data: { customer_id: row.customer_id },
            });
            console.log('Deleted successfully:', response.data);
            setButtonClicked(true)
            return response.data;
        } catch (error) {
            console.error('Delete failed:', error);
            throw error;
        }
    };

    function handleEdit (row) {
        // console.log(params);
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
        setMaxCrates(row.crate_count)

        // console.log(row.crate_count);

        try {
        // Fetch crate IDs for this customer from your API
        const response = await api.get('/crates', {
            params: {customer_id: row.customer_id }
        });

        if (response.data && Array.isArray(response.data.crates)) {
            setCrateIds(response.data.crates.map(c => c.crate_id));
            setCustomerForwardName(row.name)
            // console.log(row.name);
            setQrDialogOpen(true);
        } else {
            console.error('Unexpected response format', response.data);
        }
        } catch (error) {
        console.error('Failed to fetch crate IDs:', error);
        }
    };

    const handleNotifySMS = async (row) => {
    try {
        const res = await api.post(`/customers/${row.customer_id}/notify`, {
        // optional: custom message. If omitted, server uses default.
        message: `Hi ${row.name || "there"}, your order is ready for pickup.`,
        });
        console.log("SMS notify:", res.data);
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
        { field: 'status', headerName: 'Status', width: 100 },
        { field: 'notes', headerName: 'Notes', width: 200 },
        { field: 'actions', headerName: 'Actions', width: 300, sortable: false, filterable: false,
            renderCell: (params) => (
                <Stack direction="row" spacing={1} sx={{display:"center", justifyContent: "center", alignItems: "center"}}>
                    <Button variant="outlined" size="small" color="primary" onClick={() => handleEdit(params.row)}>
                        <Edit />
                    </Button>

                    <Button variant="outlined" size="small" color="error" onClick={() => handleDelete(params.row)}>
                        <Delete />
                    </Button>

                    <Button variant="outlined" size="small" color="warning" onClick={() => handleCrateQRPrint(params.row)}>
                        <QrCode />
                    </Button>
                    <Button variant="outlined" size="small" color="success" onClick={() => handleNotifySMS(params.row)}>
                        <Send />
                    </Button>
                </Stack>
            ),
        }
    ];

    const [rows, setRows] = useState([]);
    const [rowCount, setRowCount] = useState(0);
    const [page, setPage] = useState(0);         // 0-based for MUI
    const [pageSize, setPageSize] = useState(10);
    const [loading, setLoading] = useState(false);
    const [customerName, setCustomerName] = useState('');
    const [buttonClicked, setButtonClicked] = useState(false)

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
        })
        .catch((err) => {
            console.error('API error:', err);
            setLoading(false);
        });
    }, [page, pageSize, buttonClicked]);

    return (
        <>
            <Box sx={{ width: 'auto' }}>
                
                <Stack direction="row" spacing={2}
                    sx={{
                        justifySelf: "center",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        width: "min(1200px, 90%)",
                        padding: "5px",
                        borderRadius: "10px",
                        marginBottom: "10px"
                    }}>

                        <TextField label="Customer name" variant="filled" 
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            size="small"
                            sx={{ mb: 2 , width: "80%"}}
                            fullWidth
                            placeholder="Search by customer Name"
                        />

                        <Button variant="contained" onClick={() => {setButtonClicked(true)}}> OK</Button>
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
                    disableRowSelectionOnClick ={true}
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
                name ={CustomerForwardName}
                max={maxCrates}
            />

        </>
        
    );
}
