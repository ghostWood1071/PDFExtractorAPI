import { PageContent, TableContent } from "../../models/model";
import { VNPInvoiceExtractor } from "./VNPTInvoiceExtractor";

export class VNPT3Extractor extends VNPInvoiceExtractor {
    protected rowRegex:RegExp = /^[\d.,]+#/;
    protected endTableRegex:RegExp = /1\#2\#3\#4\#    5    \#6=4x5/g;

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
        let arrKeys = Array.from(textMap.keys()).sort((x,y)=> x-y);
        for(let key of arrKeys){
          text+= textMap.get(key)?.sort((x,y)=>x.transform[4]-y.transform[4]).map(x=>x.str).join("#") + "\n";
        }
        return text;
      };
      return pageData.getTextContent(render_options).then(renderText);
    }

    protected override processTableRow(line: string): TableContent {
      // console.log(line);
        let result = new TableContent();
        if(line.endsWith("#"))
            line = line.substring(0, line.length-1);
        let raw = line.split("#");
        result.sort_order = Number(raw[0]);
        result.product_name = raw[1];
        result.unit = raw[2];
        result.quantity = parseFloat(raw[3].replace(/\./g, "").replace(/\,/, "."));
        result.unit_price= parseFloat(raw[4].replace(/\./g, "").replace(/\,/, "."));
        result.total = parseFloat(raw[5].replace(/\./g, "").replace(/\,/, "."));
        return result;
    }


    protected override processPage(pageLines: string[]): PageContent {
        let result = new PageContent();
        let nextPos =  this.getUntil(pageLines, 0, "Tổng tiền hàng").nextPos;
        for(nextPos; nextPos<pageLines.length; nextPos++){
          if(this.rowRegex.test(pageLines[nextPos]))
            break;
        }
        let line = "";
        
        for(nextPos; nextPos<pageLines.length; nextPos++){
            if (this.endTableRegex.test(pageLines[nextPos])){
                break;
            }
            if (this.rowRegex.test(pageLines[nextPos])) {
                if(line != "") {
                    
                    result.table.unshift(this.processTableRow(line));
                    line = "";
                }
            } 
            line = line + pageLines[nextPos]+"#";
            
        }
        if(this.rowRegex.test(line))
            result.table.unshift(this.processTableRow(line));


        nextPos = this.getUntil(pageLines, nextPos, "Địa chỉ").nextPos;
        let lineTmp = this.getUntil(pageLines,nextPos,"Mã số thuế");
        result.buyer.taxCode = this.getBehind(lineTmp.strResult, ":");
        lineTmp = this.getUntil(pageLines,lineTmp.nextPos, "Tên đơn vị mua hàng");
        result.buyer.companyName = this.getBehind(lineTmp.strResult, ":").replace(/\#/g, "");
        nextPos = this.getUntil(pageLines, lineTmp.nextPos, "Địa chỉ").nextPos;
        lineTmp = this.getUntil(pageLines, nextPos, "Mã số thuế");
        result.seller.taxCode = this.getBehind(lineTmp.strResult, ":");
        lineTmp = this.getUntil(pageLines,lineTmp.nextPos, "Tên đơn vị bán hàng");
        result.seller.companyName = this.getBehind(lineTmp.strResult,":").replace(/\#/g, "");;
        nextPos = this.getUntil(pageLines, lineTmp.nextPos, "Số").nextPos;
        lineTmp = this.getUntil(pageLines, nextPos, "Ngày");
        result.no = this.getBehind(lineTmp.strResult, ":").replace(/\#/g, "");
        lineTmp = this.getUntil(pageLines, lineTmp.nextPos, "Ký hiệu");
        result.date = this.getDate(lineTmp.strResult);
        result.serial = this.getBehind(pageLines[lineTmp.nextPos], ":").replace(/\#/, "");
        return result;
    }
}