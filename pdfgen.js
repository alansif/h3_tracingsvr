const trans = require('./trans');
const fieldNames = require('./fields').fieldNames;

function getTrans(info) {
    for (let n in trans.trans) {
        if (info.includes(n)) {
            return info.replace(n, trans.trans[n]);
        }
    }
    return info;
}

var fonts = {
	Roboto: {
        normal: 'fonts/sarasa-term-sc-regular.TTF',
        bold: 'fonts/sarasa-term-sc-bold.TTF',
        italics: 'fonts/sarasa-term-sc-italic.TTF',
        bolditalics: 'fonts/sarasa-term-sc-bolditalic.TTF'
	}
};
  
var PdfPrinter = require('pdfmake');
var printer = new PdfPrinter(fonts);
var fs = require('fs');
var util = require('util');

function getDocDef(tablebody, details) {
    let docDefinition = {
        pageSize: 'A4',
        pageOrientation: 'landscape',
//        pageMargins: [ 10, 10, 10, 10 ],
        footer: function(currentPage, pageCount) {
            return [{text: currentPage.toString() + ' of ' + pageCount, alignment: 'right', margin: [0, 0, 70, 0]}];
        },
        content: [
            {
                table: {
                    headerRows: 1,
                    body: tablebody
                }
            },
            ...details
        ],
        defaultStyle: {
            // alignment: 'justify'
            fontSize: 5.4
        },
        styles: {
            detail: {
                fontSize: 5
            }
        }
    };
    return docDefinition;
}

var options = {
	// ...
}

function getDetail(mdvt) {
        let r = Object.assign({}, mdvt);
        delete r.fileId;
        delete r.Steps;
        const s = Object.entries(r).map(c => [fieldNames[c[0]]||c[0], c[1]]);
        let steps = JSON.parse(mdvt.Steps).map(q => [q.time, q.step, getTrans(q.info)]);
        return [s, steps];
}

function genpdf(res, data) {
    let tablebody = [
        ['日期','类别','设备ID','内镜型号','内镜ID','前洗消步骤','洗消员','id1','客户姓名','客户ID','预处理始','预处理终','预处理员','后洗消步骤','洗消员','id2']
    ];
    for(let x of data) {
        let d = [
            x.mdvt.CycleCompletionDate,
            x.mdvt.Category,
            x.mdvt.MachineSerialNumber,
            x.mdvt.EndoscopeType,
            x.mdvt.SerialNumber,
            x.CleanDetail,
            x.CardName,
            x.mdvt.id,
            x.PatientName,
            x.PatientID,
            x.MarrorCleanTime,
            x.MarrorCleanStopTime,
            x.MarrorCleanPerson,
            x.CleanDetail1,
            x.CardName1,
            x.mdvt1.id,
        ];
        tablebody.push(d.map(v => v || ''));
    }
    let details = [];
    for(let x of data) {
        details.push(...getDetail(x.mdvt));
        if (!!x.mdvt1.id) details.push(...getDetail(x.mdvt1));
    }
    let detailpages = [];
    const pagesize = 6;
    const pagecount = Math.floor(details.length / 2 / pagesize) + 1;
    for (let pageidx = 0; pageidx < pagecount; ++pageidx) {
        let cells = [];
        for (let i = 0; i < pagesize * 2; i += 2) {
            let dtlidx = pageidx * pagesize * 2 + i;
            if (dtlidx < details.length) {
                let cell = [
                    {
                        layout: 'noBorders',
                        style: 'detail',
                        table: {
                            headerRows: 0,
                            body: details[dtlidx]
                        }
                    },
                    {
                        layout: 'noBorders',
                        style: 'detail',
                        table: {
                            headerRows: 0,
                            body: details[dtlidx + 1]
                        }
                    }
                ];
                cells.push(cell);
            }
        }
        const w = 115;
        if (cells.length > 0) {
            let detailpage = {
                pageBreak: 'before',
                style: 'detail',
                table: {
                    widths:[w,w,w,w,w,w],
                    headerRows: 0,
                    body: [cells]
                }
            };
            detailpages.push(detailpage);
        }
    }
//    console.log(util.inspect(detailpages, false, null));
    let docDefinition = getDocDef(tablebody, detailpages);
    var pdfDoc = printer.createPdfKitDocument(docDefinition, options);
//    pdfDoc.pipe(fs.createWriteStream('doc.pdf'));
    pdfDoc.pipe(res);
    pdfDoc.end();
}

exports.genpdf = genpdf;