import { ThreeAInvoiceExtractor } from "../extractor/3A/3AInvoiceExtractor";
import { BKAV2Extractor } from "../extractor/BKAV/BKAV2Extractor";
import { BKAV3Extractor } from "../extractor/BKAV/BKAV3Extractor";
import { BKAV4Extractor } from "../extractor/BKAV/BKAV4Extractor";
import { BKAVExtractor } from "../extractor/BKAV/BKAVExtractor";
// import { EInvoice5Extractor } from "../extractor/BKAV/EInvoice5Extractor";
import { CyberLotusExtractor } from "../extractor/Cyberlotus/CYBERLOTUSExtractor";
import { EInvoice2Extractor } from "../extractor/EInvoice/EInvoice2Extractor";
import { EInvoice3Extractor } from "../extractor/EInvoice/EInvoice3Extractor";
import { EInvoice4Extractor } from "../extractor/EInvoice/EInvoice4Extractor";
import { EInvoice5Extractor } from "../extractor/EInvoice/EInvoice5Extractor";
import { EInvoiceExtractor } from "../extractor/EInvoice/EInvoiceExtractor";
import { EFYInvoiceExtractor } from "../extractor/Efy/EFYInvoiceExtrator";
import { FPT2Extractor } from "../extractor/FPT/FPT2Extractor";
import { FPTExtractor } from "../extractor/FPT/FPTExtractor";
import { FastInvoiceExtractor } from "../extractor/Fast/FastInvoiceExtractor";
import { MInvoice3Extractor } from "../extractor/MInvoice/MInvoice3Extractor";
import { MInvoiceExtractor } from "../extractor/MInvoice/MInvoiceExtractor";
import { MeInvoice2Extractor } from "../extractor/MeInvoice/MeInvoice2Extractor";
import { MeInvoice3Extractor } from "../extractor/MeInvoice/MeInvoice3Extractor";
import { MeInvoice4Extractor } from "../extractor/MeInvoice/MeInvoice4Extractor";
import { MeInvoice5Extractor } from "../extractor/MeInvoice/MeInvoice5Extractor";
import { MeInvoice6Extractor } from "../extractor/MeInvoice/MeInvoice6Extractor";
import { MeInvoiceExtractor } from "../extractor/MeInvoice/MeInvoiceExtractor";
import { SoftDreamsInvoiceExtractor } from "../extractor/Softdream/SoftDreamInvoceExtractor";
import { VNPT2Extractor } from "../extractor/VNPT/VNPT2Extractor";
import { VNPT3Extractor } from "../extractor/VNPT/VNPT3Extractor";
import { VNPT4Extractor } from "../extractor/VNPT/VNPT4Extractor";
import { VNPInvoiceExtractor } from "../extractor/VNPT/VNPTInvoiceExtractor";
import { Viettel2Extractor } from "../extractor/Viettel/Viettel2Extractor";
import { ViettelInvoiceExtractor } from "../extractor/Viettel/ViettelInvoiceExtractor";
import { VisnamExtractor } from "../extractor/Visnam/VisnamExtractor";
import { WinTechExtractor } from "../extractor/Wintech/WinTechExtractor";


export const Extractors = {
    "3A": ThreeAInvoiceExtractor,
    "BKAV": [BKAVExtractor, BKAV2Extractor, BKAV3Extractor, BKAV4Extractor],
    "BKAV5": BKAV3Extractor,
    "CYBERLOTUS": [CyberLotusExtractor, VNPT2Extractor],
    "EFY": EFYInvoiceExtractor,
    "EInvoice2": EInvoice2Extractor,
    "EInvoice3": EInvoice3Extractor,
    "EInvoice4": EInvoice4Extractor,
    "EInvoice": EInvoiceExtractor,
    "EInvoice5": EInvoice5Extractor,
    "FAST": FastInvoiceExtractor,
    "FPT": FPTExtractor,
    "FPT2": FPT2Extractor,
    "MeInvoice-3": MeInvoice3Extractor,
    "MeInvoice-2": [MeInvoice2Extractor, MeInvoice3Extractor, MeInvoice4Extractor, MeInvoice5Extractor, MeInvoice6Extractor],
    "MeInvoice-1": MeInvoiceExtractor,
    "VISNAM": VisnamExtractor,
    "M-Invoice": [MInvoiceExtractor, MInvoice3Extractor],
    "SOFTDREAMS": SoftDreamsInvoiceExtractor,
    "VIETTEL": [ViettelInvoiceExtractor, Viettel2Extractor],
    "VNPT2": VNPT2Extractor,
    "VNPT3": VNPT3Extractor,
    "VNPT": [VNPInvoiceExtractor, VNPT3Extractor, VNPT4Extractor],
    "WINTECH": WinTechExtractor,
}


