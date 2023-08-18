import { PageContent, TableContent } from "../../models/model";
import { PdfExtractor } from "../PDFExtractor";

export class MeInvoiceExtractor extends PdfExtractor {
    // private docLines:Promise<any[] | null>;
    constructor(fileContent: any) {
        super(fileContent);
        this.docLines = this.getDocLines();
      }

    protected override renderPage(pageData:any): string {
        let render_options = {
            normalizeWhitespace: false,
            disableCombineTextItems: false
        }
        let renderText = (textContent:any) => {
          let regex = /^[\d,.]+$/
          let lastY, text = '';
          for (let item of textContent.items) {
              if (lastY == item.transform[5] || !lastY){
                    if (regex.test(item.str)){
                        text += "#"+item.str+"#";
                    }
                    else if(item.str.endsWith(" "))
                        text+=item.str;
                    else
                        text +=  item.str+"#";
              }  
              else{
                if (regex.test(item.str))
                    text += "\n#"+item.str+"#";
                else 
                    text += '\n' + item.str;
              }    
              lastY = item.transform[5];
          }
          return text;
        }
        return pageData.getTextContent(render_options).then(renderText);
    }

    private getDate(str:string){
        let raw = str.match(/\d+/g);
        if (raw)
            return new Date(`${raw[1]}-${raw[0]}-${raw[2]}`);
        return new Date();
    }

    private simplifyRow(rawArr:string[]){
        while(rawArr.length>5){
            let tmp = rawArr.splice(0, 2).join(" ");
            rawArr.unshift(tmp);
        }
    }
    private trimWhile(str: string, character: string){
        while(str.trim().endsWith(character)){
            str = str.trim();
            str = str.substring(0, str.length-1);
        }
        return str;
    }
    private processTableRow(rowStr: string){
        rowStr = rowStr.replace(/\#\#/g, "#");
        let result = new TableContent();
        let numStartRegex = /^\#[0-9.,]+\#/g;
        rowStr = rowStr.replace(numStartRegex, "");
        rowStr = this.trimWhile(rowStr, "#");
        rowStr = rowStr.replace(/\#{2,}/g, "#");
        let raw = rowStr.split("#")
        this.simplifyRow(raw);
        result.product_name = raw[0];
        result.unit = raw[1];
        result.quantity = parseFloat(raw[2].replace(/\./g,"").replace(/\,/,"."))
        result.unit_price = parseFloat(raw[3].replace(/\./g,"").replace(/\,/,"."))
        result.total = parseFloat(raw[4].replace(/\./g,"").replace(/\,/,"."))
        return result;
    }

    protected override processPage(pageLines: string[]){
        let rowRegex = /^#(0?[1-9]\d*)#/;
        let enTableRegex = /Cộng tiền|Hình thức thanh toán|Người mua hàng|Số:#|^(\d+\/\d+)$|\(Theo PO đặt hàng số/;
        let result = new PageContent();
        let nextPos = this.getUntil(pageLines, 0, "CÔNG TY").nextPos;
        let tmpLine = this.getUntil(pageLines,nextPos, "Mã số thuế");
        result.seller.companyName = tmpLine.strResult.replace(/\#/g, "").trim();
        tmpLine = this.getUntil(pageLines, tmpLine.nextPos, "Địa chỉ");
        if(tmpLine.strResult.includes("Mã số thuế")){
            result.seller.taxCode = this.getBehind(tmpLine.strResult.replace(new RegExp("#", "g"), ""), ":");
            nextPos = this.getUntil(pageLines, tmpLine.nextPos, "Tên đơn vị").nextPos;
            tmpLine = this.getUntil(pageLines, nextPos, "Mã số thuế")
            result.buyer.companyName = this.getBehind(tmpLine.strResult, ":").replace(/\#/g, "");;
            tmpLine = this.getUntil(pageLines,tmpLine.nextPos,"Địa chỉ");
            result.buyer.taxCode = this.getBehind(tmpLine.strResult.replace(new RegExp("#", "g"), ""), ":"); 
            nextPos = this.getUntil(pageLines, tmpLine.nextPos, "Ngày").nextPos;
            tmpLine = this.getUntil(pageLines, nextPos, "Mã CQT");
            result.date = this.getDate(tmpLine.strResult);
            nextPos = this.getUntil(pageLines, tmpLine.nextPos, "Ký hiệu").nextPos;
            tmpLine = this.getUntil(pageLines,nextPos, "Số")
            result.serial = tmpLine.strResult.split(":")[1].replace(new RegExp("#", "g"), "").trim();
            tmpLine = this.getUntil(pageLines, tmpLine.nextPos, "STT");
            result.no = tmpLine.strResult.split(":")[1].replace(new RegExp("#", "g"), "").trim();
        }
        nextPos = this.getUntil(pageLines,tmpLine.nextPos, "(Amount)").nextPos+1;
        if(enTableRegex.test(pageLines[nextPos-1]))
            return result;
        let line = "";
        for(let linePos = nextPos; linePos<pageLines.length; linePos++){
            if(!pageLines[linePos].includes("STT#Tên hàng hóa")){
                if (enTableRegex.test(pageLines[linePos])){
                    nextPos = linePos;
                    break;
                }
                if (rowRegex.test(pageLines[linePos])) {
                    if(line != "") {
                        result.table.push(this.processTableRow(line));
                        line = "";
                    }
                }
                    line = line + pageLines[linePos] + (pageLines[linePos]==""?"":"#");
            }
        }

        if(rowRegex.test(line))
            result.table.push(this.processTableRow(line));
        return result;
    }
}