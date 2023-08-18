import { PageContent, TableContent } from "../../models/model";
import { PdfExtractor } from "../PDFExtractor";

export class VNPT2Extractor extends PdfExtractor {
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

  protected override processPage(pageLines: string[]) {
    let result = new PageContent();

    let lineTmp = this.getUntil(pageLines, 0, "Ngày");
    let nextPos = lineTmp.nextPos;

    lineTmp = this.getUntil(pageLines, nextPos, "Mã của cơ quan thuế:");
    nextPos = lineTmp.nextPos;
    result.date = this.processDate(lineTmp.strResult);

    nextPos = this.getUntil(pageLines, nextPos, "Ký hiệu:").nextPos;
    lineTmp = this.getUntil(pageLines, nextPos, "Số:");
    nextPos = lineTmp.nextPos;

    result.serial = this.getBehind(
      lineTmp.strResult.replace(/\#/g, ""),
      ":"
    ).trim();

    lineTmp = this.getUntil(pageLines, nextPos, "Đơn vị bán hàng   (Seller) :");
    nextPos = lineTmp.nextPos;
    result.no = this.getBehind(
      lineTmp.strResult.replace(/\#/g, ""),
      ":"
    ).trim();

    lineTmp = this.getUntil(pageLines, nextPos, "Mã số thuế   (Tax code) :");
    nextPos = lineTmp.nextPos;
    result.seller.companyName = this.getBehind(
      lineTmp.strResult.replace(/\#/g, ""),
      ":"
    ).trim();

    lineTmp = this.getUntil(pageLines, nextPos, "Địa chỉ   (Address) :");
    nextPos = lineTmp.nextPos;
    result.seller.taxCode = this.getBehind(
      lineTmp.strResult.replace(/\#/g, ""),
      ":"
    ).trim();

    nextPos = this.getUntil(
      pageLines,
      nextPos,
      "Tên đơn vị   (Company's name) :"
    ).nextPos;

    lineTmp = this.getUntil(pageLines, nextPos, "Mã số thuế   (Tax code) :");
    nextPos = lineTmp.nextPos;
    result.buyer.companyName = this.getBehind(
      lineTmp.strResult.replace(/\#/g, ""),
      ":"
    ).trim();

    lineTmp = this.getUntil(pageLines, nextPos, "Địa chỉ   (Address) :");
    nextPos = lineTmp.nextPos;
    result.buyer.taxCode = this.getBehind(
      lineTmp.strResult.replace(/\#/g, ""),
      ":"
    ).trim();

    nextPos = this.getUntil(pageLines, nextPos, "1#2#3#4#56=4x5").nextPos;
    nextPos++;

    let endRowRegex = /\D+\#[\d\.\, ]+\#[\d\,\. ]+\#[\d\,\. ]+$/;

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
