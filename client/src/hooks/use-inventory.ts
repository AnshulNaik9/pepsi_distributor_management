import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { Product, GodownStock, InsertProduct } from "@shared/schema";

const noStoreFetch = (input: string, init?: RequestInit) =>
  fetch(input, { ...init, cache: "no-store" });

export function useProducts() {
  return useQuery<Product[]>({
    queryKey: [api.products.list.path],
    queryFn: async () => {
      const res = await noStoreFetch(api.products.list.path);
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    }
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertProduct) => {
      const res = await fetch(api.products.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Failed to create product");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.products.list.path] })
  });
}

export function useGodownStock() {
  return useQuery<GodownStock[]>({
    queryKey: [api.godownStock.list.path],
    queryFn: async () => {
      const res = await noStoreFetch(api.godownStock.list.path);
      if (!res.ok) throw new Error("Failed to fetch godown stock");
      return res.json();
    }
  });
}

export function useAddGodownStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { productId: number, quantity: number }) => {
      const res = await noStoreFetch(api.godownStock.add.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Failed to add stock");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.godownStock.list.path] })
  });
}
export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<InsertProduct> }) => {
      const res = await noStoreFetch(buildUrl(api.products.update.path, { id }), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Failed to update product");
      return (await res.json()) as Product;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<Product[]>([api.products.list.path], (old) => {
        if (!old) return [updated];
        return old.map((p) => (p.id === updated.id ? updated : p));
      });
      void queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
    }
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await noStoreFetch(buildUrl(api.products.delete.path, { id }), {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Failed to delete product");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.godownStock.list.path] });
    }
  });
}
