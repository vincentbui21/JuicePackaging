const database = require('./source/database_fns');
const express = require('express');
const cors = require('cors')
const uuid = require('./source/uuid')
const app = express()

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
    res.send('hi')
})

app.post('/new-entry', async (req, res) =>{
    // console.log(req.body);
    const customer_datas = req.body[0]
    const order_datas = req.body[1]

    const update = await database.update_new_customer_data(customer_datas, order_datas)

    if(!update){
        res.status(400).send('something wrong')
    }
    else{
        // console.log(update);
        res.status(200).send(update)
    }
})

app.get('/crates/:cratesID', async (req, res) => {
    console.log(req.params.cratesID);
    const result = await database.get_crate_data(req.params.cratesID)

    if (!result){
        res.status(400).send('cannot fetch data')
    }

    else{
        res.status(200).send(result)
    }

})

app.put('/orders', async (req, res) => {
    const {customer_id, status} = req.body

    const result = await database.update_order_status(customer_id, status)

    if (!result){
        res.status(404).send('cannot update order data')
    }
    else{
        res.status(200).send('Updated orders data successfully')
    }
})

app.put('/crates', async (req, res) => {
    const {crate_id, status} = req.body

    const result = await database.update_crates_status(crate_id, status)

    if (!result){
        res.status(400).send("cannot update crate status")
    }

    else{
        res.status(200).send('Updated crate status successfully')
    }
})

app.get('/customer', async (req, res) => {
    const customerName = req.query.customerName
    const page = req.query.page
    const limit = req.query.limit != null ? parseInt(req.query.limit, 10) : 10;

    const result = await database.getCustomers(customerName, page, limit)
    if (!result){
        res.status(400).send("cannot update crate status")
    }
    else{
        res.status(200).send(result)
    }
    
})

app.delete('/customer', async (req, res) => {
    const { customer_id } = req.body;

    if (!customer_id) {
        return res.status(400).json({ message: 'Missing customerID in request body.' });
    }

    const result = await database.delete_customer(customer_id);

    if (result) {
        res.status(200).json({ message: 'Customer and related data deleted successfully.' });
    } else {
        res.status(500).json({ message: 'Failed to delete customer.' });
    }
});

app.put('/customer', async (req, res) => {
    const { customer_id, customerInfoChange = {}, orderInfoChange = {} } = req.body;

    // console.log(orderInfoChange);

    if (!customer_id) {
        return res.status(400).json({ error: 'customer_id is required.' });
    }

    try {
        await database.updateCustomerData(customer_id, customerInfoChange, orderInfoChange);
        res.json({ message: 'Update successful' });
    } catch (error) {
        console.error('Update error:', error);
        res.status(500).json({ error: 'Update failed' });
    }
});

app.get('/crates', async (req, res) => {
    const { customer_id } = req.query;

    if (!customer_id) {
        return res.status(400).json({ error: 'Missing customer_id parameter' });
    }

    const crates = await database.get_crates_by_customer(customer_id);

    if (!crates) {
        return res.status(500).json({ error: 'Failed to fetch crates' });
    }

    res.json({ crates });
    });

app.get('/palletes', async (req, res) => {
    const {location, page, limit} = req.query;


    if (!location) {
        return res.status(400).json({ error: 'Missing location parameter' });
    }

    const data = await database.getPalletsByLocation(location, page, limit);

    if (!data){
        res.status(500).json({ error: 'Failed to fetch palletes' });
    }
    res.status(200).send(data)

})

app.delete('/palletes', async (req, res) => {
    const pallete_id = req.body.pallete_id;

    if (!pallete_id) {
        return res.status(400).json({ error: 'Missing pallete_id parameter' });
    }

    const data = await database.deletePallet(pallete_id);

    if (!data){
        res.status(500).json({ error: 'Failed to fetch palletes' });
    }
    res.status(200).send(data)

})

app.post('/palletes', async (req, res) => {
    const {location, capacity} = req.body;

    if (!location) {
        return res.status(400).json({ error: 'Missing parameters' });
    }

    const data = await database.createNewPallet(location, capacity);

    if (!data){
        res.status(500).json({ error: 'Failed to fetch palletes' });
    }

    res.status(200).send("New Pallete created")

})

app.put('/palletes', async (req, res) => {
    const { pallete_id, capacity } = req.body;

    const result = await database.updatePalletCapacity(pallete_id, capacity);
    
    if (result) {
        res.status(200).json({ message: 'Capacity updated successfully' });
    } else {
        res.status(400).json({ error: 'Failed to update capacity' });
    }
})



app.listen(5000, () => {
    console.log("server is listening at port 5000!!");
})