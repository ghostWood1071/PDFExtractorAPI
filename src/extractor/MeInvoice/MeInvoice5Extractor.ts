import { PageContent, PagePart, TableContent } from "../../models/model";
import { PdfExtractor } from "../PDFExtractor";

export class MeInvoice5Extractor extends PdfExtractor {
 
  constructor(fileName: string) {
    super(fileName);
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

    let nextPos = this.getUntil(pageLines, 0, "Ký hiệu").nextPos;
    let lineTmp = this.getUntil(pageLines, nextPos, "Số#");
    nextPos = lineTmp.nextPos;

    result.serial = lineTmp.strResult
      .replace("Ký hiệu", "")
      .replace(/#/g, "")
      .trim();

    nextPos = this.getUntil(pageLines, 0, "Số#").nextPos;
    lineTmp = this.getUntil(pageLines, nextPos, "(#No#):");
    nextPos = lineTmp.nextPos;

    result.no = lineTmp.strResult.replace("Số#", "").replace(/#/g, "").trim();

    nextPos = this.getUntil(pageLines, nextPos, "Ngày#").nextPos;
    result.date = this.processDate(pageLines[nextPos]);

    nextPos = this.getUntil(pageLines, nextPos, "Đơn vị bán hàng#").nextPos;
    lineTmp = this.getUntil(pageLines, nextPos, "Mã số thuế#");
    nextPos = lineTmp.nextPos;

    result.seller.companyName = lineTmp.strResult
      .replace("Đơn vị bán hàng#", "")
      .replace(/#/g, "")
      .trim();

    lineTmp = this.getUntil(pageLines, nextPos, "Địa chỉ");
    nextPos = lineTmp.nextPos;

    result.seller.taxCode = lineTmp.strResult
      .replace("Mã số thuế#", "")
      .replace(/#/g, "")
      .trim();

    nextPos = this.getUntil(pageLines, ++nextPos, "Mã số thuế#").nextPos;

    result.buyer.taxCode = pageLines[nextPos]
      .replace("Mã số thuế#", "")
      .replace(/#/g, "")
      .trim();

    nextPos = this.getUntil(pageLines, ++nextPos, "Địa chỉ").nextPos;
    nextPos++;

    for (nextPos; nextPos < pageLenght; nextPos++) {
      if (/^[^#,]+$/.test(pageLines[nextPos])) {
        lineTmp = this.getUntil(pageLines, nextPos, "Tên đơn vị");
        result.buyer.companyName = lineTmp.strResult.replace(/#/g, "").trim();
        break;
      }
    }

    nextPos = this.getUntil(pageLines, nextPos, "A#B#C#1#2#3#=#1#x#2").nextPos;
    nextPos++;

    let endRowRegex = /[\d\#\,\.]+\#[\d\#\,\.]+\#[\d\#\,\.]+$/;
    let unitRegex = /^\d+\#\D+$/;

    for (nextPos; nextPos < pageLenght; nextPos++) {
      if (
        pageLines[nextPos].startsWith("PO#:") ||
        pageLines[nextPos + 1] == "Cộng tiền hàng#:"
      ) {
        break;
      }

      let rowTmp = "";

      for (nextPos; nextPos < pageLines.length; nextPos++) {
        let currLine = pageLines[nextPos];

        if (!endRowRegex.test(currLine)) {
          if (unitRegex.test(currLine)) {
            rowTmp += this.getBehind(currLine, "#") + "#";
          } else {
            rowTmp += currLine.replace(/\#/g, "") + "#";
          }
        } else {
          rowTmp +=
            currLine.replace(/\#\,\#/g, ",").replace(/\#\.\#/g, ".") + "#";
          break;
        }
      }

      let newTableContent: TableContent = new TableContent();
      let rowArr = rowTmp.split("#").filter((x) => x != "");

      let total: string = rowArr.pop()!;
      let unit_price: string = rowArr.pop()!;
      let quantity: string = rowArr.pop()!;
      newTableContent.unit = rowArr.pop()!;

      [
        newTableContent.quantity,
        newTableContent.unit_price,
        newTableContent.total,
      ] = this.processTotal(quantity, unit_price, total);

      newTableContent.product_name = rowArr.join(" ");

      result.table.push(newTableContent);
    }

    return result;
  }

  
}
