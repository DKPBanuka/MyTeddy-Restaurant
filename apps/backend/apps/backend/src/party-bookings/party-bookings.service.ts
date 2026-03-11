import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PartyBookingsService {
    constructor(private readonly prisma: PrismaService) { }

    async createBooking(data: any) {
        if (!data.customerName || !data.customerPhone || !data.eventDate) {
            throw new BadRequestException('customerName, customerPhone, and eventDate are required');
        }

        const requestedEventDate = new Date(data.eventDate);
        requestedEventDate.setHours(0, 0, 0, 0);

        const existingBookings = await this.prisma.partyBooking.findMany({
            where: {
                eventDate: {
                    gte: requestedEventDate,
                    lt: new Date(requestedEventDate.getTime() + 24 * 60 * 60 * 1000),
                },
                status: { in: ['PENDING', 'CONFIRMED'] },
            },
        });

        const reqStart = new Date(data.startTime);
        const reqEnd = new Date(data.endTime);

        const hasClash = existingBookings.some((booking: any) => {
            const existingStart = new Date(booking.startTime);
            const existingEnd = new Date(booking.endTime);
            const overlaps = reqStart.getTime() < existingEnd.getTime() && reqEnd.getTime() > existingStart.getTime();
            if (overlaps) {
                if (data.bookingType === 'EXCLUSIVE' || booking.bookingType === 'EXCLUSIVE') {
                    return true;
                }
            }
            return false;
        });

        if (hasClash) {
            throw new ConflictException('The selected time slot conflicts with an exclusive booking.');
        }

        const bookingType = data.bookingType || 'PARTIAL';
        const guestCount = Number(data.guestCount) || 0;
        const hallCharge = bookingType === 'EXCLUSIVE' ? 5000 : 0;
        const menuTotal = Number(data.menuTotal) || 0;
        const addonsTotal = Number(data.addonsTotal) || 0;
        const totalAmount = hallCharge + menuTotal + addonsTotal;
        const advancePaid = Number(data.advancePaid) || 0;

        return this.prisma.partyBooking.create({
            data: {
                customerId: data.customerId || null,
                customerName: data.customerName,
                customerPhone: data.customerPhone,
                eventDate: new Date(data.eventDate),
                startTime: reqStart,
                endTime: reqEnd,
                guestCount,
                hallCharge,
                menuTotal,
                addonsTotal,
                totalAmount,
                advancePaid,
                bookingType: bookingType as any,
                status: (advancePaid > 0 ? 'CONFIRMED' : 'PENDING') as any,
            },
        });
    }

    async getBookings(filters: { date?: string; month?: string; year?: string }) {
        const whereClause: any = {};

        if (filters.date) {
            const exactDate = new Date(filters.date);
            exactDate.setHours(0, 0, 0, 0);
            whereClause.eventDate = {
                gte: exactDate,
                lt: new Date(exactDate.getTime() + 24 * 60 * 60 * 1000),
            };
        } else if (filters.month && filters.year) {
            const startOfMonth = new Date(Number(filters.year), Number(filters.month) - 1, 1);
            const endOfMonth = new Date(Number(filters.year), Number(filters.month), 1);
            whereClause.eventDate = { gte: startOfMonth, lt: endOfMonth };
        }

        return this.prisma.partyBooking.findMany({
            where: whereClause,
            orderBy: [{ eventDate: 'asc' }, { startTime: 'asc' }],
        });
    }

    async updateAdvance(id: string, amount: number) {
        const booking = await this.prisma.partyBooking.findUnique({ where: { id } });
        if (!booking) throw new NotFoundException('Booking not found');

        const newAdvance = Number(booking.advancePaid) + Number(amount);
        const newStatus = newAdvance > 0 && booking.status === 'PENDING' ? 'CONFIRMED' : booking.status;

        return this.prisma.partyBooking.update({
            where: { id },
            data: { advancePaid: newAdvance, status: newStatus as any },
        });
    }

    async updateBookingTime(id: string, eventDate: string, startTime: string, endTime: string) {
        const booking = await this.prisma.partyBooking.findUnique({ where: { id } });
        if (!booking) throw new NotFoundException('Booking not found');

        const newEventDate = new Date(eventDate);
        newEventDate.setHours(0, 0, 0, 0);
        const reqStart = new Date(startTime);
        const reqEnd = new Date(endTime);

        // Check for conflicts, ignoring the current booking
        const existingBookings = await this.prisma.partyBooking.findMany({
            where: {
                eventDate: {
                    gte: newEventDate,
                    lt: new Date(newEventDate.getTime() + 24 * 60 * 60 * 1000),
                },
                status: { in: ['PENDING', 'CONFIRMED'] },
                id: { not: id },
            },
        });

        const hasClash = existingBookings.some((existing: any) => {
            const existingStart = new Date(existing.startTime);
            const existingEnd = new Date(existing.endTime);
            const overlaps = reqStart.getTime() < existingEnd.getTime() && reqEnd.getTime() > existingStart.getTime();
            if (overlaps) {
                if (booking.bookingType === 'EXCLUSIVE' || existing.bookingType === 'EXCLUSIVE') {
                    return true;
                }
            }
            return false;
        });

        if (hasClash) {
            throw new ConflictException('The selected time slot conflicts with an exclusive booking.');
        }

        return this.prisma.partyBooking.update({
            where: { id },
            data: {
                eventDate: new Date(eventDate),
                startTime: reqStart,
                endTime: reqEnd,
            },
        });
    }

    async addExtras(id: string, additionalAmount: number) {
        const booking = await this.prisma.partyBooking.findUnique({ where: { id } });
        if (!booking) throw new NotFoundException('Booking not found');

        const newAddonsTotal = Number(booking.addonsTotal) + Number(additionalAmount);
        const newTotalAmount = Number(booking.hallCharge) + Number(booking.menuTotal) + newAddonsTotal;

        return this.prisma.partyBooking.update({
            where: { id },
            data: {
                addonsTotal: newAddonsTotal,
                totalAmount: newTotalAmount,
            },
        });
    }
}
