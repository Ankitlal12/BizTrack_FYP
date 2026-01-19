import React from 'react'
import { MinusIcon, PlusIcon, TrashIcon } from 'lucide-react'
import { CartItem } from '../types'

interface ShoppingCartProps {
  cartItems: CartItem[]
  onUpdateQuantity: (id: number | string, quantity: number) => void
  onRemoveItem: (id: number | string) => void
  subtotal: number
  tax: number
  total: number
}

const ShoppingCart: React.FC<ShoppingCartProps> = ({
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  subtotal,
  tax,
  total,
}) => {
  if (cartItems.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No items in cart. Add products to get started.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="max-h-80 overflow-y-auto">
        {cartItems.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between py-3 border-b"
          >
            <div className="flex-1">
              <h4 className="text-sm font-medium text-gray-900">
                {item.name}
              </h4>
              <div className="text-sm text-gray-500">
                Rs {item.price.toFixed(2)} each
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center border rounded-md">
                <button
                  onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                  className="px-2 py-1 text-gray-500 hover:text-gray-700"
                >
                  <MinusIcon size={14} />
                </button>
                <span className="px-2 text-sm">{item.quantity}</span>
                <button
                  onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                  className="px-2 py-1 text-gray-500 hover:text-gray-700"
                >
                  <PlusIcon size={14} />
                </button>
              </div>
              <div className="text-sm font-medium text-gray-900 w-16 text-right">
                Rs {item.total.toFixed(2)}
              </div>
              <button
                onClick={() => onRemoveItem(item.id)}
                className="text-red-500 hover:text-red-700"
              >
                <TrashIcon size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="border-t pt-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Subtotal</span>
          <span className="font-medium">Rs {subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm mt-2">
          <span className="text-gray-600">Tax (7%)</span>
          <span className="font-medium">Rs {tax.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-lg font-bold mt-2 pt-2 border-t">
          <span>Total</span>
          <span>Rs {total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  )
}

export default ShoppingCart

