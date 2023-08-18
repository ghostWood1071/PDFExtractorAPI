import { Router } from 'express';
import importPDFRouter from './pdfImportRouter';
const router = Router();
router.use('/import', importPDFRouter);
export default router;
