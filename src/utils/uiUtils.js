// UI utility functions and components - consolidated from duplicate UI code

import React from 'react';

/**
 * Fantasy-themed container component
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.variant - Container variant (default, py-8, py-16)
 * @returns {JSX.Element} Fantasy container
 */
export const FantasyContainer = ({ children, className = '', variant = 'default' }) => {
  const baseClasses = 'min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900';
  const variantClasses = {
    default: '',
    'py-8': 'py-8',
    'py-16': 'py-16'
  };
  
  const classes = `${baseClasses} ${variantClasses[variant]} ${className}`.trim();
  
  return React.createElement('div', { className: classes }, children);
};

/**
 * Fantasy-themed card component
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.variant - Card variant (default, modal, status)
 * @param {string} props.status - Status for status variant (success, error, warning, info)
 * @returns {JSX.Element} Fantasy card
 */
export const FantasyCard = ({ children, className = '', variant = 'default', status = null }) => {
  const baseClasses = 'bg-slate-800/50 border border-slate-600/50 rounded-lg p-6 shadow-lg backdrop-blur-sm';
  
  const variantClasses = {
    default: '',
    modal: 'max-w-4xl w-full max-h-[90vh] overflow-y-auto',
    'modal-large': 'max-w-6xl w-full max-h-[95vh] overflow-y-auto',
    'modal-small': 'max-w-md w-full mx-4',
    status: 'border-2'
  };
  
  const statusClasses = {
    success: 'bg-green-900/20 border-green-700',
    error: 'bg-red-900/20 border-red-700',
    warning: 'bg-yellow-900/20 border-yellow-700',
    info: 'bg-blue-900/20 border-blue-700',
    amber: 'bg-amber-900/20 border-amber-700'
  };
  
  const classes = [
    baseClasses,
    variantClasses[variant],
    status && statusClasses[status],
    className
  ].filter(Boolean).join(' ');
  
  return (
    <div className={classes}>
      {children}
    </div>
  );
};

/**
 * Fantasy-themed title component
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Title content
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.size - Title size (sm, md, lg, xl)
 * @param {boolean} props.centered - Whether to center the title
 * @returns {JSX.Element} Fantasy title
 */
export const FantasyTitle = ({ children, className = '', size = 'md', centered = false }) => {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-4xl'
  };
  
  const baseClasses = 'font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400';
  const classes = [
    baseClasses,
    sizeClasses[size],
    centered && 'text-center',
    className
  ].filter(Boolean).join(' ');
  
  return (
    <h1 className={classes}>
      {children}
    </h1>
  );
};

/**
 * Loading spinner component
 * @param {Object} props - Component props
 * @param {string} props.message - Loading message
 * @param {string} props.size - Spinner size (sm, md, lg)
 * @returns {JSX.Element} Loading spinner
 */
export const LoadingSpinner = ({ message = 'Loading...', size = 'md' }) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-16 w-16',
    lg: 'h-24 w-24'
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className={`animate-spin rounded-full border-4 border-amber-400 border-t-transparent mx-auto mb-4 ${sizeClasses[size]}`}></div>
        <p className="text-slate-300 text-lg font-medium">{message}</p>
      </div>
    </div>
  );
};

/**
 * Error display component
 * @param {Object} props - Component props
 * @param {string} props.message - Error message
 * @param {string} props.details - Error details
 * @param {Function} props.onRetry - Retry function
 * @returns {JSX.Element} Error display
 */
