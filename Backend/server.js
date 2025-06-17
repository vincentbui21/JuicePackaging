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
    const {order_id, status} = req.body

    const result = await database.update_order_status(order_id, status)

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

app.listen(5000, () => {
    console.log("server is listening at port 5000!!");
})