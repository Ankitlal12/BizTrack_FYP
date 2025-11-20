import React, { useEffect, useState } from 'react'
import Layout from '../layout/Layout'

const Inventory = () => {
  const [items, setItems] = useState([])

  useEffect(() => {
    loadInventory()
  }, [])

  const loadInventory = () => {
    const mockInventory = [
      {
        id: 1,
        name: 'Laptop Pro X1',
        sku: 'LP-1001',
        category: 'Electronics',
        price: 1200.0,
        stock: 15,
      },
      {
        id: 2,
        name: 'Wireless Mouse',
        sku: 'WM-2002',
        category: 'Accessories',
        price: 24.99,
        stock: 32,
      },
      {
        id: 3,
        name: 'External SSD 1TB',
        sku: 'SSD-3010',
        category: 'Storage',
        price: 129.99,
        stock: 8,
      },
      {
        id: 4,
        name: 'Office Chair',
        sku: 'FN-4005',
        category: 'Furniture',
        price: 199.99,
        stock: 6,
      },
    ]

    setItems(mockInventory);
  }

  return (
    <Layout>
      <div className="p-4">
        <h2 className="text-2xl font-semibold text-gray-800">Inventory</h2>
        <p className="text-gray-600 mt-2">Your Inventory Items</p>

        {/* INVENTORY LIST */}
        <div className="mt-6 bg-white shadow rounded-lg p-4">
          {items.length === 0 ? (
            <p className="text-gray-500 text-sm">No items found.</p>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 text-left">
                  <th className="p-3">Name</th>
                  <th className="p-3">SKU</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Price</th>
                  <th className="p-3">Stock</th>
                </tr>
              </thead>

              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">{item.name}</td>
                    <td className="p-3">{item.sku}</td>
                    <td className="p-3">{item.category}</td>
                    <td className="p-3">${item.price}</td>
                    <td className="p-3">{item.stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  )
}

export default Inventory
