import { AdminService } from './admin.service';
import { CreateServiceDto, UpdateServiceDto } from '../services/dto/service.dto';
import { CreateAddOnDto, UpdateAddOnDto } from '../addons/dto/addon.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
export declare class AdminController {
    private readonly adminService;
    constructor(adminService: AdminService);
    getDashboard(): unknown;
    getCalendar(start?: string, end?: string): unknown;
    getServices(): unknown;
    createService(dto: CreateServiceDto): unknown;
    updateService(id: string, dto: UpdateServiceDto): unknown;
    deleteService(id: string): Promise<void>;
    getAddOns(): unknown;
    createAddOn(dto: CreateAddOnDto): unknown;
    updateAddOn(id: string, dto: UpdateAddOnDto): unknown;
    deleteAddOn(id: string): Promise<void>;
    getBookings(status?: string, search?: string): unknown;
    getBooking(id: string): unknown;
    updateBookingStatus(id: string, dto: UpdateBookingStatusDto): unknown;
    getCustomers(search?: string): unknown;
}
