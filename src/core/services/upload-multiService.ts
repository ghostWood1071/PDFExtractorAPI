import { injectable } from 'tsyringe';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
@injectable()
export class UploadMultiService {
  private upload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        const date = new Date();
        const year = date.getFullYear().toString();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const uploadDir = `uploads/${year}-${month}-${day}`;
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);    
      },
      filename: (req, file, cb) => {
        const filename = path.parse(file.originalname).name + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, filename + extension);
      },
      
    }),
    limits: {
      fileSize: 5 * 1024 * 1024, // 1 MB (in bytes)
      files: 10 // Maximum 5 files allowed
    }
  }).array('files');

  get multerMultiUpload() {
    return this.upload;
  }
}

