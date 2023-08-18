import { PdfExtractor, IExtractable } from "../PDFExtractor";
import { PageContent, TableContent } from "../../models/model";

export class FastInvoiceExtractor extends PdfExtractor{
    // private docLines:Promise<any[] | null>;
    constructor(fileContent: any) {
        super(fileContent);
        this.docLines = this.getDocLines();
      }

    private getDate(dateStr: string){
        let strdata =  dateStr.trim().replace(/\#/g, "").split(" ");
        return new Date(`${strdata[3]}/${strdata[1]}/${strdata[5]}`)
    }

    protected parseNumber(strNum:string, isInt: boolean = true){
        let result = strNum.replace(/\./g, "").replace(/\,/g,".");
        return isInt?parseInt(result):parseFloat(result);
    }

    protected override renderPage(pageData: any): string {
        let render_options = {
          normalizeWhitespace: false,
          disableCombineTextItems: false,
        };
    
        let renderText = (textContent: any) => {
          let lastY,
            text = "";
          for (let item of textContent.items) {
            if (lastY == item.transform[5] || !lastY) {
                text += "#"+ item.str;
            } else {
                text += "\n" + item.str+"#";
            }
            lastY = item.transform[5];
          }
          return text;
        };
    
        return pageData.getTextContent(render_options).then(renderText);
    }

    private optimizeRow(row:string[]){
        while(row.length>5){
            let tmp = row.splice(0,2);
            row.unshift(tmp.join(""));
        }
    }

    private processTableRow(rowStr: string){
        console.log(rowStr);
        let result = new TableContent();
        let numStartRegex = /^[0-9]+\#+/g;
        rowStr = rowStr.replace(numStartRegex, "").replace(/\#\#/g,"#");
        rowStr = rowStr.substring(0, rowStr.lastIndexOf("#"));
        let raw = rowStr.split("#");
        this.optimizeRow(raw);
        result.product_name = raw[0];
        result.unit = raw[1];
        result.quantity = parseFloat(raw[2].replace(/\./g,"").replace(/\,/, "."));
        result.unit_price = parseFloat(raw[3].replace(/\./g,"").replace(/\,/, "."));
        result.total = parseFloat(raw[4].replace(/\./g,"").replace(/\,/, "."));
        return result;
    }

    private extractVAT(pageLines: string[], pageResult:PageContent){
        let nextPos = this.getUntil(pageLines, 0, "#Ngày").nextPos;
        let tmpL = this.getUntil(pageLines,nextPos, "Mã cơ quan thuế cấp");
        pageResult.date = this.getDate(tmpL.strResult); 

        nextPos = this.getUntil(pageLines,nextPos,"Ký hiệu").nextPos;
        tmpL = this.getUntil(pageLines,nextPos,"Số")
        pageResult.serial = this.getBehind(tmpL.strResult, ":").replace(/\#/g, "").trim();

        tmpL = this.getUntil(pageLines, tmpL.nextPos, "Đơn vị bán hàng");
        pageResult.no = this.getBehind(tmpL.strResult, ":").replace(/\#/g, "").trim();

        tmpL = this.getUntil(pageLines, tmpL.nextPos, "Mã số thuế")
        pageResult.seller.companyName = this.getBehind(tmpL.strResult, ":")
                                            .replace(/\#/g, "")
                                            .trim();

        tmpL = this.getUntil(pageLines, tmpL.nextPos, "Địa chỉ")
        pageResult.seller.taxCode = this.getBehind(tmpL.strResult, ":").replace(/\#/g, "").replace(/\s/g,"");

        nextPos = this.getUntil(pageLines, tmpL.nextPos, "Họ tên người mua hàng").nextPos + 1;
        if(pageLines[nextPos].includes("Tên đơn vị")){
            pageResult.buyer.companyName = this.getBehind(pageLines[nextPos], ":").replace(/\#/g, "").trim();
            nextPos = this.getUntil(pageLines, nextPos, "Mã số thuế").nextPos;
            tmpL = this.getUntil(pageLines,nextPos, "Đồng tiền thanh toán");
            pageResult.buyer.taxCode = this.getBehind(tmpL.strResult, ":").replace(/\#/g,"").replace(/\s/g,"");
        }
        tmpL = this.getUntil(pageLines, nextPos, "Địa chỉ");
        if(pageResult.buyer.companyName == "")
            pageResult.buyer.companyName = this.getBehind(tmpL.strResult, ":").replace(/\#/g, "").replace("Mã số thuế","").trim();

        nextPos = this.getUntil(pageLines, tmpL.nextPos, "Số tài khoản").nextPos+1;
        tmpL = this.getByFilter(pageLines, nextPos, (x)=> x.toLowerCase().includes("stt##tên hàng hóa")) //this.getUntil(pageLines, nextPos, "Stt##Tên hàng hóa");
        if(pageResult.buyer.taxCode == "")
            pageResult.buyer.taxCode = tmpL.strResult.split(":")[2].trim().replace(/\s/g,"");
        console.log(tmpL);
        return {nextPos: tmpL.nextPos, strResult: tmpL.strResult};
    }

    private extractExportTicket(pageLines: string[], pageResult:PageContent){
        let nextPos = this.getUntil(pageLines, 0, "Ngày").nextPos;
        let tmpL = this.getUntil(pageLines,nextPos, "Mã cơ quan thuế cấp");
        pageResult.date = this.getDate(tmpL.strResult); 
        nextPos = this.getUntil(pageLines, tmpL.nextPos, "Tên tổ chức").nextPos;
        tmpL = this.getUntil(pageLines,nextPos, "Mã số thuế");
        pageResult.seller.companyName = this.getBehind(tmpL.strResult, ":").replace(/\#/g, "").trim();
        tmpL = this.getUntil(pageLines,tmpL.nextPos, "Địa chỉ");
        pageResult.seller.taxCode = this.getBehind(tmpL.strResult, ":").replace(/\#/g, "").replace(/\s/g, "");
        nextPos = this.getUntil(pageLines,tmpL.nextPos, "Mã số thuế").nextPos;
        tmpL = this.getUntil(pageLines,nextPos, "Nhập tại kho");
        pageResult.buyer.taxCode = this.getBehind(tmpL.strResult, ":").replace(/\#/g, "").replace(/\s/g, "");
        tmpL = this.getUntil(pageLines,tmpL.nextPos, "Ký hiệu");
        pageResult.buyer.companyName = this.getBehind(tmpL.strResult, ":").replace(/\#/g, "");
        pageResult.serial =this.getBehind(pageLines[tmpL.nextPos], ":").replace(/\#/,"").trim();
        tmpL = this.getUntil(pageLines, tmpL.nextPos+1, "Số");
        pageResult.no = tmpL.strResult.replace(/\#/g,"");
        tmpL = this.getUntil(pageLines, tmpL.nextPos, "Thực xuất");
        return {nextPos: tmpL.nextPos, strResult: tmpL.strResult};
    }


    protected override processPage(pageLines: string[]){
        let tmpLine: string = ""; 
        // /^[0-9]+[A-ZÁÀẠÃẢẮẰẲẶẴẤẦẬẨẪĐÓÒỎỌÕÔỐỒỔỘỖƠỚỜỞỢỠĂƯỨỪỬỰỮÚÙỦỤŨÂÊẾỀỂỆỄÉÈẺẸẼÝỲỶỴỸÍÌỈỊĨ]+|^\d+$/
        let rowRegex = /^(0?[1-9]\d*)#/;
        let endTableRegex = /Mã tra cứu hóa đơn|Tỷ giá|^PO \d+#$/
        let exchangeRegex = /Tỷ giá/g;
        let rateRegex = /#[\d.]+[A-Z]/;
        let pageResult:PageContent = new PageContent();
        if (pageLines.length==0)
            return pageResult;
        let tmpL = this.getUntil(pageLines, 0, "Ngày")
        if (tmpL.strResult.toLocaleLowerCase().includes("phiếu xuất kho"))
            tmpL = this.extractExportTicket(pageLines, pageResult);
        else
            tmpL =  this.extractVAT(pageLines, pageResult);
        let nextPos = tmpL.nextPos + 2;
        
        for(let linePos = nextPos; linePos<pageLines.length; linePos++){
            if (endTableRegex.test(pageLines[linePos])){
                nextPos = linePos;
                break;
            }
            if (rowRegex.test(pageLines[linePos])) {
                if(tmpLine != "") {
                    pageResult.table.push(this.processTableRow(tmpLine));
                    tmpLine = "";
                }
            } 
            tmpLine = tmpLine + pageLines[linePos] +"#";
        }
        pageResult.table.push(this.processTableRow(tmpLine));
        if(exchangeRegex.test(pageLines[nextPos])){
           pageResult.exchange_rate = parseFloat(pageLines[nextPos].replace(/\s/g, "").replace(/\#\#/g, "#").split("#")[2]);
        }
        return pageResult;
    }

}