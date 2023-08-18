import { PageContent } from "../../models/model";
import { MInvoiceExtractor } from "./MInvoiceExtractor";

export class MInvoice3Extractor extends MInvoiceExtractor {

    protected override processInvoiceInfo(pageLines: string[], pageContent: PageContent): number {
        let nextPos = this.getByFilter(pageLines, 0, (x)=>x.trim()!="").nextPos;
        let tmpLine = this.getUntil(pageLines, nextPos, "Số tài khoản:");
        pageContent.buyer.companyName = tmpLine.strResult.replace(/\#/g, "").trim();
        nextPos = this.getByFilter(pageLines, tmpLine.nextPos, (x)=>x.match(/^\d+$/g)?true:false).nextPos;
        tmpLine = this.getUntil(pageLines, nextPos, "Mã của cơ quan thuế");
        pageContent.buyer.taxCode = tmpLine.strResult.trim();
        nextPos = this.getUntil(pageLines, tmpLine.nextPos, "Ký hiệu:").nextPos;
        pageContent.serial = pageLines[++nextPos];
        pageContent.no = pageLines[++nextPos];
        nextPos = this.getUntil(pageLines, nextPos, "Ngày").nextPos;
        pageContent.date = this.getDate(pageLines[nextPos]);
        nextPos = this.getByFilter(pageLines, nextPos, (x)=> x.match(/^\d+$/g)?true:false).nextPos+1;
        pageContent.seller.companyName = pageLines[nextPos].replace(/\#/g, " ").trim();
        nextPos = this.getByFilter(pageLines, nextPos, (x)=>x.includes("Mã số thuế")).nextPos;
        tmpLine = this.getUntil(pageLines, nextPos, "Địa chỉ");
        pageContent.seller.taxCode = tmpLine.strResult.split("#")[0];
        nextPos = this.getUntil(pageLines, tmpLine.nextPos, "Hotline:").nextPos;
        return nextPos+1;
    }
}