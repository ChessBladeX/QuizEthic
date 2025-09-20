import React from 'react';
import { AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ConfirmationDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  type = 'warning',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isLoading = false,
  className = ''
}) => {
  if (!isOpen) return null;

  const icons = {
    warning: AlertTriangle,
    info: Info,
    success: CheckCircle,
    error: XCircle
  };

  const colors = {
    warning: 'text-warning-600',
    info: 'text-primary-600',
    success: 'text-success-600',
    error: 'text-error-600'
  };

  const buttonVariants = {
    warning: 'default',
    info: 'default',
    success: 'default',
    error: 'destructive'
  };

  const Icon = icons[type];

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <Card className={`w-full max-w-md ${className}`}>
        <CardHeader className="text-center">
          <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
            type === 'warning' ? 'bg-warning-100' :
            type === 'info' ? 'bg-primary-100' :
            type === 'success' ? 'bg-success-100' :
            'bg-error-100'
          }`}>
            <Icon className={`h-6 w-6 ${colors[type]}`} />
          </div>
          <CardTitle className="text-xl font-semibold text-secondary-900">
            {title}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <p className="text-secondary-600 text-center">
            {message}
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isLoading}
            >
              {cancelText}
            </Button>
            <Button
              variant={buttonVariants[type]}
              onClick={handleConfirm}
              className="flex-1"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  Processing...
                </>
              ) : (
                confirmText
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfirmationDialog;
