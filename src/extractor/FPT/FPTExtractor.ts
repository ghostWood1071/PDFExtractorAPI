import { PageContent, TableContent } from "../../models/model";
import { PdfExtractor } from "../PDFExtractor";

export class FPTExtractor extends PdfExtractor {
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

  protected override processPage(pageLines: string[]) {
    let result = new PageContent();

    let lineTmp = this.getUntil(pageLines, 0, "Ký hiệu:");
    let nextPos = lineTmp.nextPos;

    result.serial = pageLines[nextPos - 3].trim();
    result.no = pageLines[nextPos - 2].trim();
    result.date = this.processDate(pageLines[nextPos - 1]);

    nextPos = this.getUntil(pageLines, nextPos, "Mã số thuế:").nextPos;
    lineTmp = this.getUntil(pageLines, nextPos, "Điện thoại:");
    nextPos = lineTmp.nextPos;

    result.seller.taxCode = this.getBehind(
      lineTmp.strResult,
      "Mã số thuế:"
    ).trim();

    lineTmp = this.getUntil(pageLines, ++nextPos, "MST:");
    nextPos = lineTmp.nextPos;

    result.seller.companyName = lineTmp.strResult.trim();

    lineTmp = this.getUntil(pageLines, nextPos, "Địa chỉ:");
    nextPos = lineTmp.nextPos;

    result.buyer.taxCode = this.getBehind(lineTmp.strResult, "MST:").trim();

    nextPos = this.getUntil(pageLines, nextPos, "Nhập kho tại:").nextPos;

    let totalRowRegex = /^\d+[,\d.]+#\d+[,\d.]+/;
    let strTmp = "";
    for (nextPos; nextPos < pageLines.length; nextPos++) {
      if (totalRowRegex.test(pageLines[nextPos])) {
        break;
      }
      strTmp += pageLines[nextPos] + " ";
    }
    result.buyer.companyName = this.getBehind(strTmp, "Nhập kho tại:").trim();

    for (nextPos; nextPos < pageLines.length; nextPos++) {
      let currentLine = pageLines[nextPos];
      //   console.log(currentLine);
      if (currentLine.includes("Thủ kho xuấtThủ kho nhậpNgười vận chuyển")) {
        break;
      } else if (totalRowRegex.test(currentLine)) {
        let newTable = new TableContent();
        let totalArrTmp = currentLine
          .split("#")
          .map((x) => +x.replace(/,/g, ""))
          .filter((x) => !isNaN(x));

        [newTable.total, newTable.unit_price] = totalArrTmp;

        currentLine = pageLines[++nextPos];

        let unitArrTmp = currentLine.split("#").filter((x) => x != "");
        newTable.product_id = unitArrTmp[1].trim();
        newTable.unit = unitArrTmp[0].split(/\d+/).filter((x) => x != "")[0];
        newTable.quantity = +unitArrTmp[0]
          .split(/\D+/)
          .filter((x) => x != "")[0];

        nextPos++;
        let productNameTmp = "";
        for (nextPos; nextPos < pageLines.length; nextPos++) {
          if (!isNaN(+pageLines[nextPos])) {
            break;
          }
          productNameTmp += pageLines[nextPos];
        }

        newTable.product_name = productNameTmp.trim();
        result.table.push(newTable);
      }
    }

    return result;
  }
}
