//set up dependencies
const express = require("express");
const redis = require("redis");
const axios = require("axios");
const bodyParser = require("body-parser");

//setup port constants
const port_redis = process.env.PORT || 6379;
const port = process.env.PORT || 5500;
const url = process.env.URL || 'http://127.0.0.1:8000';
const redissvc = process.env.REDISSVC || '127.0.0.1';

//configure redis client on port 6379
const redis_client = redis.createClient(port_redis, redissvc);

//configure express server
const app = express();

//Body Parser middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

//Middleware Function to Check Cache
checkCache = (req, res, next) => {
    const { id } = req.params;

    redis_client.get(id, (err, data) => {
        if (err) {
            console.log(err);
            res.status(500).send(err);
        }
        //if no match found
        if (data != null) {
            res.send(JSON.parse(data));
        } else {
            //proceed to next middleware function
            next();
        }
    });
};

app.get("/starships/:id", checkCache, async (req, res) => {
    try {
        const { id } = req.params;
        const starShipInfo = await axios.get(
            `https://jsonplaceholder.typicode.com/todos/${id}`
        );

        //get data from response
        const starShipInfoData = starShipInfo.data;

        //add data to Redis
        redis_client.setex(id, 3600, JSON.stringify(starShipInfoData));

        return res.json(starShipInfoData);
    } catch (error) {
        console.log(error);
        return res.status(500).json(error);
    }
});

app.get("/cache/rollrates/:id", checkCache, async (req, res) => {
    try {
        const { id } = req.params;
        const response = await axios.get(url + '/api/rollrates');
        //add data to Redis 
        redis_client.setex(id, 3600, JSON.stringify(response.data));

        return res.send(response.data);
    } catch (error) {
        console.log(error);
        return res.status(500).json(error);
    }
});

//listen on port 5500;
app.listen(port, () => console.log(`Server running on Port ${port}`));
