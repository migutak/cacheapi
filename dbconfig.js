module.exports = {
    user          : process.env.NODE_ORACLEDB_USER || "ecol", 
    password      : process.env.NODE_ORACLEDB_PASSWORD || 'ecol',
    connectString : process.env.NODE_ORACLEDB_CONNECTIONSTRING || "localhost:1564/ORCLCDB.localdomain",
    externalAuth  : process.env.NODE_ORACLEDB_EXTERNALAUTH ? true : false
  };