// ==================== IMPORTS ====================
import React, { useState } from 'react'
import { toast } from 'sonner'
import { X, Users, Save } from 'lucide-react'
import { suppliersAPI } from '../services/api'
import { Supplier } from '../Pages/LowStock/types'

// ==================== TYPES ====================

interface SupplierModalProps {
  supplier?: Supplier | null
  onClose: () => void
  onSuccess: () => void
}

// ==================== HELPERS ====================

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_REGEX = /^\d{1,10}$/

const validateSupplierForm = (formData: any): Record<string, string> => {
  const errors: Record<string, string> = {}
  if (!formData.name.trim()) errors.name = 'Supplier name is required'
  if (formData.phone && !PHONE_REGEX.test(formData.phone)) errors.phone = 'Phone number must be up to 10 digits only'
  if (formData.email && !EMAIL_REGEX.test(formData.email)) errors.email = 'Please enter a valid email address'
  if (formData.averageLeadTimeDays < 1) errors.averageLeadTimeDays = 'Lead time must be at least 1 day'
  if (formData.rating < 1 || formData.rating > 5) errors.rating = 'Rating must be between 1 and 5'
  return errors
}

// ==================== COMPONENT ====================

const SupplierModal: React.FC<SupplierModalProps> = ({ supplier, onClose, onSuccess }) => {
  // ==================== STATE ====================

  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState({
    name:                 supplier?.name                 || '',
    email:                supplier?.email                || '',
    phone:                supplier?.phone                || '',
    contactPerson:        supplier?.contactPerson        || '',
    paymentTerms:         supplier?.paymentTerms         || 'net30',
    averageLeadTimeDays:  supplier?.averageLeadTimeDays  || 7,
    rating:               supplier?.rating               || 3,
    notes:                supplier?.notes                || '',
    address: {
      street:  supplier?.address?.street  || '',
      city:    supplier?.address?.city    || '',
      state:   supplier?.address?.state   || '',
      zipCode: supplier?.address?.zipCode || '',
      country: supplier?.address?.country || 'Nepal',
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
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors = validateSupplierForm(formData)
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return }

    try {
      setLoading(true)
      if (supplier) {
        await suppliersAPI.update(supplier._id, formData)
        toast.success('Supplier updated successfully')
      } else {
        await suppliersAPI.create(formData)
        toast.success('Supplier created successfully')
      }
      onSuccess()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save supplier')
    } finally {
      setLoading(false)
    }
  }

  // ==================== RENDER HELPERS ====================

  const textField = (label: string, fieldKey: string, type = 'text', placeholder = '', required = false, colSpan = '') => {
    const val = fieldKey.startsWith('address.')
      ? (formData.address as any)[fieldKey.split('.')[1]]
      : (formData as any)[fieldKey]
    return (
      <div className={colSpan}>
        <label className="block text-sm font-medium text-gray-700 mb-2">{label}{required && ' *'}</label>
        <input
          type={type}
          value={val ?? ''}
          onChange={e => {
            const value = fieldKey === 'phone'
              ? e.target.value.replace(/\D/g, '').slice(0, 10)
              : e.target.value
            handleInputChange(fieldKey, value)
          }}
          maxLength={fieldKey === 'phone' ? 10 : undefined}
          inputMode={fieldKey === 'phone' ? 'numeric' : undefined}
          pattern={fieldKey === 'phone' ? '[0-9]*' : undefined}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${errors[fieldKey] ? 'border-red-300' : 'border-gray-300'}`}
          placeholder={placeholder}
        />
        {errors[fieldKey] && <p className="text-sm text-red-600 mt-1">{errors[fieldKey]}</p>}
      </div>
    )
  }

  // ==================== RENDER ====================

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 rounded-lg"><Users className="w-5 h-5 text-teal-600" /></div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{supplier ? 'Edit Supplier' : 'New Supplier'}</h2>
              <p className="text-sm text-gray-600">{supplier ? 'Update supplier information' : 'Add a new supplier to your network'}</p>
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
              {textField('Supplier Name *', 'name', 'text', 'Enter supplier name', true)}
              {textField('Contact Person', 'contactPerson', 'text', 'Enter contact person name')}
              {textField('Email', 'email', 'email', 'Enter email address')}
              {textField('Phone', 'phone', 'tel', 'Enter phone number')}
            </div>
          </div>

          {/* Address */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Address</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {textField('Street Address', 'address.street', 'text', 'Enter street address', false, 'md:col-span-2')}
              {textField('City', 'address.city', 'text', 'Enter city')}
              {textField('State/Province', 'address.state', 'text', 'Enter state/province')}
              {textField('ZIP Code', 'address.zipCode', 'text', 'Enter ZIP code')}
              {textField('Country', 'address.country', 'text', 'Enter country')}
            </div>
          </div>

          {/* Business Terms */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Business Terms</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Terms</label>
                <select value={formData.paymentTerms} onChange={e => handleInputChange('paymentTerms', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent">
                  <option value="immediate">Immediate</option>
                  <option value="net15">Net 15 days</option>
                  <option value="net30">Net 30 days</option>
                  <option value="net45">Net 45 days</option>
                  <option value="net60">Net 60 days</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Lead Time (days)</label>
                <input type="number" min="1" value={formData.averageLeadTimeDays} onChange={e => handleInputChange('averageLeadTimeDays', parseInt(e.target.value) || 1)} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${errors.averageLeadTimeDays ? 'border-red-300' : 'border-gray-300'}`} />
                {errors.averageLeadTimeDays && <p className="text-sm text-red-600 mt-1">{errors.averageLeadTimeDays}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rating (1-5)</label>
                <select value={formData.rating} onChange={e => handleInputChange('rating', parseInt(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent">
                  <option value={1}>1 - Poor</option>
                  <option value={2}>2 - Fair</option>
                  <option value={3}>3 - Good</option>
                  <option value={4}>4 - Very Good</option>
                  <option value={5}>5 - Excellent</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea value={formData.notes} onChange={e => handleInputChange('notes', e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="Enter any additional notes about this supplier..." />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors">
              {loading
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><Save className="w-4 h-4" />{supplier ? 'Update Supplier' : 'Create Supplier'}</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default SupplierModal
