// ==================== IMPORTS ====================
import React, { useState } from 'react'
import { toast } from 'sonner'
import { X, Users, Save } from 'lucide-react'
import { customersAPI } from '../services/api'

// ==================== TYPES ====================

interface Customer {
  _id: string
  name: string
  phone: string
  email?: string
  address?: {
    street?: string
    city?: string
    state?: string
    zipCode?: string
    country?: string
  }
  notes?: string
  isActive: boolean
}

interface CustomerModalProps {
  customer?: Customer | null
  onClose: () => void
  onSuccess: () => void
}

// ==================== HELPERS ====================

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const validateCustomerForm = (formData: any): Record<string, string> => {
  const errors: Record<string, string> = {}
  if (!formData.name.trim()) errors.name = 'Customer name is required'
  if (!formData.phone.trim()) errors.phone = 'Phone number is required'
  if (formData.email && !EMAIL_REGEX.test(formData.email)) errors.email = 'Please enter a valid email address'
  return errors
}

// ==================== COMPONENT ====================

const CustomerModal: React.FC<CustomerModalProps> = ({ customer, onClose, onSuccess }) => {
  // ==================== STATE ====================

  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState({
    name: customer?.name || '',
    phone: customer?.phone || '',
    email: customer?.email || '',
    notes: customer?.notes || '',
    address: {
      street:  customer?.address?.street  || '',
      city:    customer?.address?.city    || '',
      state:   customer?.address?.state   || '',
      zipCode: customer?.address?.zipCode || '',
      country: customer?.address?.country || 'Nepal',
    },
  })

  // ==================== HANDLERS ====================

  const handleInputChange = (field: string, value: any) => {
    if (field.startsWith('address.')) {
      const key = field.split('.')[1]
      setFormData(prev => ({ ...prev, address: { ...prev.address, [key]: value } }))
    } else {
      setFormData(prev => ({ ...prev, [field]: value }))
    }
    // Clear field error on change
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors = validateCustomerForm(formData)
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return }

    try {
      setLoading(true)
      if (customer) {
        await customersAPI.update(customer._id, formData)
        toast.success('Customer updated successfully')
      } else {
        await customersAPI.create(formData)
        toast.success('Customer created successfully')
      }
      onSuccess()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save customer')
    } finally {
      setLoading(false)
    }
  }

  // ==================== RENDER HELPERS ====================

  const field = (
    label: string,
    fieldKey: string,
    type = 'text',
    placeholder = '',
    required = false,
    colSpan = ''
  ) => (
    <div className={colSpan}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={(fieldKey.startsWith('address.') ? (formData.address as any)[fieldKey.split('.')[1]] : (formData as any)[fieldKey]) ?? ''}
        onChange={e => handleInputChange(fieldKey, e.target.value)}
        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${errors[fieldKey] ? 'border-red-300' : 'border-gray-300'}`}
        placeholder={placeholder}
      />
      {errors[fieldKey] && <p className="text-sm text-red-600 mt-1">{errors[fieldKey]}</p>}
    </div>
  )

  // ==================== RENDER ====================

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 rounded-lg"><Users className="w-5 h-5 text-teal-600" /></div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{customer ? 'Edit Customer' : 'New Customer'}</h2>
              <p className="text-sm text-gray-600">{customer ? 'Update customer information' : 'Add a new customer'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {field('Customer Name', 'name', 'text', 'Enter customer name', true)}
              {field('Phone Number', 'phone', 'tel', 'Enter phone number', true)}
              {field('Email (Optional)', 'email', 'email', 'Enter email address', false, 'md:col-span-2')}
            </div>
          </div>

          {/* Address */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Address</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {field('Street Address', 'address.street', 'text', 'Enter street address', false, 'md:col-span-2')}
              {field('City', 'address.city', 'text', 'Enter city')}
              {field('State/Province', 'address.state', 'text', 'Enter state/province')}
              {field('ZIP Code', 'address.zipCode', 'text', 'Enter ZIP code')}
              {field('Country', 'address.country', 'text', 'Enter country')}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea
              value={formData.notes}
              onChange={e => handleInputChange('notes', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="Enter any additional notes about this customer..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors">
              {loading
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><Save className="w-4 h-4" />{customer ? 'Update Customer' : 'Create Customer'}</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CustomerModal
