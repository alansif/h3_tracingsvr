const moment = require("moment");
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

async function query_mdvt_next(id, sn) {
    let s1 = `select * from mdvt where id > ${id} and SerialNumber=${sn} and CYCLE='PASS'`;    
    try{
        const rows = await query(s1);
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

const soluscope = require('./soluscope');

app.get('/api/v1/soluscope/query', function(req, res) {
    const fromdate = req.query['fromdate'] || '';
    const todate = req.query['todate'] || '';
	const f = async () => {
		try {
			const r = await soluscope.query('', fromdate, todate);
            res.status(200).json(r);
		} catch(err) {
            res.status(500).end();
            console.error(err);
		}
	};
	f();
});

const tianzhu = require('./tianzhu');

function shiftTime(t) {
    return moment(t, "HH:mm:ss").subtract(60, 'seconds').format("HH:mm:ss");
}

app.get('/api/v1/timeline', function(req, res) {
	let edsn = req.query['endoscope'];
	let fromdate = req.query['fromdate'] || '';
	let todate = req.query['todate'] || '';
	if (!edsn) {
		res.status(400).end();
		return;
	}
	let mreq = {endoscope:edsn,fromdate:fromdate,todate:todate};
    let f = async() => {
        try{
			let mdr = await query_mdvt(mreq);
			let ml = mdr.map(x => ({
				stage:2, title: '机洗', datetime: new Date(x.CycleCompletionDate + 'T' + x.TimeBegin + 'Z'), contents:[
					'机洗结束:　' + x.TimeEnd + (x.CYCLE === 'FAIL' ? '　(异常结束)' : ''),
					'设备ID:　' + x.MachineSerialNumber
				],
				data: x,
				warning: x.CYCLE === 'FAIL'
			}));
            let tzr = await tianzhu.getall(mreq);
            tzr.forEach(x => {
                let r1 = x.CleanDetail.split("|");
                x.CleanDetail = {};
                r1.forEach(y => {
                    let r2 = y.split("-");
                    x.CleanDetail[r2[0]] = shiftTime(r2[1]);
                });
            });
			let tl = tzr.flatMap(x => 
				x.MarrorStatus === true ?
				[
					{stage:1, title:'手洗', datetime:new Date(x.CleanStart - 1000 * 60), contents:[
                        '测漏:　' + x.CleanDetail['测漏'] + '　　　初洗:　' + x.CleanDetail['初洗开始'],
                        '操作人:　' + x.CardName
					]},
					{stage:3, title:'诊疗使用', datetime:x.UseTime, contents:[
						'医生: ' + x.ExamDoctor + '　　　　' + '诊疗室: ' + x.ExamRoom,
						'患者: ' + x.PatientID + '　' + x.PatientName + '　' + x.Sex + '　' + x.Age + '岁'
					]},
					{stage:4, title:'预处理', datetime:x.MarrorCleanTime, contents:[
						'操作人:　' + x.MarrorCleanPerson,
						'结束时间:　' + x.MarrorCleanStopTime.toISOString().substring(11, 19)
					]}
				] :
				[
					{stage:1, title:'手洗', datetime:new Date(x.CleanStart - 1000 * 60), contents:[
                        '测漏:　' + x.CleanDetail['测漏'] + '　　　初洗:　' + x.CleanDetail['初洗开始'],
						'操作人:　' + x.CardName
					]}
				]
			);
			let rl = ml.concat(tl);
			rl.sort((a, b) => a.datetime - b.datetime);
            res.status(200).json(rl);
        } catch(err) {
            console.error(err);
            res.status(500).json(err);
        }
    };
    f();
});

async function buildData(mreq) {
    let mdr = (await query_mdvt(mreq)).filter(x => x.CYCLE !== 'FAIL');
    let r = [];
    for(let x of mdr) {
        if (!!x.SerialNumber) {
            const reftime = x.CycleCompletionDate + ' ' + x.TimeBegin;
            const tzr = await tianzhu.getclosest(x.SerialNumber, reftime);
            let tz = tzr[0] || {};
            if (tz.MarrorStatus) {
                let mdr1 = await query_mdvt_next(x.id, x.SerialNumber);
                if (mdr1.length > 0) {
                    let y = mdr1[0];
                    const reftime1 = y.CycleCompletionDate + ' ' + y.TimeBegin;
                    const tzr1 = await tianzhu.getclosest(x.SerialNumber, reftime1);
                    let tz1 =  tzr1[0] || {};
                    tz.CleanDetail1 = tz1.CleanDetail;
                    tz.CardName1 = tz1.CardName;
                    tz.mdvt = x;
                    tz.mdvt1 = y;
                    r.push(tz);
                }
            }
        } else {
            r.push({mdvt:x,mdvt1:{}});   //没有SerialNumber就是自洗消
        }
    }
    return r;
}

app.get('/api/v1/report', function(req, res) {
	let fromdate = req.query['fromdate'] || '';
	let todate = req.query['todate'] || '';
	let mreq = {fromdate:fromdate,todate:todate};
    let f = async() => {
        try{
            let r = await buildData(mreq);
            res.status(200).json(r);
        } catch(err) {
            console.error(err);
            res.status(500).json(err);
        }
    };
    f();
});

const pdfgen = require('./pdfgen');

app.post('/api/v1/report/download', function(req, res) {
	let fromdate = req.body['fromdate'] || '';
	let todate = req.body['todate'] || '';
	let mreq = {fromdate:fromdate,todate:todate};
    let f = async() => {
        try{
            let r = await buildData(mreq);
            res.writeHead(200, {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'attachment; filename=report.pdf'
            });
            pdfgen.genpdf(res, r);
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
