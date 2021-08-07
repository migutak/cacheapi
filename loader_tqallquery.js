const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');
const axios = require("axios");
const cacheapiurl = process.env.URL || 'http://127.0.0.1:5500';

async function run() {
  let connection;
  const start = Date.now()

  try {
    connection = await oracledb.getConnection(dbConfig);

    const stream = connection.queryStream(
      `SELECT accnumber
       FROM tqall
       `,
      [],  // no binds
      {
        prefetchRows:   150,  // internal buffer sizes can be adjusted for performance tuning
        fetchArraySize: 150
      }
    );
    let dataArray = [];
    const consumeStream = new Promise((resolve, reject) => {
      let rowcount = 0;
      

      stream.on('error', function(error) {
        // console.log("stream 'error' event");
        reject(error);
      });

      stream.on('metadata', function(metadata) {
        //console.log("stream 'metadata' event");
        console.log(metadata);
      });

      stream.on('data', function(data) {
        //console.log("stream 'data' event");
        //console.log(data[0]);
        dataArray.push(data[0]);
        rowcount++;
      });

      stream.on('end', function() {
        // console.log("stream 'end' event"); // all data has been fetched
        stream.destroy();                     // clean up resources being used
      });

      stream.on('close', function() {
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
    for (i=0; i<=dataArray.length - 1; i++) {
      const response = await axios.get(cacheapiurl + '/cache/api/tqall?filter[include]=guarantors&filter[include]=demandsdues&filter[where][accnumber]=' + dataArray[i]);
      if(response.statusText = 'OK') {
        console.log('cached row '+ i +' ' + dataArray[i])
      } else {
        console.log('error cache - ' + dataArray[i])
      }
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
    console.log(`Time Taken to execute = ${(stop - start)/1000} seconds`);
  }
}

run();