import { Router } from 'express';
import officeController from './office.controller';


const router = Router();

router.post('/create', officeController.createOffice);
router.get('/all', officeController.getOffices);
router.patch('/:id', officeController.updateOffice);

export const officeRoutes = router;