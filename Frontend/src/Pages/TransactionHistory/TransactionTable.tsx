import React, { Fragment } from 'react'
import { ArrowDownIcon, ArrowUpIcon } from 'lucide-react'
import TransactionDetails from './TransactionDetails'
import { Transaction } from './types'

interface Props {
  transactions: Transaction[]
  expandedId: string | null
  onToggle: (id: string) => void
}

const TransactionTable: React.FC<Props> = ({ transactions, expandedId, onToggle }) => {
  const getBadge = (type: string) =>
    type === 'sale' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50">
            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Transaction ID
            </th>
            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Type
            </th>
            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Summary
            </th>
            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Total
            </th>
            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
            <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {transactions.map((transaction) => (
            <Fragment key={transaction.id}>
              <tr className="hover:bg-gray-50">
                <td className="py-4 px-4 whitespace-nowrap">
                  <div className="font-medium text-blue-600">{transaction.id}</div>
                  {transaction.reference && (
                    <div className="text-xs text-gray-500">Ref: {transaction.reference}</div>
                  )}
                </td>
                <td className="py-4 px-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getBadge(
                      transaction.type,
                    )}`}
                  >
                    {transaction.type === 'sale' ? (
                      <ArrowUpIcon size={12} className="mr-1" />
                    ) : (
                      <ArrowDownIcon size={12} className="mr-1" />
                    )}
                    <span className="capitalize">{transaction.type}</span>
                  </span>
                </td>
                <td className="py-4 px-4 whitespace-nowrap">
                  <div className="font-medium text-gray-900">
                    {transaction.itemSummary || 'Items'}
                  </div>
                  {transaction.counterpartName && (
                    <div className="text-xs text-gray-500">
                      {transaction.type === 'sale' ? 'Customer' : 'Supplier'}:{' '}
                      {transaction.counterpartName}
                    </div>
                  )}
                </td>
                <td className="py-4 px-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    ${transaction.total.toFixed(2)}
                  </div>
                </td>
                <td className="py-4 px-4 whitespace-nowrap text-sm text-gray-500">
                  <div>{new Date(transaction.date).toLocaleDateString()}</div>
                  <div className="text-xs text-gray-400">{transaction.day}</div>
                </td>
                <td className="py-4 px-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => onToggle(transaction.id)}
                    className="text-teal-600 hover:text-teal-900"
                  >
                    {expandedId === transaction.id ? 'Hide Details' : 'View Details'}
                  </button>
                </td>
              </tr>
              {expandedId === transaction.id && (
                <tr>
                  <td colSpan={6} className="bg-gray-50 p-4">
                    <TransactionDetails transaction={transaction} />
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default TransactionTable

