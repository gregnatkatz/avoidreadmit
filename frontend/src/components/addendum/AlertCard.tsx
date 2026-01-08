import React from 'react';

type AlertType = 'PERFORMANCE_DEGRADATION' | 'INSUFFICIENT_SAMPLE' | 'EMERGING_PATTERN' | 'CONTRADICTORY_OUTCOMES' | 'CONFIDENCE_DRIFT';
type Severity = 'info' | 'warning' | 'critical';

interface AlertCardProps {
  id: string;
  alertType: AlertType | string;
  severity: Severity | string;
  message: string;
  patternTitle?: string;
  details?: Record<string, unknown>;
  createdAt: string | Date;
  onAcknowledge?: (id: string) => void;
  compact?: boolean;
}

const alertTypeConfig: Record<string, { label: string; icon: string; description: string }> = {
  PERFORMANCE_DEGRADATION: {
    label: 'Performance Drop',
    icon: '📉',
    description: 'Pattern success rate has declined significantly',
  },
  INSUFFICIENT_SAMPLE: {
    label: 'Low Sample Size',
    icon: '📊',
    description: 'Not enough data to validate pattern effectiveness',
  },
  EMERGING_PATTERN: {
    label: 'Emerging Pattern',
    icon: '🌱',
    description: 'New pattern detected that may improve outcomes',
  },
  CONTRADICTORY_OUTCOMES: {
    label: 'Contradictory Results',
    icon: '⚠️',
    description: 'Pattern showing inconsistent outcomes',
  },
  CONFIDENCE_DRIFT: {
    label: 'Confidence Drift',
    icon: '📈',
    description: 'Pattern confidence interval has widened',
  },
};

const severityConfig: Record<string, { color: string; bgColor: string; borderColor: string }> = {
  info: {
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
  warning: {
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
  },
  critical: {
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
  },
};

export function AlertCard({
  id,
  alertType,
  severity,
  message,
  patternTitle,
  details,
  createdAt,
  onAcknowledge,
  compact = false,
}: AlertCardProps) {
  const typeConfig = alertTypeConfig[alertType] || {
    label: alertType,
    icon: '🔔',
    description: 'Alert',
  };
  const sevConfig = severityConfig[severity] || severityConfig.info;

  const formattedDate = new Date(createdAt).toLocaleString();

  if (compact) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${sevConfig.bgColor} ${sevConfig.borderColor}`}>
        <span className="text-lg">{typeConfig.icon}</span>
        <span className={`text-sm ${sevConfig.color} flex-1`}>{message}</span>
        <span className="text-xs text-gray-500">{formattedDate}</span>
        {onAcknowledge && (
          <button
            onClick={() => onAcknowledge(id)}
            className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-700"
          >
            Dismiss
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-lg border ${sevConfig.bgColor} ${sevConfig.borderColor} p-4`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <span className="text-2xl">{typeConfig.icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <span className={`font-medium ${sevConfig.color}`}>{typeConfig.label}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${sevConfig.bgColor} ${sevConfig.color} border ${sevConfig.borderColor}`}>
                {severity}
              </span>
            </div>
            {patternTitle && (
              <p className="text-sm text-gray-400 mt-0.5">Pattern: {patternTitle}</p>
            )}
            <p className="text-sm text-gray-300 mt-2">{message}</p>
            {details && Object.keys(details).length > 0 && (
              <div className="mt-3 text-xs text-gray-500 space-y-1">
                {Object.entries(details).map(([key, value]) => (
                  <div key={key}>
                    <span className="text-gray-400">{key}:</span>{' '}
                    <span>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs text-gray-500">{formattedDate}</span>
          {onAcknowledge && (
            <button
              onClick={() => onAcknowledge(id)}
              className="block mt-2 text-sm text-gray-400 hover:text-white px-3 py-1 rounded border border-gray-600 hover:border-gray-500"
            >
              Acknowledge
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface AlertListProps {
  alerts: Array<{
    id: string;
    alertType: string;
    severity: string;
    message: string;
    patternTitle?: string;
    details?: Record<string, unknown>;
    createdAt: string | Date;
  }>;
  onAcknowledge?: (id: string) => void;
  compact?: boolean;
  maxItems?: number;
}

export function AlertList({ alerts, onAcknowledge, compact = false, maxItems }: AlertListProps) {
  const displayAlerts = maxItems ? alerts.slice(0, maxItems) : alerts;

  if (alerts.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <span className="text-3xl">✓</span>
        <p className="mt-2">No active alerts</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {displayAlerts.map((alert) => (
        <AlertCard
          key={alert.id}
          {...alert}
          onAcknowledge={onAcknowledge}
          compact={compact}
        />
      ))}
      {maxItems && alerts.length > maxItems && (
        <p className="text-sm text-gray-500 text-center">
          +{alerts.length - maxItems} more alerts
        </p>
      )}
    </div>
  );
}

interface AlertSummaryProps {
  alerts: Array<{ severity: string }>;
}

export function AlertSummary({ alerts }: AlertSummaryProps) {
  const counts = {
    critical: alerts.filter(a => a.severity === 'critical').length,
    warning: alerts.filter(a => a.severity === 'warning').length,
    info: alerts.filter(a => a.severity === 'info').length,
  };

  return (
    <div className="flex items-center gap-4">
      {counts.critical > 0 && (
        <span className="flex items-center gap-1 text-red-400">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          {counts.critical} critical
        </span>
      )}
      {counts.warning > 0 && (
        <span className="flex items-center gap-1 text-yellow-400">
          <span className="w-2 h-2 rounded-full bg-yellow-500" />
          {counts.warning} warning
        </span>
      )}
      {counts.info > 0 && (
        <span className="flex items-center gap-1 text-blue-400">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          {counts.info} info
        </span>
      )}
      {alerts.length === 0 && (
        <span className="text-green-400">No alerts</span>
      )}
    </div>
  );
}

export default AlertCard;
