'use client';

import React, { createContext, useContext } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi, businessesApi, salesPartnersApi } from '../lib/api';
import { Product, Business, SalesPartnerProfile, VerificationStatus, SupplierPaymentAccount } from '../types';

interface CatalogContextType {
  products: Product[];
  businesses: Business[];
  salesPartners: SalesPartnerProfile[];
  isLoadingCatalog: boolean;
  createProduct: (product: Partial<Product>) => boolean;
  updateProduct: (productId: string, updates: Partial<Product>) => boolean;
  deleteProduct: (productId: string, permanent?: boolean) => boolean;
  enrollSalesperson: (salespersonId: string, productId: string) => boolean;
  updateBusinessProfile: (businessId: string, updates: Partial<Business>) => Promise<boolean>;
  verifyBusiness: (businessId: string, status: VerificationStatus) => boolean;
  addPaymentAccount: (businessId: string, accountData: Omit<SupplierPaymentAccount, 'id' | 'verified'>) => Promise<boolean>;
  deletePaymentAccount: (businessId: string, accountId: string) => Promise<boolean>;
}

const CatalogContext = createContext<CatalogContextType | undefined>(undefined);

export const CatalogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();

  const { data: productsData, isLoading: loadingProducts } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.getAll(),
  });

  const { data: businessesData, isLoading: loadingBusinesses } = useQuery({
    queryKey: ['businesses'],
    queryFn: () => businessesApi.getAll(),
  });

  const { data: salesPartnersData, isLoading: loadingSalesPartners } = useQuery({
    queryKey: ['salesPartners'],
    queryFn: () => salesPartnersApi.getAll(),
  });

  const products = productsData?.products || [];
  const businesses = businessesData?.businesses || [];
  const salesPartners = salesPartnersData?.salesPartners || [];

  // Mutations
  const createProductMutation = useMutation({
    mutationFn: (data: Partial<Product>) => productsApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Product> }) => productsApi.update(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });

  const deleteProductMutation = useMutation({
    mutationFn: ({ id, permanent }: { id: string; permanent?: boolean }) => productsApi.delete(id, permanent),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });

  const enrollMutation = useMutation({
    mutationFn: (productId: string) => productsApi.enroll(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesPartners'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const updateBusinessMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Business> }) => businessesApi.update(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['businesses'] }),
  });

  const verifyBusinessMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => businessesApi.verify(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['businesses'] }),
  });

  const addPaymentAccountMutation = useMutation({
    mutationFn: ({ id, accountData }: { id: string; accountData: any }) => businessesApi.addPaymentAccount(id, accountData),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['businesses'] }),
  });

  const deletePaymentAccountMutation = useMutation({
    mutationFn: ({ id, accountId }: { id: string; accountId: string }) => businessesApi.deletePaymentAccount(id, accountId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['businesses'] }),
  });

  const createProduct = (product: Partial<Product>): boolean => {
    createProductMutation.mutate(product);
    return true;
  };

  const updateProduct = (productId: string, updates: Partial<Product>): boolean => {
    updateProductMutation.mutate({ id: productId, updates });
    return true;
  };

  const deleteProduct = (productId: string, permanent = false): boolean => {
    deleteProductMutation.mutate({ id: productId, permanent });
    return true;
  };

  const enrollSalesperson = (_salespersonId: string, productId: string): boolean => {
    enrollMutation.mutate(productId);
    return true;
  };

  const updateBusinessProfile = async (businessId: string, updates: Partial<Business>): Promise<boolean> => {
    try {
      await updateBusinessMutation.mutateAsync({ id: businessId, updates });
      return true;
    } catch {
      return false;
    }
  };

  const verifyBusiness = (businessId: string, status: VerificationStatus): boolean => {
    verifyBusinessMutation.mutate({ id: businessId, status });
    return true;
  };

  const addPaymentAccount = async (
    businessId: string,
    accountData: Omit<SupplierPaymentAccount, 'id' | 'verified'>
  ): Promise<boolean> => {
    try {
      await addPaymentAccountMutation.mutateAsync({ id: businessId, accountData });
      return true;
    } catch {
      return false;
    }
  };

  const deletePaymentAccount = async (businessId: string, accountId: string): Promise<boolean> => {
    try {
      await deletePaymentAccountMutation.mutateAsync({ id: businessId, accountId });
      return true;
    } catch {
      return false;
    }
  };

  return (
    <CatalogContext.Provider
      value={{
        products,
        businesses,
        salesPartners,
        isLoadingCatalog: loadingProducts || loadingBusinesses || loadingSalesPartners,
        createProduct,
        updateProduct,
        deleteProduct,
        enrollSalesperson,
        updateBusinessProfile,
        verifyBusiness,
        addPaymentAccount,
        deletePaymentAccount,
      }}
    >
      {children}
    </CatalogContext.Provider>
  );
};

export const useCatalog = () => {
  const context = useContext(CatalogContext);
  if (!context) throw new Error('useCatalog must be used within a CatalogProvider');
  return context;
};
