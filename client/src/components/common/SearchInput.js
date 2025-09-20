import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const SearchInput = ({
  value = '',
  onChange,
  onClear,
  placeholder = 'Search...',
  showFilters = false,
  onFilterClick,
  className = '',
  debounceMs = 300,
  suggestions = [],
  onSuggestionSelect,
  showSuggestions = false
}) => {
  const [internalValue, setInternalValue] = useState(value);
  const [showSuggestionList, setShowSuggestionList] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef(null);
  const suggestionRefs = useRef([]);

  // Debounce the search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (internalValue !== value) {
        onChange(internalValue);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [internalValue, value, onChange, debounceMs]);

  // Update internal value when external value changes
  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInternalValue(newValue);
    setHighlightedIndex(-1);
    
    if (showSuggestions && suggestions.length > 0) {
      setShowSuggestionList(true);
    }
  };

  const handleClear = () => {
    setInternalValue('');
    setShowSuggestionList(false);
    setHighlightedIndex(-1);
    onChange('');
    if (onClear) {
      onClear();
    }
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (!showSuggestionList || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          handleSuggestionSelect(suggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestionList(false);
        setHighlightedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const handleSuggestionSelect = (suggestion) => {
    setInternalValue(suggestion);
    setShowSuggestionList(false);
    setHighlightedIndex(-1);
    onChange(suggestion);
    if (onSuggestionSelect) {
      onSuggestionSelect(suggestion);
    }
  };

  const handleInputFocus = () => {
    if (showSuggestions && suggestions.length > 0) {
      setShowSuggestionList(true);
    }
  };

  const handleInputBlur = () => {
    // Delay hiding suggestions to allow clicking on them
    setTimeout(() => {
      setShowSuggestionList(false);
      setHighlightedIndex(-1);
    }, 150);
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-secondary-400" />
        </div>
        
        <Input
          ref={inputRef}
          type="text"
          value={internalValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          className="pl-10 pr-20"
        />
        
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 space-x-1">
          {internalValue && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-6 w-6 p-0 hover:bg-secondary-100"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          
          {showFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onFilterClick}
              className="h-6 w-6 p-0 hover:bg-secondary-100"
            >
              <Filter className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestionList && suggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-secondary-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              ref={el => suggestionRefs.current[index] = el}
              onClick={() => handleSuggestionSelect(suggestion)}
              className={`w-full px-4 py-2 text-left text-sm hover:bg-secondary-50 focus:bg-secondary-50 focus:outline-none ${
                index === highlightedIndex ? 'bg-secondary-100' : ''
              }`}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchInput;
