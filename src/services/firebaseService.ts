import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  increment, 
  writeBatch,
  onSnapshot
} from 'firebase/firestore';
import { db, auth, OperationType, handleFirestoreError } from '../lib/firebase';
import { Order, Item, DailySummary, DraftBill } from '../types';

export const firebaseService = {
  async saveOrder(order: Order) {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    const batch = writeBatch(db);

    // Save order
    const orderRef = doc(db, 'users', userId, 'orders', order.id);
    batch.set(orderRef, order);

    // Update summary for the day
    const summaryRef = doc(db, 'users', userId, 'summaries', order.date);
    const summarySnap = await getDoc(summaryRef);
    
    if (summarySnap.exists()) {
      const current = summarySnap.data() as DailySummary;
      const newHourly = { ...current.hourlySales };
      const hour = new Date(order.timestamp).getHours();
      newHourly[hour] = (newHourly[hour] || 0) + order.total;

      const newItemCounts = { ...current.itemCounts };
      order.items.forEach(item => {
        newItemCounts[item.name] = (newItemCounts[item.name] || 0) + item.quantity;
      });

      batch.update(summaryRef, {
        totalSales: increment(order.total),
        totalOrders: increment(1),
        hourlySales: newHourly,
        itemCounts: newItemCounts
      });
    } else {
      const newSummary: DailySummary = {
        date: order.date,
        totalSales: order.total,
        totalOrders: 1,
        itemCounts: order.items.reduce((acc, item) => ({ ...acc, [item.name]: item.quantity }), {}),
        hourlySales: { [new Date(order.timestamp).getHours()]: order.total }
      };
      batch.set(summaryRef, newSummary);
    }

    // Update inventory
    order.items.forEach(item => {
      if (item.useStock) {
        const stockRef = doc(db, 'users', userId, 'inventory', item.id);
        batch.update(stockRef, { count: increment(-item.quantity) });
      }
    });

    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${userId}/orders`);
    }
  },

  async getCustomItems(): Promise<Item[]> {
    if (!auth.currentUser) return [];
    try {
      const q = collection(db, 'users', auth.currentUser.uid, 'items');
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data() as Item);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'items');
      return [];
    }
  },

  async syncInventory(items: Item[]) {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    const batch = writeBatch(db);
    
    items.forEach(item => {
      if (item.useStock) {
        const ref = doc(db, 'users', userId, 'inventory', item.id);
        batch.set(ref, { count: item.stock || 0, itemId: item.id }, { merge: true });
      }
    });
    
    await batch.commit();
  },

  async getSummaries(): Promise<DailySummary[]> {
    if (!auth.currentUser) return [];
    try {
      const q = collection(db, 'users', auth.currentUser.uid, 'summaries');
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data() as DailySummary).sort((a, b) => b.date.localeCompare(a.date));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'summaries');
      return [];
    }
  }
};
