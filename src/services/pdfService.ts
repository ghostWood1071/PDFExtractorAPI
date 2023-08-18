import { injectable } from 'tsyringe';
import { PdfRepository } from '../repositories/pDFRepository';

@injectable()
export class PDFService {
  constructor(private pdfRespository:PdfRepository) {}

  async process(listFileName:string[]):Promise<any> {
    return this.pdfRespository.process(listFileName);
  }
  async checkVATExists(vat_invoice_ids: any){
    return this.pdfRespository.checkVATExists(vat_invoice_ids);
  }
}