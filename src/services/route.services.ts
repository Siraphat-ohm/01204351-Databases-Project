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
import { assertPermission } from '@/services/_shared/authorization';
import {
  resolvePagination,
  type PaginationParams,
} from '@/services/_shared/pagination';

type RouteListItem = Awaited<ReturnType<typeof routeRepository.findAll>>[number];


export class RouteNotFoundError extends Error {
  constructor(identifier: string) {
    super(`Route not found: ${identifier}`);
    this.name = 'RouteNotFoundError';
  }
}

export class RouteConflictError extends Error {
  constructor(origin: string, dest: string) {
    super(`Route ${origin} → ${dest} already exists`);
    this.name = 'RouteConflictError';
  }
}

export class RouteHasActiveFlightsError extends Error {
  constructor(count: number) {
    super(`Cannot delete route with ${count} active flight(s)`);
    this.name = 'RouteHasActiveFlightsError';
  }
}

export class UnauthorizedError extends Error {
  constructor(action: string) {
    super(`Unauthorized: cannot perform "${action}" on route`);
    this.name = 'UnauthorizedError';
  }
}


function checkPermission(
  session: Session,
  action: 'create' | 'read' | 'update' | 'delete',
) {
  assertPermission(
    session,
    action,
    canAccessRoute,
    'route',
    (a) => new UnauthorizedError(a),
  );
}


export const routeService = {

  async findById(id: string, session: Session) {
    checkPermission(session, 'read');

    const route = await routeRepository.findByIdForRole(
      id,
      session.user.role,
    );
    if (!route) throw new RouteNotFoundError(id);
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
    if (!route) throw new RouteNotFoundError(`${origin} → ${dest}`);
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
    params?: PaginationParams,
  ): Promise<PaginatedResponse<RouteListItem>> {
    checkPermission(session, 'read');

    const { page, limit, skip } = resolvePagination(params);
    const [data, total] = await Promise.all([
      routeRepository.findMany({
        skip,
        take: limit,
      }),
      routeRepository.count(),
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
    if (existing) throw new RouteConflictError(data.originAirportId, data.destAirportId);

    if (data.createReturn) {
      const reverseExists = await routeRepository.findByAirportIds(
        data.destAirportId,
        data.originAirportId,
      );
      if (reverseExists) throw new RouteConflictError(data.destAirportId, data.originAirportId);
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
    if (!existing) throw new RouteNotFoundError(id);

    return routeRepository.update(id, data);
  },

  async deleteRoute(id: string, session: Session) {
    checkPermission(session, 'delete');

    const existing = await routeRepository.findByIdAdmin(id);
    if (!existing) throw new RouteNotFoundError(id);

    const activeFlights = await routeRepository.countActiveFlights(id);
    if (activeFlights > 0) throw new RouteHasActiveFlightsError(activeFlights);

    return routeRepository.delete(id);
  },
};