//set up dependencies
const express = require("express");
const redis = require("redis");
const axios = require("axios");
const cors = require('cors')

//setup port constants
const port_redis = process.env.REDISPORT || 6379;
const apiurl = process.env.URL || 'http://127.0.0.1:8000';
const nodeapiurl = process.env.NODEAPIURL || 'http://127.0.0.1:6001';
const redissvc = process.env.REDISSVC || '127.0.0.1';

//configure redis client on port 6379
const redis_client = redis.createClient(port_redis, redissvc);
const app = express(); 
app.use(cors());
app.use(express.json());

//Middleware Function to Check Cache 
checkCache = (req, res, next) => {
    const id = req.params.accnumber;

    redis_client.get(id, (err, data) => { 
        if (err) {
            console.log(err); 
            res.status(500).send(err);
        }
        //if no match found
        if (data != null) {
            console.log('..from cache');
            res.send(JSON.parse(data));
        } else {
            //proceed to next middleware function
            next();
        }
    });
};

customerdetailssummarycheckCache = (req, res, next) => {
    const CustomerId = 'customerdetailssummary_' + req.body.CustomerDetailsInquiryRequest.CustomerDetailsInquiryRq.CustomerId;

    redis_client.get(CustomerId, (err, data) => { 
        if (err) {
            console.log(err); 
            res.status(500).send(err);
        }
        //if no match found
        if (data != null) {
            console.log('..from cache');
            res.send(JSON.parse(data));
        } else {
            //proceed to next middleware function
            next();
        }
    });
};

checkCacheWatch = (req, res, next) => {
    const id = 'w_' + req.params.accnumber;

    redis_client.get(id, (err, data) => {
        if (err) {
            console.log(err);
            res.status(500).send(err);
        }
        //if no match found
        if (data != null) {
            console.log('..from cache');
            res.send(JSON.parse(data));
        } else {
            //proceed to next middleware function 
            next();
        }
    });
};

checkCachetqallquery = (req, res, next) => {
    const id = 'q_' + req.query.filter.where.accnumber;

    redis_client.get(id, (err, data) => {
        if (err) {
            console.log(err);
            res.status(500).send(err);
        }
        //if no match found 
        if (data != null) {
            console.log('..from cache');
            res.send(JSON.parse(data));
        } else {
            //proceed to next middleware function 
            next();
        }
    });
};


checkCachenodeapitqall = (req, res, next) => {
    const id = 'nodeapi_tqall';

    redis_client.get(id, (err, data) => {
        if (err) {
            console.log(err);
            res.status(500).send(err);
        }
        //if no match found 
        if (data != null) {
            console.log('..from cache');
            res.send(JSON.parse(data));
        } else {
            //proceed to next middleware function 
            next();
        }
    });
};

app.post("/cache/customerdetailssummary/dev", async (req, res) => {
    const CustomerId = req.body.CustomerDetailsInquiryRequest.CustomerDetailsInquiryRq.CustomerId

    redis_client.get('customerdetailssummary_'+CustomerId, (err, data) => {
        if (err) {
            console.log(err);
            res.status(500).send(err);
        }
        //if no match found 
        if (data != null) {
            res.send(JSON.parse(data));
        } else {
            //proceed to next middleware function 
            res.status(500).send({message: 'customer missing'});
        }
    });
});

app.post("/cache/loansummary/dev", async (req, res) => {
    const accountNum = req.body.LoanSummaryReq.accountNum

    redis_client.get('loansummary_'+accountNum, (err, data) => {
        if (err) {
            console.log(err);
            res.status(500).send(err);
        }
        //if no match found 
        if (data != null) {
            res.send(JSON.parse(data));
        } else {
            //proceed to next middleware function 
            res.status(500).send({message: 'loan is missing'});
        }
    });
});

app.post("/cache/customerdetailssummary", customerdetailssummarycheckCache, async (req, res) => {
    try {
        const response = await axios.post('http://192.168.0.180/REST/Customer/CustomerDetailsSummary/Get/1.0', req.body);
        console.log(JSON.stringify(response.data))
        //add data to Redis
        if (response.statusText = 'OK') {
            redis_client.setex('customerdetailssummary_'+req.body.CustomerDetailsInquiryRequest.CustomerDetailsInquiryRq.CustomerId, 43200, JSON.stringify(response.data));
        }

        return res.status(200).json(response.data);
    } catch (error) {
        console.log(error);
        return res.status(500).json(error);
    }
});

app.get("/cache/nodeapi/:accnumber", checkCache, async (req, res) => {
    try {
        const response = await axios.get(nodeapiurl + '/nodeapi/tqall/' + req.params.accnumber);
        //console.log(JSON.stringify(response.data))
        //add data to Redis
        if (response.statusText = 'OK') {
            redis_client.setex(req.params.accnumber, 43200, JSON.stringify(response.data));
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
        if (response.statusText = 'OK') {
            redis_client.setex('w_' + req.params.accnumber, 43200, JSON.stringify(response.data));
        }
        console.log('from api')
        return res.status(200).json(response.data);
    } catch (error) {
        console.log(error);
        return res.status(500).json(error);  
    }
});

app.get("/cache/api/tqall", checkCachetqallquery, async (req, res) => {
    if (req.query.filter.where.accnumber) {
        try {
            const response = await axios.get(apiurl + '/api/tqall?filter[include]=guarantors&filter[include]=demandsdues&filter[where][accnumber]=' + req.query.filter.where.accnumber);

            //add data to Redis
            if (response.statusText = 'OK') {
                redis_client.setex('q_' + req.query.filter.where.accnumber, 43200, JSON.stringify(response.data));
            }
            console.log('from api')
            return res.status(200).json(response.data);
        } catch (error) {
            console.log(error); 
            return res.status(500).json(error);
        }
    } else {
        return res.status(200).json([]);
    }
}); 

app.get("/cache/nodeapi/all/tqall", checkCachenodeapitqall, async (req, res) => {
    
        try {
            const response = await axios.get(nodeapiurl + '/nodeapi/tqall');
            //add data to Redis
            if (response.statusText = 'OK') {
                redis_client.setex('nodeapi_tqall', 43200, JSON.stringify(response.data));
            }
            console.log('from api')
            return res.status(200).json(response.data);
        } catch (error) {
            console.log(error); 
            return res.status(500).json(error);
        }
    
});

app.post("/cache/nodeapi/tqall", checkCachenodeapitqall, async (req, res) => {
    const branchname = req.branchname
    const arocode = req.arocode
    const region = req.region
    const productcode = req.productcode

    if (req.query.filter.where.accnumber) {
        try {
            const response = await axios.get(apiurl + '/api/tqall?filter[where][productcode]=AssetFinanceLoan' + req.query.filter.where.accnumber);

            //add data to Redis
            if (response.statusText = 'OK') {
                redis_client.setex('q_' + req.query.filter.where.accnumber, 43200, JSON.stringify(response.data));
            }
            console.log('from api')
            return res.status(200).json(response.data);
        } catch (error) {
            console.log(error);
            return res.status(500).json(error);
        }
    } else {
        return res.status(200).json([]); 
    }
});

//listen on port 5600; 
app.listen(5600, () => console.log(`Server running on Port 5600`));