export const ErrorDisplay = ({ message, details, onRetry }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold text-red-500 mb-4">🚨 Error</h1>
        <p className="mb-4 text-slate-300">{message}</p>
        {details && (
          <div className="bg-slate-800 p-4 rounded-lg mb-4 text-sm font-mono text-left text-slate-400">
            {details}
          </div>
        )}
        {onRetry && (
          <button
            onClick={onRetry}
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Button component with fantasy styling
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Button content
 * @param {string} props.variant - Button variant (primary, secondary, danger, success)
 * @param {string} props.size - Button size (sm, md, lg)
 * @param {boolean} props.disabled - Whether button is disabled
 * @param {Function} props.onClick - Click handler
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element} Fantasy button
 */
export const FantasyButton = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  disabled = false, 
  onClick, 
  className = '',
  type = 'button'
}) => {
  const variantClasses = {
    primary: 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
    secondary: 'bg-gradient-to-r from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700',
    danger: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700',
    success: 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700',
    warning: 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700'
  };
  
  const sizeClasses = {
    sm: 'py-1 px-3 text-sm',
    md: 'py-2 px-4',
    lg: 'py-3 px-6 text-lg'
  };
  
  const baseClasses = 'text-white font-semibold rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed';
  const classes = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    className
  ].filter(Boolean).join(' ');
  
  return (
    <button
      type={type}
      className={classes}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

/**
 * Modal wrapper component
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether modal is open
 * @param {Function} props.onClose - Close handler
 * @param {React.ReactNode} props.children - Modal content
 * @param {string} props.size - Modal size (sm, md, lg, xl)
 * @returns {JSX.Element} Modal wrapper
 */
export const ModalWrapper = ({ isOpen, onClose, children, size = 'md' }) => {
  if (!isOpen) return null;
  
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl'
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className={`${sizeClasses[size]} w-full max-h-[90vh] overflow-y-auto`}>
        {children}
      </div>
    </div>
  );
};

/**
 * Tab component
 * @param {Object} props - Component props
 * @param {Array} props.tabs - Array of tab objects with id, name, and icon
 * @param {string} props.activeTab - Currently active tab
 * @param {Function} props.onTabChange - Tab change handler
 * @returns {JSX.Element} Tab component
 */
export const TabComponent = ({ tabs, activeTab, onTabChange }) => {
  return (
    <div className="flex border-b border-slate-600 mb-6">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === tab.id
              ? 'text-amber-400 border-b-2 border-amber-400'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          <span className="mr-2">{tab.icon}</span>
          {tab.name}
        </button>
      ))}
    </div>
  );
}; 

/**
 * Ensure all modals and overlays are visible
 * Call this function if you suspect visibility issues
 */
export const ensureModalVisibility = () => {
  // Find all modal-like elements
  const modalElements = document.querySelectorAll('[class*="fixed"], [class*="modal"], [class*="overlay"]');
  
  modalElements.forEach(element => {
    const styles = window.getComputedStyle(element);
    
    // Force visibility for modal elements
    if (styles.position === 'fixed' || element.classList.contains('modal') || element.classList.contains('overlay')) {
      element.style.visibility = 'visible';
      element.style.opacity = '1';
      element.style.display = 'flex';
      element.style.zIndex = '9999';
    }
  });
  
  console.log(`Ensured visibility for ${modalElements.length} modal elements`);
};

/**
 * Fix common visibility issues
 */
export const fixVisibilityIssues = () => {
  // Ensure all interactive elements are visible
  const interactiveElements = document.querySelectorAll('button, a, input, select, textarea, [role="button"]');
  
  interactiveElements.forEach(element => {
    element.style.visibility = 'visible';
    element.style.opacity = '1';
  });
  
  // Ensure all fantasy components are visible
  const fantasyElements = document.querySelectorAll('.fantasy-container, .fantasy-card, .fantasy-button, .fantasy-input');
  
  fantasyElements.forEach(element => {
    element.style.visibility = 'visible';
    element.style.opacity = '1';
  });
  
  console.log(`Fixed visibility for ${interactiveElements.length} interactive elements and ${fantasyElements.length} fantasy elements`);
};

/**
 * Debug visibility issues
 */
export const debugVisibility = () => {
  const allElements = document.querySelectorAll('*');
  const hiddenElements = [];
  
  allElements.forEach(element => {
    const styles = window.getComputedStyle(element);
    const isHidden = styles.visibility === 'hidden' || 
                    styles.display === 'none' || 
                    styles.opacity === '0' ||
                    element.offsetParent === null;
    
    if (isHidden && element.tagName !== 'SCRIPT' && element.tagName !== 'STYLE') {
      hiddenElements.push({
        tag: element.tagName,
        className: element.className,
        id: element.id,
        text: element.textContent?.substring(0, 50) || 'No text'
      });
    }
  });
  
  console.log('Hidden elements found:', hiddenElements);
  return hiddenElements;
}; 