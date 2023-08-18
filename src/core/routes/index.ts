import { Router } from 'express';
import uploadmultiRouter from './upload-multiRouter';
import uploadRouter from './uploadRouter';
const core_router = Router();
core_router.use('/upload-multi',uploadmultiRouter );
core_router.use('/upload',uploadRouter );
export default core_router;
