const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');
const redis = require("redis");
const axios = require("axios");
const { v4: uuidv4 } = require('uuid');
const cacheapiurl = process.env.CACHEAPIURL || 'http://127.0.0.1:5500';
const redissvc = process.env.REDISSVC || '127.0.0.1';
const port_redis = process.env.REDISPORT || 6379;
const redispass = process.env.REDISPASS || 'abc.123';

const redis_client = redis.createClient({
  host: redissvc,
  port: port_redis,
  password: redispass
})

async function run() {
  let connection;
  const start = Date.now()

  try {
    connection = await oracledb.getConnection(dbConfig);

    const sql = `select accnumber from loans_finacle`;

    const stream = connection.queryStream(
      sql,
      [],  // no binds 
      {
        prefetchRows: 150,  // internal buffer sizes can be adjusted for performance tuning
        fetchArraySize: 150
      }
    );
    let dataArray = [];
    const consumeStream = new Promise((resolve, reject) => {
      let rowcount = 0;


      stream.on('error', function (error) {
        // console.log("stream 'error' event");
        reject(error);
      });

      stream.on('metadata', function (metadata) {
        //console.log("stream 'metadata' event");
        // console.log(metadata);
      });

      stream.on('data', function (data) {
        //console.log("stream 'data' event");
        //console.log(data[0]);
        dataArray.push(data[0]);
        rowcount++;
      });

      stream.on('end', function () {
        // console.log("stream 'end' event"); // all data has been fetched
        stream.destroy();                     // clean up resources being used
      });

      stream.on('close', function () {
        // console.log("stream 'close' event");
        // The underlying ResultSet has been closed, so the connection can now
        // be closed, if desired.  Note: do not close connections on 'end'.
        resolve(rowcount);
      });
    });

    const numrows = await consumeStream;

    try {
      // call cache api
      for (i = 0; i <= dataArray.length - 1; i++) {
        console.log("===="+i+"====")
        const body = {
          RequestHeader: {
            CreationTimestamp: new Date(),
            CorrelationID: uuidv4(),
            FaultTO: "to",
            MessageID: uuidv4(),
            ReplyTO: "me",
            Credentials: {
              SystemCode: "000",
              Username: "me",
              Password: "me",
              Realm: "me",
              BankID: "01"
            }
          },
          LoanSummaryReq: {
            accountNum: dataArray[i],
            LoanType: "Account",
            MobileNumber: ""
          }
        };

        const response = await axios.post('http://soauat.co-opbank.co.ke/REST2/Account/LoanSummary/Get/2.0', body);
        if (response.statusText = 'OK') {
          console.log(JSON.stringify(response.data));
          redis_client.set('loansummary_' + body.LoanSummaryReq.accountNum, JSON.stringify(response.data));
        } else {
          console.log('error cache - ' + dataArray[i])
        }
      } // end for
    } catch (err) {
      console.error(err);
    }



  } catch (err) {
    console.error(err);
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error(err);
      }
    }
    const stop = Date.now()
    console.log(`Time Taken to execute = ${(stop - start) / 1000} seconds`);
  }
}

run();