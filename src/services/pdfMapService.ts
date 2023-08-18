import { injectable } from 'tsyringe';
import { MapVatPdfRepository } from '../repositories/pdfMapRepository';

@injectable()
export class MapVatPdfService {
  constructor(private mapVatPdfRepository: MapVatPdfRepository
  ) {}

  async mapVatPdf(pdfjson: any): Promise<any> {
    return this.mapVatPdfRepository.mapVatPdf(pdfjson);
  }

  async getMaterialSuggest(customer_id:any, material_name:any): Promise<any> {
    return this.mapVatPdfRepository.getMaterialSuggest(customer_id,material_name);
  }

}