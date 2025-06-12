import {Typography} from '@mui/material';
import Divider from '@mui/material/Divider';
import CustomerInfo from '../components/customerinfo';
import OrderInfoInput from '../components/orderinfoinput';


function CustomerInfoEntry() {
    return (
        <>  
            <Typography 
                sx={
                    {
                        fontSize: "clamp(20px, 5vw, 40px);",
                        textAlign: "center",
                        paddingTop: "20px",
                        marginBottom: "10px"
                    }
                }>Customer Information Entry
            </Typography>

            <CustomerInfo />
            
            <OrderInfoInput />

        </>
    );
}

export default CustomerInfoEntry;