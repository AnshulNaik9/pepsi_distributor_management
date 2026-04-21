import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { Truck, Route, Customer, InsertTruck, InsertRoute, InsertCustomer, LoadTruckRequest, ReturnStockRequest, TruckStock, Order } from "@shared/schema";

export function useTrucks() {
  return useQuery<Truck[]>({
    queryKey: [api.trucks.list.path],
    queryFn: async () => {
      const res = await fetch(api.trucks.list.path);
      if (!res.ok) throw new Error("Failed to fetch trucks");
      return res.json();
    }
  });
}

export function useCreateTruck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertTruck) => {
      const res = await fetch(api.trucks.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Failed to create truck");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.trucks.list.path] })
  });
}

export function useTruckStock(truckId: number | undefined) {
  return useQuery<TruckStock[]>({
    queryKey: [api.trucks.stock.path, truckId],
    queryFn: async () => {
      if (!truckId) return [];
      const url = buildUrl(api.trucks.stock.path, { id: truckId });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch truck stock");
      return res.json();
    },
    enabled: !!truckId
  });
}

export function useLoadTruck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: LoadTruckRequest) => {
      const res = await fetch(api.trucks.load.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || "Failed to load truck");
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.trucks.stock.path, variables.truckId] });
      queryClient.invalidateQueries({ queryKey: [api.godownStock.list.path] });
    }
  });
}

export function useReturnStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: ReturnStockRequest) => {
      const res = await fetch(api.trucks.returnStock.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Failed to return stock");
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.trucks.stock.path, variables.truckId] });
      queryClient.invalidateQueries({ queryKey: [api.godownStock.list.path] });
    }
  });
}

export function useDeleteTruck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(buildUrl(api.trucks.delete.path, { id }), {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || "Failed to delete truck");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.trucks.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.godownStock.list.path] });
    }
  });
}

export function useRoutes() {
  return useQuery<Route[]>({
    queryKey: [api.routes.list.path],
    queryFn: async () => {
      const res = await fetch(api.routes.list.path);
      if (!res.ok) throw new Error("Failed to fetch routes");
      return res.json();
    }
  });
}

export function useCreateRoute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertRoute) => {
      const res = await fetch(api.routes.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Failed to create route");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.routes.list.path] })
  });
}

export function useDeleteRoute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(buildUrl(api.routes.delete.path, { id }), {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || "Failed to delete route");
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.routes.list.path] })
  });
}

export function useCustomers(routeId?: number) {
  return useQuery<Customer[]>({
    queryKey: [api.customers.list.path, routeId],
    queryFn: async () => {
      const url = routeId 
        ? buildUrl(api.customers.list.path, { routeId }) 
        : api.customers.list.path;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch customers");
      return res.json();
    }
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertCustomer) => {
      const res = await fetch(api.customers.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Failed to create customer");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.customers.list.path] })
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(buildUrl(api.customers.delete.path, { id }), {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || "Failed to delete customer");
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.customers.list.path] })
  });
}

export function useCustomerOrders(customerId: number | undefined) {
  return useQuery<Order[]>({
    queryKey: [api.customers.orders.path, customerId],
    queryFn: async () => {
      if (!customerId) return [];
      const url = buildUrl(api.customers.orders.path, { id: customerId });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch customer orders");
      return res.json();
    },
    enabled: !!customerId
  });
}

export function useResetCustomerMonthlyData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (customerId: number) => {
      const res = await fetch(buildUrl(api.customers.resetMonthly.path, { id: customerId }), {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || "Failed to reset customer data");
      }
      return res.json();
    },
    onSuccess: (_, customerId) => {
      queryClient.invalidateQueries({ queryKey: [api.customers.orders.path, customerId] });
      queryClient.invalidateQueries({ queryKey: [api.customers.list.path] });
    }
  });
}
