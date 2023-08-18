import { PageContent, TableContent } from "../../models/model";
import { PdfExtractor } from "../PDFExtractor";

export class BKAV2Extractor extends PdfExtractor {
  constructor(fileName: string) {
    super(fileName);
    this.docLines = this.getDocLines();
  }

  protected processDate(dataStr: string): Date {
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
      let text = "";
      let textMap: Map<number, any[]> = new Map<number, any[]>();
      for (let item of textContent.items) {
        let itemMap = textMap.get(item.transform[5]);
        if (itemMap) {
          itemMap.push(item);
        } else {
          textMap.set(item.transform[5], [item]);
        }
      }

      for (let key of textMap.keys()) {
        text +=
          textMap
            .get(key)
            ?.sort((x, y) => x.transform[4] - y.transform[4])
            .map((x) => x.str)
            .join("#") + "\n";
      }
      return text;
    };

    return pageData.getTextContent(render_options).then(renderText);
  }

  protected processTotal(
    quantity_str: string,
    unit_price_str: string,
    total_str: string
  ) {
    let quantity = +quantity_str.replace(/\,/g, "").trim();
    let unit_price = +unit_price_str.replace(/\,/g, "").trim();
    let total = +total_str.replace(/\,/g, "").trim();

    if (
      !isNaN(quantity) &&
      !isNaN(unit_price) &&
      !isNaN(total) &&
      quantity * unit_price == total
    ) {
      return [quantity, unit_price, total];
    } else {
      return [
        +quantity_str.replace(/\./g, "").replace(",", "."),
        +unit_price_str.replace(/\./g, "").replace(",", "."),
        +total_str.replace(/\./g, "").replace(",", "."),
      ];
    }
  }

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

    lineTmp = this.getUntil(pageLines, nextPos, "Ngày#");
    nextPos = lineTmp.nextPos;

    lineTmp = this.getUntil(pageLines, nextPos, "Người mua#");
    nextPos = lineTmp.nextPos;

    result.date = this.processDate(lineTmp.strResult);

    nextPos = this.getUntil(
      pageLines,
      nextPos,
      "Đơn vị# (Company name)#:"
    ).nextPos;
    lineTmp = this.getUntil(pageLines, nextPos, "Mã số thuế# (Tax Code)#:");
    nextPos = lineTmp.nextPos;

    result.buyer.companyName = this.getBehind(
      lineTmp.strResult.replace(/\#/g, ""),
      ":"
    ).trim();

    lineTmp = this.getUntil(pageLines, nextPos, "Địa chỉ# (Address)#:");
    result.buyer.taxCode = this.getBehind(
      lineTmp.strResult.replace(/\#/g, ""),
      ":"
    ).trim();

    let startRowRegex = /^\d+\#\D+\#[\d\.\, ]+\#[\d\,\. ]+\#[\d\,\. ]+$/;

    nextPos = this.getUntil(pageLines, nextPos, "1#2#3#4#5#6 = 4 x 5").nextPos;
    nextPos++;

    for (nextPos; nextPos < pageLines.length; nextPos++) {
      if (startRowRegex.test(pageLines[nextPos])) {
        let rowTmp = pageLines[nextPos] + "#";
        nextPos++;

        for (nextPos; nextPos < pageLines.length; nextPos++) {
          if (
            pageLines[nextPos].startsWith("Cộng tiền hàng#") ||
            pageLines[nextPos].replace(/#/g, "").trim() == ""
          ) {
            break;
          }

          if (!startRowRegex.test(pageLines[nextPos])) {
            rowTmp += pageLines[nextPos] + "#";
          } else {
            rowTmp += pageLines[nextPos] + "#";
            break;
          }
        }

        let newTableContent: TableContent = new TableContent();
        let rowArr = rowTmp.split("#").filter((x) => x != "");
        rowArr.shift();

        newTableContent.unit = rowArr.shift()!;
        let quantity: string = rowArr.shift()!;
        let unit_price: string = rowArr.shift()!;
        let total: string = rowArr.shift()!;

        [
          newTableContent.quantity,
          newTableContent.unit_price,
          newTableContent.total,
        ] = this.processTotal(quantity, unit_price, total);

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
