import { z } from 'zod';
import { 
  insertProductSchema, patchProductSchema, insertRouteSchema, insertCustomerSchema, patchCustomerSchema,
  insertTruckSchema, insertOfferSchema, insertExpenseSchema,
  checkoutSchema, loadTruckSchema, returnStockSchema, reportDamageSchema
} from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  products: {
    list: {
      method: 'GET' as const,
      path: '/api/products' as const,
      responses: {
        200: z.array(z.any()), // array of Product
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/products' as const,
      input: insertProductSchema,
      responses: {
        201: z.any(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/products/:id' as const,
      input: patchProductSchema,
      responses: {
        200: z.any(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/products/:id' as const,
      responses: {
        204: z.any(),
        404: errorSchemas.notFound,
      },
    },
  },
  godownStock: {
    list: {
      method: 'GET' as const,
      path: '/api/godown-stock' as const,
      responses: {
        200: z.array(z.any()), // array of GodownStock with product
      },
    },
    add: {
      method: 'POST' as const,
      path: '/api/godown-stock' as const,
      input: z.object({ productId: z.number(), quantity: z.number() }),
      responses: {
        200: z.any(),
      },
    }
  },
  inventory: {
    damage: {
      method: 'POST' as const,
      path: '/api/inventory/damage' as const,
      input: reportDamageSchema,
      responses: { 200: z.any(), 400: errorSchemas.validation }
    }
  },
  trucks: {
    list: {
      method: 'GET' as const,
      path: '/api/trucks' as const,
      responses: {
        200: z.array(z.any()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/trucks' as const,
      input: insertTruckSchema,
      responses: { 201: z.any() }
    },
    load: {
      method: 'POST' as const,
      path: '/api/trucks/load' as const,
      input: loadTruckSchema,
      responses: { 200: z.any() }
    },
    returnStock: {
      method: 'POST' as const,
      path: '/api/trucks/return' as const,
      input: returnStockSchema,
      responses: { 200: z.any() }
    },
    stock: {
      method: 'GET' as const,
      path: '/api/trucks/:id/stock' as const,
      responses: { 200: z.array(z.any()) }
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/trucks/:id' as const,
      responses: {
        204: z.any(),
        404: errorSchemas.notFound,
      }
    }
  },
  routes: {
    list: {
      method: 'GET' as const,
      path: '/api/routes' as const,
      responses: { 200: z.array(z.any()) }
    },
    create: {
      method: 'POST' as const,
      path: '/api/routes' as const,
      input: insertRouteSchema,
      responses: { 201: z.any() }
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/routes/:id' as const,
      responses: {
        204: z.any(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      }
    }
  },
  customers: {
    list: {
      method: 'GET' as const,
      path: '/api/customers' as const,
      input: z.object({ routeId: z.coerce.number().optional() }).optional(),
      responses: { 200: z.array(z.any()) }
    },
    create: {
      method: 'POST' as const,
      path: '/api/customers' as const,
      input: insertCustomerSchema,
      responses: { 201: z.any() }
    },
    payCredit: {
      method: 'POST' as const,
      path: '/api/customers/:id/pay-credit' as const,
      responses: { 200: z.any() }
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/customers/:id' as const,
      input: patchCustomerSchema,
      responses: {
        200: z.any(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      }
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/customers/:id' as const,
      responses: {
        204: z.any(),
        404: errorSchemas.notFound,
      }
    },
    orders: {
      method: 'GET' as const,
      path: '/api/customers/:id/orders' as const,
      responses: { 200: z.array(z.any()) }
    },
    resetMonthly: {
      method: 'POST' as const,
      path: '/api/customers/:id/reset-monthly' as const,
      responses: { 200: z.any() }
    }
  },
  offers: {
    list: {
      method: 'GET' as const,
      path: '/api/offers' as const,
      responses: { 200: z.array(z.any()) }
    },
    create: {
      method: 'POST' as const,
      path: '/api/offers' as const,
      input: insertOfferSchema,
      responses: { 201: z.any() }
    }
  },
  orders: {
    list: {
      method: 'GET' as const,
      path: '/api/orders' as const,
      responses: { 200: z.array(z.any()) }
    },
    checkout: {
      method: 'POST' as const,
      path: '/api/orders/checkout' as const,
      input: checkoutSchema,
      responses: { 201: z.any(), 400: errorSchemas.validation }
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/orders/:id' as const,
      input: checkoutSchema,
      responses: { 200: z.any(), 400: errorSchemas.validation, 404: errorSchemas.notFound }
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/orders/:id' as const,
      responses: { 204: z.any(), 404: errorSchemas.notFound }
    }
  },
  expenses: {
    list: {
      method: 'GET' as const,
      path: '/api/expenses' as const,
      responses: { 200: z.array(z.any()) }
    },
    create: {
      method: 'POST' as const,
      path: '/api/expenses' as const,
      input: insertExpenseSchema,
      responses: { 201: z.any() }
    }
  },
  reports: {
    monthlyCSV: {
      method: 'GET' as const,
      path: '/api/reports/monthly-csv' as const,
      responses: { 200: z.any() }
    }
  },
  admin: {
    monthlyReset: {
      method: 'POST' as const,
      path: '/api/admin/monthly-reset' as const,
      responses: { 200: z.any() }
    },
    monthlyHistory: {
      method: 'GET' as const,
      path: '/api/admin/monthly-history' as const,
      responses: { 200: z.array(z.any()) }
    },
    availableMonths: {
      method: 'GET' as const,
      path: '/api/admin/available-months' as const,
      responses: { 200: z.array(z.string()) }
    },
    deletedOrders: {
      method: 'GET' as const,
      path: '/api/admin/deleted-orders' as const,
      responses: { 200: z.array(z.any()) }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
