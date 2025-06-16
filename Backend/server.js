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

    const update = await database.update_data(customer_datas, order_datas)

    if(!update){
        res.status(400).send('something wrong')
    }
    else{
        console.log(update);
        res.status(200).send(update)
    }
})

app.listen(5000, () => {
    console.log("server is listening at port 5000!!");
})