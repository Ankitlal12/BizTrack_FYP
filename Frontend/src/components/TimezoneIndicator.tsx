import React from 'react'
import { ClockIcon } from 'lucide-react'

interface TimezoneIndicatorProps {
  className?: string
  showIcon?: boolean
}

const TimezoneIndicator: React.FC<TimezoneIndicatorProps> = ({ 
  className = "text-xs text-gray-500", 
  showIcon = true 
}) => {
  return (
    <span className={`inline-flex items-center ${className}`}>
      {showIcon && <ClockIcon size={12} className="mr-1" />}
      Nepal Time (NPT)
    </span>
  )
}

export default TimezoneIndicator