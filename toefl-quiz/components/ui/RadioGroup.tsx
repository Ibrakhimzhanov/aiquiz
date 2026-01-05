'use client'

import { cn } from '@/lib/utils'

interface RadioOption {
  value: string
  label: string
  description?: string
}

interface RadioGroupProps {
  name: string
  options: RadioOption[]
  value: string
  onChange: (value: string) => void
  className?: string
}

export function RadioGroup({ name, options, value, onChange, className }: RadioGroupProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {options.map((option) => (
        <label
          key={option.value}
          className={cn(
            'flex items-start p-4 rounded-lg border-2 cursor-pointer transition-all duration-200',
            value === option.value
              ? 'border-primary-600 bg-primary-50'
              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
          )}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={(e) => onChange(e.target.value)}
            className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500"
          />
          <div className="ml-3">
            <span className={cn(
              'font-medium',
              value === option.value ? 'text-primary-900' : 'text-gray-900'
            )}>
              {option.label}
            </span>
            {option.description && (
              <p className="text-sm text-gray-500 mt-0.5">{option.description}</p>
            )}
          </div>
        </label>
      ))}
    </div>
  )
}
