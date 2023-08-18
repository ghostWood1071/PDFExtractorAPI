export class PageContent {
  file_name: string = "";
  path:string = "";
  date: Date = new Date();
  serial: string = "";
  no: string = "";
  vat_rate: any = null;
  exchange_rate:any = null;
  seller: any = {
    companyName: "",
    taxCode: "",
  };
  buyer: any = {
    companyName: "",
    taxCode: "",
  };
  table: TableContent[] = [];
}

export class TableContent {
  sort_order: number = 0;
  product_id:string = "";
  product_name: string = "";
  unit: string = "";
  quantity: number = 0;
  unit_price: number = 0;
  total: number = 0;
}

export enum PagePart {
  NONE,
  DATE,
  SERIAL,
  NO,
  EXCHANGE_RATE,
  SELLER_COMPANY_NAME,
  SELLER_TAX_CODE,
  BUYER_COMPANY_NAME,
  BUYER_TAX_CODE,
  TABLE,
}
