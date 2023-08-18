import { start } from "repl";
import { PageContent, TableContent } from "../../models/model";
import { PdfExtractor } from "../PDFExtractor";
//mag_tron
export class MInvoiceExtractor extends PdfExtractor {
    // private docLines: Promise<any[] | null>;
    protected rowRegex: RegExp =  /^(\d+.)+\d$/g;
    protected lineRegex: RegExp = /Bản thể hiện của hóa đơn điện tử|Mã của cơ quan thuế/g
    protected enTableRegex:RegExp = /Người mua hàng|None#Chuyển sang trang sau|Cộng tiền hàng hoá|Tổng tiền|Tiền thuế|Total amount|Total payment/g;
    constructor(fileContent: any) {
      super(fileContent);
      this.docLines = this.getDocLines();
    }
 
   
    protected getDate(str:string){
      let raw = str.match(/\d+/g);
      if (raw)
        return new Date(`${raw[1]}-${raw[0]}-${raw[2]}`);
      return new Date();
    }

    protected override getUntil(pageLines: string[], posPart: number, ending: string) {
        let result = "";
        let pos = posPart;
        for (let i = posPart; i < pageLines.length; i++) {
          if (pageLines[i].toLocaleLowerCase() == ending || pageLines[i].toLocaleLowerCase().startsWith(ending.toLocaleLowerCase())) {
            pos = i;
            break;
          } else result = result + pageLines[i] + " ";
        }
        return { strResult: result, nextPos: pos };
    }

    protected getByFilter(pageLines:string[], posPart: number, endingCondition: (x:string)=>boolean){
        let result = "";
        let pos = posPart;
        for (let i = posPart; i < pageLines.length; i++) {
            if (endingCondition(pageLines[i])) {
              pos = i;
              break;
            } else result = result + pageLines[i] + " ";
          }
        return { strResult: result, nextPos: pos };
    }

    protected renderPage(pageData: any): string {
        let render_options = {
          normalizeWhitespace: false,
          disableCombineTextItems: false,
        };
        let renderText = (textContent: any) => {
          let regex = /^[\d,.]+$/;
          let lastY,
            text = "";
          for (let item of textContent.items) {
            if (lastY == item.transform[5] || !lastY) {
              text += "#" + item.str;
            } else {
              text += "\n" + item.str;
            }
            lastY = item.transform[5];
          }
          return text;
        };
    
        return pageData.getTextContent(render_options).then(renderText);
    }

    protected simpyRow(raw:string[]){
      while(raw.length>5){
        let del = raw.splice(raw.length-2, 2);
        raw.push(del.join(" "));
      }
    }

    private processTableRow(rowStr: string){
      rowStr = rowStr.substring(0, rowStr.length-1).replace(/\s+/g, " ");
      rowStr = rowStr.replace(/\|/g, "#");
      let result = new TableContent();
      let raw = rowStr.split("#");
      if(raw[raw.length-1].match(/^[\d.,]+$/g))
        raw.splice(raw.length-1, 1);
      this.simpyRow(raw);
      result.total = parseFloat(raw[0].replace(/\./g, "").replace(/\,/g,"."));
      result.unit_price = parseFloat(raw[1].replace(/\./g, "").replace(/\,/g,"."));
      result.quantity = parseFloat(raw[2].replace(/\./g, "").replace(/\,/g,"."));
      result.unit = raw[3];
      result.product_name = raw[4].replace(/^[\d.]+ /, "");
      return result;
    }

