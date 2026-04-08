import React, { useRef, useEffect, useState, useCallback } from 'react'
import styles from './DetailPanel.module.css'

export interface FieldRowProps {
  label: string
  value: string | number | null
  onChange: (v: string) => void
  type?: 'text' | 'number' | 'textarea' | 'select'
  options?: Array<{ value: string; label: string }>
  placeholder?: string
  debounceMs?: number
  rows?: number
  autoGrow?: boolean
  grokTint?: boolean
  autocompleteItems?: string[]
  className?: string
}

export function FieldRow({
  label,
  value,
  onChange,
  type = 'text',
  options = [],
  placeholder,
  debounceMs = 800,
  rows = 3,
  autoGrow = false,
  grokTint = false,
  autocompleteItems,
  className,
}: FieldRowProps): React.ReactElement {
  const [localValue, setLocalValue] = useState<string>(value !== null ? String(value) : '')
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mirrorRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  // Keep local value in sync when external value changes (e.g. node switch)
  useEffect(() => {
    setLocalValue(value !== null ? String(value) : '')
  }, [value])

  // Auto-grow: sync mirror div and resize textarea
  useEffect(() => {
    if (!autoGrow || !mirrorRef.current || !textareaRef.current) return
    mirrorRef.current.textContent = localValue + '\u00a0'
    textareaRef.current.style.height = mirrorRef.current.offsetHeight + 'px'
  }, [localValue, autoGrow])

  const scheduleChange = useCallback(
    (newVal: string) => {
      if (timerRef.current !== null) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        onChange(newVal)
        timerRef.current = null
      }, debounceMs)
    },
    [onChange, debounceMs],
  )

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const newVal = e.target.value
    setLocalValue(newVal)
    scheduleChange(newVal)
    if (autocompleteItems && newVal.length > 0) {
      setShowAutocomplete(true)
    } else {
      setShowAutocomplete(false)
    }
  }

  const handleSelectAutocomplete = (item: string) => {
    setLocalValue(item)
    onChange(item)
    setShowAutocomplete(false)
  }

  const filteredAC = autocompleteItems
    ? autocompleteItems.filter((i) => i.toLowerCase().includes(localValue.toLowerCase()) && i !== localValue)
    : []

  const textareaClasses = [
    styles.fieldTextarea,
    grokTint ? styles.fieldTextareaGrok : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={`${styles.fieldRow} ${className ?? ''}`}>
      <div className={styles.fieldLabel}>{label}</div>

      {type === 'select' && (
        <select className={styles.fieldSelect} value={localValue} onChange={handleChange}>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}

      {type === 'textarea' && (
        <div style={{ position: 'relative' }}>
          {autoGrow && (
            <div
              ref={mirrorRef}
              aria-hidden="true"
              style={{
                position: 'absolute',
                visibility: 'hidden',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontSize: 13,
                lineHeight: 1.5,
                padding: '6px 10px',
                width: '100%',
                boxSizing: 'border-box',
                minHeight: 60,
              }}
            />
          )}
          <textarea
            ref={textareaRef}
            className={textareaClasses}
            value={localValue}
            onChange={handleChange}
            placeholder={placeholder}
            rows={rows}
            style={autoGrow ? { overflow: 'hidden' } : undefined}
          />
        </div>
      )}

      {(type === 'text' || type === 'number') && (
        <div className={autocompleteItems ? styles.autocompleteWrap : undefined}>
          <input
            className={styles.fieldInput}
            type={type}
            value={localValue}
            onChange={handleChange}
            placeholder={placeholder}
            onBlur={() => setTimeout(() => setShowAutocomplete(false), 150)}
            onFocus={() => {
              if (autocompleteItems && localValue.length > 0) setShowAutocomplete(true)
            }}
          />
          {autocompleteItems && showAutocomplete && filteredAC.length > 0 && (
            <div className={styles.autocompleteList}>
              {filteredAC.map((item) => (
                <div
                  key={item}
                  className={styles.autocompleteItem}
                  onMouseDown={() => handleSelectAutocomplete(item)}
                >
                  {item}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
