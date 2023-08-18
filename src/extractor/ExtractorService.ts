import { CyberLotusExtractor } from "../extractor/Cyberlotus/CYBERLOTUSExtractor";
import { PdfExtractor } from "./PDFExtractor";

export class ExtractorService {
    private supplier:string;
    private extractorDict:any;
    private currentExtractor: any[] = [];
    private extractorIndex = 0;
    constructor(supplier: string, extractors:any){
        this.supplier = supplier;
        this.extractorDict = extractors;
    }

    private createExtractor(className:any, args:any){
        console.log(className)
        if(className!=null || className!=undefined)
            return new className(args);
        else throw new Error("Định dạng file không được hỗ trợ");
    }

    public async getExtractor(fileContent:any) {
        if (this.supplier == "M-Invoice") {
            let meta = await PdfExtractor.getMetadata(fileContent);
            if(meta['xmpmm:documentid']){
              return this.createExtractor(this.extractorDict["M-Invoice2"], fileContent);
            } else { // M-Invoice
                this.currentExtractor = this.extractorDict[this.supplier];
                return this.createExtractor(this.currentExtractor[0], fileContent);
            }
        } else if (this.supplier == "CYBERLOTUS") {
            let info = await PdfExtractor.getInfo(fileContent);
            if (info.Creator.includes("Windows NT 6.1")){
                return  this.createExtractor(this.extractorDict[this.supplier][0], fileContent);
            }else {
                return this.createExtractor(this.extractorDict["VNPT2"], fileContent);
            }
        }
        else {
            let extractorName =  this.extractorDict[this.supplier];
            if(Array.isArray(extractorName)){
                this.currentExtractor = extractorName;
                return this.createExtractor(this.currentExtractor[this.extractorIndex], fileContent);
            } else {
                return this.createExtractor(extractorName,fileContent);
            }
        }
    }

    public next(fileContent:any){
        if(this.currentExtractor.length==0)
            return null;
        this.extractorIndex++;
        return this.createExtractor(this.currentExtractor[this.extractorIndex], fileContent);
    }
}