import { Request, Response, NextFunction } from 'express';
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Lỗi:', err);
  res.status(500).json({ error: 'Lỗi máy chủ' });
};