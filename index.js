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

async function query_mdvt(qu) {
    let fromdate = qu['fromdate'] || '';
    let todate = qu['todate'] || '';
    if (fromdate.length === 0) fromdate = '2000-01-01';
    fromdate += ' 00:00:00';
    if (todate.length === 0) todate = '2039-12-31';
    todate += ' 23:59:59';
    let CYCLE = qu['CYCLE'] || '';
	let machine = (qu['machine'] || []).map(v=>`'${v}'`).join();
	let endoscope = qu['endoscope'] || '';
    let s1 = `select * from mdvt where CycleCompletionDate between '${fromdate}' and '${todate}'`;
    let s2 = CYCLE.length === 0 ? '' : ` and CYCLE='${CYCLE}'`;
    let s3 = endoscope.length === 0 ? '' : ` and SerialNumber='${endoscope}'`;
    let s4 = machine.length === 0 ? '' : ` and MachineSerialNumber in (${machine})`;
    let s5 = ' order by CycleCompletionDate';
    try{
        const rows = await query(s1+s2+s3+s4+s5);
        return rows;
    } catch(err) {
        console.error(err);
        throw err;
    }
}

app.get('/api/v1/query', function(req, res) {
    let f = async function() {
        try{
            const rows = await query_mdvt(req.query);
            res.status(200).json(rows);
        } catch(err) {
            res.status(500).end();
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
	let edsn = req.query['endoscope'];
	if (!edsn) {
		res.status(400).end();
		return;
	}
    let f = async() => {
        try{
            let mreq = {endoscope:edsn,fromdate:'2019-08-01',todate:'2019-08-01'};
            let mres = await query_mdvt(mreq);
            console.log(mres);
            let result = await tianzhu.getall(mreq);
            console.log(result.recordset);
            res.status(200).json(result.recordset);
        } catch(err) {
            console.error(err);
            res.status(500).json(err);
        }
    };
    f();
});

app.get('/api/v1/timeline', function(req, res) {
	let edsn = req.query['endoscope'];
	let fromdate = req.query['fromdate'] || '';
	let todate = req.query['todate'] || '';
	if (!edsn) {
		res.status(400).end();
		return;
	}
	let mreq = {endoscope:edsn,fromdate:'2019-08-01',todate:'2019-08-01'};
    let f = async() => {
        try{
			let mdr = await query_mdvt(mreq);
			let ml = mdr.map(x => ({
				title: '机洗', datetime: new Date(x.CycleCompletionDate + 'T' + x.TimeBegin + 'Z'), contents:[
					'机洗结束: ' + x.TimeEnd,
					'设备ID:　' + x.MachineSerialNumber
				],
				data: x
			}));
			let tzr = await tianzhu.getall(mreq);
			let tl = tzr.flatMap(x => 
				x.MarrorStatus === true ?
				[
					{title:'测漏初洗', datetime:new Date(x.CleanStart - 1000 * 60), contents:[
						'操作人: ' + x.CardName
					]},
					{title:'诊疗使用', datetime:x.UseTime, contents:[
						'医生: ' + x.ExamDoctor + '　　　' + '诊疗室: ' + x.ExamRoom,
						'患者: ' + x.PatientID + '　' + x.PatientName + '　' + x.Sex + '　' + x.Age + '岁'
					]},
					{title:'预处理', datetime:x.MarrorCleanTime, contents:[
						'操作人: ' + x.MarrorCleanPerson,
						'结束时间: ' + x.MarrorCleanStopTime.toISOString().substring(11, 19)
					]}
				] :
				[
					{title:'测漏初洗', datetime:new Date(x.CleanStart - 1000 * 60), contents:[
						'操作人: ' + x.CardName
					]}
				]
			);
			let rl = ml.concat(tl);
			rl.sort((a, b) => a.datetime - b.datetime);
			console.log(rl);
            res.status(200).json(rl);
        } catch(err) {
            console.error(err);
            res.status(500).json(err);
        }
    };
    f();
});


app.listen(port, () => {
    console.log("Server is running on port " + port + "...");
});
