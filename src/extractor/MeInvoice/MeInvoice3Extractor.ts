import { PageContent, TableContent } from "../../models/model";
import { PdfExtractor } from "../PDFExtractor";

export class MeInvoice3Extractor extends PdfExtractor {
  constructor(fileName: string) {
    super(fileName);
    this.docLines = this.getDocLines();
  }

  private processDate(dataStr: string): Date {
    return new Date(
      dataStr
        .trim()
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
      let textMap: Map<number, string> = new Map<number, string>();

      for (let item of textContent.items) {
        if (textMap.get(item.transform[5])) {
          textMap.set(
            item.transform[5],
            textMap.get(item.transform[5]) + "#" + item.str
          );
        } else {
          textMap.set(item.transform[5], item.str);
        }
      }

      for (let [key, value] of textMap) {
        text += "\n" + value;
      }

      return text;
    };

    return pageData.getTextContent(render_options).then(renderText);
  }

  protected override getUntil(
    pageLines: string[],
    posPart: number,
    ending: string
  ) {
    let result = "";
    let pos = posPart;
    for (let i = posPart; i < pageLines.length; i++) {
      if (pageLines[i] == ending || pageLines[i].endsWith(ending)) {
        pos = i;
        break;
      } else result = result + pageLines[i] + " ";
    }

    return { strResult: result, nextPos: pos };
  }

  protected removeTextAfterLastSharp(str: string) {
    return str.substring(0, str.lastIndexOf("#")).replace(/\#/g, "").trim();
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

  protected processPage(pageLines: string[]) {
    let result = new PageContent();

    let lineTmp = this.getUntil(pageLines, 0, "(#Sign#):");
    let nextPos = lineTmp.nextPos;

    nextPos = this.getUntil(pageLines, ++nextPos, "Ký hiệu").nextPos;
    result.serial = this.removeTextAfterLastSharp(pageLines[nextPos]);

    nextPos = this.getUntil(pageLines, ++nextPos, "Số").nextPos;
    result.no = this.removeTextAfterLastSharp(pageLines[nextPos]);

    nextPos = this.getUntil(pageLines, ++nextPos, "Ngày").nextPos;
    result.date = this.processDate(pageLines[nextPos]);

    nextPos = this.getUntil(pageLines, ++nextPos, "Đơn vị bán hàng").nextPos;
    result.seller.companyName = this.removeTextAfterLastSharp(
      pageLines[nextPos]
    );

    nextPos = this.getUntil(pageLines, ++nextPos, "Mã số thuế").nextPos;
    result.seller.taxCode = this.removeTextAfterLastSharp(pageLines[nextPos]);

    nextPos = this.getUntil(pageLines, ++nextPos, "Mã số thuế").nextPos;
    result.buyer.taxCode = this.removeTextAfterLastSharp(pageLines[nextPos]);

    nextPos = this.getUntil(pageLines, ++nextPos, "Tên đơn vị").nextPos;
    result.buyer.companyName = this.removeTextAfterLastSharp(
      pageLines[nextPos]
    );

    nextPos = this.getUntil(
      pageLines,
      ++nextPos,
      "A#C#D#1#2#3#=#1#x#2"
    ).nextPos;
    nextPos++;

    let startRowRegex = /^\D+\#\d+$/;
    let totalRegex = /^[\d\,\.\#]+$/;

    for (nextPos; nextPos < pageLines.length; nextPos++) {
      if (!startRowRegex.test(pageLines[nextPos])) {
        break;
      }

      let tableContent = new TableContent();
      tableContent.unit = this.removeTextAfterLastSharp(pageLines[nextPos]);
      nextPos++;

      if (totalRegex.test(pageLines[nextPos])) {
        let totalArr = pageLines[nextPos]
          .replace(/\#\.\#/g, ".")
          .replace(/\#\,\#/g, ",")
          .split("#")
          .filter((x) => x != "");

        [tableContent.quantity, tableContent.unit_price, tableContent.total] =
          totalArr.map((x) => +x.replace(/\./g, "").replace(",", "."));
      }
      nextPos++;
      let productNameTmp = "";
      for (nextPos; nextPos <= pageLines.length; nextPos++) {
        if (
          !startRowRegex.test(pageLines[nextPos]) &&
          nextPos < pageLines.length
        ) {
          productNameTmp += pageLines[nextPos].replace(/\#/g, "");
        } else {
          tableContent.product_name = productNameTmp.trim();
          result.table.push(tableContent);
          nextPos--;
          break;
        }
      }
    }

    return result;
  }
}
