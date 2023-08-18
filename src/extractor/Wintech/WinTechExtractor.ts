import { PageContent, TableContent } from "../../models/model";
import { PdfExtractor } from "../PDFExtractor";

export class WinTechExtractor extends PdfExtractor {
  // private docLines: Promise<any[] | null>;

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

  private processTable(str: string) {
    let newTableContent = new TableContent();
    let rowArr = str.split("#");

    let total = rowArr.pop()?.replace(/\./g, "").replace(/\,/g, ".");
    newTableContent.total = typeof total != undefined ? +total! : 0;

    let unit_price = rowArr.pop()?.replace(/\./g, "").replace(/\,/g, ".");
    newTableContent.unit_price =
      typeof unit_price != undefined ? +unit_price! : 0;

    let quantity = rowArr.pop()?.replace(/\./g, "").replace(/\,/g, ".");
    newTableContent.quantity = typeof quantity != undefined ? +quantity! : 0;

    let unit = rowArr.pop();
    newTableContent.unit = typeof unit != undefined ? unit! : "";

    rowArr.shift();

    newTableContent.product_name = rowArr.join("");

    return newTableContent;
  }

  protected override processPage(pageLines: string[]) {
    let result = new PageContent();

    let lineTmp = this.getUntil(pageLines, 0, "Đơn vị bán hàng#(Issued)#:");
    let nextPos = lineTmp.nextPos;

    lineTmp = this.getUntil(pageLines, nextPos, "Mã số thuế #(VAT code)#:");
    nextPos = lineTmp.nextPos;

    result.seller.companyName = this.getBehind(
      lineTmp.strResult.replace(/\#/g, ""),
      ":"
    ).trim();

    lineTmp = this.getUntil(pageLines, nextPos, "Địa chỉ #(Address)#: ");
    nextPos = lineTmp.nextPos;

    result.seller.taxCode = this.getBehind(
      lineTmp.strResult.replace(/\#/g, ""),
      ":"
    ).trim();

    nextPos = this.getUntil(pageLines, nextPos, "(VAT INVOICE)").nextPos;

    lineTmp = this.getUntil(pageLines, nextPos, "Ký hiệu #(Serial)#");
    nextPos = lineTmp.nextPos;

    result.date = this.processDate(lineTmp.strResult);

    lineTmp = this.getUntil(pageLines, nextPos, "Số #(No.)#:");
    nextPos = lineTmp.nextPos;

    result.serial = this.getBehind(
      lineTmp.strResult.replace(/\#/g, ""),
      ":"
    ).trim();

    lineTmp = this.getUntil(
      pageLines,
      nextPos,
      "Họ tên người mua hàng #(Customer's name)#:"
    );
    nextPos = lineTmp.nextPos;

    result.no = this.getBehind(
      lineTmp.strResult.replace(/\#/g, ""),
      ":"
    ).trim();

    lineTmp = this.getUntil(pageLines, ++nextPos, "Mã số thuế #(VAT code)#:");
    nextPos = lineTmp.nextPos;

    result.buyer.companyName = this.getBehind(
      lineTmp.strResult.replace(/\#/g, ""),
      ":"
    ).trim();

    lineTmp = this.getUntil(pageLines, nextPos, "Địa chỉ #(Address)#:");
    nextPos = lineTmp.nextPos;

    result.buyer.taxCode = this.getBehind(
      lineTmp.strResult.replace(/\#/g, ""),
      ":"
    ).trim();

    nextPos = this.getUntil(
      pageLines,
      nextPos,
      "(1)#(2)#(3)#(4)#(5)#(6=4x5)"
    ).nextPos;

    let rowRegex = /\d+\#.*\#\w+\#[\d\.]+\#[\d\.]+\#[\d\.]+/;

    while (!rowRegex.test(pageLines[nextPos])) {
      nextPos++;
    }

    for (let linePos = nextPos; linePos < pageLines.length; linePos++) {
      if (rowRegex.test(pageLines[linePos])) {
        result.table.push(this.processTable(pageLines[linePos]));
      } else break;
    }

    return result;
  }
}
