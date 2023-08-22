import * as fs from "fs";
import { injectable } from "tsyringe";
import { Database } from "../config/database";
import { Extractors } from "../config/extractor";
import { pdfSupplier } from "../config/invoice-supplier";
import { ExtractorService } from "../extractor/ExtractorService";
import { PdfExtractor } from "../extractor/PDFExtractor";

@injectable()
export class PdfRepository {
  constructor(private db: Database) {}

  private getSupplier(info: any) {
    for (let supplier of pdfSupplier) {
      let regex = RegExp(supplier.Producer);
      if (
        regex.test(info.Producer) ||
        info.Producer == supplier.Producer ||
        info.Producer.includes(supplier.Producer)
      ) {
        return supplier.Fournisseur;
      }
    }
    return null;
  }

  private async getResult(processor: any, fileName: string) {
    let data = await processor.getResult();
    data.path = fileName;
    data.file_name = fileName.substring(
      fileName.lastIndexOf("/") + 1,
      fileName.length
    );
    return data;
  }

  async process(listFileName: string[]): Promise<any> {
    let result: any = [];
    for (let fileName of listFileName) {
      let fileConent = await fs.readFileSync(fileName);
      let info = await PdfExtractor.getInfo(fileConent);
      let supplier = this.getSupplier(info);
      console.log(supplier);
      if (supplier == null) {
        throw new Error(
          `Định dạng file: ${fileName.substring(
            fileName.lastIndexOf("/") + 1,
            fileName.length
          )} không được hỗ trợ`
        );
      } else {
        let extractService = new ExtractorService(supplier, Extractors);
        let extractor = await extractService.getExtractor(fileConent);
        while (extractor != null) {
          try {
            result.push(await this.getResult(extractor, fileName));
            break;
          } catch (TypeError) {
            extractor = extractService.next(fileConent);
          }
        }
        if (!extractor) throw new Error("Định dạng file không được hỗ trợ");
      }
    }
    return result;
  }

  async checkVATExists(vat_invoice_ids: any) {
    try {
      const sql = "CALL CheckVATExists(?, @err_code, @err_msg)";
      const [results] = await this.db.query(sql, [
        JSON.stringify(vat_invoice_ids),
      ]);
      return results;
    } catch (error: any) {
      throw new Error(error.message);
    }
  }
}
