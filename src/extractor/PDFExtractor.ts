import * as fs from "fs";
import { invalid } from "moment";
import { MethodNotImplementedError, PDFDocument, PDFPage } from "pdf-lib";
import PdfParse from "pdf-parse";
import { EncodeDict } from "../config/encode-dict";
import { PageContent, TableContent } from "../models/model";

export interface IExtractable {
  extractInfo(): any;
  extractBuyer(): any;
  extractSeller(): any;
  extractTable(): any;
  getResult(): any;
}

export class PdfExtractor {
  protected fileContent: any;
  private extracted: any;
  protected docLines!: Promise<any[] | null>;
  private encodeRegex: RegExp;
  protected encodeMap: Map<string, string>;
  private productCount: number = 1;
  private infoCheck: RegExp =
    /[:\(\)\.\,]|[ÁÀẠÃẢẮẰẲẶẴẤẦẬẨẪĐÓÒỎỌÕÔỐỒỔỘỖƠỚỜỞỢỠĂƯỨỪỬỰỮÚÙỦỤŨÂÊẾỀỂỆỄÉÈẺẸẼÝỲỶỴỸÍÌỈỊĨ]/g;
  constructor(fileConent: any) {
    this.fileContent = fileConent;
    this.encodeRegex = this.getEncodeRegex(EncodeDict);
    this.encodeMap = this.getEncodeMap(EncodeDict);
  }

  static async getInfo(fileContent: any): Promise<any> {
    let parser = await PdfParse(fileContent);
    return parser.info;
  }

  static async getMetadata(fileContent: any): Promise<any> {
    let parser = await PdfParse(fileContent);
    return parser.metadata;
  }

  private getEncodeRegex(dict: any) {
    let arrKey: string[] = [];
    for (let key in dict) {
      arrKey.push(key);
    }
    let rawStrRegex = arrKey.join("|");
    return new RegExp(rawStrRegex, "g");
  }

  private getEncodeMap(object: any) {
    const map = new Map<string, string>();
    for (const key in object) {
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        map.set(key, object[key]);
      }
    }

