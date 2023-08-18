import express, { Request, Response } from 'express';
import { container } from 'tsyringe';
import { UploadMultiService } from '../services/upload-multiService';

const uploadmultiRouter = express.Router();
const uploadMultiService = container.resolve(UploadMultiService);

uploadmultiRouter.post('/', uploadMultiService.multerMultiUpload, (req: Request, res: Response) => {
  if (!req.files) {
    res.json({ error: 'Không thể upload được file' });
    return;
  }
  const uploadedFiles = req.files as Express.Multer.File[];
  const fileUrls: string[] = [];
  uploadedFiles.forEach(file => {
    fileUrls.push(file.path);
  });
  res.json(fileUrls);
});

export default uploadmultiRouter;
