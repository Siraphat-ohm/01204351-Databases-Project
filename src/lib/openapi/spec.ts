export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'YokAirlines API',
    version: '1.0.0',
    description: 'OpenAPI spec for YokAirlines v1 endpoints',
  },
  servers: [
    {
      url: '/',
      description: 'Current deployment',
    },
  ],
  tags: [
    { name: 'Bookings' },
    { name: 'Payments' },
  ],
  paths: {
    '/api/v1/bookings': {
      get: {
        tags: ['Bookings'],
        summary: 'List bookings',
        description:
          'Supports filters: bookingRef, flightId, flightCode, mine. Returns paginated data for read-all roles when no filter is provided.',
        parameters: [
          { name: 'bookingRef', in: 'query', schema: { type: 'string' } },
          { name: 'flightId', in: 'query', schema: { type: 'string' } },
          { name: 'flightCode', in: 'query', schema: { type: 'string' } },
          { name: 'mine', in: 'query', schema: { type: 'boolean' } },
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
        ],
        responses: {
          '200': { description: 'OK' },
          '401': { description: 'Unauthorized' },
        },
      },
      post: {
        tags: ['Bookings'],
        summary: 'Create booking',
        description:
          'Authenticated users can create with userId. Guests (no session) can create with contactEmail and optional guestName. If tickets[] is provided, max 9 passengers are allowed and totalPrice must equal sum(ticket.price + ticket.seatSurcharge).',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                oneOf: [
                  { $ref: '#/components/schemas/CreateBookingInput' },
                  { $ref: '#/components/schemas/GuestCreateBookingInput' },
                ],
              },
            },
          },
        },
        responses: {
          '201': { description: 'Created' },
          '400': { description: 'Validation failed' },
          '401': { description: 'Unauthorized' },
          '409': { description: 'Conflict' },
        },
      },
    },
    '/api/v1/bookings/{id}': {
      get: {
        tags: ['Bookings'],
        summary: 'Get booking by id',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'OK' },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Not found' },
        },
      },
      patch: {
        tags: ['Bookings'],
        summary: 'Booking action endpoint',
        description:
          'Action-based endpoint. Supported actions: cancel, change-flight, accept-reaccommodation, cancel-reaccommodation.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/BookingActionInput' },
            },
          },
        },
        responses: {
          '200': { description: 'OK' },
          '400': { description: 'Validation failed / unsupported action' },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Not found' },
          '409': { description: 'Conflict' },
        },
      },
      delete: {
        tags: ['Bookings'],
        summary: 'Cancel booking (alias)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'OK' },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Not found' },
          '409': { description: 'Already cancelled / conflict' },
        },
      },
    },
    '/api/v1/payments': {
      get: {
        tags: ['Payments'],
        summary: 'List payments',
        parameters: [
          { name: 'bookingId', in: 'query', schema: { type: 'string' } },
          { name: 'mine', in: 'query', schema: { type: 'boolean' } },
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
        ],
        responses: {
          '200': { description: 'OK' },
          '401': { description: 'Unauthorized' },
        },
      },
      post: {
        tags: ['Payments'],
        summary: 'Create payment',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreatePaymentInput' },
            },
          },
        },
        responses: {
          '201': { description: 'Created' },
          '400': { description: 'Validation failed' },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Booking not found' },
          '409': { description: 'Conflict' },
        },
      },
    },
    '/api/v1/payments/{id}': {
      get: {
        tags: ['Payments'],
        summary: 'Get payment by id',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'OK' },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Not found' },
        },
      },
      patch: {
        tags: ['Payments'],
        summary: 'Payment action endpoint',
        description: 'Action-based endpoint. Supported actions: mark-success, mark-failed, refund.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PaymentActionInput' },
            },
          },
        },
        responses: {
          '200': { description: 'OK' },
          '400': { description: 'Validation failed / unsupported action' },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Not found' },
          '409': { description: 'Conflict' },
        },
      },
    },
  },
  components: {
    schemas: {
      CreateBookingInput: {
        type: 'object',
        required: ['userId', 'flightId', 'totalPrice'],
        properties: {
          bookingRef: { type: 'string' },
          userId: { type: 'string' },
          flightId: { type: 'string' },
          totalPrice: { type: 'number' },
          currency: { type: 'string', minLength: 3, maxLength: 3, default: 'THB' },
          contactEmail: { type: 'string', format: 'email', nullable: true },
          contactPhone: { type: 'string', nullable: true },
          tickets: {
            type: 'array',
            minItems: 1,
            items: { $ref: '#/components/schemas/BookingTicketInput' },
          },
        },
      },
      GuestCreateBookingInput: {
        type: 'object',
        required: ['flightId', 'totalPrice', 'contactEmail'],
        properties: {
          bookingRef: { type: 'string' },
          flightId: { type: 'string' },
          totalPrice: { type: 'number' },
          currency: { type: 'string', minLength: 3, maxLength: 3, default: 'THB' },
          contactEmail: { type: 'string', format: 'email' },
          contactPhone: { type: 'string', nullable: true },
          guestName: { type: 'string' },
          tickets: {
            type: 'array',
            minItems: 1,
            items: { $ref: '#/components/schemas/BookingTicketInput' },
          },
        },
      },
      BookingTicketInput: {
        type: 'object',
        required: ['price', 'firstName', 'lastName'],
        properties: {
          class: { type: 'string', enum: ['ECONOMY', 'BUSINESS', 'FIRST_CLASS'] },
          seatNumber: { type: 'string', pattern: '^[\\d]{1,2}[A-Z]$' },
          price: { type: 'number' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          dateOfBirth: { type: 'string', format: 'date-time' },
          passportNumber: { type: 'string' },
          nationality: { type: 'string' },
          gender: { type: 'string' },
          seatSurcharge: { type: 'number' },
        },
      },
      BookingActionInput: {
        oneOf: [
          {
            type: 'object',
            required: ['action'],
            properties: { action: { type: 'string', enum: ['cancel'] } },
          },
          {
            type: 'object',
            required: ['action', 'newFlightId'],
            properties: {
              action: { type: 'string', enum: ['change-flight'] },
              newFlightId: { type: 'string' },
              reason: {
                type: 'string',
                enum: ['FLIGHT_CANCELLED', 'MAJOR_DELAY', 'ROUTE_DISRUPTION', 'AIRCRAFT_DOWNSIZE'],
              },
              keepSeatAssignments: { type: 'boolean' },
              totalPrice: { type: 'number' },
              currency: { type: 'string' },
            },
          },
          {
            type: 'object',
            required: ['action', 'newFlightId'],
            properties: {
              action: { type: 'string', enum: ['accept-reaccommodation'] },
              newFlightId: { type: 'string' },
              totalPrice: { type: 'number' },
              currency: { type: 'string' },
            },
          },
          {
            type: 'object',
            required: ['action'],
            properties: {
              action: { type: 'string', enum: ['cancel-reaccommodation'] },
              reason: { type: 'string' },
            },
          },
        ],
      },
      CreatePaymentInput: {
        type: 'object',
        required: ['bookingId', 'amount'],
        properties: {
          bookingId: { type: 'string' },
          amount: { type: 'number' },
          currency: { type: 'string', minLength: 3, maxLength: 3, default: 'THB' },
          paymentMethodType: { type: 'string' },
          paymentMethodRef: { type: 'string' },
          stripePaymentIntentId: { type: 'string' },
        },
      },
      PaymentActionInput: {
        oneOf: [
          {
            type: 'object',
            required: ['action'],
            properties: {
              action: { type: 'string', enum: ['mark-success'] },
              stripeChargeId: { type: 'string' },
            },
          },
          {
            type: 'object',
            required: ['action'],
            properties: {
              action: { type: 'string', enum: ['mark-failed'] },
              failureCode: { type: 'string' },
              failureMessage: { type: 'string' },
            },
          },
          {
            type: 'object',
            required: ['action'],
            properties: {
              action: { type: 'string', enum: ['refund'] },
              amount: { type: 'number' },
              reason: { type: 'string' },
            },
          },
        ],
      },
    },
  },
} as const;
