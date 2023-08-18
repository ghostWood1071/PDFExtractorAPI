import { injectable } from 'tsyringe';
import { Database } from '../config/database';

@injectable()
export class MapVatPdfRepository {
  constructor(private db: Database) { }  
   async mapVatPdf(pdfjson: any): Promise<any> {
    try {
      const sql = 'CALL MapVatPdf(?, @err_code, @err_msg)';
      const [results] = await this.db.query(sql, [pdfjson]);
      if (Array.isArray(results) && results.length > 0) {
        return results[0];
      } 
      return null; 
    } catch (error:any) {
      throw new Error( error.message);
    }
  }

  async getMaterialSuggest(customer_id:any, material_name:any): Promise<any> {
    try {
      const sql = 'CALL MaterialSuggest(?,?,@err_code, @err_msg)';
      const [results] = await this.db.query(sql, [customer_id, material_name]);
      return results;
    } catch (error:any) {
      throw new Error( error.message);
    }
  }
}