    return map;
  }

  private removeEncoding(str: string) {
    let allMatch = str.match(this.encodeRegex) || [];
    for (let match of allMatch) {
      str = str.replace(
        new RegExp(match, "g"),
        this.encodeMap.get(match) || ""
      );
    }
    return str;
  }

  private refactorTable(page: PageContent) {
    for (let row of page.table) {
      row.sort_order = this.productCount++;
      row.product_name = this.removeEncoding(row.product_name);
      row.unit = this.removeEncoding(row.unit);
    }
  }

  protected getUntil(pageLines: string[], posPart: number, ending: string) {
    let result = "";
    let pos = posPart;
    for (let i = posPart; i < pageLines.length; i++) {
      if (pageLines[i] == ending || pageLines[i].startsWith(ending)) {
        pos = i;
        break;
      } else result = result + pageLines[i] + " ";
    }
    // result = this.getBehind(result.trim(), ":")
    return { strResult: result, nextPos: pos };
  }

  protected getByFilter(
    pageLines: string[],
    posPart: number,
    endingCondition: (x: string) => boolean
  ) {
    let result = "";
    let pos = posPart;
    for (let i = posPart; i < pageLines.length; i++) {
      if (endingCondition(pageLines[i])) {
        pos = i;
        break;
      } else result = result + pageLines[i] + " ";
    }
    return { strResult: result, nextPos: pos };
  }

  protected getBehind(input: string, split: string) {
    return input.split(split)[1].trim();
  }

  protected renderPage(pageData: any): string {
    //check documents https://mozilla.github.io/pdf.js/
    let render_options = {
      //replaces all occurrences of whitespace with standard spaces (0x20). The default value is `false`.
      normalizeWhitespace: false,
      //do not attempt to combine same line TextItem's. The default value is `false`.
      disableCombineTextItems: false,
    };

    let renderText = (textContent: any) => {
      //fs.writeFileSync('lol.json', JSON.stringify(textContent));
      let regex = /^[\d,.]+$/;
      let lastY,
        text = "";
      for (let item of textContent.items) {
        if (lastY == item.transform[5] || !lastY) {
          if (regex.test(item.str)) text += "#" + item.str;
          else text += item.str;
        } else {
          text += "\n" + item.str;
        }
        lastY = item.transform[5];
      }
      return text;
    };

    return pageData.getTextContent(render_options).then(renderText);
  }

  protected async getDocLines() {
    try {
      let data = this.extracted ? this.extracted : await this.extractPDF();
      let textPageArr: string[] = data.textPages;
      let result: any[] = [];
      for (let textPage of textPageArr) {
        result.push(textPage.split("\n"));
      }
      return result;
    } catch (e: any) {
      console.log(e);
      return null;
    }
  }

  protected async getPageBuffer(document: PDFDocument, pageNum: number) {
    try {
      let newDoc = await PDFDocument.create();
      let [page] = await newDoc.copyPages(document, [pageNum]);
      newDoc.addPage(page);
      let buffArr = await newDoc.save();
      let buff = Buffer.from(buffArr);
      return buff;
    } catch (err: any) {
      console.log(err);
      return null;
    }
  }

  protected async getTextInPages(document: PDFDocument) {
    let pageText: string[] = [];

    for (let pageNum = 0; pageNum < document.getPageCount(); pageNum++) {
      let pageBuff = await this.getPageBuffer(document, pageNum);
      if (!pageBuff) continue;
      let parser = await PdfParse(pageBuff, {
        pagerender: await this.renderPage,
      });
      pageText.push(parser.text);
    }
    return pageText;
  }

  protected async extractTotal(totalStr: string) {
    let totalObj: any = {
      unit: "",
      quantity: 0,
      unitPrice: 0,
      total: 0,
    };

    let splitString: string[] = totalStr.split(/(\d+)/);

    totalObj.unit = splitString[0];

    splitString = splitString.slice(1, splitString.length - 1);

    splitString = splitString.filter((x) => x != ".");

    const l = splitString.length;
    let total: string = "";
    let unitPrice: string = "";
    while (splitString.length > 0) {
      let x = splitString.pop();
      if (x != null) {
        if (splitString[splitString.length - 1] == ",") {
          unitPrice = splitString.pop() + x.slice(0, 2);
          totalObj.total = +(x.slice(2) + total);
          break;
        } else if (x.length == 3) {
          total = x + total;
        } else if (x.length > 3) {
          unitPrice = x.slice(0, 3);
          total = x.slice(3) + total;
          totalObj.total = +total;
          break;
        }
      }
    }

    while (splitString.length > 0) {
      let x = splitString.pop();
      if (x != null) {
        if (splitString.length >= 1) {
          if (splitString[splitString.length - 1] == ",") {
            totalObj.quantity = parseFloat(
              (splitString.join("") + x.slice(0, 2)).replace(",", ".")
            );
            totalObj.unitPrice = parseFloat(
              (x.slice(2) + unitPrice).replace(",", ".")
            );

            return totalObj;
          } else if (x.length == 3) {
            unitPrice = x + unitPrice;
          } else if (x.length > 3) {
            let quantity = x.slice(0, 3);
            unitPrice = x.slice(3) + unitPrice;

            totalObj.unitPrice = parseFloat(unitPrice.replace(",", "."));
            totalObj.quantity = parseFloat(
              (splitString.join("") + quantity).replace(",", ".")
            );
            return totalObj;
          }
        } else {
          for (let i = 1; i <= 3; i++) {
            let j = x.length - i;
            if (j >= 1 && j <= 3) {
              let quantity: number = +x.slice(0, i);
              let unitPriceTmp: number = +(x.slice(i) + unitPrice);
              if (quantity * unitPriceTmp == totalObj.total) {
                totalObj.quantity = quantity;
                totalObj.unitPrice = unitPriceTmp;

                return totalObj;
              }
            }
          }
        }
      }
    }

    return null;
  }

  protected processPage(pageLines: string[]): PageContent {
    throw new Error("Method not implemented.");
  }

  async extractPDF() {
    try {
      let pdfDoc = await PDFDocument.load(this.fileContent);
      let pageTextArr = await this.getTextInPages(pdfDoc);
      // let docInfo = await this.getDocInfo();
      this.extracted = {
        textPages: pageTextArr,
        supplier: null,
      };
      return this.extracted;
    } catch (error: any) {
      throw new Error(error.message);
    }
  }

  async saveRaw(fileName: string) {
    try {
      let data = this.extracted ? this.extracted : await this.extractPDF();
      await fs.writeFileSync(fileName, JSON.stringify(data));
    } catch (e: any) {
      console.log(e);
    }
  }

  async saveRawText(fileName: string) {
    try {
      let data: any = this.extracted ? this.extracted : await this.extractPDF();
      let textArray = data.textPages;
      for (let i = 0; i < textArray.length - 1; i++) {
        await fs.writeFileSync(`${fileName}-${i}.txt`, textArray[i]);
      }
    } catch (e: any) {
      console.log(e);
    }
  }

  private checkInfo(data: PageContent) {
    if (
      data.date == null ||
      isNaN(data.date.getTime()) ||
      this.infoCheck.test(data.serial) ||
      this.infoCheck.test(data.no) ||
      data.no == "" ||
      data.serial == ""
    ) {
      throw new TypeError("next");
    }
  }

  public async getResult() {
    let pageLines = await this.docLines;
    if (pageLines) {
      if (pageLines.length == 1) {
        let data = this.processPage(pageLines[0]);
        this.checkInfo(data);
        this.refactorTable(data);
        if (data.table.length == 0)
          throw new TypeError("Định dạng file không được hỗ trợ");
        console.log("table count: " + data.table.length);
        return data;
      } else {
        let result: PageContent = this.processPage(pageLines[0]);
        this.checkInfo(result);
        for (let pageNum = 1; pageNum < pageLines.length; pageNum++) {
          let tmpPage: PageContent = this.processPage(pageLines[pageNum]);
          result.exchange_rate = tmpPage.exchange_rate
            ? tmpPage.exchange_rate
            : result.exchange_rate;
          result.vat_rate =
            tmpPage.vat_rate != 0 || tmpPage.vat_rate != null
              ? tmpPage.vat_rate
              : result.vat_rate;
          result.table = result.table.concat(tmpPage.table);
        }
        this.refactorTable(result);
        if (result.table.length == 0)
          throw new TypeError("Định dạng file không được hỗ trợ");
        console.log("table count: " + result.table.length);
        return result;
      }
    } else {
      throw new Error("Không thể đọc file PDF");
    }
  }
}
