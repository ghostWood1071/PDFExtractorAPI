import { PageContent, PagePart, TableContent } from "../../models/model";
import { PdfExtractor } from "../PDFExtractor";
import * as fs from "fs";

export class MeInvoice2Extractor extends PdfExtractor {
  // private docLines: Promise<any[] | null>;

  constructor(fileContent: any) {
    super(fileContent);
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

  protected override getUntil(
    pageLines: string[],
    posPart: number,
    ending: string
  ) {
    let result = "";
    let pos = posPart;
    for (let i = posPart; i < pageLines.length; i++) {
      if (pageLines[i] == ending || pageLines[i].includes(ending)) {
        pos = i;
        break;
      } else result = result + pageLines[i] + " ";
    }
    return { strResult: result, nextPos: pos };
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
        text = "",
        lastVal;
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

  protected override processPage(pageLines: string[]) {
    let result: PageContent = new PageContent();
    let pageLength = pageLines.length;
    let lineTmp = this.getUntil(pageLines, 0, "(#Invoice code#):");
    let nextPos = lineTmp.nextPos;

    if (!pageLines[nextPos + 3].includes("Mã số thuế")) {
      lineTmp = this.getUntil(pageLines, nextPos, "(#Sign#):");
      nextPos = lineTmp.nextPos;

      result.serial = pageLines[++nextPos].replace(/#/g, "");
      result.no = pageLines[++nextPos].replace(/#/g, "");

      nextPos = this.getUntil(pageLines, nextPos, "(#Date#)").nextPos;

      result.date = this.processDate(pageLines[nextPos - 1]);

      nextPos = this.getUntil(pageLines, nextPos, "Địa chỉ").nextPos;
      result.seller.companyName = pageLines[nextPos - 2]
        .replace(/#/g, "")
        .replace("Đơn vị bán hàng", "")
        .trim();

      result.seller.taxCode = pageLines[nextPos - 1]
        .replace(/#/g, "")
        .replace("Mã số thuế", "")
        .trim();

      nextPos = this.getUntil(pageLines, nextPos, "(#Buyer#):").nextPos;

      lineTmp = this.getUntil(pageLines, ++nextPos, "Địa chỉ");

      result.buyer.taxCode = lineTmp.strResult
        .replace(/#/g, "")
        .replace("Mã số thuế", "")
        .trim();
    } else {
      nextPos += 2;
      result.seller.companyName = this.getUntil(
        pageLines,
        nextPos,
        "Mã số thuế"
      ).strResult.trim();

      result.seller.taxCode = this.getUntil(pageLines, ++nextPos, "Địa chỉ")
        .strResult.replace(/#/g, "")
        .replace("Mã số thuế", "")
        .trim();

      lineTmp = this.getUntil(pageLines, nextPos, "(#Sign#):");

      nextPos = lineTmp.nextPos;

      result.serial = pageLines[++nextPos].replace(/\#/g, "");
      lineTmp = this.getUntil(pageLines, ++nextPos, "(#No#):");
      result.no = lineTmp.strResult;
      nextPos = lineTmp.nextPos;

      lineTmp = this.getUntil(pageLines, nextPos, "(#VAT Invoice#)");
      nextPos = lineTmp.nextPos;

      lineTmp = this.getUntil(pageLines, ++nextPos, "(#Date#)");
      result.date = this.processDate(lineTmp.strResult);

      nextPos = this.getUntil(pageLines, nextPos, "(#Buyer#):").nextPos;

      lineTmp = this.getUntil(pageLines, ++nextPos, "Địa chỉ");
      result.buyer.taxCode = lineTmp.strResult
        .replace(/#/g, "")
        .replace("Mã số thuế", "")
        .trim();

      nextPos = this.getUntil(pageLines, nextPos, "Tên đơn vị").nextPos;
      result.buyer.companyName = pageLines[nextPos]
        .replace(/#/g, "")
        .replace("Tên đơn vị", "")
        .trim();
    }

    nextPos = this.getUntil(
      pageLines,
      nextPos,
      "(#Company#'#s name#):"
    ).nextPos;

    result.buyer.companyName = pageLines[nextPos - 1]
      .replace(/#/g, "")
      .replace("Tên đơn vị", "")
      .trim();

    nextPos = this.getUntil(pageLines, nextPos, "A#B#C#1#2#3#=#1#x#2").nextPos;
    nextPos++;
    let numStrRegex = /^\d[\#\.\,\d]*\d$/;

    for (nextPos; nextPos < pageLength; nextPos += 2) {

      if (numStrRegex.test(pageLines[nextPos].trim())) {
        break;
      }

      let newTableContent: TableContent = new TableContent();

      let str = "";
      for (nextPos; nextPos < pageLength; nextPos++) {
        if (!numStrRegex.test(pageLines[nextPos])) {
          str += "#" + pageLines[nextPos] + " ";
        } else {
          break;
        }
      }

      let lastIndexOfSharp = str.lastIndexOf("#");
      newTableContent.product_name = str
        .slice(0, lastIndexOfSharp)
        .replace(/#/g, "")
        .trim();
      newTableContent.unit = str.slice(lastIndexOfSharp + 1).trim();

      var numArr = pageLines[nextPos]
        .replace(/\#\.\#/g, ".")
        .replace(/\#\,\#/g, ",")
        .split("#")
        .filter((x) => x != "");
      newTableContent.quantity = +numArr[0]
        .replace(/\./g, "")
        .replace(/\,/g, ".");
      newTableContent.unit_price = +numArr[1]
        .replace(/\./g, "")
        .replace(/\,/g, ".");
      newTableContent.total = +numArr[2].replace(/\./g, "").replace(/\,/g, ".");

      result.table.push(newTableContent);
    }

    for (nextPos; nextPos < pageLength; nextPos++) {
      if (pageLines[nextPos] == "Tỷ giá") {
        result.exchange_rate = +pageLines[nextPos + 2]
          .replace(/\#/g, "")
          .replace(",", ".");
        break;
      }
    }

    return result;
  }

}