import { PageContent, PagePart, TableContent } from "../../models/model";
import { PdfExtractor } from "../PDFExtractor";

export class ThreeAInvoiceExtractor extends PdfExtractor {
  constructor(fileContent: any) {
    super(fileContent);
    this.docLines = this.getDocLines();
  }

  private processDate(dataStr: string): Date {
    return new Date(
      dataStr.trim().replace(/\#/g, "").split(/\D+/g).reverse().join("-")
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

  protected override processPage(pageLines: string[]) {
    let result = new PageContent();

    let lineTmp = this.getUntil(pageLines, 0, "Mã số thuế");
    let nextPos = lineTmp.nextPos;

    lineTmp = this.getUntil(pageLines, nextPos, "Hình thức thanh toán");
    nextPos = lineTmp.nextPos;

    result.buyer.taxCode = lineTmp.strResult
      .replace("Mã số thuế#", "")
      .trim()
      .split(" ")
      .join("");

    lineTmp = this.getUntil(pageLines, ++nextPos, "Họ tên người mua hàng");
    nextPos = lineTmp.nextPos;

    result.buyer.companyName = lineTmp.strResult.trim();

    nextPos = this.getUntil(pageLines, ++nextPos, "Số tài khoản").nextPos;
    nextPos = this.getUntil(pageLines, ++nextPos, "Số").nextPos;

    lineTmp = this.getUntil(pageLines, ++nextPos, "Ký hiệu");
    nextPos = lineTmp.nextPos;

    result.no = lineTmp.strResult.trim();

    lineTmp = this.getUntil(pageLines, ++nextPos, "Mẫu số");
    nextPos = lineTmp.nextPos;

    let strTmp = lineTmp.strResult.split(" ");
    strTmp.pop();
    strTmp.pop();

    result.serial = strTmp.join();

    lineTmp = this.getUntil(pageLines, ++nextPos, "#Mã số thuế");
    nextPos = lineTmp.nextPos;

    result.seller.taxCode = pageLines[nextPos].replace("#Mã số thuế", "");

    lineTmp = this.getUntil(pageLines, ++nextPos, "6 = 4 x 5#5#4#3#2#1");
    nextPos = lineTmp.nextPos;

    result.seller.companyName = lineTmp.strResult.trim();

    nextPos = this.getUntil(pageLines, nextPos, "(day)").nextPos;

    lineTmp = this.getUntil(
      pageLines,
      ++nextPos,
      "(HÓA ĐƠN CHUYỂN ĐỔI TỪ HÓA ĐƠN ĐIỆN TỬ)"
    );
    result.date = this.processDate(lineTmp.strResult);

    let rowRegex = /^\d+(\,\d+)*\#+\d+(\,\d+)*\#+\d+(\,\d+)*/;

    while (!rowRegex.test(pageLines[nextPos]) && nextPos < pageLines.length) {
      nextPos++;
    }

    if (nextPos <= pageLines.length) {
      while (rowRegex.test(pageLines[nextPos]) && nextPos <= pageLines.length) {
        let arr = pageLines[nextPos].split("#");
        arr.pop();
        let newTableContent: TableContent = new TableContent();
        newTableContent.total = +arr[0].replace(/\,/g, "");
        newTableContent.unit_price = +arr[1].replace(/\,/g, "");
        newTableContent.quantity = +arr[2].replace(/\,/g, "");
        newTableContent.unit = arr[3];
        newTableContent.product_name = arr[4];

        result.table.push(newTableContent);
        nextPos++;
      }
    }

    return result;
  }
}
