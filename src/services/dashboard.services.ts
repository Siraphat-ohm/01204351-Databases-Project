import { prisma } from '@/lib/prisma';
import { flightOpsLogRepository } from '@/repositories/flight-ops-log.repository';
import { TransactionStatus } from '@/generated/prisma/client';
import type { ServiceSession as Session } from '@/services/_shared/session';
import { hasAnyRole } from '@/services/_shared/role';

export class DashboardDataFetchError extends Error {
  constructor(message: string) {
    super(`Failed to fetch dashboard data: ${message}`);
    this.name = 'DashboardDataFetchError';
  }
}

export class UnauthorizedError extends Error {
  constructor(action: string) {
    super(`Unauthorized: cannot perform "${action}" on dashboard`);
    this.name = 'UnauthorizedError';
  }
}

function checkPermission(
  session: Session,
  action: 'read' | 'export',
) {
  // Utilizing the hasAnyRole helper similar to issueReportService
  if (!hasAnyRole(session, ['ADMIN', 'MANAGER', 'STAFF', 'GROUND_STAFF', 'PILOT', 'CABIN_CREW', 'MECHANIC'])) {
    throw new UnauthorizedError(action);
  }
}

function getRelativeTime(date: Date) {
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const diffInSeconds = (date.getTime() - new Date().getTime()) / 1000;
  
  if (Math.abs(diffInSeconds) < 60) return rtf.format(Math.round(diffInSeconds), 'second');
  if (Math.abs(diffInSeconds) < 3600) return rtf.format(Math.round(diffInSeconds / 60), 'minute');
  if (Math.abs(diffInSeconds) < 86400) return rtf.format(Math.round(diffInSeconds / 3600), 'hour');
  return rtf.format(Math.round(diffInSeconds / 86400), 'day');
}

export const dashboardService = {
  
  async getExecutiveOverview(session: Session) {
    checkPermission(session, 'read');

    try {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const [
        activeFlights,
        totalPlanes,
        availablePlanes,
        reservationsToday,
        incomeResult,
        totalUsers,
        flightsCountByRoute,
        totalFlightsCount,
        upcomingFlightsRaw,
        opsLogsRaw
      ] = await Promise.all([
        prisma.flight.count({
          where: { status: { in: ['BOARDING', 'DEPARTED'] } }
        }),
        
        prisma.aircraft.count(),
        
        prisma.aircraft.count({
          where: { status: "ACTIVE" } 
        }),

        prisma.booking.count({
          where: { createdAt: { gte: startOfToday } }
        }),

        prisma.transaction.aggregate({
          _sum: { amount: true },
          where: { status: TransactionStatus.SUCCESS, type: 'PAYMENT' }
        }),

        prisma.user.count(),

        prisma.flight.groupBy({
          by: ['routeId'],
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 4,
        }),
        
        prisma.flight.count(),

        prisma.flight.findMany({
          where: { departureTime: { gte: new Date() } },
          orderBy: { departureTime: 'asc' },
          take: 5,
          include: {
            route: {
              include: {
                origin: true,
                destination: true
              }
            }
          }
        }),

        flightOpsLogRepository.findAll()
      ]);

      const routeIds = flightsCountByRoute.map(fr => fr.routeId);
      const routes = await prisma.route.findMany({
        where: { id: { in: routeIds } },
        include: { destination: true }
      });

      const popularDestinations = flightsCountByRoute.map(fr => {
        const route = routes.find(r => r.id === fr.routeId);
        const percentage = totalFlightsCount > 0 
          ? Math.round((fr._count.id / totalFlightsCount) * 100) 
          : 0;

        return {
          city: route?.destination.city || 'Unknown',
          code: route?.destination.iataCode || 'UNK',
          percentage,
          count: fr._count.id
        };
      });

      const upcomingFlights = upcomingFlightsRaw.map(flight => ({
        id: flight.id,
        code: flight.flightCode,
        route: `${flight.route.origin.iataCode} - ${flight.route.destination.iataCode}`,
        time: flight.departureTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        status: flight.status.replace('_', ' ')
      }));

      const flightLogs = opsLogsRaw.slice(0, 5).map((log: any, index: number) => {
        const isError = log.incidents && log.incidents.length > 0;
        return {
          id: log._id ? log._id.toString() : index,
          type: isError ? 'error' : 'info',
          message: isError ? `Incident: ${log.incidents}` : `Ops log updated by ${log.captainName || 'Crew'}`,
          time: getRelativeTime(new Date(log.updatedAt || log.createdAt))
        };
      });

      if (flightLogs.length === 0) {
        flightLogs.push({
          id: 'system-init',
          type: 'info',
          message: 'System operations normal',
          time: 'Just now'
        });
      }

      return {
        stats: {
          income: Number(incomeResult._sum.amount || 0),
          activeFlights,
          activeUsers: totalUsers, 
          reservationsToday,
          availablePlanes,
          totalPlanes,
        },
        popularDestinations,
        upcomingFlights,
        flightLogs
      };

    } catch (error: any) {
      throw new DashboardDataFetchError(error.message || 'Database query failed');
    }
  }
};