import { useEffect, useState } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { Box, Button, Stack, Typography, TextField } from '@mui/material';
import { RestoreFromTrash, DeleteForever } from '@mui/icons-material';
import api from '../services/axios';
import DrawerComponent from '../components/drawer';
import ConfirmationDialog from '../components/ConfirmationDialog';

export default function DeleteBinPage() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

        const fetchDeletedCustomers = () => {

            setLoading(true);

            api.get('/deleted-customers')

                .then((res) => {
                    // console.log('deleted-customers response:', res.data); // <--- add this

                    setRows(res.data);

                    setLoading(false);

                })

                .catch((err) => {

                    console.error('API error:', err);

                    setLoading(false);

                });

        };

    

        useEffect(() => {

            fetchDeletedCustomers();

        }, []);

    

        const handleRestore = (customer) => {

            api.post('/restore-customer', { customer_id: customer.customer_id })

                .then(() => {

                    fetchDeletedCustomers();

                    window.dispatchEvent(new CustomEvent('customers-updated'));

                })

                .catch((err) => {

                    console.error('Error restoring customer:', err);

                });

        };

    

        const handleDeleteClick = (customer) => {

            setSelectedCustomer(customer);

            setConfirmDialogOpen(true);

        };

    

        const handleConfirmDelete = () => {

            if (selectedCustomer) {

                api.delete('/force-delete-customer', { data: { customer_id: selectedCustomer.customer_id } })

                    .then(() => {

                        fetchDeletedCustomers();

                    })

                    .catch((err) => {

                        console.error('Error permanently deleting customer:', err);

                    })

                    .finally(() => {

                        setConfirmDialogOpen(false);

                        setSelectedCustomer(null);

                    });

            }

        };

    

        const filteredRows = rows.filter((row) => {

            if (!row) {

                return false;

            }

            const query = searchQuery.toLowerCase();

            return (

                (row.name && row.name.toLowerCase().includes(query)) ||

                (row.phone && row.phone.toLowerCase().includes(query))

            );

        });

    

        const columns = [

            { field: 'name', headerName: 'Name', width: 150 },

            { field: 'email', headerName: 'Email', width: 200 },

            { field: 'phone', headerName: 'Phone', width: 150 },

            { field: 'city', headerName: 'City', width: 120 },

            {
            field: 'deleted_at',
            headerName: 'Deleted At',
            width: 220,
            valueGetter: (value, row) => {
                const raw = row?.deleted_at;
                if (!raw) return 'N/A';

                const d = new Date(raw); 
                if (Number.isNaN(d.getTime())) return 'N/A';

                return d.toLocaleString();
            },
            },


            {
            field: 'actions',
            headerName: 'Actions',
            width: 300,
            sortable: false,
            filterable: false,
            renderCell: (params) => (
                <Stack
                direction="row"
                spacing={1}
                justifyContent="center"
                alignItems="center"
                sx={{ width: '100%', height: '100%' }} // important for centering in the cell
                >
                <Button
                    variant="outlined"
                    size="small"
                    color="success"
                    startIcon={<RestoreFromTrash />}
                    onClick={() => handleRestore(params.row)}
                >
                    Restore
                </Button>
                <Button
                    variant="outlined"
                    size="small"
                    color="error"
                    startIcon={<DeleteForever />}
                    onClick={() => handleDeleteClick(params.row)}
                >
                    Delete Permanently
                </Button>
                </Stack>
            ),
            }


        ];

    

        return (

            <>

                <DrawerComponent />

                <Box display="flex" justifyContent="center" sx={{ flexDirection: 'column', alignItems: 'center' }}>

                    <Typography variant='h4'

                        sx={{

                            paddingTop: "40px",

                            color: "black",

                            width: "min(1200px, 90%)",

                            textAlign: "center",

                            marginBottom: 3,

                            fontWeight: 'bold'

                        }}

                    >

                        Delete Bin

                    </Typography>

                    <Box sx={{ width: 'min(1200px, 90%)', mb: 2 }}>

                        <TextField

                            label="Search by Name or Phone Number"

                            variant="outlined"

                            fullWidth

                            value={searchQuery}

                            onChange={(e) => setSearchQuery(e.target.value)}

                        />

                    </Box>

                    <Box sx={{ height: 600, width: 'min(1200px, 90%)' }}>

                        <DataGrid

                            rows={filteredRows}

                            columns={columns}

                            loading={loading}

                            getRowId={(row) => row ? row.customer_id : Math.random()}

                            autoHeight={false}

                            disableRowSelectionOnClick

                            hideFooterSelectedRowCount

                        />

                    </Box>

                </Box>

                <ConfirmationDialog

                    open={confirmDialogOpen}

                    onClose={() => setConfirmDialogOpen(false)}

                    onConfirm={handleConfirmDelete}

                    title="Permanently Delete Customer?"

                    message={`Are you sure you want to permanently delete ${selectedCustomer?.name}? This action cannot be undone.`}

                    confirmText="Delete"

                />

            </>

        );

    }