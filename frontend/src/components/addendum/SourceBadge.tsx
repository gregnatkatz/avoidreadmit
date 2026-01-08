import React from 'react';

type ContextSource = 'NURSE_BEDSIDE' | 'FAMILY_DISCUSSION' | 'CARE_COORDINATION' | 'SOCIAL_WORK' | 'PT_OT_SESSION';

interface SourceBadgeProps {
  source: ContextSource | string;
  size?: 'sm' | 'md' | 'lg';
  showReliability?: boolean;
  reliability?: number;
}

const sourceConfig: Record<string, { label: string; color: string; bgColor: string; icon: string }> = {
  NURSE_BEDSIDE: {
    label: 'Nurse Bedside',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20 border-blue-500/30',
    icon: '🩺',
  },
  FAMILY_DISCUSSION: {
    label: 'Family Discussion',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20 border-purple-500/30',
    icon: '👨‍👩‍👧',
  },
  CARE_COORDINATION: {
    label: 'Care Coordination',
    color: 'text-green-400',
    bgColor: 'bg-green-500/20 border-green-500/30',
    icon: '📋',
  },
  SOCIAL_WORK: {
    label: 'Social Work',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20 border-orange-500/30',
    icon: '🤝',
  },
  PT_OT_SESSION: {
    label: 'PT/OT Session',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/20 border-cyan-500/30',
    icon: '🏃',
  },
};

const sourceReliability: Record<string, number> = {
  NURSE_BEDSIDE: 0.95,
  PT_OT_SESSION: 0.90,
  CARE_COORDINATION: 0.85,
  SOCIAL_WORK: 0.80,
  FAMILY_DISCUSSION: 0.75,
};

export function SourceBadge({ source, size = 'md', showReliability = false, reliability }: SourceBadgeProps) {
  const config = sourceConfig[source] || {
    label: source,
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/20 border-gray-500/30',
    icon: '📝',
  };

  const reliabilityValue = reliability ?? sourceReliability[source] ?? 0.5;

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border ${config.bgColor} ${config.color} ${sizeClasses[size]}`}
    >
      <span>{config.icon}</span>
      <span>{config.label}</span>
      {showReliability && (
        <span className="text-gray-500 ml-1">
          ({(reliabilityValue * 100).toFixed(0)}%)
        </span>
      )}
    </span>
  );
}

interface SourceListProps {
  sources: Array<{
    source: string;
    confidence?: number;
    capturedAt?: string | Date;
  }>;
  compact?: boolean;
}

export function SourceList({ sources, compact = false }: SourceListProps) {
  if (compact) {
    return (
      <div className="flex flex-wrap gap-1">
        {sources.map((s, idx) => (
          <SourceBadge key={idx} source={s.source} size="sm" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sources.map((s, idx) => (
        <div key={idx} className="flex items-center justify-between">
          <SourceBadge source={s.source} size="md" />
          <div className="flex items-center gap-3 text-sm">
            {s.confidence !== undefined && (
              <span className={`${s.confidence >= 0.7 ? 'text-green-400' : 'text-yellow-400'}`}>
                {(s.confidence * 100).toFixed(0)}% confidence
              </span>
            )}
            {s.capturedAt && (
              <span className="text-gray-500">
                {new Date(s.capturedAt).toLocaleString()}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function SourceReliabilityLegend() {
  const sortedSources = Object.entries(sourceReliability).sort((a, b) => b[1] - a[1]);

  return (
    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
      <h4 className="text-sm font-medium text-gray-300 mb-3">Source Reliability Weights</h4>
      <div className="space-y-2">
        {sortedSources.map(([source, reliability]) => {
          const config = sourceConfig[source];
          return (
            <div key={source} className="flex items-center gap-2">
              <span className="text-lg">{config?.icon}</span>
              <span className={`text-sm ${config?.color} flex-1`}>{config?.label}</span>
              <div className="w-20 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full ${config?.color.replace('text-', 'bg-')}`}
                  style={{ width: `${reliability * 100}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 w-10 text-right">
                {(reliability * 100).toFixed(0)}%
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-gray-500 mt-3">
        Higher reliability = more weight in conflict resolution
      </p>
    </div>
  );
}

export default SourceBadge;
