import { canAccessRoute } from '@/auth/permissions';
import { routeRepository } from '@/repositories/route.repository';
import {
  createRouteSchema,
  updateRouteSchema,
  iataCodeSchema,
  routeAdminInclude,
  type CreateRouteInput,
  type RouteAdmin,
  type RouteListItem,
  type RouteServiceAction,
  type UpdateRouteInput,
} from '@/types/route.type';
import type { PaginatedResponse } from '@/types/common';
import type { ServiceSession as Session } from '@/services/_shared/session';
import type { Prisma } from '@/generated/prisma/client';
import { makePermissionHelpers } from '@/services/_shared/authorization';
import {
  resolvePagination,
  type PaginationParams,
} from '@/services/_shared/pagination';
import { ConflictError, NotFoundError, UnauthorizedError } from '@/lib/errors';

const { checkPermission } = makePermissionHelpers<RouteServiceAction>(
  canAccessRoute,
  'route',
  (a) => new UnauthorizedError(a),
);

async function getRouteByIdOrThrow(id: string) {
  const route = await routeRepository.findByIdAdmin(id, routeAdminInclude);
  if (!route) throw new NotFoundError(`Route not found: ${id}`);
  return route as RouteAdmin;
}

async function assertRouteDoesNotExist(originAirportId: string, destAirportId: string) {
  const existing = await routeRepository.findByAirportIds(originAirportId, destAirportId);
  if (existing) throw new ConflictError(`${originAirportId} → ${destAirportId} already exists`);
}

async function assertRouteDeletable(id: string) {
  const activeFlights = await routeRepository.countActiveFlights(id);
  if (activeFlights > 0) {
    throw new ConflictError(`Cannot delete route with ${activeFlights} active flight(s)`);
  }
}


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
    return routeRepository.findAll({ include: routeAdminInclude });
  },

  async findAllPaginated(
    session: Session,
    params?: PaginationParams<Prisma.RouteWhereInput>,
  ): Promise<PaginatedResponse<RouteListItem>> {
    checkPermission(session, 'read');

    const { page, limit, skip } = resolvePagination(params);
    const where = (params as any)?.where;
    const [data, total] = await Promise.all([
      routeRepository.findMany({ where, skip, take: limit, include: routeAdminInclude }) as Promise<RouteAdmin[]>,
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
        include: routeAdminInclude,
      }) as Promise<RouteAdmin[]>,
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

    await assertRouteDoesNotExist(data.originAirportId, data.destAirportId);
    if (data.createReturn) {
      await assertRouteDoesNotExist(data.destAirportId, data.originAirportId);
    }

    if (data.createReturn) {
      const [route, returnRoute] = await routeRepository.createWithReturn(data, routeAdminInclude);
      return { route, returnRoute };
    }

    const route = await routeRepository.create(data, routeAdminInclude);
    return { route, returnRoute: null };
  },

  async updateRoute(id: string, input: UpdateRouteInput, session: Session) {
    checkPermission(session, 'update');

    const data = updateRouteSchema.parse(input);

    await getRouteByIdOrThrow(id);
    return routeRepository.update(id, data, routeAdminInclude);
  },

  async deleteRoute(id: string, session: Session) {
    checkPermission(session, 'delete');

    await getRouteByIdOrThrow(id);
    await assertRouteDeletable(id);
    return routeRepository.delete(id);
  },
};