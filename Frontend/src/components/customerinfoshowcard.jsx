import { Grid, Paper, Typography } from "@mui/material";


function CustomerInfoCard({customerInfo}) {

    function formatToMMDDYYYY(isoString) {
        if (!isoString) return "";

        const date = new Date(isoString);
        const mm = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
        const dd = String(date.getDate()).padStart(2, '0');
        const yyyy = date.getFullYear();
        return `${mm}/${dd}/${yyyy}`;
    }

    return ( 
        <>
            <Paper elevation={6} sx={{
                width: "max(300px, 30%)",
                height: "auto",
                padding:"15px"
            }}>
                <Grid container>
                    <Grid item size={6}>
                        <Typography variant='h6'>Name</Typography>
                    </Grid>
                    
                    <Grid item size={6}>
                        <Typography>: {customerInfo.name}</Typography>
                    </Grid>

                    <Grid item size={6}>
                        <Typography variant='h6'>Date Entry</Typography>
                    </Grid>

                    <Grid item size={6}>
                        <Typography >: {formatToMMDDYYYY(customerInfo.created_at)}</Typography>
                    </Grid>

                    <Grid item size={6}>
                        <Typography variant='h6'>Apple weight</Typography>
                    </Grid>

                    <Grid item size={6}>
                        <Typography>: {customerInfo.weight_kg}</Typography>
                    </Grid>

                    <Grid item size={6}>
                        <Typography variant='h6'>Crate Count</Typography>
                    </Grid>

                    <Grid item size={6}>
                        <Typography>: {customerInfo.crate_count}</Typography>
                    </Grid>

                    <Grid item size={6}>
                        <Typography variant='h6'>City</Typography>
                    </Grid>

                    <Grid item size={6}>
                        <Typography>: {customerInfo.city}</Typography>
                    </Grid>

                </Grid>

            </Paper>
        </>
    );
}

export default CustomerInfoCard;