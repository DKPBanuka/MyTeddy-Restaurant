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

        // Time overlap logic
        const reqStart = new Date(data.startTime);
        const reqEnd = new Date(data.endTime);

        const hasClash = existingBookings.some((booking: any) => {
            const existingStart = new Date(booking.startTime);
            const existingEnd = new Date(booking.endTime);

            const overlaps = (reqStart.getTime() < existingEnd.getTime()) && (reqEnd.getTime() > existingStart.getTime());

            if (overlaps) {
                // If either the new booking or the existing booking is EXCLUSIVE, they clash
                if (data.bookingType === 'EXCLUSIVE' || booking.bookingType === 'EXCLUSIVE') {
                    return true;
                }
                // Partial bookings can overlap with other Partial bookings
            }
            return false;
        });

        if (hasClash) {
            throw new RpcException(new ConflictException('The selected time slot conflicts with an exclusive booking.'));
        }

        // 2. Calculations
        // 2. Calculations
        const bookingType = data.bookingType || 'PARTIAL';
        const guestCount = Number(data.guestCount) || 0;
        const hallCharge = bookingType === 'EXCLUSIVE' ? 5000 : 0; // Enforce UI rule
        const menuTotal = Number(data.menuTotal) || 0;
        const addonsTotal = Number(data.addonsTotal) || 0;
        const serviceCharge = Number(data.serviceCharge) || 0;
        const discount = Number(data.discount) || 0;

        const totalAmount = (hallCharge + menuTotal + addonsTotal + serviceCharge) - discount;
        const advancePaid = Number(data.advancePaid) || 0;

        // 3. Create Record
        return this.prisma.partyBooking.create({
            data: {
                customerId: (data.customerId && data.customerId !== 'WALK_IN') ? data.customerId : null,
                customerName: data.customerName,
                customerPhone: data.customerPhone,
                eventDate: new Date(data.eventDate),
                startTime: reqStart,
                endTime: reqEnd,
                guestCount,
                hallCharge,
                menuTotal,
                addonsTotal,
                serviceCharge,
                discount,
                totalAmount,
                advancePaid,
                items: data.items || [],
                bookingType,
                paymentMethod: data.paymentMethod || 'CASH',
                status: advancePaid > 0 ? 'CONFIRMED' : 'PENDING'
            }
        });
    }

    async getBookings(filters: any) {
        const whereClause: any = {};

        try {
            if (filters.startDate && filters.endDate) {
                const start = new Date(filters.startDate);
                const end = new Date(filters.endDate);
                if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                    start.setHours(0, 0, 0, 0);
                    end.setHours(23, 59, 59, 999);
                    whereClause.eventDate = {
                        gte: start,
                        lte: end
                    };
                }
            } else if (filters.date) {
                const exactDate = new Date(filters.date);
                if (!isNaN(exactDate.getTime())) {
                    exactDate.setHours(0, 0, 0, 0);
                    whereClause.eventDate = {
                        gte: exactDate,
                        lt: new Date(exactDate.getTime() + 24 * 60 * 60 * 1000)
                    };
                }
            } else if (filters.month && filters.year) {
                const year = Number(filters.year);
                const month = Number(filters.month);
                
                if (!isNaN(year) && !isNaN(month)) {
                    const startOfMonth = new Date(year, month - 1, 1);
                    const endOfMonth = new Date(year, month, 1);
                    whereClause.eventDate = {
                        gte: startOfMonth,
                        lt: endOfMonth
                    };
                }
            }

            let bookings = await this.prisma.partyBooking.findMany({
                where: whereClause,
                orderBy: [
                    { eventDate: 'asc' },
                    { startTime: 'asc' }
                ]
            });

            // Post-fetch filtering for payment status
            if (filters.paymentStatus && filters.paymentStatus !== 'ALL') {
                bookings = bookings.filter(b => {
                    const total = Number(b.totalAmount || 0);
                    const advance = Number(b.advancePaid || 0);

                    if (filters.paymentStatus === 'SETTLED') {
                        return advance >= total && total > 0;
                    }
                    if (filters.paymentStatus === 'PARTIAL') {
                        return advance > 0 && advance < total;
                    }
                    if (filters.paymentStatus === 'PENDING') {
                        return advance === 0;
                    }
                    return true;
                });
            }

            return bookings;
        } catch (error) {
            console.error('Error in PartyBooking Microservice (getBookings):', error);
            // Return empty array to prevent total failure in UI
            return [];
        }
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

    async updateBookingTime(id: string, eventDate: string, startTime: string, endTime: string) {
        const booking = await this.prisma.partyBooking.findUnique({ where: { id } });
        if (!booking) throw new RpcException(new NotFoundException('Booking not found'));

        const newEventDate = new Date(eventDate);
        newEventDate.setHours(0, 0, 0, 0);
        const reqStart = new Date(startTime);
        const reqEnd = new Date(endTime);

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
            throw new RpcException(new ConflictException('The selected time slot conflicts with an exclusive booking.'));
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
        if (!booking) throw new RpcException(new NotFoundException('Booking not found'));

        const newAddonsTotal = Number(booking.addonsTotal) + Number(additionalAmount);
        const newTotalAmount = (Number(booking.hallCharge) + Number(booking.menuTotal) + newAddonsTotal + Number(booking.serviceCharge)) - Number(booking.discount);

        return this.prisma.partyBooking.update({
            where: { id },
            data: {
                addonsTotal: newAddonsTotal,
                totalAmount: newTotalAmount,
            },
        });
    }

    async updateItems(id: string, items: any[], menuTotal: number) {
        const booking = await this.prisma.partyBooking.findUnique({ where: { id } });
        if (!booking) throw new RpcException(new NotFoundException('Booking not found'));

        const newTotalAmount = (Number(booking.hallCharge) + Number(menuTotal) + Number(booking.addonsTotal) + Number(booking.serviceCharge)) - Number(booking.discount);

        return this.prisma.partyBooking.update({
            where: { id },
            data: {
                items,
                menuTotal,
                totalAmount: newTotalAmount,
            },
        });
    }

    async updateBooking(id: string, data: any) {
        const booking = await this.prisma.partyBooking.findUnique({ where: { id } });
        if (!booking) throw new RpcException(new NotFoundException('Booking not found'));

        let reqStart = booking.startTime;
        let reqEnd = booking.endTime;
        let finalEventDate = booking.eventDate;

        if (data.eventDate && data.startTime && data.endTime) {
            const dateObj = new Date(data.eventDate);
            dateObj.setHours(0, 0, 0, 0);
            finalEventDate = new Date(data.eventDate);
            reqStart = new Date(data.startTime);
            reqEnd = new Date(data.endTime);

            const existingBookings = await this.prisma.partyBooking.findMany({
                where: {
                    eventDate: {
                        gte: dateObj,
                        lt: new Date(dateObj.getTime() + 24 * 60 * 60 * 1000),
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
                    if (data.bookingType === 'EXCLUSIVE' || existing.bookingType === 'EXCLUSIVE') {
                        return true;
                    }
                }
                return false;
            });

            if (hasClash) {
                throw new RpcException(new ConflictException('The selected time slot conflicts with an exclusive booking.'));
            }
        }

        const bookingType = data.bookingType || booking.bookingType;
        const guestCount = data.guestCount !== undefined ? Number(data.guestCount) : booking.guestCount;
        const hallCharge = bookingType === 'EXCLUSIVE' ? 5000 : 0;
        const menuTotal = data.menuTotal !== undefined ? Number(data.menuTotal) : Number(booking.menuTotal);
        const addonsTotal = data.addonsTotal !== undefined ? Number(data.addonsTotal) : Number(booking.addonsTotal);
        const serviceCharge = data.serviceCharge !== undefined ? Number(data.serviceCharge) : Number(booking.serviceCharge);
        const discount = data.discount !== undefined ? Number(data.discount) : Number(booking.discount);
        
        const totalAmount = (hallCharge + menuTotal + addonsTotal + serviceCharge) - discount;
        const advancePaid = data.advancePaid !== undefined ? Number(data.advancePaid) : Number(booking.advancePaid);
        const items = data.items !== undefined ? data.items : booking.items;
        const customerPhone = data.customerPhone || booking.customerPhone;
        const paymentMethod = data.paymentMethod || booking.paymentMethod;

        const updateData: any = {
            customerPhone,
            customerId: (data.customerId && data.customerId !== 'WALK_IN') ? data.customerId : (data.customerId === 'WALK_IN' ? null : booking.customerId),
            eventDate: finalEventDate,
            startTime: reqStart,
            endTime: reqEnd,
            guestCount,
            hallCharge,
            menuTotal,
            addonsTotal,
            serviceCharge,
            discount,
            totalAmount,
            advancePaid,
            items,
            bookingType: bookingType as any,
            paymentMethod: paymentMethod || 'CASH',
        };

        return this.prisma.partyBooking.update({
            where: { id },
            data: updateData,
        });
    }
}
