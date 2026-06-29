import { cn } from '../../utils/cn';

interface EmptyStateProps {
  icon?: string | React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

export function EmptyState({ icon = '📭', title, description, action, className, compact }: EmptyStateProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center text-center',
      compact ? 'py-8 px-4' : 'py-16 px-6',
      className,
    )}>
      <div className={cn(
        'flex items-center justify-center rounded-2xl mb-4',
        compact ? 'w-12 h-12 text-2xl' : 'w-16 h-16 text-3xl',
        'bg-[var(--surface-2)]',
      )}>
        {icon}
      </div>
      <h3 className={cn(
        'font-heading font-semibold text-[var(--text)] mb-1',
        compact ? 'text-sm' : 'text-base',
      )}>
        {title}
      </h3>
      {description && (
        <p className={cn(
          'text-[var(--text-muted)] max-w-xs',
          compact ? 'text-xs' : 'text-sm',
        )}>
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'We couldn\'t load this content. Check your connection and try again.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center py-16 px-6', className)}>
      <div className="w-16 h-16 rounded-2xl bg-[var(--danger-light)] flex items-center justify-center text-3xl mb-4">
        ⚠️
      </div>
      <h3 className="font-heading font-semibold text-[var(--text)] mb-1">{title}</h3>
      <p className="text-sm text-[var(--text-muted)] max-w-xs mb-4">{description}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="btn btn-secondary text-sm"
        >
          Try again
        </button>
      )}
    </div>
  );
}
