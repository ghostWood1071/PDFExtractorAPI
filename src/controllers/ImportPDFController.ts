import { Request, Response } from 'express';
import { injectable } from "tsyringe";
import { PDFService } from '../services/pdfService';
import { MapVatPdfService } from '../services/pdfMapService';

@injectable()
export class ImportXMLController {
  constructor(private importService: PDFService, private mapVatPdfService: MapVatPdfService) { }

  async mapPDF(req: Request, res: Response): Promise<void> {
    try {
        if(!req.files)
            throw new Error("File không tồn tại");
        if(Array.isArray(req.files)){
            let results = [];
            let data = await this.importService.process(req.files.map(x=>x.path));
            if(data && data.length > 0) {           
              for (const vat of data) {
                let _vat = JSON.stringify(vat);
                var re = /\\\\/gi;  
                _vat = _vat.replace(re, "/"); 
                let mapvat = await this.mapVatPdfService.mapVatPdf(_vat);                
                results.push(mapvat.pdfjson);
              } 
            }
            res.json(results);
        }
    } catch (error: any) {
      res.json({ message: error.message, results: false });
    }
  }

  async importPDF(req: Request, res: Response): Promise<void> {
    try {
        if(!req.files)
            throw new Error("File không tồn tại");
        if(Array.isArray(req.files)){            
            let data = await this.importService.process(req.files.map(x=>x.path));            
            res.json(data);
        }
    } catch (error: any) {
      console.error('Error occurred at line:', error.stack);
      res.json({ message: error.message, results: false });
    }
  }

  async getMaterialSuggest(req: Request, res: Response): Promise<void> {
    try {
      const object = req.body as {customer_id:any, material_name:any};
      const data = await this.mapVatPdfService.getMaterialSuggest(object.customer_id,object.material_name);
      if (data && data.length > 0) {
        res.json(data);
      } else {
        res.json({ message: 'Không có dữu liệu được gợi ý!' });
      }
    } catch (error: any) {
      res.json({ message: error.message , results: false});
    }
  }

  async checkVATExists(req:Request, res:Response): Promise<void> {
    try {
      const object = req.body as {vat_invoice_ids:any};
      const data = await this.importService.checkVATExists(object.vat_invoice_ids);
      if (data && data.length > 0) {
        res.json(data);
      } else {
        res.json([]);
      }
    } catch (error: any) {
      res.json({ message: error.message , results: false});
    }
  }
}
