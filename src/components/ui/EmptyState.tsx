import { Inbox } from 'lucide-react';
import { cn } from '../../utils/cn';

interface EmptyStateProps {
  icon?: string | React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

export function EmptyState({ icon, title, description, action, className, compact }: EmptyStateProps) {
  const displayIcon = icon ?? <Inbox size={compact ? 22 : 28} className="text-[var(--text-muted)]" />;

  return (
    <div className={cn(
      'flex flex-col items-center justify-center text-center',
      compact ? 'py-8 px-4' : 'py-16 px-6',
      className,
    )}>
      <div className={cn(
        'flex items-center justify-center rounded-2xl mb-4 border border-[var(--border)]',
        compact ? 'w-12 h-12' : 'w-16 h-16',
        'bg-[var(--surface-2)] shadow-[var(--shadow-xs)]',
      )}>
        {displayIcon}
      </div>
      <h3 className={cn(
        'font-heading font-semibold text-[var(--text)] mb-1',
        compact ? 'text-sm' : 'text-base',
      )}>
        {title}
      </h3>
      {description && (
        <p className={cn(
          'text-[var(--text-muted)] max-w-sm leading-relaxed',
          compact ? 'text-xs' : 'text-sm',
        )}>
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
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
      <div className="w-16 h-16 rounded-2xl bg-[var(--danger-light)] border border-[rgba(239,68,68,0.15)] flex items-center justify-center text-2xl mb-4">
        <span role="img" aria-hidden>⚠️</span>
      </div>
      <h3 className="font-heading font-semibold text-[var(--text)] mb-1">{title}</h3>
      <p className="text-sm text-[var(--text-muted)] max-w-sm mb-4 leading-relaxed">{description}</p>
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
