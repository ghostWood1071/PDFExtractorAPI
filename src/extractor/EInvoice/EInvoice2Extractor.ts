import { PageContent, TableContent } from "../../models/model";
import { PdfExtractor } from "../PDFExtractor";
// Lux Share
export class EInvoice2Extractor extends PdfExtractor {

  constructor(fileContent: any) {
    super(fileContent);
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

    nextPos = serialLineIndex > dateLineIndex ? serialLineIndex : dateLineIndex;
    let prevNextPos = nextPos;
    for (nextPos; nextPos < pageLength; nextPos++) {
      if (
        pageLines[nextPos] == "1#2#3#4#5#6 = 4 x 5" ||
        pageLines[nextPos] == "1#2#3#4#5#6#7 = 5 x 6"
      ) {
        nextPos++;
        break;
      }
    }

    let startRowRegex = /\d+\#\D+/;
    let endRowRegex = /\D+\#[\d\.\, ]+\#[\d\,\. ]+\#[\d\,\. ]+$/;

    if (nextPos == pageLength) {
      nextPos = this.getUntil(
        pageLines,
        prevNextPos,
        "1# #2#3#4#5#6 = 4 x 5"
      ).nextPos;

      nextPos++;

      for (nextPos; nextPos < pageLines.length; nextPos++) {
        if (startRowRegex.test(pageLines[nextPos])) {
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
          newTableContent.product_id = rowArr.shift()!.trim();

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
    } else {
      for (nextPos; nextPos < pageLines.length; nextPos++) {
        if (pageLines[nextPos].trim() != "" && !isNaN(+pageLines[nextPos][0])) {
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
    }

    for (nextPos; nextPos < pageLength; nextPos++) {
      if (pageLines[nextPos].startsWith("Tỷ giá #(Exchange rate)#:")) {
        result.exchange_rate = +this.getBehind(
          pageLines[nextPos].replace(/\#/g, "").trim(),
          ":"
        )
          .split(" ")[0];
          // .replace(/\./g, "")
          // .replace(/\,/g, ".");
        break;
      }
    }

    return result;
  }
}

