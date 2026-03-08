import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { Product, GodownStock, InsertProduct } from "@shared/schema";

export function useProducts() {
  return useQuery<Product[]>({
    queryKey: [api.products.list.path],
    queryFn: async () => {
      const res = await fetch(api.products.list.path);
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
      const res = await fetch(api.godownStock.list.path);
      if (!res.ok) throw new Error("Failed to fetch godown stock");
      return res.json();
    }
  });
}

export function useAddGodownStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { productId: number, quantity: number }) => {
      const res = await fetch(api.godownStock.add.path, {
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