    protected processInvoiceInfo(pageLines: string[], pageContent: PageContent){
      // let nextPos = this.getUntil(pageLines, 0, "#CÔNG TY").nextPos;
      let tmpLine = this.getByFilter(pageLines,0, (x:string)=> {  
          return x.toLowerCase().includes("số tài khoản") ||
                x.toLowerCase().includes("stk")
      });
      pageContent.buyer.companyName = tmpLine.strResult.replace(/\#/g, "").trim();

      let nextPos = this.getUntil(pageLines, tmpLine.nextPos, "Mã số thuế").nextPos;
      // tmpLine = this.getUntil(pageLines, nextPos,"CÔNG TY");
      tmpLine = this.getByFilter(pageLines, nextPos, (current:string)=>{
          return current.toLocaleLowerCase() == "công ty" || 
                 current.toLocaleLowerCase().startsWith("công ty") ||
                 current.toLocaleLowerCase() == "công#ty" || 
                 current.toLocaleLowerCase().startsWith("công#ty")
      });
      if(tmpLine.strResult.includes("#"))
        pageContent.seller.taxCode = this.getBehind(tmpLine.strResult,"#");
      else{
          let tmpTax = tmpLine.strResult.match(/\d+/);
          pageContent.seller.taxCode = tmpTax?tmpTax[0]:"";
      }
      nextPos = tmpLine.nextPos; // dang o cong ty
      pageContent.seller.companyName = pageLines[tmpLine.nextPos].replace(/\#/g, " ");
      tmpLine = this.getByFilter(pageLines,nextPos+1,(current:string)=> { // tu "congty" den "hoa don"
        return  current.toLocaleLowerCase() == "hóa đơn" || 
                current.toLocaleLowerCase().startsWith("hóa đơn")
      }); //hoas don
      if (tmpLine.strResult.includes("Mã số thuế")){
        tmpLine = this.getUntil(pageLines, nextPos+1, "số tài khoản")
        pageContent.buyer.taxCode = pageLines[tmpLine.nextPos+1];
        nextPos = this.getUntil(pageLines, tmpLine.nextPos, "ngày").nextPos;
        tmpLine = this.getUntil(pageLines, nextPos, "hóa đơn");
        pageContent.date = this.getDate(tmpLine.strResult);
      }
      if(pageLines[tmpLine.nextPos].toLowerCase() == "hóa đơn")
        tmpLine = this.getUntil(pageLines, tmpLine.nextPos, "giá trị gia tăng");
      pageContent.serial = pageLines[tmpLine.nextPos+1];
      pageContent.no = pageLines[tmpLine.nextPos+2];
      nextPos = this.getUntil(pageLines,nextPos+3, "(At):").nextPos+1; 
      if(!pageContent.date)
        pageContent.date = this.getDate(pageLines[nextPos]);
      nextPos = this.getUntil(pageLines, nextPos, "(Tax code):").nextPos;
      tmpLine = this.getUntil(pageLines,nextPos, "Mã số thuế");
      if(pageContent.buyer.taxCode == "" || pageContent.buyer.taxCode == null)
        pageContent.buyer.taxCode = this.getBehind(tmpLine.strResult,":");
      nextPos = tmpLine.nextPos;
      while(nextPos<pageLines.length-1){
          if(this.rowRegex.test(pageLines[nextPos])){
              break;
          } else nextPos++;
      }
      return nextPos;
    }

    protected processTable(pageLines:string[], startPos:number, pageContent:PageContent){
      let line = "";
      let endPos = startPos;
      for(let linePos = startPos; linePos<pageLines.length-1; linePos++){
          if (this.enTableRegex.test(pageLines[linePos]) || pageLines[linePos+1].includes("Amount in words")){
              endPos = linePos;
              break;
          }
          if (this.rowRegex.test(pageLines[linePos])) {
              if(line != "") {
                  if(!this.lineRegex.test(line))
                    pageContent.table.push(this.processTableRow(line));
                  line = "";
              }
          } 
          line = line + pageLines[linePos] + "|";
      }
        
      if(!this.enTableRegex.test(line) && line.trim() != "" && line.split("|").length>2){
        pageContent.table.push(this.processTableRow(line));
      }
      return endPos;
    }

    protected override processPage(pageLines: string[]){
        let result = new PageContent();
        // try {
          let nextPos = this.processInvoiceInfo(pageLines, result);
          // this.processTable(pageLines, nextPos, result);
        // } catch(TypeError) {
          // let nextPos = this.processInvoiceInfo(pageLines, result);
          this.processTable(pageLines, nextPos, result);
        // }
        return result;
    }
    
}