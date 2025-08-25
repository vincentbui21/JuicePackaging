import { useEffect, useState } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { Box, TextField, Stack, Button, MenuItem } from '@mui/material';
import api from '../services/axios';
import QRCodeDialog from './qrcodeDialog';
import EditPalletDialog from './EditPalletDialog';

export default function PalletTable() {
    const [rows, setRows] = useState([]);
    const [rowCount, setRowCount] = useState(0);
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(5);
    const [loading, setLoading] = useState(false);
    const [locationSearch, setLocationSearch] = useState('Kuopio');
    const [refreshTable, setRefreshTable] = useState(false);
    const [openQRDialog, setOpenQRDialog] = useState(false);
    const [QRcodeDialogData, setQRcodeDialogData] = useState([]);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [selectedPallet, setSelectedPallet] = useState(null);

    const handleDelete = async (row) => {
        try {
            const response = await api.delete('/palletes', {
                data: { pallete_id: row.pallete_id },
            });
            console.log('Deleted:', response.data);
            setRefreshTable(true);
        } catch (error) {
            console.error('Delete failed:', error);
        }
    };

    const createNewPallet = async () => {
        try{
            const response = await api.post('/palletes', {
                location: locationSearch
            });

            console.log('New Pallet created');
            setRefreshTable(true);
        } catch(error){
            console.error('Cannot create:', error);
        }

    }

    const columns = [
        { field: 'pallete_id', headerName: 'Pallet ID', width: 200 },
        { field: 'location', headerName: 'Location', width: 150 },
        { field: 'capacity', headerName: 'Capacity', width: 100 },
        { field: 'holding', headerName: 'Holding', width: 100 },
        { field: 'status', headerName: 'Status', width: 120 },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 400,
            sortable: false,
            filterable: false,
            renderCell: (params) => (
                <Stack direction="row" spacing={1} sx={{display:"center", justifyContent: "center", alignItems: "center"}}>
                    {/* Optionally add Edit here */}
                    <Button
                        variant="outlined"
                        size="small"
                        color="error"
                        onClick={() => {
                            handleDelete(params.row)
                        }}
                    >
                        Delete
                    </Button>

                    <Button
                        variant="outlined"
                        size="small"
                        color="warning"
                        onClick={() => 
                        {
                            setOpenQRDialog(true)
                            setQRcodeDialogData([params.row.pallete_id])
                        }
                    }
                    >
                        Print QRCode
                    </Button>

                    <Button
                        variant="outlined"
                        size="small"
                        onClick={() => {
                            setEditDialogOpen(true);
                            setSelectedPallet(params.row);
                        }}
                    >
                        Edit
                    </Button>


                </Stack>
            ),
        },
    ];

    useEffect(() => {
        setLoading(true);
        api.get('/palletes', {
            params: {
                location: locationSearch,
                limit: pageSize,
                page: page + 1,
            },
        })
        .then((res) => {
            setRows(res.data.rows);
            setRowCount(res.data.total);
            setLoading(false);
            setRefreshTable(false);
        })
        .catch((err) => {
            console.error('API error:', err);
            setLoading(false);
        });
    }, [page, pageSize, locationSearch, refreshTable]);

    return (

        <>
            <Box 
            sx={{ 
                width: 'min(80%, 1200px)', 
                overflowX: 'auto', 
                alignSelf: "center",
                justifySelf: 'center'
                }}>
                <Stack
                    direction="row"
                    spacing={2}
                    sx={{
                        justifyContent: "center",
                        alignItems: "center",
                        width: "min(1200px, 90%)",
                        background: "#cde2d9",
                        padding: "5px",
                        borderRadius: "10px",
                        marginBottom: "10px",
                        mx: "auto"
                    }}
                >

                    <TextField 
                        select 
                        label="City" 
                        value={locationSearch} 
                        name={"city"} 
                        onChange={(e) => setLocationSearch(e.target.value)}
                        size="small"
                        placeholder="Search by location"
                        sx={{width: "80%"}}
                    >
                        <MenuItem value={"Kuopio"}>Kuopio</MenuItem>
                        <MenuItem value={"Mikkeli"}>Mikkeli</MenuItem>
                        <MenuItem value={"Varkaus"}>Varkaus</MenuItem>
                        <MenuItem value={"Lapinlahti"}>Lapinlahti</MenuItem>
                        <MenuItem value={"Joensuu"}>Joensuu</MenuItem>
                        <MenuItem value={"Lahti"}>Lahti</MenuItem>
                    </TextField>

                    <Button
                        sx={{width: "20%"}}
                        variant="contained"
                        onClick={ () => createNewPallet()}
                    >
                        Create new Pallet
                    </Button>
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
                    getRowId={(row) => row.pallete_id}
                    checkboxSelection={false}
                    disableRowSelectionOnClick
                    hideFooterSelectedRowCount
                />
            </Box>

            <QRCodeDialog 
                data={QRcodeDialogData} 
                open={openQRDialog} 
                onClose={() => setOpenQRDialog(false)}>
            </QRCodeDialog>

            <EditPalletDialog
                open={editDialogOpen}
                onClose={() => setEditDialogOpen(false)}
                initialData={selectedPallet}
                onSubmit={(newCapacity) => {
                    api.put('/palletes', {
                        pallete_id: selectedPallet.pallete_id,
                        capacity: newCapacity
                    }).then(() => {
                        setRefreshTable(true);
                    }).catch(console.error);
                }}
            />

        </>

    
    );
}
