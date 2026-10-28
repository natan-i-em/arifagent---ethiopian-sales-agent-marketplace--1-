'use client';

import React, { useEffect, useRef } from 'react';
import { useNotifications } from '@/context/NotificationContext';
import { useApp } from '@/context/AppContext';

export const AutoAlertWatcher: React.FC = () => {
  const { currentUser, products, businesses, orders, salesPartners, selectedSupplierId, selectedSalespersonId } = useApp();
  const { sendNotification, allNotifications } = useNotifications();
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    if (!currentUser) return;
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;

    // 1. Supplier Automated Stock & Reserve Checks
    if (currentUser.role === 'supplier') {
      const supplier = businesses.find(b => b.id === (currentUser.supplierId || selectedSupplierId)) || businesses[0];
      if (supplier) {
        // Low Reserve Wallet Check (< 5,000 ETB)
        const reserve = supplier.commissionReserveBalance || 0;
        const existingWalletAlert = allNotifications.find(
          n => n.type === 'wallet' && n.title.includes('Low Reserve') && !n.read
        );
        if (reserve < 5000 && !existingWalletAlert) {
          sendNotification({
            recipientRole: 'supplier',
            recipientId: supplier.id,
            type: 'wallet',
            title: 'Critical: Low Commission Reserve',
            message: `Your reserve balance is currently ETB ${reserve.toLocaleString()}. Maintain at least ETB 5,000 to keep checkout active for sales agents.`,
            severity: 'urgent',
            link: '/portal/supplier?tab=wallet',
            metadata: { amount: reserve }
          });
        }

        // Low Stock Inventory Check (stock <= 5)
        const myProducts = products.filter(p => p.supplierId === supplier.id);
        const lowStockProduct = myProducts.find(p => p.stock <= 5);
        const existingStockAlert = allNotifications.find(
          n => n.type === 'inventory' && n.metadata?.productId === lowStockProduct?.id && !n.read
        );

        if (lowStockProduct && !existingStockAlert) {
          sendNotification({
            recipientRole: 'supplier',
            recipientId: supplier.id,
            type: 'inventory',
            title: `Low Stock: ${lowStockProduct.name}`,
            message: `Only ${lowStockProduct.stock} unit(s) remaining for ${lowStockProduct.name}. Restock to avoid agent order cancellations.`,
            severity: 'warning',
            link: '/portal/supplier?tab=products',
            metadata: { productId: lowStockProduct.id, stockRemaining: lowStockProduct.stock, productName: lowStockProduct.name }
          });
        }
      }
    }

    // 2. Sales Agent Automated Escrow & Lead Checks
    if (currentUser.role === 'salesperson') {
      const agent = salesPartners.find(sp => sp.id === (currentUser.salespersonId || selectedSalespersonId)) || salesPartners[0];
      if (agent) {
        // Unlocked Escrow Ready for Withdrawal
        const eligible = agent.eligibleCommissions || 0;
        const existingPayoutAlert = allNotifications.find(
          n => n.type === 'escrow' && n.title.includes('Ready for Payout') && !n.read
        );

        if (eligible > 0 && !existingPayoutAlert) {
          sendNotification({
            recipientRole: 'salesperson',
            recipientId: agent.id,
            type: 'escrow',
            title: 'Commissions Ready for Payout',
            message: `ETB ${eligible.toLocaleString()} in cleared commissions is ready for immediate transfer to your Telebirr or CBE account.`,
            severity: 'success',
            link: '/portal/salesperson?tab=payouts',
            metadata: { amount: eligible }
          });
        }

        // Catalog Low Stock Notice (so agent knows urgency)
        const lowStockOffer = products.find(p => p.stock > 0 && p.stock <= 5);
        const existingOfferStockAlert = allNotifications.find(
          n => n.type === 'inventory' && n.metadata?.productId === lowStockOffer?.id && !n.read
        );

        if (lowStockOffer && !existingOfferStockAlert) {
          sendNotification({
            recipientRole: 'salesperson',
            recipientId: agent.id,
            type: 'inventory',
            title: `Limited Inventory: ${lowStockOffer.name}`,
            message: `Only ${lowStockOffer.stock} items left in stock for ${lowStockOffer.name}. Close your buyer leads before allocation ends!`,
            severity: 'warning',
            link: '/portal/salesperson?tab=offers',
            metadata: { productId: lowStockOffer.id, stockRemaining: lowStockOffer.stock, productName: lowStockOffer.name }
          });
        }
      }
    }
  }, [currentUser, products, businesses, orders, salesPartners, selectedSupplierId, selectedSalespersonId, allNotifications, sendNotification]);

  return null;
};
