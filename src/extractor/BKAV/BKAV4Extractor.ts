import { PageContent, TableContent } from "../../models/model";
import { PdfExtractor } from "../PDFExtractor";
import { BKAVExtractor } from "./BKAVExtractor";

export class BKAV4Extractor extends BKAVExtractor {
  protected override processPage(pageLines: string[]) {
    let result = new PageContent();
    let pageLenght = pageLines.length;

    let nextPos = 0;
    for (nextPos; nextPos < pageLenght; nextPos++) {
      if (pageLines[nextPos].trim() != "") {
        break;
      }
    }

    result.seller.companyName = pageLines[nextPos].replace(/\#/g, "").trim();

    nextPos = this.getUntil(pageLines, nextPos, "MST #/VAT code#:").nextPos;
    let lineTmp = this.getUntil(pageLines, nextPos, "HÓA ĐƠN GIÁ TRỊ GIA TĂNG");
    result.seller.taxCode = this.getBehind(
      lineTmp.strResult.replace(/\#/g, ""),
      ":"
    ).replace(/ /g, "");

    for (nextPos; nextPos < pageLenght; nextPos++) {
      if (pageLines[nextPos].endsWith("Mẫu số - Ký hiệu# /Serial No#:")) {
        lineTmp = this.getUntil(pageLines, nextPos, "Đơn đặt hàng số#");
        nextPos = lineTmp.nextPos;
        result.serial = this.getBehind(
          lineTmp.strResult
            .replace("Mã khách hàng# /Customer code#:", "")
            .replace(/\#/g, ""),
          ":"
        ).trim();
        break;
      }
    }

    nextPos = this.getUntil(
      pageLines,
      nextPos,
      "Hóa đơn số# /Inv. No#:"
    ).nextPos;

    result.no = pageLines[nextPos].match(/\#\d+\#/)![0].replace(/\#/g, "");

    nextPos = this.getUntil(
      pageLines,
      nextPos,
      "Đơn vị mua hàng# /Bill to#:"
    ).nextPos;
    lineTmp = this.getUntil(pageLines, nextPos, "Địa chỉ# /Add#:");
    nextPos = lineTmp.nextPos;

    result.buyer.companyName = this.getBehind(
      lineTmp.strResult.replace(/\#/g, ""),
      ":"
    ).trim();

    nextPos = this.getUntil(pageLines, nextPos, "Hóa đơn ngày#").nextPos;

    result.date = new Date(pageLines[++nextPos].split("/").reverse().join("-"));

    nextPos = this.getUntil(
      pageLines,
      nextPos,
      "Mã số thuế# /VAT code#:"
    ).nextPos;

    result.buyer.taxCode = this.getBehind(
      pageLines[nextPos].replace(/\#/g, ""),
      ":"
    ).trim();

    let endRowRegex = /\D+\#[\d\.\, ]+\#[\d\,\. ]+\#[\d\,\. ]+$/;

    nextPos = this.getUntil(pageLines, nextPos, "Amount").nextPos;
    nextPos++;

    for (nextPos; nextPos < pageLines.length; nextPos++) {
      if (
        pageLines[nextPos] != "#####" &&
        !pageLines[nextPos].startsWith("Cộng tiền hàng#")
      ) {
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
        newTableContent.product_id = rowArr.shift()!;

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

    return result;
  }
}
