import { PageContent, PagePart, TableContent } from "../../models/model";
import { BKAV2Extractor } from "./BKAV2Extractor";
import { PdfExtractor } from "../PDFExtractor";

export class BKAV3Extractor extends BKAV2Extractor {
  protected override processPage(pageLines: string[]) {
    let result = new PageContent();
    let pageLenght = pageLines.length;

    let nextPos = 0;
    for (nextPos; nextPos < pageLenght; nextPos++) {
      if (pageLines[nextPos].trim() != "") {
        break;
      }
    }

    let lineTmp = this.getUntil(pageLines, nextPos, "Mã số thuế#");
    nextPos = lineTmp.nextPos;

    result.seller.companyName = lineTmp.strResult.replace(/\#/g, "").trim();

    lineTmp = this.getUntil(pageLines, nextPos, "Địa chỉ# (Address)#:");
    result.seller.taxCode = this.getBehind(
      lineTmp.strResult.replace(/\#/g, ""),
      ":"
    ).replace(/ /g, "");

    nextPos = this.getUntil(pageLines, nextPos, "Ngày#").nextPos;

    lineTmp = this.getUntil(pageLines, nextPos, "Họ tên người mua hàng#");
    nextPos = lineTmp.nextPos;

    result.date = this.processDate(lineTmp.strResult);

    nextPos = this.getUntil(
      pageLines,
      ++nextPos,
      "Đơn vị# (Company name)#:"
    ).nextPos;
    lineTmp = this.getUntil(pageLines, nextPos, "Địa chỉ# (Address)#:");
    nextPos = lineTmp.nextPos;

    result.buyer.companyName = this.getBehind(
      lineTmp.strResult.replace(/\#/g, ""),
      ":"
    ).trim();

    nextPos = this.getUntil(
      pageLines,
      nextPos,
      "Mã số thuế# (Tax code)#:"
    ).nextPos;

    lineTmp = this.getUntil(
      pageLines,
      nextPos,
      "STT#Tên hàng hóa, dịch vụ#Số lượng#Đơn giá#Thành tiền"
    );
    result.buyer.taxCode = this.getBehind(
      lineTmp.strResult.replace(/\#/g, ""),
      ":"
    ).trim();

    let endRowRegex = /\D+\#[\d\.\, ]+\#[\d\,\. ]+\#[\d\,\. ]+$/;

    nextPos = this.getUntil(pageLines, nextPos, "1#2#3#4#5#6 = 4 x 5").nextPos;
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

        let total: string = rowArr.pop()!;
        let unit_price: string = rowArr.pop()!;
        let quantity: string = rowArr.pop()!;

        [
          newTableContent.quantity,
          newTableContent.unit_price,
          newTableContent.total,
        ] = this.processTotal(quantity, unit_price, total);
        newTableContent.unit = rowArr.pop()!;

        newTableContent.product_name = rowArr.join(" ");

        result.table.push(newTableContent);
      } else break;
    }

    nextPos = this.getUntil(
      pageLines,
      nextPos,
      "Mẫu số - Ký hiệu# (Serial No.)#:"
    ).nextPos;
    lineTmp = this.getUntil(pageLines, nextPos, "Số# (Invoice No.)#:");
    nextPos = lineTmp.nextPos;

    result.serial = this.getBehind(
      lineTmp.strResult.replace(/\#/g, ""),
      ":"
    ).trim();

    result.no = this.getBehind(
      pageLines[nextPos].replace(/\#/g, ""),
      ":"
    ).trim();

    return result;
  }
}
