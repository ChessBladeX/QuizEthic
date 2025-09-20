import React from 'react';
import { 
  FileText, 
  Users, 
  Search, 
  AlertCircle, 
  Plus,
  RefreshCw,
  Home
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const EmptyState = ({
  icon: Icon = FileText,
  title = 'No data found',
  description = 'There are no items to display at the moment.',
  action,
  secondaryAction,
  className = ''
}) => {
  const defaultActions = {
    create: {
      label: 'Create New',
      icon: Plus,
      variant: 'default'
    },
    refresh: {
      label: 'Refresh',
      icon: RefreshCw,
      variant: 'outline'
    },
    home: {
      label: 'Go Home',
      icon: Home,
      variant: 'outline'
    }
  };

  const getAction = (actionKey) => {
    if (typeof actionKey === 'string') {
      return defaultActions[actionKey];
    }
    return actionKey;
  };

  const primaryAction = getAction(action);
  const secondaryActionData = getAction(secondaryAction);

  return (
    <Card className={`text-center ${className}`}>
      <CardContent className="py-12 px-6">
        <div className="mx-auto w-16 h-16 bg-secondary-100 rounded-full flex items-center justify-center mb-4">
          <Icon className="h-8 w-8 text-secondary-400" />
        </div>
        
        <h3 className="text-lg font-medium text-secondary-900 mb-2">
          {title}
        </h3>
        
        <p className="text-secondary-600 mb-6 max-w-sm mx-auto">
          {description}
        </p>

        {(primaryAction || secondaryActionData) && (
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {primaryAction && (
              <Button
                onClick={primaryAction.onClick}
                variant={primaryAction.variant || 'default'}
                className="inline-flex items-center"
              >
                {primaryAction.icon && (
                  <primaryAction.icon className="h-4 w-4 mr-2" />
                )}
                {primaryAction.label}
              </Button>
            )}
            
            {secondaryActionData && (
              <Button
                onClick={secondaryActionData.onClick}
                variant={secondaryActionData.variant || 'outline'}
                className="inline-flex items-center"
              >
                {secondaryActionData.icon && (
                  <secondaryActionData.icon className="h-4 w-4 mr-2" />
                )}
                {secondaryActionData.label}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Predefined empty states for common scenarios
export const EmptyStates = {
  NoQuestions: (props) => (
    <EmptyState
      icon={FileText}
      title="No questions found"
      description="Get started by creating your first question or importing questions from a file."
      action="create"
      {...props}
    />
  ),
  
  NoExams: (props) => (
    <EmptyState
      icon={FileText}
      title="No exams found"
      description="Create your first exam to start assessing your students."
      action="create"
      {...props}
    />
  ),
  
  NoUsers: (props) => (
    <EmptyState
      icon={Users}
      title="No users found"
      description="No users match your current search criteria."
      action="refresh"
      {...props}
    />
  ),
  
  NoResults: (props) => (
    <EmptyState
      icon={Search}
      title="No results found"
      description="Try adjusting your search criteria or filters to find what you're looking for."
      action="refresh"
      {...props}
    />
  ),
  
  Error: (props) => (
    <EmptyState
      icon={AlertCircle}
      title="Something went wrong"
      description="We encountered an error while loading the data. Please try again."
      action="refresh"
      secondaryAction="home"
      {...props}
    />
  )
};

export default EmptyState;
