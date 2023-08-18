import { Router } from 'express';
import { container } from 'tsyringe';
import {UploadMultiService} from "../core/services/upload-multiService";
import {ImportXMLController } from '../controllers/ImportPDFController';


const importPDFRouter = Router();
const importPdfController = container.resolve(ImportXMLController);
const uploadMultiService = container.resolve(UploadMultiService);
importPDFRouter.post('/map-pdf-files', uploadMultiService.multerMultiUpload, importPdfController.mapPDF.bind(importPdfController));
importPDFRouter.post('/import-pdf-files', uploadMultiService.multerMultiUpload, importPdfController.importPDF.bind(importPdfController));
importPDFRouter.post('/suggest', importPdfController.getMaterialSuggest.bind(importPdfController));
importPDFRouter.post('/check-vat-exists', importPdfController.checkVATExists.bind(importPdfController));
export default importPDFRouter;