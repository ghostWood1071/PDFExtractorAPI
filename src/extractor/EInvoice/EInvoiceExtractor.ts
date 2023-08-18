import { PageContent, TableContent } from "../../models/model";
import { IExtractable, PdfExtractor } from "../PDFExtractor";

export class EInvoiceExtractor extends PdfExtractor {
  // private docLines: Promise<any[] | null>;
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
          if(item.str == " "){continue;}
          if (lastY == item.transform[5] || !lastY){
                text +=  item.str+"#";
          }  
          else{
              if(item.str.startsWith("(") || item.str.endsWith(")"))
                text+= " "+item.str
              else
                text += '\n' + item.str;
          }    
          lastY = item.transform[5];
      }
      return text;
    }

    return pageData.getTextContent(render_options).then(renderText);
  }

  private getDate(dateStr: string) {
    let strdata = dateStr.split("#");
    return new Date(`${strdata[4]}/${strdata[1]}/${strdata[7]}`);
  }

  protected parseNumber(strNum: string, isInt: boolean = true) {
    // console.log(strNum);
    let result = strNum.replace(".", "").replace(",", ".");
    return isInt ? parseInt(result) : parseFloat(result);
  }

  private processTableRow(rowStr: string) {
    let result = new TableContent();
    let numStartRegex = /^[0-9]+/g;
    rowStr = rowStr.trim().replace(numStartRegex, "").trim().replace(/^\||\|$/g, "");
    if(rowStr.includes("|")){
      let raw = rowStr.split("|");
      let rawPr =  raw.splice(raw.length-1, 1)[0].replace(/\s/g, "").split("#");
      result.product_name = raw.join(" ");
      let rawQuantity = rawPr[0].match(/\d+(\.\d+)?/g)?.join("").replace(/\./g, "").replace(/\,/g, "");
      result.quantity = parseFloat(rawQuantity?rawQuantity:"0");
      result.unit = rawPr[0].replace(/[\d,.]+/g, "");
      result.unit_price = parseFloat(rawPr[1]);
      result.total = parseFloat(rawPr[3]);
    } else {
      let raw = rowStr.split("#");
      result.product_name = raw[0].trim();
      result.unit = raw[1].trim();
      result.quantity = parseFloat(raw[2].trim().replace(/\,/g, ""))
      result.unit_price = parseFloat(raw[3].trim().replace(/\,/g, ""))
      result.total = parseFloat(raw[5].trim().replace(/\,/g, ""))
    }
    return result;
  }

  private execRegex(str: string, regex: RegExp) {
    let result = regex.exec(str);
    return result ? result[0] : "";
  }

  protected override processPage(pageLines: string[]) {
    let rowRegex = /^[0-9]+[A-ZÁÀẠÃẢẮẰẲẶẴẤẦẬẨẪĐÓÒỎỌÕÔỐỒỔỘỖƠỚỜỞỢỠĂƯỨỪỬỰỮÚÙỦỤŨÂÊẾỀỂỆỄÉÈẺẸẼÝỲỶỴỸÍÌỈỊĨ]+|^\d+$/
    let enTableRegex = /Tổng số tiền/;
    let numRegex = /^[\d,.]+$/;
    let result = new PageContent();
    let nextPos = this.getUntil(pageLines, 0, "Customer").nextPos+1;
    let tmpLine = this.getUntil(pageLines,nextPos, "Địa chỉ :");
    result.buyer.companyName = tmpLine.strResult.trim();
    nextPos = this.getUntil(pageLines, tmpLine.nextPos, "Tax code").nextPos+1;
    result.buyer.taxCode = pageLines[nextPos];
    nextPos = this.getUntil(pageLines, nextPos, "Tỷ giá (FX)").nextPos;
    tmpLine = this.getUntil(pageLines, nextPos, "Thuế suất GTGT")
    result.exchange_rate = tmpLine.strResult.split("#")[2];
    for(let i = 0; i<3; i++){
      tmpLine = this.getUntil(pageLines,tmpLine.nextPos+1,"Tại/ At");
    }
    result.seller.companyName = pageLines[tmpLine.nextPos + 1];
    nextPos = this.getUntil(pageLines, tmpLine.nextPos+2, "Tel").nextPos+1;
    result.seller.taxCode = pageLines[nextPos].split("#")[2]
    nextPos = this.getUntil(pageLines, nextPos, "HÓA ĐƠN").nextPos+1;
    result.serial = this.getBehind(pageLines[nextPos], ": #").replace("#","");
    result.no = this.getBehind(pageLines[nextPos+1], ": #").replace("#", "");
    nextPos = this.getUntil(pageLines, nextPos+1, "Ngày").nextPos;
    result.date = this.getDate(pageLines[nextPos]);
    nextPos = this.getUntil(pageLines, nextPos, "12#3#4#5#6").nextPos+1;
    let line = "";
    for(let linePos = nextPos; linePos<pageLines.length; linePos++){
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
          line = line + pageLines[linePos] + "|";
    }
    result.table.push(this.processTableRow(line));
    tmpLine = this.getUntil(pageLines, nextPos, "")
    return result;
  }


}
