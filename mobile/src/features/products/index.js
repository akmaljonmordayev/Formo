import { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api';
import { products as mockProducts } from '../../data/mockData';

/**
 * Provides a list of products.
 * On mount calls the live API; falls back to mock data on any error (including 404).
 *
 * @returns {{ products: object[], isLoading: boolean, error: Error|null, refetch: () => void }}
 */
export default function useProducts() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.products.list();
      setProducts(data || mockProducts);
    } catch (err) {
      // API not yet deployed — silently fall back to mock data
      setError(err instanceof Error ? err : new Error(String(err)));
      setProducts(mockProducts);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return { products, isLoading, error, refetch: fetchProducts };
}
