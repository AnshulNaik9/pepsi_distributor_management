import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPatch, apiDelete } from '../lib/api';

// Products
export function useProducts() {
  return useQuery({ queryKey: ['/api/products'], queryFn: () => apiGet('/api/products') });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiPost('/api/products', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['/api/products'] }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiPatch(`/api/products/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['/api/products'] }),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/api/products/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/products'] });
      qc.invalidateQueries({ queryKey: ['/api/godown-stock'] });
    },
  });
}

// Godown Stock
export function useGodownStock() {
  return useQuery({ queryKey: ['/api/godown-stock'], queryFn: () => apiGet('/api/godown-stock') });
}

export function useAddGodownStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { productId: string; quantity: number }) => apiPost('/api/godown-stock', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['/api/godown-stock'] }),
  });
}

// Trucks
export function useTrucks() {
  return useQuery({ queryKey: ['/api/trucks'], queryFn: () => apiGet('/api/trucks') });
}

export function useCreateTruck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiPost('/api/trucks', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['/api/trucks'] }),
  });
}

export function useTruckStock(truckId: string | undefined) {
  return useQuery({
    queryKey: ['/api/trucks', truckId, 'stock'],
    queryFn: () => apiGet(`/api/trucks/${truckId}/stock`),
    enabled: !!truckId,
  });
}

export function useLoadTruck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiPost('/api/trucks/load', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/trucks'] });
      qc.invalidateQueries({ queryKey: ['/api/godown-stock'] });
    },
  });
}

export function useReturnStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiPost('/api/trucks/return', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/trucks'] });
      qc.invalidateQueries({ queryKey: ['/api/godown-stock'] });
    },
  });
}

export function useDeleteTruck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/api/trucks/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/trucks'] });
      qc.invalidateQueries({ queryKey: ['/api/godown-stock'] });
    },
  });
}

// Routes
export function useRoutes() {
  return useQuery({ queryKey: ['/api/routes'], queryFn: () => apiGet('/api/routes') });
}

export function useCreateRoute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiPost('/api/routes', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['/api/routes'] }),
  });
}

export function useDeleteRoute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/api/routes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['/api/routes'] }),
  });
}

// Customers
export function useCustomers(routeId?: string) {
  return useQuery({
    queryKey: ['/api/customers', routeId],
    queryFn: () => apiGet(routeId ? `/api/customers?routeId=${routeId}` : '/api/customers'),
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiPost('/api/customers', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['/api/customers'] }),
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiPatch(`/api/customers/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['/api/customers'] }),
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/api/customers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['/api/customers'] }),
  });
}

export function usePayCredit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiPost(`/api/customers/${id}/pay-credit`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['/api/customers'] }),
  });
}

export function useCustomerOrders(customerId: string | undefined) {
  return useQuery({
    queryKey: ['/api/customers', customerId, 'orders'],
    queryFn: () => apiGet(`/api/customers/${customerId}/orders`),
    enabled: !!customerId,
  });
}

// Offers
export function useOffers() {
  return useQuery({ queryKey: ['/api/offers'], queryFn: () => apiGet('/api/offers') });
}

export function useCreateOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiPost('/api/offers', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['/api/offers'] }),
  });
}

// Orders
export function useOrders() {
  return useQuery({ queryKey: ['/api/orders'], queryFn: () => apiGet('/api/orders') });
}

export function useCheckout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiPost('/api/orders/checkout', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/orders'] });
      qc.invalidateQueries({ queryKey: ['/api/trucks'] });
      qc.invalidateQueries({ queryKey: ['/api/customers'] });
      qc.invalidateQueries({ queryKey: ['/api/godown-stock'] });
    },
  });
}

export function useUpdateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiPatch(`/api/orders/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/orders'] });
      qc.invalidateQueries({ queryKey: ['/api/trucks'] });
      qc.invalidateQueries({ queryKey: ['/api/customers'] });
    },
  });
}

export function useDeleteOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/api/orders/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/orders'] });
      qc.invalidateQueries({ queryKey: ['/api/trucks'] });
      qc.invalidateQueries({ queryKey: ['/api/customers'] });
      qc.invalidateQueries({ queryKey: ['/api/godown-stock'] });
    },
  });
}

// Expenses
export function useExpenses() {
  return useQuery({ queryKey: ['/api/expenses'], queryFn: () => apiGet('/api/expenses') });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiPost('/api/expenses', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['/api/expenses'] }),
  });
}

// Admin
export function useDeletedOrders() {
  return useQuery({ queryKey: ['/api/admin/deleted-orders'], queryFn: () => apiGet('/api/admin/deleted-orders') });
}

export function useMonthlyHistory(month: string | undefined) {
  return useQuery({
    queryKey: ['/api/admin/monthly-history', month],
    queryFn: () => apiGet(`/api/admin/monthly-history?month=${month}`),
    enabled: !!month,
  });
}

export function useAvailableMonths() {
  return useQuery({ queryKey: ['/api/admin/available-months'], queryFn: () => apiGet('/api/admin/available-months') });
}

export function useReportDamage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiPost('/api/inventory/damage', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/godown-stock'] });
      qc.invalidateQueries({ queryKey: ['/api/trucks'] });
    },
  });
}
