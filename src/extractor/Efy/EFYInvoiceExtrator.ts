import { PageContent, TableContent } from "../../models/model";
import { PdfExtractor } from "../PDFExtractor";

export class EFYInvoiceExtractor extends PdfExtractor {
  constructor(fileContent: any) {
    super(fileContent);
    this.docLines = this.getDocLines();
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

  protected override processPage(pageLines: string[]) {
    let result = new PageContent();

    let lineTmp = this.getUntil(pageLines, 0, "Số tài khoản#(A/C):");
    let nextPos = lineTmp.nextPos;

    lineTmp = this.getUntil(pageLines, ++nextPos, "Mã số thuế#(Tax code):");
    nextPos = lineTmp.nextPos;

    result.seller.companyName = lineTmp.strResult.trim();

    lineTmp = this.getUntil(pageLines, nextPos, "Địa chỉ#(Address):");
    nextPos = lineTmp.nextPos;

    result.seller.taxCode = this.getBehind(
      lineTmp.strResult.replace(/[ \#]/g, ""),
      ":"
    );

    nextPos = this.getUntil(pageLines, ++nextPos, "Ngày# #(Date)#").nextPos;

    lineTmp = this.getUntil(pageLines, nextPos, "Ký hiệu# #(Serial No):");
    nextPos = lineTmp.nextPos;

    result.date = this.processDate(lineTmp.strResult);

    lineTmp = this.getUntil(pageLines, ++nextPos, "Số# #(No):");
    nextPos = lineTmp.nextPos;

    result.serial = lineTmp.strResult.trim();

    lineTmp = this.getUntil(pageLines, ++nextPos, "Mã số thuế#(Tax code):");
    nextPos = lineTmp.nextPos;

    result.no = lineTmp.strResult.trim();

    lineTmp = this.getUntil(pageLines, nextPos, "Số tài khoản#(A/C):");
    nextPos = lineTmp.nextPos;

    result.buyer.taxCode = this.getBehind(
      lineTmp.strResult.replace(/\#/g, ""),
      ":"
    );

    nextPos = this.getUntil(
      pageLines,
      ++nextPos,
      "Tên đơn vị#(Co.name):"
    ).nextPos;

    lineTmp = this.getUntil(pageLines, nextPos, "Địa chỉ#(Address):#");
    nextPos = lineTmp.nextPos;

    result.buyer.companyName = this.getBehind(
      lineTmp.strResult.replace(/\#/g, ""),
      ":"
    );

    nextPos = this.getUntil(pageLines, ++nextPos, "(Amount)").nextPos;
    nextPos++;

    let rowRegex = /^\d+\#.+\#.+\#[\d\.]+\#[\d\.]+\#[\d\.]+$/;

    for (nextPos; nextPos < pageLines.length; nextPos++) {
      if (rowRegex.test(pageLines[nextPos])) {
        let newTableContent = new TableContent();
        let arrStr = pageLines[nextPos].split("#");

        newTableContent.product_name = arrStr[1];
        newTableContent.unit = arrStr[2];
        newTableContent.quantity = +arrStr[3]
          .replace(/\./g, "")
          .replace(/\,/g, ".");
        newTableContent.unit_price = +arrStr[4]
          .replace(/\./g, "")
          .replace(/\,/g, ".");
        newTableContent.total = +arrStr[5]
          .replace(/\./g, "")
          .replace(/\,/g, ".");
        result.table.push(newTableContent);
      } else if (
        pageLines[nextPos].includes("trang") ||
        pageLines[nextPos].endsWith("#(Buyer)")
      ) {
        break;
      }
    }

    return result;
  }
}
