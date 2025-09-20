import React, { useState, useMemo } from 'react';
import { 
  ChevronUp, 
  ChevronDown, 
  MoreHorizontal, 
  Search,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SearchInput from './SearchInput';
import Pagination from './Pagination';
import EmptyState from './EmptyState';

const DataTable = ({
  data = [],
  columns = [],
  searchable = true,
  searchPlaceholder = 'Search...',
  onSearch,
  filterable = false,
  onFilter,
  sortable = true,
  onSort,
  pagination = true,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  loading = false,
  emptyState,
  actions,
  className = '',
  rowKey = 'id',
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  stickyHeader = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    
    return data.filter(item =>
      columns.some(column => {
        const value = column.accessor ? 
          (typeof column.accessor === 'function' ? 
            column.accessor(item) : 
            item[column.accessor]
          ) : 
          item[column.key];
        
        return String(value).toLowerCase().includes(searchTerm.toLowerCase());
      })
    );
  }, [data, searchTerm, columns]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = getNestedValue(a, sortConfig.key);
      const bValue = getNestedValue(b, sortConfig.key);

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [filteredData, sortConfig]);

  // Paginate data
  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData;
    
    const startIndex = (currentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, currentPage, pageSize, pagination]);

  const totalPages = Math.ceil(filteredData.length / pageSize);

  const getNestedValue = (obj, path) => {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  };

  const handleSort = (key) => {
    if (!sortable) return;

    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));

    if (onSort) {
      onSort(key, sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc');
    }
  };

  const handleSearch = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
    if (onSearch) {
      onSearch(value);
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    if (onPageChange) {
      onPageChange(page);
    }
  };

  const handleSelectAll = (checked) => {
    if (!selectable) return;
    
    const allIds = paginatedData.map(item => item[rowKey]);
    if (checked) {
      onSelectionChange([...new Set([...selectedRows, ...allIds])]);
    } else {
      onSelectionChange(selectedRows.filter(id => !allIds.includes(id)));
    }
  };

  const handleSelectRow = (rowId, checked) => {
    if (!selectable) return;
    
    if (checked) {
      onSelectionChange([...selectedRows, rowId]);
    } else {
      onSelectionChange(selectedRows.filter(id => id !== rowId));
    }
  };

  const isAllSelected = paginatedData.length > 0 && 
    paginatedData.every(item => selectedRows.includes(item[rowKey]));

  const isIndeterminate = paginatedData.some(item => selectedRows.includes(item[rowKey])) && 
    !isAllSelected;

  const renderCell = (item, column) => {
    if (column.render) {
      return column.render(item);
    }

    const value = column.accessor ? 
      (typeof column.accessor === 'function' ? 
        column.accessor(item) : 
        item[column.accessor]
      ) : 
      item[column.key];

    if (column.type === 'badge') {
      return (
        <Badge variant={column.badgeVariant || 'secondary'}>
          {value}
        </Badge>
      );
    }

    if (column.type === 'date') {
      return new Date(value).toLocaleDateString();
    }

    if (column.type === 'datetime') {
      return new Date(value).toLocaleString();
    }

    return value;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-200 border-t-primary-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return emptyState || <EmptyState />;
  }

  return (
    <Card className={className}>
      {/* Header */}
      {(searchable || filterable || actions) && (
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              {searchable && (
                <SearchInput
                  value={searchTerm}
                  onChange={handleSearch}
                  placeholder={searchPlaceholder}
                  className="max-w-sm"
                />
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              {filterable && (
                <Button variant="outline" size="sm" onClick={onFilter}>
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              )}
              
              {actions?.map((action, index) => (
                <Button
                  key={index}
                  variant={action.variant || 'outline'}
                  size="sm"
                  onClick={action.onClick}
                  disabled={action.disabled}
                >
                  {action.icon && <action.icon className="h-4 w-4 mr-2" />}
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
      )}

      {/* Table */}
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className={stickyHeader ? 'sticky top-0 bg-white z-10' : ''}>
              <TableRow>
                {selectable && (
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={input => {
                        if (input) input.indeterminate = isIndeterminate;
                      }}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                    />
                  </TableHead>
                )}
                
                {columns.map((column) => (
                  <TableHead
                    key={column.key}
                    className={`${column.className || ''} ${
                      sortable && column.sortable !== false ? 'cursor-pointer hover:bg-secondary-50' : ''
                    }`}
                    onClick={() => column.sortable !== false && handleSort(column.key)}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{column.title}</span>
                      {sortable && column.sortable !== false && (
                        <div className="flex flex-col">
                          <ChevronUp 
                            className={`h-3 w-3 ${
                              sortConfig.key === column.key && sortConfig.direction === 'asc' 
                                ? 'text-primary-600' 
                                : 'text-secondary-400'
                            }`} 
                          />
                          <ChevronDown 
                            className={`h-3 w-3 -mt-1 ${
                              sortConfig.key === column.key && sortConfig.direction === 'desc' 
                                ? 'text-primary-600' 
                                : 'text-secondary-400'
                            }`} 
                          />
                        </div>
                      )}
                    </div>
                  </TableHead>
                ))}
                
                {actions && (
                  <TableHead className="w-12">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            
            <TableBody>
              {paginatedData.map((item, index) => (
                <TableRow key={item[rowKey] || index}>
                  {selectable && (
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedRows.includes(item[rowKey])}
                        onChange={(e) => handleSelectRow(item[rowKey], e.target.checked)}
                        className="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                      />
                    </TableCell>
                  )}
                  
                  {columns.map((column) => (
                    <TableCell key={column.key} className={column.className || ''}>
                      {renderCell(item, column)}
                    </TableCell>
                  ))}
                  
                  {actions && (
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div className="px-6 py-4 border-t">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            pageSize={pageSize}
            onPageSizeChange={onPageSizeChange}
            showSizeChanger={!!onPageSizeChange}
          />
        </div>
      )}
    </Card>
  );
};

export default DataTable;
