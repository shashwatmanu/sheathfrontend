import React, { useState, useMemo } from 'react';
import Modal from '@mui/material/Modal';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Tooltip from '@mui/material/Tooltip';

const DataModal = ({ open, onClose, data, columns, filename, darkMode }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');

  const theme = {
    bg: darkMode ? "#0f172a" : "#ffffff",
    cardBg: darkMode ? "#1e293b" : "#ffffff",
    text: darkMode ? "#f1f5f9" : "#000000",
    textSecondary: darkMode ? "#94a3b8" : "#666666",
    border: darkMode ? "#334155" : "#e0e0e0",
    modalBg: darkMode ? "#1e293b" : "#ffffff",
    headerBg: darkMode ? "#334155" : "#f3f4f6",
  };

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    let result = [...data];

    // Apply search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      result = result.filter(row => 
        columns.some(col => 
          String(row[col] || '').toLowerCase().includes(search)
        )
      );
    }

    // Apply sorting
    if (sortColumn) {
      result.sort((a, b) => {
        const aVal = String(a[sortColumn] || '');
        const bVal = String(b[sortColumn] || '');
        
        // Try numeric sort first
        const aNum = parseFloat(aVal.replace(/,/g, ''));
        const bNum = parseFloat(bVal.replace(/,/g, ''));
        
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
        }
        
        // Fallback to string sort
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      });
    }

    return result;
  }, [data, columns, searchTerm, sortColumn, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedData.length / rowsPerPage);
  const startIdx = (currentPage - 1) * rowsPerPage;
  const endIdx = startIdx + rowsPerPage;
  const currentData = filteredAndSortedData.slice(startIdx, endIdx);

  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Handle sort
  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = columns.join(',');
    const rows = filteredAndSortedData.map(row => 
      columns.map(col => {
        const val = String(row[col] || '');
        // Escape quotes and wrap in quotes if contains comma
        return val.includes(',') || val.includes('"') 
          ? `"${val.replace(/"/g, '""')}"` 
          : val;
      }).join(',')
    );
    
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename.replace(/\.[^/.]+$/, '')}_filtered.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  // Reset filters
  const handleReset = () => {
    setSearchTerm('');
    setSortColumn(null);
    setSortDirection('asc');
    setCurrentPage(1);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      <div style={{
        background: theme.modalBg,
        borderRadius: '16px',
        boxShadow: darkMode 
          ? '0 20px 60px rgba(0,0,0,0.5)' 
          : '0 20px 60px rgba(0,0,0,0.2)',
        width: '95vw',
        maxWidth: '1400px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: darkMode ? '1px solid #334155' : 'none'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: `2px solid ${theme.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          background: theme.headerBg
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 24 }}>📊</span>
            <div>
              <h2 style={{ 
                margin: 0, 
                fontSize: '20px', 
                fontWeight: 700,
                color: theme.text 
              }}>
                {filename}
              </h2>
              <p style={{ 
                margin: '4px 0 0 0', 
                fontSize: '13px',
                color: theme.textSecondary 
              }}>
                {filteredAndSortedData.length.toLocaleString()} rows 
                {searchTerm && ` (filtered from ${data.length.toLocaleString()})`}
                {' • '}
                {columns.length} columns
              </p>
            </div>
          </div>
          
          <Tooltip title="Close" arrow>
            <IconButton 
              onClick={onClose}
              style={{ 
                color: theme.text,
                background: darkMode ? '#334155' : '#f3f4f6'
              }}
            >
              <span style={{ fontSize: 20 }}>✕</span>
            </IconButton>
          </Tooltip>
        </div>

        {/* Controls */}
        <div style={{
          padding: '16px 24px',
          borderBottom: `1px solid ${theme.border}`,
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          alignItems: 'center',
          background: theme.bg
        }}>
          {/* Search */}
          <TextField
            placeholder="Search all columns..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1); // Reset to first page on search
            }}
            size="small"
            style={{ flex: '1 1 300px', minWidth: '200px' }}
            InputProps={{
              startAdornment: <span style={{ marginRight: 8 }}>🔍</span>,
              style: {
                background: darkMode ? '#334155' : '#f8f9fa',
                color: theme.text
              }
            }}
          />

          {/* Rows per page */}
          <FormControl size="small" style={{ minWidth: '120px' }}>
            <InputLabel style={{ color: theme.textSecondary }}>Rows</InputLabel>
            <Select
              value={rowsPerPage}
              label="Rows"
              onChange={(e) => {
                setRowsPerPage(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                background: darkMode ? '#334155' : '#f8f9fa',
                color: theme.text
              }}
            >
              <MenuItem value={10}>10 rows</MenuItem>
              <MenuItem value={25}>25 rows</MenuItem>
              <MenuItem value={50}>50 rows</MenuItem>
              <MenuItem value={100}>100 rows</MenuItem>
              <MenuItem value={250}>250 rows</MenuItem>
            </Select>
          </FormControl>

          {/* Reset button */}
          {(searchTerm || sortColumn) && (
            <Tooltip title="Clear all filters and sorting" arrow>
              <button
                onClick={handleReset}
                style={{
                  padding: '8px 16px',
                  background: darkMode ? '#334155' : '#e5e7eb',
                  color: theme.text,
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <span>🔄</span>
                Reset
              </button>
            </Tooltip>
          )}

          {/* Export CSV */}
          <Tooltip title="Export filtered data as CSV" arrow>
            <button
              onClick={handleExportCSV}
              style={{
                padding: '8px 16px',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <span>💾</span>
              Export CSV
            </button>
          </Tooltip>
        </div>

        {/* Sort indicator */}
        {sortColumn && (
          <div style={{
            padding: '8px 24px',
            background: darkMode ? '#0f172a' : '#f8f9fa',
            borderBottom: `1px solid ${theme.border}`,
            fontSize: '12px',
            color: theme.textSecondary,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <span>📐</span>
            Sorted by <strong style={{ color: theme.text }}>{sortColumn}</strong>
            <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
            {sortDirection === 'asc' ? 'ascending' : 'descending'}
          </div>
        )}

        {/* Table */}
        <div style={{ 
          flex: 1, 
          overflow: 'auto',
          background: theme.bg
        }}>
          {currentData.length === 0 ? (
            <div style={{
              padding: '48px',
              textAlign: 'center',
              color: theme.textSecondary
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
              <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                No results found
              </p>
              <p style={{ fontSize: 14 }}>
                Try adjusting your search term
              </p>
            </div>
          ) : (
            <table style={{ 
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '12px'
            }}>
              <thead>
                <tr>
                  <th style={{
                    position: 'sticky',
                    top: 0,
                    background: theme.headerBg,
                    color: theme.text,
                    fontWeight: 700,
                    fontSize: 11,
                    padding: '12px 8px',
                    textAlign: 'left',
                    borderBottom: `2px solid ${theme.border}`,
                    width: '50px',
                    zIndex: 10
                  }}>
                    #
                  </th>
                  {columns.map((col, idx) => (
                    <th 
                      key={idx}
                      onClick={() => handleSort(col)}
                      style={{
                        position: 'sticky',
                        top: 0,
                        background: theme.headerBg,
                        color: theme.text,
                        fontWeight: 700,
                        fontSize: 11,
                        padding: '12px 8px',
                        textAlign: 'left',
                        borderBottom: `2px solid ${theme.border}`,
                        cursor: 'pointer',
                        userSelect: 'none',
                        whiteSpace: 'nowrap',
                        minWidth: '120px',
                        maxWidth: '300px',
                        zIndex: 10,
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = darkMode ? '#475569' : '#e5e7eb';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = theme.headerBg;
                      }}
                    >
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 6,
                        justifyContent: 'space-between'
                      }}>
                        <span style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {col}
                        </span>
                        {sortColumn === col && (
                          <span style={{ fontSize: 14 }}>
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentData.map((row, rowIdx) => (
                  <tr 
                    key={startIdx + rowIdx}
                    style={{
                      background: rowIdx % 2 === 0 
                        ? (darkMode ? '#1e293b' : '#ffffff')
                        : (darkMode ? '#0f172a' : '#f9fafb'),
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = darkMode ? '#334155' : '#f0f4ff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = rowIdx % 2 === 0 
                        ? (darkMode ? '#1e293b' : '#ffffff')
                        : (darkMode ? '#0f172a' : '#f9fafb');
                    }}
                  >
                    <td style={{ 
                      color: theme.textSecondary, 
                      fontSize: 11,
                      padding: '10px 8px',
                      fontWeight: 600,
                      borderBottom: `1px solid ${theme.border}`,
                      width: '50px'
                    }}>
                      {startIdx + rowIdx + 1}
                    </td>
                    {columns.map((col, colIdx) => {
                      const cellValue = String(row[col] || '');
                      const isHighlighted = searchTerm && 
                        cellValue.toLowerCase().includes(searchTerm.toLowerCase());

                      return (
                        <td 
                          key={colIdx}
                          title={cellValue}
                          style={{ 
                            color: theme.text, 
                            fontSize: 11,
                            padding: '10px 8px',
                            borderBottom: `1px solid ${theme.border}`,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '300px',
                            background: isHighlighted 
                              ? (darkMode ? '#fbbf2433' : '#fef3c7') 
                              : 'transparent'
                          }}
                        >
                          {cellValue}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{
            padding: '16px 24px',
            borderTop: `2px solid ${theme.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            background: theme.headerBg
          }}>
            <div style={{ 
              fontSize: '13px', 
              color: theme.textSecondary,
              fontWeight: 500
            }}>
              Showing {startIdx + 1}-{Math.min(endIdx, filteredAndSortedData.length)} of{' '}
              {filteredAndSortedData.length.toLocaleString()} rows
            </div>

            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              flexWrap: 'wrap'
            }}>
              {/* First page */}
              <Tooltip title="First page" arrow>
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                  style={{
                    padding: '6px 12px',
                    background: darkMode ? '#334155' : '#e5e7eb',
                    color: theme.text,
                    border: 'none',
                    borderRadius: '6px',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                    opacity: currentPage === 1 ? 0.5 : 1
                  }}
                >
                  ⏮️
                </button>
              </Tooltip>

              {/* Previous page */}
              <Tooltip title="Previous page" arrow>
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  style={{
                    padding: '6px 12px',
                    background: darkMode ? '#334155' : '#e5e7eb',
                    color: theme.text,
                    border: 'none',
                    borderRadius: '6px',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                    opacity: currentPage === 1 ? 0.5 : 1
                  }}
                >
                  ◀️
                </button>
              </Tooltip>

              {/* Page numbers */}
              <div style={{ 
                display: 'flex', 
                gap: '4px',
                alignItems: 'center'
              }}>
                {/* Show first few pages */}
                {currentPage > 3 && (
                  <>
                    <button
                      onClick={() => handlePageChange(1)}
                      style={{
                        padding: '6px 12px',
                        background: darkMode ? '#334155' : '#e5e7eb',
                        color: theme.text,
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 600,
                        minWidth: '40px'
                      }}
                    >
                      1
                    </button>
                    {currentPage > 4 && (
                      <span style={{ color: theme.textSecondary }}>...</span>
                    )}
                  </>
                )}

                {/* Pages around current */}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => 
                    page === currentPage || 
                    page === currentPage - 1 || 
                    page === currentPage + 1
                  )
                  .map(page => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      style={{
                        padding: '6px 12px',
                        background: page === currentPage 
                          ? (darkMode ? '#4f46e5' : '#667eea')
                          : (darkMode ? '#334155' : '#e5e7eb'),
                        color: page === currentPage ? 'white' : theme.text,
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: page === currentPage ? 700 : 600,
                        minWidth: '40px'
                      }}
                    >
                      {page}
                    </button>
                  ))}

                {/* Show last few pages */}
                {currentPage < totalPages - 2 && (
                  <>
                    {currentPage < totalPages - 3 && (
                      <span style={{ color: theme.textSecondary }}>...</span>
                    )}
                    <button
                      onClick={() => handlePageChange(totalPages)}
                      style={{
                        padding: '6px 12px',
                        background: darkMode ? '#334155' : '#e5e7eb',
                        color: theme.text,
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 600,
                        minWidth: '40px'
                      }}
                    >
                      {totalPages}
                    </button>
                  </>
                )}
              </div>

              {/* Next page */}
              <Tooltip title="Next page" arrow>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '6px 12px',
                    background: darkMode ? '#334155' : '#e5e7eb',
                    color: theme.text,
                    border: 'none',
                    borderRadius: '6px',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                    opacity: currentPage === totalPages ? 0.5 : 1
                  }}
                >
                  ▶️
                </button>
              </Tooltip>

              {/* Last page */}
              <Tooltip title="Last page" arrow>
                <button
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '6px 12px',
                    background: darkMode ? '#334155' : '#e5e7eb',
                    color: theme.text,
                    border: 'none',
                    borderRadius: '6px',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                    opacity: currentPage === totalPages ? 0.5 : 1
                  }}
                >
                  ⏭️
                </button>
              </Tooltip>

              {/* Jump to page */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 6,
                marginLeft: 8
              }}>
                <span style={{ 
                  fontSize: 12, 
                  color: theme.textSecondary,
                  whiteSpace: 'nowrap'
                }}>
                  Go to:
                </span>
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={currentPage}
                  onChange={(e) => {
                    const page = parseInt(e.target.value);
                    if (page >= 1 && page <= totalPages) {
                      handlePageChange(page);
                    }
                  }}
                  style={{
                    width: '60px',
                    padding: '6px 8px',
                    background: darkMode ? '#334155' : '#f8f9fa',
                    color: theme.text,
                    border: `1px solid ${theme.border}`,
                    borderRadius: '6px',
                    fontSize: '13px',
                    textAlign: 'center'
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default DataModal;