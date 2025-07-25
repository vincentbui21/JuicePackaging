import { Paper, Grid, Typography } from "@mui/material";

function CrateInfoCard({index, crateID}) {
    return (  
        <>
            <Paper elevation={6} sx={{
                width: "max(300px, 100%)",
                height: "auto",
                padding:"15px",
                
            }}>

                <Grid container>

                    <Grid item size={1} display={"flex"} alignItems={"center"}>
                        <Typography variant='h6'>Crate:</Typography>
                    </Grid>

                    <Grid item size={5} display={"flex"} alignItems={"center"} justifyContent={"center"}>
                        <Typography>{index}</Typography>
                    </Grid>

                    <Grid item size={1} display={"flex"} alignItems={"center"}>
                        <Typography variant='h6'>ID:</Typography>
                    </Grid>

                    <Grid item size={5} display={"flex"} alignItems={"center"}>
                        <Typography>{crateID}</Typography>
                    </Grid>

                </Grid>

            </Paper>
        </>
    );
}

export default CrateInfoCard;