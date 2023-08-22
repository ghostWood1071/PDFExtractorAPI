import { PageContent, TableContent } from "../../models/model";
import { PdfExtractor } from "../PDFExtractor";
import { EInvoice2Extractor } from "./EInvoice2Extractor";
// UIL
export class EInvoice6Extractor extends EInvoice2Extractor {
  private processTableRow(rowStr: string) {
    let result = new TableContent();
    let raw = rowStr.split("##").filter((x) => x.trim() != "");

    result.product_id = raw.shift()!.split("#")[1];

    let totalArr = raw.pop()!.split("#");
    result.unit = totalArr[0];
    result.quantity = parseFloat(
      totalArr[1].replace(/\./g, "").replace(/\,/, ".")
    );
    result.unit_price = parseFloat(
      totalArr[2].replace(/\./g, "").replace(/\,/, ".")
    );
    result.total = parseFloat(
      totalArr[3].replace(/\./g, "").replace(/\,/, ".")
    );

    result.product_name = raw.join(" ");

    return result;
  }

  protected override processPage(pageLines: string[]) {
    let result = new PageContent();

    let pageLength = pageLines.length;
    let nextPos = 0;

    for (nextPos; nextPos < pageLength; nextPos++) {
      if (pageLines[nextPos].trim() != "") {
        break;
      }
    }

    result.seller.companyName = pageLines[nextPos].replace(/\#/g, "").trim();
    result.seller.taxCode = pageLines[++nextPos].replace(/\#/g, "").trim();

    nextPos++;

    let prevIndex = nextPos;
    let bankAccount = /[\d\-]+\#.+|[\d ]+\(\w+\).+/;

    for (nextPos; nextPos < pageLength; nextPos++) {
      if (
        pageLines[nextPos].trim() == "" ||
        bankAccount.test(pageLines[nextPos])
      ) {
        nextPos++;
        break;
      }
    }

    if (nextPos == pageLength) {
      nextPos = prevIndex;
    }

    let taxCodeRegex = /^\d+$/;
    for (nextPos; nextPos < pageLength; nextPos++) {
      if (taxCodeRegex.test(pageLines[nextPos + 1].trim())) {
        result.buyer.companyName = pageLines[nextPos].replace(/\#/g, "").trim();
        result.buyer.taxCode = pageLines[++nextPos].replace(/\#/g, "").trim();
        break;
      }
    }

    let lineTmp = this.getUntil(pageLines, ++nextPos, "Ký hiệu#");

    let serialLineIndex = lineTmp.nextPos;
    result.serial = this.getBehind(pageLines[serialLineIndex], ":")
      .replace(/\#/, "")
      .trim();
    result.no = this.getBehind(pageLines[++serialLineIndex], ":")
      .replace(/\#/, "")
      .trim();

    lineTmp = this.getUntil(pageLines, nextPos, "Ngày");
    let dateLineIndex = lineTmp.nextPos;
    result.date = this.processDate(pageLines[dateLineIndex]);

    nextPos =
      this.getUntil(pageLines, nextPos, "1#2#3#4#5#6#7#8 = 6 x 7").nextPos + 1;

    let startRowRegex = /\d+\#\D+/;
    let endRowRegex = /\D+\#[\d\.\, ]+\#[\d\,\. ]+\#[\d\,\. ]+$/;
    let endTableRegex = /^\s+$|Người mua hàng#(Buyer)#Người bán hàng#(Seller)/;
    let tmpRow = "";
    for (nextPos; nextPos < pageLines.length; nextPos++) {
      if (endTableRegex.test(pageLines[nextPos])) {
        break;
      }
      if (!endRowRegex.test(pageLines[nextPos])) {
        tmpRow += pageLines[nextPos] + "##";
      } else {
        tmpRow += pageLines[nextPos] + "##";
        result.table.push(this.processTableRow(tmpRow));
        tmpRow = "";
      }
    }

    return result;
  }
}
