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
            fontSize: 8
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
  
function genpdf(res, data) {
    let tablebody = [
        ['id','日期','类别','客户姓名','客户ID','内镜型号','内镜ID','预处理开始','预处理结束','预处理员','洗消步骤','洗消员']
    ];
    for(let x of data) {
        let d = [
            x.mdvt.id,
            x.mdvt.CycleCompletionDate,
            x.mdvt.Category,
            x.PatientName,
            x.PatientID,
            x.mdvt.EndoscopeType,
            x.mdvt.SerialNumber,
            x.MarrorCleanTime,
            x.MarrorCleanStopTime,
            x.MarrorCleanPerson,
            x.CleanDetail,
            x.CardName
        ];
        tablebody.push(d.map(v => v || ''));
    }
    let details = [];
    for(let x of data) {
        let r = Object.assign({}, x.mdvt);
        delete r.fileId;
        delete r.Steps;
        const s = Object.entries(r).map(c => [fieldNames[c[0]]||c[0], c[1]]);
        let v = {
            layout: 'noBorders',
            style: 'detail',
            table: {
                headerRows: 0,
                body: s
            }
        }
        details.push(v);
        let steps = JSON.parse(x.mdvt.Steps).map(q => [q.time, q.step, getTrans(q.info)]);
        const z = {
            layout: 'noBorders',
            style: 'detail',
            table: {
                headerRows: 0,
                body: steps
            }
        }
        details.push(z);
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
                            body: details[dtlidx].table.body
                        }
                    },
                    {
                        layout: 'noBorders',
                        style: 'detail',
                        table: {
                            headerRows: 0,
                            body: details[dtlidx + 1].table.body
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