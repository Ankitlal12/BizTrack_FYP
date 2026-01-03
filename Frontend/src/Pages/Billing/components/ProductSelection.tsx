import React from 'react'
import { Product } from '../types'

interface ProductSelectionProps {
  searchProduct: string
  onSearchChange: (value: string) => void
  filteredProducts: Product[]
  onAddToCart: (product: Product) => void
  validationError?: string
}

const ProductSelection: React.FC<ProductSelectionProps> = ({
  searchProduct,
  onSearchChange,
  filteredProducts,
  onAddToCart,
  validationError,
}) => {
  return (
    <>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search products by name, barcode or category..."
          className="w-full border border-gray-300 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-teal-500"
          value={searchProduct}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      {validationError && (
        <p className="text-red-500 text-sm mb-2">{validationError}</p>
      )}
      <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Price
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stock
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredProducts.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="font-medium text-gray-900">
                    {product.name}
                  </div>
                  <div className="text-xs text-gray-500">{product.barcode}</div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {product.category}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                  ${product.price.toFixed(2)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right">
                  <span
                    className={`text-sm ${
                      product.stock < 5
                        ? 'text-red-600 font-medium'
                        : 'text-gray-500'
                    }`}
                  >
                    {product.stock}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right">
                  <button
                    onClick={() => onAddToCart(product)}
                    className={`font-medium ${
                      product.stock > 0
                        ? 'text-teal-600 hover:text-teal-900'
                        : 'text-gray-400 cursor-not-allowed'
                    }`}
                    disabled={product.stock <= 0}
                  >
                    {product.stock > 0 ? 'Add' : 'Out of Stock'}
                  </button>
                </td>
              </tr>
            ))}
            {filteredProducts.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-3 text-center text-sm text-gray-500"
                >
                  No products found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

export default ProductSelection

