import express, { Request, Response } from 'express';
import { container } from 'tsyringe';
import { UploadService } from '../services/uploadService';

const uploadRouter = express.Router();
const uploadService = container.resolve(UploadService);

uploadRouter.post('/', uploadService.multerUpload, (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'Không thể upload được file' });
    return;
  }

  const filePath = req.file.path;
  res.json({ path: filePath });
});

export default uploadRouter;
