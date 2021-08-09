const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');
const axios = require("axios");
const cacheapiurl = process.env.CACHEAPIURL || 'http://127.0.0.1:5500';
const csv = require('csv-parser')
const fs = require('fs');
var Redis = require("ioredis");
const redissvc = process.env.REDISSVC || '157.245.253.243';
const port_redis = process.env.REDISPORT || 6379;
var redis = new Redis(port_redis, redissvc);
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const { send } = require('process');
const csvWriter = createCsvWriter({
  path: 'out.csv',
  header: [
    { id: 'ACCNUMBER', title: 'accnumber' },
    { id: 'CUSTNUMBER', title: 'custnumber' },
    { id: 'CUSTNAME', title: 'custname' },
    { id: 'CURRENCY', title: 'currency' },
    { id: 'OUSTBALANCE', title: 'oustbalance' },
    { id: 'REPAYMENTAMOUNT', title: 'repaymentamount' },
    { id: 'REPAYMENTDATE', title: 'repaymentdate' },
    { id: 'PRODUCTCODE', title: 'productcode' },
    { id: 'AROCODE', title: 'arocode' },
    { id: 'BRANCHCODE', title: 'branchcode' },
    { id: 'SETTLEACCNO', title: 'settleaccno' },
    { id: 'TOWN', title: 'town' },
    { id: 'CELNUMBER', title: 'celnumber' },
    { id: 'TELNUMBER', title: 'telnumber' },
    { id: 'EMAILADDRESS', title: 'emailaddress' },
    { id: 'DOB', title: 'dob' },
    { id: 'NATIONID', title: 'nationid' },
    { id: 'DEPTCODE', title: 'deptcode' },
    { id: 'EMPLOYER', title: 'employer' },
    { id: 'EMPLOYERNO', title: 'employerno' },
    { id: 'STAGEDATE', title: 'stagedate' }
  ]
});

async function run() {
  let connection;
  const start = Date.now()

  try {
    connection = await oracledb.getConnection(dbConfig);

    const stream = connection.queryStream(
      `SELECT accnumber,custnumber,CUSTNAME,CURRENCY,OUSTBALANCE,REPAYMENTAMOUNT,REPAYMENTDATE,PRODUCTCODE,AROCODE,
      BRANCHCODE,SETTLEACCNO,SETTLEACCBAL,ADDRESSLINE1,TOWN,CELNUMBER,TELNUMBER,EMAILADDRESS,DOB,NATIONID,DEPTCODE,
      EMPLOYER,EMPLOYERNO,STAGEDATE
       FROM watch_stage
       `,
      [],  // no binds
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        prefetchRows: 150,  // internal buffer sizes can be adjusted for performance tuning
        fetchArraySize: 150,

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
        //console.log(metadata);
      });

      stream.on('data', function (data) {
        //console.log("stream 'data' event");

        dataArray.push(data);
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
    console.log('Rows selected: ' + numrows);
    console.log('dataArray length: ' + dataArray.length);
    //console.log(dataArray)
    // call cache api
    /*for (i=0; i<=dataArray.length - 1; i++) {
      const response = await axios.get(cacheapiurl + '/cache/nodeapi/watch_stage/' + dataArray[i]);
      if(response.statusText = 'OK') {
        console.log('cached row '+ i +' ' + dataArray[i])
      } else { 
        console.log('error cache - ' + dataArray[i])
      }
    }*/
    //generate csv file 
    csvWriter
      .writeRecords(dataArray)
      .then(() => send());


    function send() {
      fs.createReadStream('out.csv')
        .pipe(csv())
        .on('data', (data) => {
          redis.set('w_' + data.accnumber, JSON.stringify(data));
        })
        .on('end', () => {
          console.log('The CSV file was written successfully')
          console.log('uploaded all data !!!');
          redis.disconnect();
        });
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