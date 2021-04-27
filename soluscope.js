const sql = require('mssql');

const config = {
    user: 'itsoluscope',
    password: 'itspwd1',
    server: '192.168.160.206',
    database: 'TicketsDatabase',
    options: {
		useUTC: false
    }
};

const pool1 = new sql.ConnectionPool(config);
const pool1Connect = pool1.connect();

pool1.on('error', err => {
    // ... error handler
});

async function query(endoscope, fromdate, todate) {
    if (fromdate.length === 0) fromdate = '2000-01-01';
    fromdate += ' 00:00:00';
    if (todate.length === 0) todate = '2039-12-31';
    todate += ' 23:59:59';
    const ss =
        "select Id,RetrieveDate,EndoSN,EndoCode,StartDate,EndDate,CycleName,CycleStateOK,ErrorCode,EndoType,Cycletime,Alarm " +
		"from Tickets where StartDate between @fromdate and @todate order by StartDate";
	await pool1Connect;
    try {
    	const request = new sql.Request(pool1)
        const result = await request.input("fromdate", fromdate).input("todate", todate).query(ss);
    	return result.recordset;
    } catch (err) {
        console.error('SQL error', err);
        throw err;
    }	
}

exports.query = query;
