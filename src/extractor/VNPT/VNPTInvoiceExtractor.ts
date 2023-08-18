import { PageContent, TableContent } from "../../models/model";
import { PdfExtractor } from "../PDFExtractor";

export class VNPInvoiceExtractor extends PdfExtractor {
    // private docLines:Promise<any[] | null>;
    constructor(fileContent: any) {
        super(fileContent);
        this.docLines = this.getDocLines();
    }

    protected getDate(str:string){
        let rawNumA = str.match(/\d+/g);
        if (rawNumA)
            return new Date(`${rawNumA[1]}-${rawNumA[0]}-${rawNumA[2]}`);
        return new Date();
    }

    protected override renderPage(pageData:any): string {
        let render_options = {
            normalizeWhitespace: false,
            disableCombineTextItems: false
        }
  
        let renderText = (textContent:any) => {
          let regex = /^[\d,.]+$/;
          let lastY, text = '';
          for (let item of textContent.items) {
              if (lastY == item.transform[5] || !lastY){
                    text +=  item.str+"#";
              }  
              else{
                  text += '\n' + item.str;
              }    
              lastY = item.transform[5];
          }
          return text;
        }
    
        return pageData.getTextContent(render_options).then(renderText);
    }
   
    private simplyRow(raw:string[]){
        if(raw.length>5){
            let del = raw.splice(0, 2);
            raw.unshift(del.join(" "));
        }
    }
    protected processTableRow(line:string):TableContent{
        let result = new TableContent();
        let numStartRegex = /^[0-9]+/g;
        line = line.replace(numStartRegex, "");
        if(line.endsWith("#"))
            line = line.substring(0, line.length-1);
        let rawLine = line.split("#");
        this.simplyRow(rawLine);
        result.product_name = rawLine[0];
        result.unit = rawLine[1];
        result.quantity = parseFloat(rawLine[2].replace(/\./g, "").replace(/\,/g,"."))
        result.unit_price = parseFloat(rawLine[3].replace(/\./g, "").replace(/\,/g,"."))
        result.total = parseFloat(rawLine[4].replace(/\./g, "").replace(/\,/g,"."))
        return result;
    }

    protected override processPage(pageLines: string[]){
        let tmpLine = "";
        let rowRegex = /[0-9]+[A-ZÁÀẠÃẢẮẰẲẶẴẤẦẬẨẪĐÓÒỎỌÕÔỐỒỔỘỖƠỚỜỞỢỠĂƯỨỪỬỰỮÚÙỦỤŨÂÊẾỀỂỆỄÉÈẺẸẼÝỲỶỴỸÍÌỈỊĨ]+|^\d+$/
        let exchangeRegex = /Tỷ giá:/g;
        let rateVATstartRegex = /Thuế suất/g;
        let endTableRegex = /Cộng tiền hàng/g;
        let result = new PageContent();
        if (pageLines.length<=3)
            return result;
        let lineTmp = this.getUntil(pageLines, 0, "Ngày");
        let nextPos = lineTmp.nextPos;
        lineTmp = this.getUntil(pageLines, nextPos, "Mã của cơ quan thuế");
        result.date = this.getDate(lineTmp.strResult);
        nextPos = this.getUntil(pageLines, lineTmp.nextPos, "Ký hiệu").nextPos;
        lineTmp = this.getUntil(pageLines, nextPos, "Số");
        result.serial = this.getBehind(lineTmp.strResult, ":").replace(new RegExp("#", "g"), "");
        lineTmp = this.getUntil(pageLines, lineTmp.nextPos, "Đơn vị bán hàng");
        result.no = this.getBehind(lineTmp.strResult,":").replace(new RegExp("#", "g"), "").replace(/\s/g, "");
        lineTmp = this.getUntil(pageLines, lineTmp.nextPos, "Mã số thuế")
        result.seller.companyName = this.getBehind(lineTmp.strResult, ":").trim().replace(new RegExp("#", "g"), "");
        nextPos = lineTmp.nextPos;
        lineTmp = this.getUntil(pageLines, nextPos, "Địa chỉ");
        nextPos = lineTmp.nextPos;
        result.seller.taxCode = this.getBehind(lineTmp.strResult,":").trim().replace(new RegExp("#", "g"), "");
        nextPos = this.getUntil(pageLines,nextPos,"Tên đơn vị ").nextPos;
        lineTmp = this.getUntil(pageLines, nextPos, "Mã số thuế ");
        result.buyer.companyName = this.getBehind(lineTmp.strResult, ":").replace(new RegExp("#", "g"), "").trim();
        nextPos = lineTmp.nextPos;
        lineTmp = this.getUntil(pageLines, nextPos, "Địa chỉ");
        result.buyer.taxCode = this.getBehind(lineTmp.strResult, ":").replace("#", "").replace(new RegExp("#", "g"), "");
        lineTmp = this.getUntil(pageLines, lineTmp.nextPos, "12#3#4#5#6=4x5#");
        nextPos = lineTmp.nextPos+1;
        for(let linePos = nextPos; linePos<pageLines.length; linePos++){
            if (endTableRegex.test(pageLines[linePos]))
                break;
            if(exchangeRegex.test(pageLines[linePos])){
                let tmp_rate = pageLines[linePos].split("#")[2];
                if(tmp_rate != ":")
                    result.exchange_rate = parseFloat(tmp_rate);
                break;
            }
            if(rateVATstartRegex.test(pageLines[linePos])){
                result.vat_rate = parseFloat(pageLines[linePos].split("#")[3].replace("%", ""));
            }
            if (rowRegex.test(pageLines[linePos])) {
                if(tmpLine != "") {
                    result.table.push(this.processTableRow(tmpLine));
                    tmpLine = "";
                }
            } 
            tmpLine = tmpLine + pageLines[linePos];
        }
        if(!endTableRegex.test(tmpLine))
           result.table.push(this.processTableRow(tmpLine));
        return result;
    }

}
