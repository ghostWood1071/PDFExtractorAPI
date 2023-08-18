import { PageContent, PagePart, TableContent } from "../../models/model";
import { PdfExtractor } from "../PDFExtractor";

export class CyberLotusExtractor extends PdfExtractor {

  constructor(fileContent: any) {
    super(fileContent);
    this.docLines = this.getDocLines();
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

  private processDate(dataStr: string): Date {
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

  protected override processPage(pageLines: string[]) {
    let result = new PageContent();

    let lineTmp = this.getUntil(pageLines, 0, "Đơn vị bán hàng:");
    let nextPos = lineTmp.nextPos;

    lineTmp = this.getUntil(pageLines, nextPos, "Mã số thuế:#");
    nextPos = lineTmp.nextPos;
    result.seller.companyName = this.getBehind(
      lineTmp.strResult.replace(/\#/g, ""),
      ":"
    ).trim();

    lineTmp = this.getUntil(pageLines, nextPos, "Địa chỉ:#");
    nextPos = lineTmp.nextPos;
    result.seller.taxCode = this.getBehind(
      lineTmp.strResult.replace(/\#/g, ""),
      ":"
    ).trim();

    nextPos = this.getUntil(pageLines, nextPos, "Tên đơn vị:#").nextPos;

    lineTmp = this.getUntil(pageLines, nextPos, "Địa chỉ:#");
    nextPos = lineTmp.nextPos;
    result.buyer.companyName = this.getBehind(
      lineTmp.strResult.replace(/\#/g, ""),
      ":"
    ).trim();

    nextPos = this.getUntil(pageLines, nextPos, "Mã số thuế:#").nextPos;
    lineTmp = this.getUntil(pageLines, nextPos, "Hình thức thanh toán:#");
    nextPos = lineTmp.nextPos;

    result.buyer.taxCode = this.getBehind(
      lineTmp.strResult.replace(/\#/g, ""),
      ":"
    ).trim();

    nextPos = this.getUntil(pageLines, nextPos, "Ngày").nextPos;
    lineTmp = this.getUntil(pageLines, nextPos, "Ký hiệu:#");
    nextPos = lineTmp.nextPos;

    result.date = this.processDate(lineTmp.strResult);

    lineTmp = this.getUntil(pageLines, nextPos, "Số:#");
    nextPos = lineTmp.nextPos;
    result.serial = this.getBehind(
      lineTmp.strResult.replace(/\#/g, ""),
      ":"
    ).trim();

    lineTmp = this.getUntil(pageLines, nextPos, "STT#");
    nextPos = lineTmp.nextPos;
    result.no = this.getBehind(
      lineTmp.strResult.replace(/\#/g, ""),
      ":"
    ).trim();

    nextPos = this.getUntil(
      pageLines,
      nextPos,
      "(1)#(2)#(3)#(4)#(5)#(6) = (4) x (5)"
    ).nextPos;
    nextPos++;

    let endRowRegex = /\D+\#[\d\.\, ]+\#[\d\,\. ]+\#\ +\#[\d\,\. ]+\# +$/;

    for (nextPos; nextPos < pageLines.length; nextPos++) {
      if (!isNaN(+pageLines[nextPos][0])) {
        let rowTmp = "";

        for (nextPos; nextPos < pageLines.length; nextPos++) {
          if (!endRowRegex.test(pageLines[nextPos])) {
            rowTmp += pageLines[nextPos] + "#";
          } else {
            rowTmp += pageLines[nextPos] + "#";
            break;
          }
        }

        let newTableContent: TableContent = new TableContent();

        let rowArr = rowTmp.split("#").filter((x) => x.trim() != "");
        rowArr.shift();

        newTableContent.total = +rowArr
          .pop()!
          .replace(/\./g, "")
          .replace(",", ".");
        newTableContent.unit_price = +rowArr
          .pop()!
          .replace(/\./g, "")
          .replace(",", ".");
        newTableContent.quantity = +rowArr
          .pop()!
          .replace(/\./g, "")
          .replace(",", ".");
        newTableContent.unit = rowArr.pop()!;

        newTableContent.product_name = rowArr.join("");

        result.table.push(newTableContent);
      } else break;
    }

    return result;
  }
}
