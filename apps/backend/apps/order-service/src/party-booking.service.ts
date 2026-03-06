import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@app/prisma';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class PartyBookingService {
    constructor(private prisma: PrismaService) { }

    async createBooking(data: any) {
        // 1. Time-slot clash validation
        const requestedEventDate = new Date(data.eventDate);
        requestedEventDate.setHours(0, 0, 0, 0); // Normalize to midnight for day comparison

        // Get all bookings for that day that are NOT cancelled
        const existingBookings = await this.prisma.partyBooking.findMany({
            where: {
                eventDate: {
                    gte: requestedEventDate,
                    lt: new Date(requestedEventDate.getTime() + 24 * 60 * 60 * 1000), // Next day
                },
                status: {
                    in: ['PENDING', 'CONFIRMED'],
                },
            }
        });

        // Time overlap logic (Simple string comparison works for HH:mm)
        const hasClash = existingBookings.some(booking => {
            // requestedStart < existingEnd AND requestedEnd > existingStart
            return (data.startTime < booking.endTime) && (data.endTime > booking.startTime);
        });

        if (hasClash) {
            throw new RpcException(new ConflictException('The selected time slot conflicts with an existing booking.'));
        }

        // 2. Calculations
        const guestCount = Number(data.guestCount) || 0;
        const hallCharge = Number(data.hallCharge) || 0;
        const menuTotal = Number(data.menuTotal) || 0;
        const addonsTotal = Number(data.addonsTotal) || 0;

        const totalAmount = hallCharge + menuTotal + addonsTotal;
        const advancePaid = Number(data.advancePaid) || 0;

        // 3. Create Record
        return this.prisma.partyBooking.create({
            data: {
                customerId: data.customerId || 'WALK_IN',
                customerName: data.customerName,
                customerPhone: data.customerPhone,
                eventDate: new Date(data.eventDate),
                startTime: data.startTime,
                endTime: data.endTime,
                guestCount,
                hallCharge,
                menuTotal,
                addonsTotal,
                totalAmount,
                advancePaid,
                status: advancePaid > 0 ? 'CONFIRMED' : 'PENDING'
            }
        });
    }

    async getBookings(filters: any) {
        const whereClause: any = {};

        if (filters.date) {
            const exactDate = new Date(filters.date);
            exactDate.setHours(0, 0, 0, 0);
            whereClause.eventDate = {
                gte: exactDate,
                lt: new Date(exactDate.getTime() + 24 * 60 * 60 * 1000)
            };
        } else if (filters.month && filters.year) {
            const startOfMonth = new Date(filters.year, filters.month - 1, 1);
            const endOfMonth = new Date(filters.year, filters.month, 1);
            whereClause.eventDate = {
                gte: startOfMonth,
                lt: endOfMonth
            };
        }

        return this.prisma.partyBooking.findMany({
            where: whereClause,
            orderBy: [
                { eventDate: 'asc' },
                { startTime: 'asc' }
            ]
        });
    }

    async updateAdvance(id: string, advanceAmount: number) {
        const booking = await this.prisma.partyBooking.findUnique({ where: { id } });

        if (!booking) {
            throw new RpcException(new NotFoundException('Booking not found'));
        }

        const newAdvance = Number(booking.advancePaid) + Number(advanceAmount);
        let newStatus = booking.status;

        // Auto confirm if advance is paid
        if (newAdvance > 0 && booking.status === 'PENDING') {
            newStatus = 'CONFIRMED';
        }

        return this.prisma.partyBooking.update({
            where: { id },
            data: {
                advancePaid: newAdvance,
                status: newStatus
            }
        });
    }
}
