import express, { Application, NextFunction, Request, Response } from 'express';
import 'reflect-metadata';
import { errorHandler } from './errors/errorHandler';
import router from "./routes/index"; 
import cors from 'cors';
import core_router from './core/routes';
const app  = express(); 
 // Sử dụng cors middleware
app.use(cors());
// Middleware để xử lý dữ liệu đầu vào
app.use(express.json()); // Middleware để xử lý dữ liệu JSON
app.use(express.urlencoded({ extended: true })); // Middleware để xử lý dữ liệu được gửi qua form-urlencoded
// Sử dụng router 
app.use('/api-pdf', core_router);
app.use('/api-pdf', router);
// Đăng ký middleware xử lý lỗi toàn cục
app.use(errorHandler);
// Xử lý các route không tồn tại
app.use((req , res ) => {
  res.json({ message: 'Không tìm thấy đường dẫn' });
});
export default app;
 