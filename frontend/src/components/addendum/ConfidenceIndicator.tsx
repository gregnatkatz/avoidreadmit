import React from 'react';

interface ConfidenceIndicatorProps {
  confidence: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showPercentage?: boolean;
  breakdown?: {
    transcription?: number;
    extraction?: number;
    source?: number;
  };
}

export function ConfidenceIndicator({
  confidence,
  size = 'md',
  showLabel = true,
  showPercentage = true,
  breakdown,
}: ConfidenceIndicatorProps) {
  const getConfidenceColor = (value: number) => {
    if (value >= 0.85) return 'bg-green-500';
    if (value >= 0.7) return 'bg-yellow-500';
    if (value >= 0.5) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getConfidenceLabel = (value: number) => {
    if (value >= 0.85) return 'High';
    if (value >= 0.7) return 'Good';
    if (value >= 0.5) return 'Moderate';
    return 'Low';
  };

  const sizeClasses = {
    sm: 'h-1.5 w-16',
    md: 'h-2 w-24',
    lg: 'h-3 w-32',
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        {showLabel && (
          <span className={`${textSizeClasses[size]} text-gray-400`}>
            Confidence:
          </span>
        )}
        <div className={`${sizeClasses[size]} bg-gray-700 rounded-full overflow-hidden`}>
          <div
            className={`h-full ${getConfidenceColor(confidence)} transition-all duration-300`}
            style={{ width: `${confidence * 100}%` }}
          />
        </div>
        {showPercentage && (
          <span className={`${textSizeClasses[size]} font-medium ${
            confidence >= 0.7 ? 'text-green-400' : confidence >= 0.5 ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {(confidence * 100).toFixed(0)}%
          </span>
        )}
        {showLabel && (
          <span className={`${textSizeClasses[size]} text-gray-500`}>
            ({getConfidenceLabel(confidence)})
          </span>
        )}
      </div>
      
      {breakdown && (
        <div className="flex gap-4 text-xs text-gray-500 ml-4">
          {breakdown.transcription !== undefined && (
            <span>ASR: {(breakdown.transcription * 100).toFixed(0)}%</span>
          )}
          {breakdown.extraction !== undefined && (
            <span>NER: {(breakdown.extraction * 100).toFixed(0)}%</span>
          )}
          {breakdown.source !== undefined && (
            <span>Source: {(breakdown.source * 100).toFixed(0)}%</span>
          )}
        </div>
      )}
    </div>
  );
}

interface ConfidenceBreakdownProps {
  sources: Array<{
    source: string;
    confidence: number;
    reliability: number;
  }>;
}

export function ConfidenceBreakdown({ sources }: ConfidenceBreakdownProps) {
  const sourceLabels: Record<string, string> = {
    NURSE_BEDSIDE: 'Nurse Bedside',
    FAMILY_DISCUSSION: 'Family Discussion',
    CARE_COORDINATION: 'Care Coordination',
    SOCIAL_WORK: 'Social Work',
    PT_OT_SESSION: 'PT/OT Session',
  };

  const sourceColors: Record<string, string> = {
    NURSE_BEDSIDE: 'bg-blue-500',
    FAMILY_DISCUSSION: 'bg-purple-500',
    CARE_COORDINATION: 'bg-green-500',
    SOCIAL_WORK: 'bg-orange-500',
    PT_OT_SESSION: 'bg-cyan-500',
  };

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-gray-300">Context Sources</h4>
      <div className="space-y-1.5">
        {sources.map((source, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${sourceColors[source.source] || 'bg-gray-500'}`} />
            <span className="text-xs text-gray-400 w-28">
              {sourceLabels[source.source] || source.source}
            </span>
            <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full ${sourceColors[source.source] || 'bg-gray-500'}`}
                style={{ width: `${source.confidence * 100}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 w-10 text-right">
              {(source.confidence * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ConfidenceIndicator;
