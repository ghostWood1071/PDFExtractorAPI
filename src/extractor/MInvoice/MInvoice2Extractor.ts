import test from "node:test";
import { PageContent, TableContent } from "../../models/model";
import { PdfExtractor } from "../PDFExtractor";
//honk
export class MInvoice2Extractor extends PdfExtractor {
    // private docLines: Promise<any[] | null>;
    constructor(fileContent: any) {
        super(fileContent);
        this.docLines = this.getDocLines();
      }
 
    private getDate(str:string){
        let raw = str.split(" ");
        return new Date(`${raw[5]}-${raw[2]}-${raw[8]}`);
    }

    protected override renderPage(pageData: any): string {
        let render_options = {
          normalizeWhitespace: false,
          disableCombineTextItems: false,
        };
        let renderText = (textContent: any) => {
        let regex = /^[\d,.]+$/;
        let lastY,text = "";
        let items = textContent.items;
        text+=items[0].str+"\n";
        for(let i = 1; i<items.length-1; i++){
                if (lastY == items[i].transform[5] || !lastY){
                    if(regex.test(items[i].str))
                        text += "#"+items[i].str+"#";
                    else 
                        text +=  items[i].str+"#";
                } else {
                    if(regex.test(items[i].str)){
                        if ( (regex.test(items[i-1].str) && regex.test(items[i+1].str)) || (items[i-1].str.includes("Tại") && regex.test(items[i+1].str))){
                            text += "\n" + items[i].str;
                        } else {
                            text += "\n#" + items[i].str+"*";
                        }
                    } else
                        text += "\n" + items[i].str;
                }
                lastY = items[i].transform[5];
            }
          return text;
        };
        return pageData.getTextContent(render_options).then(renderText);
    }

    private processTableRow(rowStr: string){
        let result = new TableContent();
        let raw = rowStr.split("|");
        result.total = parseFloat(raw[0].replace(/\./g, "").replace(/\,/g,".")); 
        let rawPrice = raw[1].split("#");
        result.unit_price = parseFloat(rawPrice[1].replace(/\./g, "").replace(/\,/g,".")); 
        result.quantity = parseFloat(rawPrice[0].replace(/\./g, "").replace(/\,/g,".")); 
        result.unit = rawPrice[2]
        raw.splice(0, 2);
        result.product_name = raw.join(" ").trim();
        return result;
    }

    protected override processPage(pageLines: string[]){
        let rowRegex = /^\#\d+\*$/
        let enTableRegex = /Người mua hàng/;
        let result = new PageContent();
        let tmpLine = this.getUntil(pageLines, 0, "Số tài khoản");
        let nextPos = tmpLine.nextPos;
        result.seller.companyName = tmpLine.strResult.trim();
        nextPos = this.getUntil(pageLines,nextPos, "Mã số thuế:").nextPos;
        result.seller.taxCode = this.getBehind(pageLines[nextPos],":#").replace("#","");
        result.buyer.companyName = pageLines[nextPos+1].split("#").join(" ").replace("CÔNGTY", "CÔNG TY").trim();
        nextPos +=1 ;
        nextPos = this.getUntil(pageLines,nextPos, "Số tài khoản:").nextPos+1;
        result.buyer.taxCode = pageLines[nextPos].replace("#","").replace("*","");
        nextPos = this.getUntil(pageLines,nextPos, "Ngày").nextPos;
        tmpLine = this.getUntil(pageLines,nextPos, "HÓA ĐƠN");
        result.date = this.getDate(tmpLine.strResult);
        nextPos = this.getUntil(pageLines,tmpLine.nextPos,"GIÁ TRỊ GIA TĂNG").nextPos+1;
        result.serial = pageLines[nextPos];
        result.no = pageLines[nextPos+1].replace("#","").replace("*", "");
        nextPos = this.getUntil(pageLines, nextPos+1, "Tại:").nextPos+1; 
        let line = "";
        for(let linePos = nextPos; linePos<pageLines.length; linePos++){
            if (pageLines[linePos].startsWith("NoneChuyển")){
                nextPos = linePos;
                break;
            }
            if (rowRegex.test(pageLines[linePos])) {
                if(line != "") {
                    result.table.push(this.processTableRow(line));
                    line = "";
                }
            } else 
            line = line + pageLines[linePos] + "|";
        }
        nextPos = this.getUntil(pageLines, nextPos, "Tỷ giá (exchange rate):").nextPos;
        tmpLine = this.getUntil(pageLines, nextPos, "Trang");
        if(tmpLine.strResult.includes("Tỷ giá")){
            let rawRate = this.getBehind(tmpLine.strResult, ":").replace(".","").replace(",",".")
            result.exchange_rate = rawRate?parseFloat(rawRate):result.exchange_rate;
        }
        return result;
    }
    
}