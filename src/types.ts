/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Item {
  id: string;
  name: string;
  price: number;
  category: 'Tea' | 'Addiction' | 'Snacks' | 'Biscuits' | 'Other';
  color: string;
  isSpecialCombo?: boolean;
  iconName?: string;
}

export interface CartItem extends Item {
  quantity: number;
}

export interface Order {
  id: string;
  items: CartItem[];
  total: number;
  timestamp: number;
  date: string; // YYYY-MM-DD for grouping
}

export interface DraftBill {
  id: string;
  items: CartItem[];
  name: string;
  updatedAt: number;
}

export interface DailySummary {
  date: string;
  totalSales: number;
  totalOrders: number;
  itemCounts: Record<string, number>;
  hourlySales: Record<number, number>; // Hour (0-23) -> Total
}
