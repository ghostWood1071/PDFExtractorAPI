import { PageContent, TableContent } from "../../models/model";
import { PdfExtractor } from "../PDFExtractor";

export class VNPT4Extractor extends PdfExtractor {
  constructor(fileName: string) {
    super(fileName);
    this.docLines = this.getDocLines();
  }

  protected override getUntil(
    pageLines: string[],
    posPart: number,
    ending: string
  ) {
    let result = "";
    let pos = posPart;
    for (let i = posPart; i < pageLines.length; i++) {
      if (
        pageLines[i] == ending ||
        pageLines[i].startsWith(ending) ||
        pageLines[i].endsWith(ending)
      ) {
        pos = i;
        break;
      } else result = result + pageLines[i] + " ";
    }
    // result = this.getBehind(result.trim(), ":")
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

  protected processPage(pageLines: string[]) {
    let result = new PageContent();

    let lineTmp = this.getUntil(pageLines, 0, "1#2#3#4#5#6=4x5");
    let nextPos = lineTmp.nextPos + 1;

    let endRowRegex = /\d+[\d\,\.]+\#\d+[\d\,\.]+\#\d+[\d\,\.]+$/;

    for (nextPos; nextPos < pageLines.length; nextPos++) {
      let tableContent = new TableContent();

      let rowTmp = "";

      for (nextPos; nextPos < pageLines.length; nextPos++) {
        let currLine = pageLines[nextPos];

        if (currLine == "Cộng tiền hàng #(Total amount)#:") {
          rowTmp = "";
          break;
        }
        if (!endRowRegex.test(currLine)) {
          rowTmp += currLine + " #";
        } else {
          rowTmp +=
            currLine.replace(/\#\,\#/g, ",").replace(/\#\.\#/g, ".") + "#";
          break;
        }
      }
      if (rowTmp == "") break;

      let tmpArr = rowTmp.split("#").filter((x) => x.trim() != "");

      tableContent.total = +tmpArr.pop()!.replace(/\./g, "").replace(",", ".");
      tableContent.unit_price = +tmpArr
        .pop()!
        .replace(/\./g, "")
        .replace(",", ".");
      tableContent.quantity = +tmpArr
        .pop()!
        .replace(/\./g, "")
        .replace(",", ".");

      tableContent.unit = tmpArr.pop()!.trim();
      tmpArr.shift();

      tableContent.product_name = tmpArr.join("").trim();
      result.table.push(tableContent);
    }

    nextPos = this.getUntil(pageLines, nextPos, "Ngày #").nextPos;
    lineTmp = this.getUntil(pageLines, nextPos, "Mã của cơ quan thuế:");
    nextPos = lineTmp.nextPos;
    result.date = new Date(
      lineTmp.strResult
        .split(/\D+/)
        .filter((x) => x != "")
        .reverse()
        .join("-")
    );
    nextPos = this.getUntil(pageLines, nextPos, "Ký hiệu").nextPos;
    result.serial = this.getBehind(pageLines[nextPos], ":")
      .replace(/\#/g, "")
      .trim();

    nextPos = this.getUntil(pageLines, nextPos, "Số").nextPos;
    result.no = this.getBehind(pageLines[nextPos], ":")
      .replace(/\#/g, "")
      .trim();

    lineTmp = this.getUntil(pageLines, ++nextPos, "#Mã số thuế#(TAX code)#:");
    nextPos = lineTmp.nextPos;
    result.seller.companyName = lineTmp.strResult
      .replace("#Đơn vị bán hàng#(Issued)#:", "")
      .replace(/\#/g, "")
      .trim();

    result.seller.taxCode = pageLines[nextPos]
      .replace("#Mã số thuế#(TAX code)#:", "")
      .replace(/\#/g, "")
      .trim();

    nextPos = this.getUntil(
      pageLines,
      nextPos,
      " #Họ tên người mua hàng#(Customer's name)#:"
    ).nextPos;

    lineTmp = this.getUntil(pageLines, nextPos, "#Mã số thuế#(TAX code)#:");
    nextPos = lineTmp.nextPos;
    result.buyer.companyName = this.getBehind(lineTmp.strResult, ":")
      .replace("#Tên đơn vị#(Company's name)#", "")
      .replace(/\#/g, "")
      .trim();

    result.buyer.taxCode = pageLines[nextPos]
      .replace("#Mã số thuế#(TAX code)#:", "")
      .replace(/\#/g, "")
      .trim();

    return result;
  }
}
