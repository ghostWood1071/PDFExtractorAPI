import { PageContent, TableContent } from "../../models/model";
import { PdfExtractor } from "../PDFExtractor";

export class VisnamExtractor extends PdfExtractor {
    protected rowRegex = /^\d+\#/;
    protected endTableRegex = /^Theo PO \d+$/;
    constructor(fileContent: any) {
        super(fileContent);
        this.docLines = this.getDocLines();
    }

    protected renderPage(pageData: any): string {
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
            for(let key of textMap.keys()){
              text+= textMap.get(key)?.sort((x,y)=>x.transform[4]-y.transform[4]).map(x=>x.str).join("#") + "\n";
            }
            return text;
          };
          return pageData.getTextContent(render_options).then(renderText);
    }

    protected getDate(str:string){
        let raw = str.match(/\d+/g);
        if (raw)
          return new Date(`${raw[1]}-${raw[0]}-${raw[2]}`);
        return new Date();
    }

    private simplifyRow(row:string[]){
        while(row.length>5){
           let del = row.splice(row.length-2, 2).join(" ");
           row.push(del);
        }
    }

    private processTableRow(row:string):TableContent{
        let result = new TableContent();
        row = row.replace(/\#$/g, "").replace(/^\d+#/g,"");
        let data = row.split("#");
        this.simplifyRow(data);
        result.unit = data[0];
        result.quantity = Number(data[1].replace(/\./g, "").replace(/\,/g,"."));
        result.unit_price = Number(data[2].replace(/\./g, "").replace(/\,/g,"."));
        result.total = Number(data[3].replace(/\./g, "").replace(/\,/g,"."));
        result.product_name = data[4].replace(/\s\s/g," ");
        return result;
    }

    protected processPage(pageLines: string[]): PageContent {
        let result = new PageContent();
        if(pageLines.length<=4)
            return result;
        let nextPos = this.getUntil(pageLines, 0, "Ký hiệu").nextPos;
        let tmpLine = this.getUntil(pageLines, nextPos, "Số#");
        result.serial = this.getBehind(tmpLine.strResult, ":")
                            .replace(/\#/g, "")
                            .trim();
        
        tmpLine = this.getUntil(pageLines, tmpLine.nextPos, "Đơn vị bán hàng");
        result.no = this.getBehind(tmpLine.strResult, ":")
                        .replace(/\#/g, "")
                        .trim();
        
        tmpLine = this.getUntil(pageLines, tmpLine.nextPos, "Mã số thuế");
        result.seller.companyName = this.getBehind(tmpLine.strResult, ":")
                                        .replace(/\#/g, "")
                                        .replace(/\s\s/, " ")
                                        .trim()
        tmpLine = this.getUntil(pageLines, tmpLine.nextPos, "Địa chỉ");
        result.seller.taxCode = this.getBehind(tmpLine.strResult, ":")

        nextPos = this.getUntil(pageLines, tmpLine.nextPos, "Tên đơn vị").nextPos;
        tmpLine = this.getUntil(pageLines, nextPos, "Địa chỉ");
        result.buyer.companyName = this.getBehind(tmpLine.strResult, ":")
                                       .replace(/\#/g,"").trim();

        nextPos = this.getUntil(pageLines, tmpLine.nextPos, "Mã số thuế").nextPos;
        tmpLine = this.getUntil(pageLines, nextPos, "Hình thức thanh toán");
        result.buyer.taxCode = this.getBehind(tmpLine.strResult, ":").replace(/\#/g, "");

        nextPos = this.getUntil(pageLines, tmpLine.nextPos, "Ngày#").nextPos;
        tmpLine = this.getUntil(pageLines, nextPos, "STT#");
        result.date = this.getDate(tmpLine.strResult);
        
        nextPos = this.getUntil(pageLines, tmpLine.nextPos, "(1)#(2)#(3)#").nextPos;
        nextPos++;
        let line = "";
        for(nextPos; nextPos<pageLines.length; nextPos++){
            if(pageLines[nextPos] == "" || this.endTableRegex.test(pageLines[nextPos]))
                break;
            if(this.rowRegex.test(pageLines[nextPos])){
                if(line != ""){
                    result.table.push(this.processTableRow(line))
                    line = "";
                }
            }
            line += pageLines[nextPos]+"#";
        }
        if(this.rowRegex.test(line))
            result.table.push(this.processTableRow(line));

        return result;
    }
}