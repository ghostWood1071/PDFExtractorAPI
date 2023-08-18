import { raw } from "mysql2";
import { PageContent, TableContent } from "../../models/model";
import { PdfExtractor } from "../PDFExtractor";

export class FPT2Extractor extends PdfExtractor{
    private rowRegex = /^[\d.,]+$/g;
    private endTableRegex = /Cộng tiền hàng/g;
    constructor(fileContent: any) {
        super(fileContent);
        this.docLines = this.getDocLines();
    }

    protected simplifyRow(row:string[]){
        while(row.length>5){
            let del = row.splice(0, 2).join(" ");
            row.unshift(del);
        }
    }

    protected processRow(row:string):TableContent{
        let result = new TableContent();
        row = row.replace(/^\d+\#/g,"").replace(/\#$/g, "");
        let rawRow = row.split("#");
        this.simplifyRow(rawRow);
        result.product_name = rawRow[0].trim();
        result.unit = rawRow[1];
        result.quantity = Number(rawRow[2].replace(/\./g, "").replace(/\,/g,"."));
        result.unit_price = Number(rawRow[3].replace(/\./g, "").replace(/\,/g,"."));
        result.total = Number(rawRow[4].replace(/\./g, "").replace(/\,/g,"."));
        return result;
    }

    protected getDate(str:string){
        let raw = str.match(/\d+/g);
        if (raw)
          return new Date(`${raw[1]}-${raw[0]}-${raw[2]}`);
        return new Date();
    }

    protected processPage(pageLines: string[]): PageContent {
        let result:PageContent = new PageContent();
        let tmpLine = this.getUntil(pageLines, 0, "STT");
        let nextPos = this.getByFilter(pageLines, tmpLine.nextPos, (x)=>this.rowRegex.test(x)).nextPos;
        let line = "";
        for(nextPos; nextPos<pageLines.length; nextPos++){
            if(pageLines[nextPos].trim() == "" || this.endTableRegex.test(pageLines[nextPos]))
                break;
            if(this.rowRegex.test(pageLines[nextPos])){
                if(line!=""){
                    result.table.push(this.processRow(line));
                    line = "";
                }
            }
            line = line + pageLines[nextPos] + "#";
        }
        result.table.push(this.processRow(line));

        nextPos = this.getUntil(pageLines, nextPos, "Ngày").nextPos;
        tmpLine = this.getUntil(pageLines, nextPos, "Mã CQT");
        result.date = this.getDate(tmpLine.strResult);
        
        nextPos = this.getUntil(pageLines, tmpLine.nextPos, "Ký hiệu").nextPos;
        tmpLine = this.getUntil(pageLines, nextPos, "Số");
        result.serial = this.getBehind(tmpLine.strResult, ":").trim();

        tmpLine = this.getUntil(pageLines, tmpLine.nextPos, "Đơn vị bán hàng");
        result.no = this.getBehind(tmpLine.strResult, ":").trim().replace(/\#/g,"");

        tmpLine = this.getUntil(pageLines, tmpLine.nextPos, "Mã số thuế");
        result.seller.companyName = this.getBehind(tmpLine.strResult, ":").trim();

        tmpLine = this.getUntil(pageLines,tmpLine.nextPos, "Địa chỉ");
        result.seller.taxCode = this.getBehind(tmpLine.strResult, ":").trim();
        
        nextPos = this.getUntil(pageLines, tmpLine.nextPos, "Tên đơn vị").nextPos;
        tmpLine = this.getUntil(pageLines, nextPos, "Địa chỉ");
        result.buyer.companyName = this.getBehind(tmpLine.strResult, ":").replace(/\#/g, "").trim();

        nextPos = this.getUntil(pageLines, tmpLine.nextPos, "Mã số thuế").nextPos;
        tmpLine = this.getByFilter(pageLines, nextPos, (x)=> (/\^d+$/g).test(x));
        result.buyer.taxCode = this.getBehind(tmpLine.strResult,":").replace(/\#/g, "").trim();
        return result;
    }
}