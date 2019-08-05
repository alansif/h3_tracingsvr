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

async function getall(edsn) {
	const ss = "select UseTime,MarrorCleanTime,MarrorCleanPerson,MarrorType,ExamDoctor,ExamRoom,"
		+ "PatientID,PatientName,Sex,Age from Clean_Record where MarrorID=@edsn and MarrorStatus=1 order by UseTime";
	await pool1Connect;
    try {
    	const request = new sql.Request(pool1)
        const result = await request.input("edsn", edsn).query(ss);
    	return result;
    } catch (err) {
        console.error('SQL error', err);
        throw err;
    }	
}

exports.getall = getall;
