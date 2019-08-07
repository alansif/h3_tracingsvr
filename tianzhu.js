const sql = require('mssql');

const config = {
    user: 'sa',
    password: 'Angelwin123',
    server: '192.168.160.101',
    database: 'xixiao',
    options: {
    }
};

const pool1 = new sql.ConnectionPool(config);
const pool1Connect = pool1.connect();

pool1.on('error', err => {
    // ... error handler
});

async function getall({endoscope, fromdate, todate}) {
    if (fromdate.length === 0) fromdate = '2000-01-01';
    fromdate += ' 00:00:00';
    if (todate.length === 0) todate = '2039-12-31';
    todate += ' 23:59:59';
    const ss =
        "select CleanStart,CleanStop,CleanTime,CardName,UseTime,ExamDoctor,ExamRoom,PatientID,PatientName,Sex,Age," +
        "MarrorCleanTime,MarrorCleanStopTime,MarrorCleanPerson,MarrorStatus from Clean_Record " +
		"where MarrorID=@edsn and CleanStart between @fromdate and @todate order by CleanStart";
	await pool1Connect;
    try {
    	const request = new sql.Request(pool1)
        const result = await request.input("edsn", endoscope).input("fromdate", fromdate).input("todate", todate).query(ss);
    	return result.recordset;
    } catch (err) {
        console.error('SQL error', err);
        throw err;
    }	
}

exports.getall = getall;