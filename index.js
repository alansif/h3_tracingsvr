const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const port = 8865;

const config = require('./config');
app.use(express.static(path.resolve(config.clipath)));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "*");
    res.header("Content-Type", "application/json;charset=utf-8");
    next();
});

const mysql = require('mysql');
const util = require('util');

const conn = mysql.createPool({
    host:       '192.168.160.90',
    user:       'root',
    password:   '1234',
    database:   'mdvt_schema',
    dateStrings:true
});

const query = util.promisify(conn.query).bind(conn);

app.get('/api/v1/query', function(req, res) {
    let fromdate = req.query['fromdate'] || '';
    let todate = req.query['todate'] || '';
    if (fromdate.length === 0) fromdate = '2000-01-01';
    fromdate += ' 00:00:00';
    if (todate.length === 0) todate = '2039-12-31';
    todate += ' 23:59:59';
    let CYCLE = req.query['CYCLE'] || '';
	let machine = (req.query['machine'] || []).map(v=>`'${v}'`).join();
	let endoscope = req.query['endoscope'] || '';
    let s1 = `select * from mdvt where CycleCompletionDate between '${fromdate}' and '${todate}'`;
    let s2 = CYCLE.length === 0 ? '' : ` and CYCLE='${CYCLE}'`;
    let s3 = endoscope.length === 0 ? '' : ` and SerialNumber='${endoscope}'`;
    let s4 = machine.length === 0 ? '' : ` and MachineSerialNumber in (${machine})`;
    let s5 = ' order by CycleCompletionDate';
    let f = async function() {
        try{
            const rows = await query(s1+s2+s3+s4+s5);
            res.status(200).json(rows);
        } catch(err) {
            res.status(500).end();
            console.error(err);
        }
    };
    f();
});

app.get('/api/v1/machines', function(req, res) {
    let f = async function() {
        try{
            const rows = await query("select distinct MachineSerialNumber from mdvt_schema.mdvt order by MachineSerialNumber");
            const r = rows.map(v=>v.MachineSerialNumber);
            res.status(200).json(r);
        } catch(err) {
            res.status(500).end();
            console.error(err);
        }
    };
    f();
});

app.get('/api/v1/endoscopes', function(req, res) {
    let f = async function() {
        try{
            const rows = await query("select distinct SerialNumber from mdvt_schema.mdvt order by SerialNumber");
            const r = rows.filter(v=>v.SerialNumber).map(v=>v.SerialNumber);
            res.status(200).json(r);
        } catch(err) {
            res.status(500).end();
            console.error(err);
        }
    };
    f();
});

const tianzhu = require('./tianzhu');

app.get('/api/v1/tianzhu', function(req, res) {
	let edsn = req.query['edsn'];
	if (!edsn) {
		res.status(400).end();
		return;
	}
    let f = async() => {
        try{
            let result = await tianzhu.getall(edsn);
            res.status(200).json(result.recordset);
        } catch(err) {
            res.status(500).json(err);
        }
    };
    f();
});

app.listen(port, () => {
    console.log("Server is running on port " + port + "...");
});
