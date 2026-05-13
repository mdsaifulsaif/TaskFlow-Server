import { Request, Response } from 'express';

import { IOffice } from '../../../types/office.type';
import { officeServices } from './office.service';


class OfficeController {
    async createOffice(req: Request, res: Response): Promise<void> {
        try {
            const officeData: IOffice = req.body;
            const newOffice = await officeServices.createOfficeService(officeData);
            
            res.status(201).json({
                success: true,
                message: 'Office created successfully',
                data: newOffice
            });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async updateOffice(req: Request, res: Response): Promise<void> {
        try {
            const id = parseInt(req.params.id as string) 
            const officeData: Partial<IOffice> = req.body;

            
            const updatedOffice = await officeServices.updateOfficeService(id, officeData);

            res.status(200).json({
                success: true,
                message: 'Office updated successfully',
                data: updatedOffice
            });
        } catch (error: any) {
           
            const statusCode = error.message === "Office not found" ? 404 : 500;
            res.status(statusCode).json({ 
                success: false, 
                message: error.message 
            });
        }
    }

    async getOffices(req: Request, res: Response): Promise<void> {
        try {
            const offices = await officeServices.getAllOfficesService();
            res.status(200).json({ success: true, data: offices });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}

export default new OfficeController();