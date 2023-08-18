import { PageContent, TableContent } from "../../models/model";
import { EInvoice2Extractor } from "./EInvoice2Extractor";
import { PdfExtractor } from "../PDFExtractor";
// UIL
export class EInvoice3Extractor extends EInvoice2Extractor {
  // private docLines: Promise<any[] | null>;

  constructor(fileContent: any) {
    super(fileContent);
    this.docLines = this.getDocLines();
  }

  protected override processDate(dataStr: string): Date {
    return new Date(
      dataStr
        .trim()
        .replace(/\#/g, "")
        .split(/\D+/g)
        .filter((x) => x != "")
        .reverse()
        .join("-")
    );
  }

  protected override renderPage(pageData: any): string {
    //check documents https://mozilla.github.io/pdf.js/
    let render_options = {
      //replaces all occurrences of whitespace with standard spaces (0x20). The default value is `false`.
      normalizeWhitespace: false,
      //do not attempt to combine same line TextItem's. The default value is `false`.
      disableCombineTextItems: false,
    };

    let renderText = (textContent: any) => {
      let lastY,
        text = "";
      for (let item of textContent.items) {
        if (lastY == item.transform[5] || !lastY) {
          text += "#" + item.str;
        } else {
          text += "\n" + item.str;
        }
        lastY = item.transform[5];
      }
      return text;
    };

    return pageData.getTextContent(render_options).then(renderText);
  }

  private optimizeRow(row:string[]){
    while(row.length > 5){
      let replace = row.splice(0, 2);
      row.unshift(replace.join(" "))
    }
  }

  private processTableRow(rowStr: string){
    let result = new TableContent();
    let numStartRegex = /^[0-9]+\#/g;
    rowStr = rowStr.replace(numStartRegex, "");
    if(rowStr.endsWith("#"))
      rowStr = rowStr.substring(0, rowStr.length-1);
    let raw = rowStr.split("#");
    this.optimizeRow(raw);
    result.product_name = raw[0];
    result.unit = raw[1];
    result.quantity = parseFloat(raw[2].replace(/\./g, "").replace(/\,/g,".")); 
    result.unit_price = parseFloat(raw[3].replace(/\./g, "").replace(/\,/g,".")); 
    result.total = parseFloat(raw[4].replace(/\./g, "").replace(/\,/g,".")); 
    return result;
  }

  protected override processPage(pageLines: string[]) {
    try {
      let enTableRegex = /Trang|tiep theo|Số tiền viết bằng chữ/g;
      let rowRegex = /^\d+\#[A-ZÁÀẠÃẢẮẰẲẶẴẤẦẬẨẪĐÓÒỎỌÕÔỐỒỔỘỖƠỚỜỞỢỠĂƯỨỪỬỰỮÚÙỦỤŨÂÊẾỀỂỆỄÉÈẺẸẼÝỲỶỴỸÍÌỈỊĨ]|^\d+$/
      let result = new PageContent();
      let tmpLine = this.getUntil(pageLines, 0, "#Điện thoại");
      let nextPos = tmpLine.nextPos + 1; 
      tmpLine = this.getUntil(pageLines,nextPos,"Địa chỉ");
      result.seller.companyName = tmpLine.strResult.trim();
      nextPos = this.getUntil(pageLines,nextPos, "Mã số thuế").nextPos;
      tmpLine = this.getUntil(pageLines,nextPos,"Số tài khoản");
      result.seller.taxCode = this.getBehind(tmpLine.strResult, ":").trim().replace(/\#/g,"").trim();
      nextPos = this.getUntil(pageLines,tmpLine.nextPos,"Ngày#").nextPos;
      tmpLine = this.getUntil(pageLines,nextPos,"Ký hiệu");
      result.date = this.processDate(tmpLine.strResult);
      tmpLine = this.getUntil(pageLines,tmpLine.nextPos, "Số");
      result.serial = this.getBehind(tmpLine.strResult, ":").replace(/\#/g, "");
      tmpLine = this.getUntil(pageLines,tmpLine.nextPos, "Mã của CQT");
      result.no = this.getBehind(tmpLine.strResult, ":").replace(/\#/g, "");
      nextPos = this.getUntil(pageLines, tmpLine.nextPos, "Tên đơn vị").nextPos;
      tmpLine = this.getUntil(pageLines, nextPos, "Địa chỉ");
      result.buyer.companyName = this.getBehind(tmpLine.strResult,":").replace(/\#/g, "");
      nextPos = this.getUntil(pageLines, nextPos, "Mã số thuế").nextPos;
      tmpLine = this.getUntil(pageLines, nextPos, "Số tài khoản");
      result.buyer.taxCode = this.getBehind(tmpLine.strResult,":").replace(/\#/g, "").trim();
      nextPos = this.getUntil(pageLines, tmpLine.nextPos, "(Amount)").nextPos+1;
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
          line = line + pageLines[linePos] + "#";
      }
      result.table.push(this.processTableRow(line));
      tmpLine = this.getUntil(pageLines, nextPos, "")

      return result;
    } catch (TypeError) {
      return super.processPage(pageLines);
      // return new PageContent();
    }
  }

}