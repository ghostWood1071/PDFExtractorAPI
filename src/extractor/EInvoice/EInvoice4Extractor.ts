import { PageContent, TableContent } from "../../models/model";
import { PdfExtractor } from "../PDFExtractor";

export class EInvoice4Extractor extends PdfExtractor {
    protected rowRegex:RegExp = /^[\d.,]+#/;
    protected endTableRegex:RegExp = /Người mua hàng/g;

    constructor(fileContent: any) {
        super(fileContent);
        this.docLines = this.getDocLines();
    }
    protected override renderPage(pageData: any): string {
        let render_options = {
            normalizeWhitespace: false,
            disableCombineTextItems: false,
          };
      
          let renderText = (textContent: any) => {
            let text = "";
            let textMap: Map<number, any[]> = new Map<number, any[]>();
            for (let item of textContent.items) {
              let itemMap = textMap.get(item.transform[5]);
              if(itemMap){
                itemMap.push(item);
              } else{
                textMap.set(item.transform[5], [item]);
              }
            }
            let arrKeys = Array.from(textMap.keys())//.sort((x,y)=> x-y);
            for(let key of arrKeys){
              text+= textMap.get(key)?.sort((x,y)=>x.transform[4]-y.transform[4]).map(x=>x.str).join("#") + "\n";
            }
            return text;
          };
          return pageData.getTextContent(render_options).then(renderText);
    }
    private getDate(str: string){
        let raw = str.match(/\d+/g);
        if(raw)
            return new Date(`${raw[1]}-${raw[0]}-${raw[2]}`);
        else
            return new Date();
    }
    private simplifyRow(raw:string[]){
        while(raw.length>5){
            let del = raw.splice(raw.length-2, 2); 
            raw.push(del.join(""));
        }
    }
    private processTableRow(line: string): TableContent {
        let result = new TableContent();
        if(line.endsWith("#"))
            line = line.substring(0, line.length-1);
        line = line.replace(/^[\d\,\.]+\#/, "");
        let raw = line.split("#");
        if(raw[1].match(/^[\d\.\,]+$/g)){
            this.simplifyRow(raw);
            result.product_name = raw[4];
            result.unit = raw[0];
            result.quantity = parseFloat(raw[1].replace(/\./g, "").replace(/\,/, "."));
            result.unit_price= parseFloat(raw[2].replace(/\./g, "").replace(/\,/, "."));
            result.total = parseFloat(raw[3].replace(/\./g, "").replace(/\,/, "."));
        } else {
            result.product_name = raw[0];
            result.unit = raw[1];
            result.quantity = parseFloat(raw[2].replace(/\./g, "").replace(/\,/, "."));
            result.unit_price= parseFloat(raw[3].replace(/\./g, "").replace(/\,/, "."));
            result.total = parseFloat(raw[4].replace(/\./g, "").replace(/\,/, "."));
        }
        return result;
    }


    protected override processPage(pageLines: string[]): PageContent {
        let result = new PageContent();
        if(pageLines.length<=3)
            return result;
        let nextPos = this.getUntil(pageLines, 0, "Đơn vị bán hàng").nextPos;
        let tmpLine = this.getUntil(pageLines, nextPos, "Mã số thuế");
        result.seller.companyName = this.getBehind(tmpLine.strResult, ":").replace(/\#/g, "");
        tmpLine = this.getUntil(pageLines,tmpLine.nextPos, "Địa chỉ");
        result.seller.taxCode = this.getBehind(tmpLine.strResult, ":").replace(/\#/g, "");
        nextPos = this.getUntil(pageLines, tmpLine.nextPos, "Tên đơn vị").nextPos;
        tmpLine = this.getUntil(pageLines,nextPos, "Mã số thuế");
        result.buyer.companyName = this.getBehind(tmpLine.strResult, ":").replace(/\#/g, "");
        tmpLine = this.getUntil(pageLines,tmpLine.nextPos, "Địa chỉ");
        result.buyer.taxCode = this.getBehind(tmpLine.strResult, ":").replace(/\#/g, "");
        nextPos = this.getUntil(pageLines, tmpLine.nextPos, "Ký hiệu").nextPos;
        tmpLine = this.getUntil(pageLines, nextPos, "(BẢN THỂ HIỆN");
        result.serial = this.getBehind(tmpLine.strResult, ":").replace(/\#/, "");
        tmpLine = this.getUntil(pageLines,tmpLine.nextPos, "Điện thoại");
        result.no = this.getBehind(tmpLine.strResult, ":").replace(/\#/g, "");
        nextPos = this.getUntil(pageLines,tmpLine.nextPos, "Ngày").nextPos;
        tmpLine = this.getUntil(pageLines,nextPos, "STT");
        result.date = this.getDate(tmpLine.strResult);
        nextPos = this.getUntil(pageLines, tmpLine.nextPos, "1#2#3#4#5#6").nextPos+1;
        let line = "";
        for(nextPos; nextPos<pageLines.length; nextPos++){
            if (this.endTableRegex.test(pageLines[nextPos])){
                break;
            }
            if (this.rowRegex.test(pageLines[nextPos])) {
                if(line != "") {
                    result.table.push(this.processTableRow(line));
                    line = "";
                }
            } 
            line = line + pageLines[nextPos]+"#";
            
        }
        if(this.rowRegex.test(line))
            result.table.push(this.processTableRow(line));
        return result;
    }

    
}
