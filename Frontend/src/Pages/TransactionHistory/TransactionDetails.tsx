import React from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowDownIcon, ArrowUpIcon, CalendarIcon, PackageIcon } from 'lucide-react'
import { Transaction } from './types'
import { invoicesAPI } from '../../services/api'

interface Props {
  transaction: Transaction
}

const TransactionDetails: React.FC<Props> = ({ transaction }) => {
  const navigate = useNavigate()

  const handleViewInvoice = async () => {
    try {
      // Determine the type for the API query
      const invoiceType = transaction.type === 'sale' ? 'sale' : 'purchase'
      
      // Query invoices by the transaction's database ID
      const response = await invoicesAPI.getAll(`relatedId=${transaction.dbId}&type=${invoiceType}`)
      
      if (response.invoices && response.invoices.length > 0) {
        const invoice = response.invoices[0]
        // Navigate directly to the individual invoice detail page
        navigate(`/invoices/${invoice._id}`)
      } else {
        toast.error(`No invoice found for this ${transaction.type}`)
      }
    } catch (error: any) {
      console.error('Error finding invoice:', error)
      toast.error(`Failed to find invoice for this ${transaction.type}`)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-3 rounded border border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Transaction Details</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Transaction ID:</span>
              <span className="text-sm font-medium text-gray-900">{transaction.id}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Type:</span>
              <span
                className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
                  transaction.type === 'sale'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-blue-100 text-blue-800'
                }`}
              >
                {transaction.type === 'sale' ? (
                  <ArrowUpIcon size={12} className="mr-1" />
                ) : (
                  <ArrowDownIcon size={12} className="mr-1" />
                )}
                <span className="capitalize">{transaction.type}</span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Date:</span>
              <span className="text-sm font-medium text-gray-900 flex items-center">
                <CalendarIcon size={14} className="mr-1 text-gray-400" />
                {new Date(transaction.date).toLocaleDateString()} ({transaction.day})
              </span>
            </div>
            {transaction.counterpartName && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  {transaction.type === 'sale' ? 'Customer' : 'Supplier'}:
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {transaction.counterpartName}
                </span>
              </div>
            )}
            {transaction.reference && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Reference:</span>
                <span className="text-sm font-medium text-blue-600">
                  {transaction.reference}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="bg-white p-3 rounded border border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Items</h3>
          <div className="space-y-2">
            {transaction.items.map((item, idx) => (
              <div key={`${transaction.id}-item-${idx}`} className="flex items-start">
                <PackageIcon size={16} className="text-gray-400 mr-2 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{item.name}</p>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Quantity:</span>
                      <span className="font-medium text-gray-900">{item.quantity}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Unit Price:</span>
                      <span className="font-medium text-gray-900">
                        Rs {item.price.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm pt-1 border-t">
                      <span className="text-gray-700 font-medium">Total:</span>
                      <span className="font-bold text-gray-900">Rs {item.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {transaction.items.length === 0 && (
              <p className="text-sm text-gray-500">No items recorded for this transaction.</p>
            )}
          </div>
        </div>
      </div>
      {transaction.reference && (
        <div className="bg-blue-50 border border-blue-200 rounded p-3">
          <p className="text-sm text-blue-800">
            <span className="font-medium">Linked document:</span>{' '}
            {transaction.type === 'sale' ? 'Invoice' : 'Purchase Order'}{' '}
            <span className="font-medium">{transaction.reference}</span>
          </p>
        </div>
      )}
      <div className="flex justify-end space-x-2">
        <button className="bg-white border border-gray-300 text-gray-700 py-1 px-3 rounded text-sm hover:bg-gray-50">
          Print
        </button>
        <button className="bg-white border border-gray-300 text-gray-700 py-1 px-3 rounded text-sm hover:bg-gray-50">
          Export
        </button>
        {transaction.reference && (
          <button 
            onClick={handleViewInvoice}
            className="bg-teal-500 hover:bg-teal-600 text-white py-1 px-3 rounded text-sm"
          >
            View Invoice
          </button>
        )}
      </div>
    </div>
  )
}

export default TransactionDetails

