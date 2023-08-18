import { injectable } from 'tsyringe';
import { Pool, PoolConnection, createPool } from 'mysql2/promise';
import { config } from './config';

// Cấu hình kết nối MySQL
const connectionConfig = {
  host: config.db.host,
  port:  config.db.port,
  user:  config.db.username,
  password:  config.db.password,
  database:  config.db.database
};

@injectable()
export class Database {
  private pool: Pool;

  constructor() {
    this.pool = createPool(connectionConfig);
  }

  public async query(sql: string, values: any[]): Promise<any> {
    let connection: PoolConnection | null = null;
    try {
      connection = await this.pool.getConnection();
      const [results] = await connection.query(sql, values);
      const [outParam] = await connection.query('SELECT @err_code, @err_msg');
      let err:any = outParam;
      if (err[0]['@err_code'] === 0) {
        return results;
      } else {
        throw new Error(err[0]['@err_msg']);
      } 
    } catch (error) {  
      throw error;      
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }
  public async queryList(sql: string, values: any[]): Promise<any> {
    let connection: PoolConnection | null = null;
    try {
      connection = await this.pool.getConnection();
      const [results] = await connection.query(sql, values);
      const [outParam] = await connection.query('SELECT @err_code, @err_msg');
      let err:any = outParam;
      if (err[0]['@err_code'] === 0) {
        return results;
      } else {
        throw new Error(err[0]['@err_msg']);
      } 
    } catch (error) {
      throw error;      
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }
}


