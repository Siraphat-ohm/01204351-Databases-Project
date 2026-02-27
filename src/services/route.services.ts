import { canAccessRoute } from '@/auth/permissions';
import { routeRepository } from '@/repositories/route.repository';
import {
  createRouteSchema,
  updateRouteSchema,
  iataCodeSchema,
  type CreateRouteInput,
  type UpdateRouteInput,
} from '@/types/route.type';
import type { PaginatedResponse } from '@/types/common';
import type { ServiceSession as Session } from '@/services/_shared/session';
import type { Prisma } from '@/generated/prisma/client';
import { makeCheckPermission } from '@/services/_shared/authorization';
import {
  resolvePagination,
  type PaginationParams,
} from '@/services/_shared/pagination';

type RouteListItem = Awaited<ReturnType<typeof routeRepository.findAll>>[number];


import { NotFoundError, ConflictError, UnauthorizedError } from '@/lib/errors';


const checkPermission = makeCheckPermission(
  canAccessRoute,
  'route',
  (a) => new UnauthorizedError(a),
);


export const routeService = {

  async findById(id: string, session: Session) {
    checkPermission(session, 'read');

    const route = await routeRepository.findByIdForRole(
      id,
      session.user.role,
    );
    if (!route) throw new NotFoundError(`Route not found: ${id}`);
    return route;
  },

  async findByIataCodes(
    originCode: string,
    destCode: string,
    session: Session,
  ) {
    checkPermission(session, 'read');

    const origin = iataCodeSchema.parse(originCode);
    const dest   = iataCodeSchema.parse(destCode);

    const route = await routeRepository.findByIataCodes(origin, dest);
    if (!route) throw new NotFoundError(`Route not found: ${origin} → ${dest}`);
    return route;
  },

  async getOriginAirports(session: Session) {
    checkPermission(session, 'read');
    return routeRepository.findDistinctOrigins();
  },

  async getDestinationsFromOrigin(originCode: string, session: Session) {
    checkPermission(session, 'read');

    const origin = iataCodeSchema.parse(originCode);
    return routeRepository.findDestinationsByOrigin(origin);
  },

  async findAll(session: Session) {
    checkPermission(session, 'read');
    return routeRepository.findAll();
  },

  async findAllPaginated(
    session: Session,
    params?: PaginationParams<Prisma.RouteWhereInput>,
  ): Promise<PaginatedResponse<RouteListItem>> {
    checkPermission(session, 'read');

    const { page, limit, skip } = resolvePagination(params);
    const where = (params as any)?.where;
    const [data, total] = await Promise.all([
      routeRepository.findMany({ where, skip, take: limit }),
      routeRepository.count(where),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async searchPaginated(
    search: string,
    session: Session,
    params?: PaginationParams<Prisma.RouteWhereInput>,
  ): Promise<PaginatedResponse<RouteListItem>> {
    checkPermission(session, 'read');

    const keyword = search.trim();
    const where = keyword
      ? {
          OR: [
            { origin: { name: { contains: keyword, mode: 'insensitive' as const } } },
            { destination: { name: { contains: keyword, mode: 'insensitive' as const } } },
          ],
        }
      : undefined;

    const { page, limit, skip } = resolvePagination(params);
    const [data, total] = await Promise.all([
      routeRepository.findMany({
        where,
        skip,
        take: limit,
      }),
      routeRepository.count(where),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async createRoute(input: CreateRouteInput, session: Session) {
    checkPermission(session, 'create');

    const data = createRouteSchema.parse(input);

    const existing = await routeRepository.findByAirportIds(
      data.originAirportId,
      data.destAirportId,
    );
    if (existing) throw new ConflictError(`${data.originAirportId} → ${data.destAirportId} already exists`);

    if (data.createReturn) {
      const reverseExists = await routeRepository.findByAirportIds(
        data.destAirportId,
        data.originAirportId,
      );
      if (reverseExists) throw new ConflictError(`${data.destAirportId} → ${data.originAirportId} already exists`);
    }

    if (data.createReturn) {
      const [route, returnRoute] = await routeRepository.createWithReturn(data);
      return { route, returnRoute };
    }

    const route = await routeRepository.create(data);
    return { route, returnRoute: null };
  },

  async updateRoute(id: string, input: UpdateRouteInput, session: Session) {
    checkPermission(session, 'update');

    const data = updateRouteSchema.parse(input);

    const existing = await routeRepository.findByIdAdmin(id);
    if (!existing) throw new NotFoundError(`Route not found: ${id}`);

    return routeRepository.update(id, data);
  },

  async deleteRoute(id: string, session: Session) {
    checkPermission(session, 'delete');

    const existing = await routeRepository.findByIdAdmin(id);
    if (!existing) throw new NotFoundError(`Route not found: ${id}`);

    const activeFlights = await routeRepository.countActiveFlights(id);
    if (activeFlights > 0) throw new ConflictError(`Cannot delete route with ${activeFlights} active flight(s)`);

    return routeRepository.delete(id);
  },
};