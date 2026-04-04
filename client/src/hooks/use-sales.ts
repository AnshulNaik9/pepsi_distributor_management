import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import type { Customer, InsertCustomer, Offer, InsertOffer, Order, CheckoutRequest, Expense, InsertExpense } from "@shared/schema";

export function useCustomers(routeId?: number) {
  return useQuery<Customer[]>({
    queryKey: [api.customers.list.path, routeId],
    queryFn: async () => {
      let url = api.customers.list.path;
      if (routeId) url += `?routeId=${routeId}`;
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

export function usePayCredit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = api.customers.payCredit.path.replace(':id', id.toString());
      const res = await fetch(url, { method: "POST" });
      if (!res.ok) throw new Error("Failed to clear credit balance");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.customers.list.path] })
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<InsertCustomer> }) => {
      const url = api.customers.update.path.replace(':id', id.toString());
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Failed to update customer");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.customers.list.path] })
  });
}

export function useOffers() {
  return useQuery<Offer[]>({
    queryKey: [api.offers.list.path],
    queryFn: async () => {
      const res = await fetch(api.offers.list.path);
      if (!res.ok) throw new Error("Failed to fetch offers");
      return res.json();
    }
  });
}

export function useCreateOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertOffer) => {
      const res = await fetch(api.offers.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Failed to create offer");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.offers.list.path] })
  });
}

export function useOrders() {
  return useQuery<Order[]>({
    queryKey: [api.orders.list.path],
    queryFn: async () => {
      const res = await fetch(api.orders.list.path);
      if (!res.ok) throw new Error("Failed to fetch orders");
      return res.json();
    }
  });
}

export function useCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CheckoutRequest) => {
      const res = await fetch(api.orders.checkout.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Checkout failed");
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.orders.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.trucks.stock.path, variables.truckId] });
    }
  });
}

export function useExpenses() {
  return useQuery<Expense[]>({
    queryKey: [api.expenses.list.path],
    queryFn: async () => {
      const res = await fetch(api.expenses.list.path);
      if (!res.ok) throw new Error("Failed to fetch expenses");
      return res.json();
    }
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertExpense) => {
      const res = await fetch(api.expenses.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Failed to log expense");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.expenses.list.path] })
  });
}
