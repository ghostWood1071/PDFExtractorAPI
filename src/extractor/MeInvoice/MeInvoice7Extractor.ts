import { PageContent, PagePart, TableContent } from "../../models/model";
import { PdfExtractor } from "../PDFExtractor";

export class MeInvoice7Extractor extends PdfExtractor {
  

  constructor(fileName: string) {
    super(fileName);
    this.docLines = this.getDocLines();
  }
  protected override getBehind(input: string, split: string) {
    return input.split(split)[1].replace(/\#/g, "").trim();
  }

  protected renderPage(pageData: any): string {
    let render_options = {
      normalizeWhitespace: false,
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

  protected getUntil(pageLines: string[], posPart: number, ending: string) {
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

  protected processPage(pageLines: string[]) {
    let result = new PageContent();

    let lineTmp = this.getUntil(pageLines, 0, "(#Sign#):");
    let nextPos = lineTmp.nextPos;

    lineTmp = this.getUntil(pageLines, nextPos, "#(#No#):");
    nextPos = lineTmp.nextPos;
    result.serial = this.getBehind(lineTmp.strResult, ":");

    lineTmp = this.getUntil(pageLines, nextPos, "Ký hiệu");
    nextPos = lineTmp.nextPos;
    result.no = lineTmp.strResult.replace("#(#No#):", "");

    nextPos = this.getUntil(pageLines, nextPos, "Ngày").nextPos;

    result.date = new Date(
      pageLines[nextPos]
        .split(/\D+/)
        .filter((x) => x != "")
        .reverse()
        .join("-")
    );

    nextPos = this.getUntil(
      pageLines,
      nextPos,
      "(Dùng cho tổ chức, cá nhân trong khu phi thuế quan)"
    ).nextPos;
    lineTmp = this.getUntil(pageLines, ++nextPos, "Đơn vị bán hàng");
    nextPos = lineTmp.nextPos;

    result.seller.companyName = lineTmp.strResult.replace(/\#/g, " ").trim();

    lineTmp = this.getUntil(pageLines, ++nextPos, "Địa chỉ");
    nextPos = lineTmp.nextPos;
    result.seller.taxCode = lineTmp.strResult.replace("#Mã số thuế", "").trim();

    nextPos = this.getUntil(
      pageLines,
      nextPos,
      "Số tài khoản#(#Bank account#):"
    ).nextPos;
    lineTmp = this.getUntil(pageLines, ++nextPos, "Địa chỉ");
    nextPos = lineTmp.nextPos;

    result.buyer.taxCode = lineTmp.strResult.replace("#Mã số thuế", "").trim();

    nextPos = this.getUntil(
      pageLines,
      nextPos,
      "#Tên đơn vị#(#Company#'#s name#):"
    ).nextPos;

    result.buyer.companyName = pageLines[nextPos]
      .replace("#Tên đơn vị#(#Company#'#s name#):", "")
      .trim();

    nextPos = this.getUntil(
      pageLines,
      nextPos,
      "A#B#C#D#1#2#3#=#1#x#2"
    ).nextPos;
    nextPos++;

    let endRowRegex = /\d+[\d\#\,\.]+\#\d+[\d\#\,\.]+\#\d+[\d\#\,\.]+$/;

    for (nextPos; nextPos < pageLines.length; nextPos++) {
      let tableContent = new TableContent();

      let arrTmp: string[] = [];

      for (nextPos; nextPos < pageLines.length; nextPos++) {
        let currLine = pageLines[nextPos];

        if (currLine == "(#Total amount#):") {
          arrTmp = [];
          break;
        }

        if (endRowRegex.test(currLine)) {
          let totalArr = currLine
            .replace(/\#\.\#/g, ".")
            .replace(/\#\,\#/g, ",")
            .split("#");
          if (totalArr.length == 3) {
            tableContent.total = +totalArr
              .pop()!
              .replace(/\./g, "")
              .replace(/\,/g, ".");
            tableContent.unit_price = +totalArr
              .pop()!
              .replace(/\./g, "")
              .replace(/\,/g, ".");
            tableContent.quantity = +totalArr
              .pop()!
              .replace(/\./g, "")
              .replace(/\,/g, ".");
          } else {
            arrTmp = [];
          }
          break;
        } else {
          arrTmp.push(currLine);
        }
      }
      if (arrTmp.length <= 1) break;

      let unit = arrTmp.pop()!;
      if (unit.includes("#")) {
        let tmpArr = unit.split("#");
        tableContent.unit = tmpArr.pop()!;

        tableContent.product_id = tmpArr.join("").trim();
      } else {
        let tmp = arrTmp.pop()!;
        tableContent.product_id = (arrTmp.pop()! + " " + tmp).replace(
          /\#/g,
          ""
        );
        tableContent.unit = unit;
      }

      tableContent.product_name = arrTmp.join(" ").replace(/\#/g, "").trim();
      result.table.push(tableContent);
      nextPos++;
    }

    return result;
  }
}
