import { PageContent, TableContent } from "../../models/model";
import { PdfExtractor } from "../PDFExtractor";

export class SoftDreamsInvoiceExtractor extends PdfExtractor {
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

  private getBuyerTaxCode(taxStr: String) {
    return taxStr.split("#").filter((x) => /\d+/.test(x))[0];
  }

  protected override processPage(pageLines: string[]) {
    let lineTmp = this.getUntil(pageLines, 0, "(VAT INVOICE)");
    let nextPos = lineTmp.nextPos;
    let result = new PageContent();

    lineTmp = this.getUntil(pageLines, ++nextPos, "Ký hiệu #(Serial)#:");
    nextPos = lineTmp.nextPos;

    result.date = this.processDate(lineTmp.strResult);

    lineTmp = this.getUntil(pageLines, nextPos, "Số #(No.)#:");
    nextPos = lineTmp.nextPos;

    result.serial = this.getBehind(lineTmp.strResult.replace(/\#/g, ""), ":");
    result.no = this.getBehind(pageLines[nextPos].replace(/\#/g, ""), ":");

    nextPos = this.getUntil(
      pageLines,
      ++nextPos,
      "Địa chỉ #(Address)#:"
    ).nextPos;
    nextPos++;
    result.seller.companyName = pageLines[++nextPos].replace(/\#/g, "").trim();
    result.seller.taxCode = pageLines[++nextPos].replace(/\#/g, "").trim();

    let endRowRegex = /\D+\#[\d\. ]+\#[\d\. ]+\#[\d\. ]+$/;

    let prevLine = nextPos;
    nextPos = this.getUntil(
      pageLines,
      nextPos,
      "(1)#(2)#(3)#(4)#(5)#(6)=(4)x(5)"
    ).nextPos;
    if (prevLine == nextPos) {
      nextPos = this.getUntil(pageLines, nextPos, "1#2#3#4#5#6=4x5").nextPos;
    }
    nextPos++;

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

        let rowArr = rowTmp.split("#").filter((x) => x != "");
        rowArr.shift();

        newTableContent.total = +rowArr.pop()!.replace(/\./g, "");
        newTableContent.unit_price = +rowArr.pop()!.replace(/\./g, "");
        newTableContent.quantity = +rowArr.pop()!.replace(/\./g, "");
        newTableContent.unit = rowArr.pop()!;

        newTableContent.product_name = rowArr.join("");

        result.table.push(newTableContent);
      } else break;
    }

    if (nextPos < pageLines.length) {
      nextPos = this.getUntil(
        pageLines,
        nextPos,
        "Tên đơn vị #(Company name)#:"
      ).nextPos;

      result.buyer.companyName = this.getBehind(
        pageLines[nextPos].replace(/\#/g, ""),
        ":"
      );

      nextPos = this.getUntil(pageLines, nextPos++, "Mã số thuế #(Tax").nextPos;
      result.buyer.taxCode = this.getBuyerTaxCode(pageLines[nextPos]);
    }
    return result;
  }
}
