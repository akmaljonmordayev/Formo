import { useCallback, useMemo } from 'react';
import { api } from '../../services/api';

/**
 * Wraps the store's cart state with a checkout method that calls the live API.
 *
 * @param {object} store - The result of useAppStore().
 * @returns {{ cart: object[], addToCart: fn, removeFromCart: fn, clearCart: fn, total: number, checkout: (deliveryData: object) => Promise<object> }}
 */
export default function useCart(store) {
  const { cart, addToCart, removeFromCart, clearCart } = store;

  /** Sum of all cart item prices (item.price × item.quantity if present, else item.price). */
  const total = useMemo(
    () =>
      cart.reduce((sum, item) => {
        const qty = item.quantity != null ? item.quantity : 1;
        return sum + (item.price || 0) * qty;
      }, 0),
    [cart],
  );

  /**
   * Builds an order payload from the current cart + deliveryData,
   * sends it to the API, clears the cart on success, and returns the created order.
   * Throws on any API error so CartScreen can display an inline error message.
   *
   * @param {object} deliveryData - Delivery address / contact details.
   * @returns {Promise<object>} The created order object from the server.
   */
  const checkout = useCallback(
    async (deliveryData = {}) => {
      const payload = {
        items: cart.map((item) => ({
          productId: item.id,
          name: item.name,
          size: item.size,
          color: item.color,
          customName: item.customName,
          customNumber: item.customNumber,
          price: item.price,
          quantity: item.quantity != null ? item.quantity : 1,
        })),
        total,
        delivery: deliveryData,
      };

      // Throws on error — intentionally not caught here
      const createdOrder = await api.orders.checkout(payload);
      clearCart();
      return createdOrder;
    },
    [cart, total, clearCart],
  );

  return { cart, addToCart, removeFromCart, clearCart, total, checkout };
}
