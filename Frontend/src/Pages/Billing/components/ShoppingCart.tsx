import React from 'react'
import { Minus, Plus, Trash2, ShoppingCart as CartIcon } from 'lucide-react'
import { CartItem } from '../types'

interface ShoppingCartProps {
  cartItems: CartItem[]
  onUpdateQuantity: (id: number | string, quantity: number) => void
  onRemoveItem: (id: number | string) => void
  subtotal: number
  total: number
}

const ShoppingCart: React.FC<ShoppingCartProps> = ({
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  subtotal,
  total,
}) => {
  if (cartItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
          <CartIcon className="w-7 h-7 text-gray-400" />
        </div>
        <p className="text-sm font-semibold text-gray-500">Cart is empty</p>
        <p className="text-xs text-gray-400 mt-1">Click products on the left to add them</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-0 gap-3">
      {/* Scrollable items */}
      <div className="flex-1 overflow-y-auto min-h-0 space-y-2 pr-0.5">
        {cartItems.map(item => (
          <div
            key={item.id}
            className="flex items-center gap-2.5 p-2.5 bg-gray-50 rounded-xl border border-gray-100"
          >
            {/* Name + price */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-900 truncate">{item.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">Rs {item.price.toFixed(2)}</p>
            </div>

            {/* Qty stepper with direct typing support */}
            <div className="flex items-center bg-white border border-gray-200 rounded-lg overflow-hidden flex-shrink-0">
              <button
                onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                title="Decrease quantity"
                aria-label="Decrease quantity"
                className="w-6 h-6 flex items-center justify-center text-gray-500 hover:bg-teal-50 hover:text-teal-600 transition-colors"
              >
                <Minus className="w-3 h-3" />
              </button>
              <input
                type="number"
                min={1}
                value={item.quantity}
                onChange={(e) => {
                  const parsed = parseInt(e.target.value, 10)
                  if (Number.isNaN(parsed)) return
                  onUpdateQuantity(item.id, parsed)
                }}
                title="Quantity"
                aria-label="Quantity"
                placeholder="Qty"
                className="w-10 text-center text-xs font-bold text-gray-800 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button
                onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                title="Increase quantity"
                aria-label="Increase quantity"
                className="w-6 h-6 flex items-center justify-center text-gray-500 hover:bg-teal-50 hover:text-teal-600 transition-colors"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>

            {/* Line total */}
            <span className="text-xs font-bold text-gray-900 w-14 text-right flex-shrink-0">
              Rs {item.total.toFixed(2)}
            </span>

            {/* Remove */}
            <button
              onClick={() => onRemoveItem(item.id)}
              title="Remove item"
              aria-label="Remove item"
              className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Totals — always at bottom */}
      <div className="border-t border-gray-100 pt-3 space-y-1.5 flex-shrink-0">
        <div className="flex justify-between text-xs text-gray-500">
          <span>{cartItems.reduce((s, i) => s + i.quantity, 0)} items</span>
          <span>Rs {subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm font-bold text-gray-900">Total</span>
          <span className="text-lg font-extrabold text-teal-700">Rs {total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  )
}

export default ShoppingCart
