//set up dependencies
const express = require("express");
const redis = require("redis");
const axios = require("axios");

//setup port constants
const port_redis = process.env.PORT || 6379;
const port = process.env.PORT || 5500;
const apiurl = process.env.URL || 'http://127.0.0.1:8000';
const nodeapiurl = process.env.NODEAPIURL || 'http://127.0.0.1:6001';
const redissvc = process.env.REDISSVC || '127.0.0.1';

//configure redis client on port 6379
const redis_client = redis.createClient(port_redis, redissvc);

//configure express server
const app = express();

//Middleware Function to Check Cache
checkCache = (req, res, next) => {
    const id  = req.params.accnumber;

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

checkCacheWatch = (req, res, next) => {
    const id  = 'w_'+req.params.accnumber;

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

app.get("/cache/nodeapi/tqall/:accnumber", checkCache, async (req, res) => {
    try {
        const response = await axios.get(nodeapiurl + '/nodeapi/tqall/' + req.params.accnumber);
        //console.log(JSON.stringify(response.data))
        //add data to Redis
        if(response.statusText = 'OK') {
            redis_client.setex(req.params.accnumber, 86400, JSON.stringify(response.data));
        }

        return res.status(200).json(response.data);
    } catch (error) {
        console.log(error);
        return res.status(500).json(error);
    }
});

app.get("/cache/api/watch_stage/:accnumber", checkCacheWatch, async (req, res) => {
    try {
        const response = await axios.get(apiurl + '/api/watch_stage/' + req.params.accnumber);
       // console.log(JSON.stringify(response.data))
        //add data to Redis
        if(response.statusText = 'OK') {
            redis_client.setex('w_'+req.params.accnumber, 86400, JSON.stringify(response.data));
        }

        return res.status(200).json(response.data);
    } catch (error) {
        console.log(error);
        return res.status(500).json(error);
    }
});

//listen on port 5500;
app.listen(port, () => console.log(`Server running on Port ${port}`));
