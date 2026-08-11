import React, { useState, useRef, useEffect, useMemo } from 'react';

// Helper to remove accents for fuzzy matching
const normalizeStr = (str) => {
  if (!str) return '';
  return str
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

export default function SearchableSelect({
  options = [],
  value = '',
  onChange,
  placeholder = '🔍 Escribe para buscar...',
  getOptionLabel = (opt) => opt?.name || opt?.label || opt?.title || String(opt || ''),
  getOptionValue = (opt) => opt?.id !== undefined ? opt.id : (opt?.value !== undefined ? opt.value : opt),
  getOptionSubtext = (opt) => opt?.subtext || opt?.sku || opt?.rfc || (typeof opt?.category === 'object' && opt?.category !== null ? opt.category.name : opt?.category) || '',
  disabled = false,
  required = false,
  name,
  className = '',
  style = {},
  emptyMessage = 'No se encontraron resultados'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Find currently selected option object
  const selectedOption = useMemo(() => {
    if (value === '' || value === null || value === undefined) return null;
    return options.find(opt => String(getOptionValue(opt)) === String(value)) || null;
  }, [options, value, getOptionValue]);

  // Sync display text when value or selected option changes
  useEffect(() => {
    if (selectedOption) {
      setSearchTerm(getOptionLabel(selectedOption));
    } else if (!value) {
      setSearchTerm('');
    }
  }, [selectedOption, value, getOptionLabel]);

  // Filter options based on typed search term
  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    const normSearch = normalizeStr(searchTerm);
    
    // If the search term exactly equals the selected option label, return all options
    if (selectedOption && normalizeStr(getOptionLabel(selectedOption)) === normSearch && !isOpen) {
      return options;
    }

    return options.filter(opt => {
      const label = normalizeStr(getOptionLabel(opt));
      const subtext = normalizeStr(getOptionSubtext(opt));
      const val = normalizeStr(getOptionValue(opt));
      return label.includes(normSearch) || subtext.includes(normSearch) || val.includes(normSearch);
    });
  }, [options, searchTerm, selectedOption, isOpen, getOptionLabel, getOptionSubtext, getOptionValue]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        // Reset search term back to selected item if user typed something but didn't pick
        if (selectedOption) {
          setSearchTerm(getOptionLabel(selectedOption));
        } else {
          setSearchTerm('');
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedOption, getOptionLabel]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && listRef.current && listRef.current.children[highlightedIndex]) {
      listRef.current.children[highlightedIndex].scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  }, [highlightedIndex, isOpen]);

  const handleSelect = (opt) => {
    const optVal = getOptionValue(opt);
    onChange && onChange(optVal, opt);
    setSearchTerm(getOptionLabel(opt));
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange && onChange('', null);
    setSearchTerm('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (disabled) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
      }
    } else if (e.key === 'Enter') {
      if (isOpen && filteredOptions.length > 0 && filteredOptions[highlightedIndex]) {
        e.preventDefault();
        handleSelect(filteredOptions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      if (selectedOption) {
        setSearchTerm(getOptionLabel(selectedOption));
      }
    } else if (e.key === 'Tab') {
      setIsOpen(false);
    }
  };

  const handleInputFocus = () => {
    if (!disabled) {
      setIsOpen(true);
      setHighlightedIndex(0);
    }
  };

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
    setIsOpen(true);
    setHighlightedIndex(0);
  };

  return (
    <div
      ref={containerRef}
      className={`searchable-select-container ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        ...style
      }}
    >
      {/* Hidden input for native HTML form support if name prop is provided */}
      {name && (
        <input
          type="hidden"
          name={name}
          value={value || ''}
          required={required}
        />
      )}

      {/* Main Input Display */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          width: '100%'
        }}
      >
        <input
          ref={inputRef}
          type="text"
          className="input full"
          value={searchTerm}
          placeholder={placeholder}
          disabled={disabled}
          required={required && !value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          style={{
            width: '100%',
            paddingRight: value ? '55px' : '35px',
            cursor: disabled ? 'not-allowed' : 'text',
            fontWeight: selectedOption ? 600 : 400,
            borderColor: isOpen ? 'var(--primary, #0056b3)' : undefined,
            boxShadow: isOpen ? '0 0 0 3px rgba(0, 86, 179, 0.15)' : undefined
          }}
          autoComplete="off"
        />

        <div
          style={{
            position: 'absolute',
            right: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              title="Limpiar selección"
              style={{
                background: '#e2e8f0',
                border: 'none',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                display: 'grid',
                placeItems: 'center',
                fontSize: '11px',
                color: '#475569',
                cursor: 'pointer',
                lineHeight: 1,
                padding: 0
              }}
            >
              ✕
            </button>
          )}
          <span
            onClick={() => !disabled && setIsOpen(!isOpen)}
            style={{
              cursor: disabled ? 'default' : 'pointer',
              fontSize: '10px',
              color: '#64748b',
              transform: isOpen ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s ease',
              userSelect: 'none'
            }}
          >
            ▼
          </span>
        </div>
      </div>

      {/* Floating Dropdown List */}
      {isOpen && !disabled && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '14px',
            boxShadow: '0 12px 28px -4px rgba(0, 0, 0, 0.15), 0 4px 10px -2px rgba(0, 0, 0, 0.05)',
            maxHeight: '260px',
            overflowY: 'auto',
            zIndex: 9999,
            padding: '6px'
          }}
        >
          <div ref={listRef} style={{ display: 'grid', gap: '2px' }}>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, idx) => {
                const optVal = getOptionValue(opt);
                const optLabel = getOptionLabel(opt);
                const optSub = getOptionSubtext(opt);
                const isSelected = String(optVal) === String(value);
                const isHighlighted = idx === highlightedIndex;

                return (
                  <div
                    key={optVal || idx}
                    onMouseDown={(e) => {
                      e.preventDefault(); // Prevent input blur before selection
                      handleSelect(opt);
                    }}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      background: isSelected
                        ? 'var(--primary2, #eff6ff)'
                        : isHighlighted
                        ? '#f1f5f9'
                        : 'transparent',
                      borderLeft: isSelected ? '4px solid var(--primary, #0056b3)' : '4px solid transparent',
                      transition: 'background 0.15s ease',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <div
                        style={{
                          fontWeight: isSelected ? 800 : 600,
                          fontSize: '13.5px',
                          color: isSelected ? 'var(--primary, #0056b3)' : '#1e293b'
                        }}
                      >
                        {optLabel}
                      </div>
                      {optSub && (
                        <div
                          style={{
                            fontSize: '11.5px',
                            color: '#64748b',
                            marginTop: '2px'
                          }}
                        >
                          {optSub}
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <span
                        style={{
                          color: 'var(--primary, #0056b3)',
                          fontWeight: 900,
                          fontSize: '14px'
                        }}
                      >
                        ✓
                      </span>
                    )}
                  </div>
                );
              })
            ) : (
              <div
                style={{
                  padding: '16px',
                  textAlign: 'center',
                  color: '#94a3b8',
                  fontSize: '13px'
                }}
              >
                {emptyMessage} "{searchTerm}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
