import React from 'react'
import { CheckCircleIcon, XIcon, PrinterIcon } from 'lucide-react'
import { SaleData } from '../types'
import { formatDate } from '../utils/billingUtils'

interface SaleReceiptProps {
  saleData: SaleData
  paymentMethod: string
  onStartNewSale: () => void
}

const SaleReceipt: React.FC<SaleReceiptProps> = ({
  saleData,
  paymentMethod,
  onStartNewSale,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Sale Complete</h2>
          <p className="text-green-600 flex items-center">
            <CheckCircleIcon size={18} className="mr-1" />
            Transaction successful
          </p>
        </div>
        <button
          onClick={onStartNewSale}
          className="text-gray-500 hover:text-gray-700"
        >
          <XIcon size={24} />
        </button>
      </div>
      <div className="border-b pb-4 mb-4">
        <div className="flex justify-between mb-2">
          <span className="font-medium">Invoice #:</span>
          <span>{saleData.invoiceNumber}</span>
        </div>
        <div className="flex justify-between mb-2">
          <span className="font-medium">Date:</span>
          <span>{formatDate(saleData.date)}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium">Payment Method:</span>
          <span>
            {paymentMethod === 'cash' ? 'Cash' : 'Credit/Debit Card'}
          </span>
        </div>
      </div>
      <div className="mb-4">
        <h3 className="font-medium mb-2">Customer Information</h3>
        <p className="text-gray-800">{saleData.customer.name}</p>
        <p className="text-gray-600 text-sm">{saleData.customer.email}</p>
        <p className="text-gray-600 text-sm">{saleData.customer.phone}</p>
      </div>
      <div className="mb-4">
        <h3 className="font-medium mb-2">Items Purchased</h3>
        <table className="min-w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Item</th>
              <th className="text-right py-2">Qty</th>
              <th className="text-right py-2">Price</th>
              <th className="text-right py-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {saleData.items.map((item) => (
              <tr key={item.id} className="border-b">
                <td className="py-2">{item.name}</td>
                <td className="text-right py-2">{item.quantity}</td>
                <td className="text-right py-2">Rs {item.price.toFixed(2)}</td>
                <td className="text-right py-2">Rs {item.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} className="text-right py-2 font-medium">
                Subtotal:
              </td>
              <td className="text-right py-2">
                Rs {saleData.subtotal.toFixed(2)}
              </td>
            </tr>
            <tr>
              <td colSpan={3} className="text-right py-2 font-medium">
                Tax (7%):
              </td>
              <td className="text-right py-2">Rs {saleData.tax.toFixed(2)}</td>
            </tr>
            <tr>
              <td colSpan={3} className="text-right py-2 font-bold">
                Total:
              </td>
              <td className="text-right py-2 font-bold">
                Rs {saleData.total.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      {saleData.notes && (
        <div className="mb-4">
          <h3 className="font-medium mb-2">Notes</h3>
          <p className="text-gray-600 text-sm">{saleData.notes}</p>
        </div>
      )}
      <div className="flex justify-end space-x-3 mt-6">
        <button className="bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded-lg">
          Email Receipt
        </button>
        <button className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg flex items-center">
          <PrinterIcon size={18} className="mr-1" />
          Print Receipt
        </button>
        <button
          onClick={onStartNewSale}
          className="bg-teal-500 hover:bg-teal-600 text-white py-2 px-4 rounded-lg"
        >
          New Sale
        </button>
      </div>
    </div>
  )
}

export default SaleReceipt

