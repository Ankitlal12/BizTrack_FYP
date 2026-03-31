import React, { useState, useMemo } from 'react'
import { Search, Plus, Package } from 'lucide-react'
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
  const [activeCategory, setActiveCategory] = useState('All')

  const categories = useMemo(() => {
    const cats = Array.from(new Set(filteredProducts.map(p => p.category)))
    return ['All', ...cats.sort()]
  }, [filteredProducts])

  // Reset category if it disappears from filtered results
  const safeCategory = categories.includes(activeCategory) ? activeCategory : 'All'

  const visibleProducts = useMemo(() => {
    if (safeCategory === 'All') return filteredProducts
    return filteredProducts.filter(p => p.category === safeCategory)
  }, [filteredProducts, safeCategory])

  const stockBadge = (stock: number) => {
    if (stock <= 0)  return { label: 'Out of stock', cls: 'bg-red-100 text-red-600' }
    if (stock < 5)   return { label: `${stock} left`, cls: 'bg-orange-100 text-orange-600' }
    return { label: `${stock} in stock`, cls: 'bg-green-100 text-green-700' }
  }

  return (
    <div className="flex flex-col gap-3 h-full min-h-0">
      {/* Search bar */}
      <div className="relative flex-shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search products..."
          className={`w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors ${
            validationError ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'
          }`}
          value={searchProduct}
          onChange={e => onSearchChange(e.target.value)}
        />
      </div>

      {validationError && (
        <p className="text-red-500 text-xs font-medium flex-shrink-0">{validationError}</p>
      )}

      {/* Category filter pills */}
      {categories.length > 2 && (
        <div className="flex gap-1.5 overflow-x-auto flex-shrink-0 pb-0.5">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                safeCategory === cat
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Product count */}
      {visibleProducts.length > 0 && (
        <p className="text-xs text-gray-400 flex-shrink-0">
          {visibleProducts.length} product{visibleProducts.length !== 1 ? 's' : ''}
          {safeCategory !== 'All' ? ` in ${safeCategory}` : ''}
        </p>
      )}

      {/* Product grid — fills remaining space and scrolls */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {visibleProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
              <Package className="w-7 h-7 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-500">No products found</p>
            <p className="text-xs text-gray-400 mt-1">Try a different search or category</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-2.5 pb-2">
            {visibleProducts.map(product => {
              const badge = stockBadge(product.stock)
              const outOfStock = product.stock <= 0
              return (
                <button
                  key={product.id}
                  onClick={() => !outOfStock && onAddToCart(product)}
                  disabled={outOfStock}
                  className={`relative flex flex-col p-3.5 rounded-xl border text-left transition-all duration-150 ${
                    outOfStock
                      ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                      : 'border-gray-200 bg-white hover:border-teal-400 hover:shadow-md hover:bg-teal-50 active:scale-95 cursor-pointer'
                  }`}
                >
                  {/* Product icon */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2.5 ${
                    outOfStock ? 'bg-gray-200' : 'bg-teal-100'
                  }`}>
                    <Package className={`w-4.5 h-4.5 ${outOfStock ? 'text-gray-400' : 'text-teal-600'}`} />
                  </div>

                  {/* Name */}
                  <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2 mb-1">
                    {product.name}
                  </p>

                  {/* Category */}
                  <p className="text-xs text-gray-400 mb-2">{product.category}</p>

                  {/* Price + stock row */}
                  <div className="flex items-end justify-between mt-auto gap-1">
                    <span className="text-sm font-bold text-teal-700">
                      Rs {product.price.toFixed(2)}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </div>

                  {/* Add button overlay (bottom-right) */}
                  {!outOfStock && (
                    <div className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-teal-600 flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                      <Plus className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default ProductSelection
