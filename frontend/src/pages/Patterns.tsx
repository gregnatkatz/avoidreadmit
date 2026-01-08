import { useQuery } from '@tanstack/react-query'
import { Sparkles, TrendingUp, CheckCircle, AlertTriangle, Beaker, Shield, Info } from 'lucide-react'
import { patternsApi, addendumApi, EnhancedPattern } from '../api/client'
import { useState } from 'react'

interface Pattern {
  id: string
  patternNumber: string
  title: string
  description: string
  contextCriteria: string[]
  sampleSize: number
  successCount: number
  successRate: number
  baselineRate: number
  liftVsBaseline: number
  statisticallySignificant: boolean
  status: string
  dataMonth: number
}

// Evidence strength badge colors
const evidenceColors: Record<string, { bg: string; text: string; label: string }> = {
  strong: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Strong Evidence' },
  moderate: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Moderate Evidence' },
  emerging: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Emerging' },
  weak: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Weak Evidence' },
}

// Discovery method icons
const discoveryIcons: Record<string, { icon: typeof Beaker; label: string }> = {
  statistical_correlation: { icon: TrendingUp, label: 'Statistical Correlation' },
  llm_inference: { icon: Sparkles, label: 'AI Inference' },
  manual: { icon: CheckCircle, label: 'Manual Entry' },
}

export default function Patterns() {
  const [showMetadata, setShowMetadata] = useState<string | null>(null)
  
  const { data: patterns, isLoading } = useQuery({
    queryKey: ['patterns'],
    queryFn: patternsApi.getPatterns
  })

  // Get enhanced patterns with self-describing metadata
  const { data: enhancedPatterns } = useQuery({
    queryKey: ['enhanced-patterns'],
    queryFn: () => addendumApi.getEnhancedPatterns()
  })

  const patternList = patterns || []
  const validatedPatterns = patternList.filter((p: Pattern) => p.status === 'validated')
  
  // Create a map of enhanced pattern data by ID
  const enhancedMap = new Map<string, EnhancedPattern>()
  enhancedPatterns?.forEach((ep: EnhancedPattern) => {
    enhancedMap.set(ep.id, ep)
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Context Patterns</h2>
          <p className="text-gray-400 text-sm">
            AI-discovered patterns that predict successful outcomes
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/20">
          <Sparkles size={18} className="text-green-400" />
          <span className="text-green-400 font-medium">{validatedPatterns.length} Validated Patterns</span>
        </div>
      </div>

      {isLoading ? (
        <div className="glass-card p-8 text-center text-gray-400">Loading patterns...</div>
      ) : (
        <div className="grid grid-cols-2 gap-6">
                    {patternList.map((pattern: Pattern) => {
                      const enhanced = enhancedMap.get(pattern.id)
                      const evidence = enhanced?.selfDescribing?.evidenceStrength || 'moderate'
                      const evidenceStyle = evidenceColors[evidence] || evidenceColors.moderate
                      const discovery = enhanced?.selfDescribing?.discoveryMethod || 'statistical_correlation'
                      const DiscoveryIcon = discoveryIcons[discovery]?.icon || TrendingUp
            
                      return (
                      <div key={pattern.id} className="glass-card p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="icon-box cyan-gradient">
                              <Sparkles size={20} className="text-white" />
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-white">{pattern.title}</h3>
                              <p className="text-xs text-gray-400">{pattern.patternNumber}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {/* Evidence Strength Badge */}
                            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${evidenceStyle.bg}`}>
                              <Shield size={14} className={evidenceStyle.text} />
                              <span className={`${evidenceStyle.text} text-xs`}>{evidenceStyle.label}</span>
                            </div>
                            {pattern.status === 'validated' && (
                              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-500/20">
                                <CheckCircle size={14} className="text-green-400" />
                                <span className="text-green-400 text-xs">Validated</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <p className="text-gray-300 text-sm mb-4">{pattern.description}</p>

                        {/* Discovery Method */}
                        <div className="flex items-center gap-2 mb-4 text-xs text-gray-400">
                          <DiscoveryIcon size={14} />
                          <span>Discovered via {discoveryIcons[discovery]?.label || 'Statistical Correlation'}</span>
                          {enhanced?.selfDescribing?.minimumConfidence && (
                            <span className="ml-auto">Min confidence: {(enhanced.selfDescribing.minimumConfidence * 100).toFixed(0)}%</span>
                          )}
                        </div>

                        <div className="space-y-3 mb-4">
                          <div className="flex flex-wrap gap-2">
                            {pattern.contextCriteria.map((criteria: string, i: number) => (
                              <span key={i} className="px-2 py-1 rounded-lg bg-cyan-500/20 text-cyan-400 text-xs">
                                {criteria}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Self-Describing Metadata Toggle */}
                        {enhanced?.selfDescribing && (
                          <div className="mb-4">
                            <button
                              onClick={() => setShowMetadata(showMetadata === pattern.id ? null : pattern.id)}
                              className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors"
                            >
                              <Info size={14} />
                              {showMetadata === pattern.id ? 'Hide' : 'Show'} Applicability Rules & Contraindications
                            </button>
                  
                            {showMetadata === pattern.id && (
                              <div className="mt-3 p-3 rounded-lg bg-white/5 space-y-3">
                                {/* Applicability Rules */}
                                {enhanced.selfDescribing.applicabilityRules && (
                                  <div>
                                    <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                                      <CheckCircle size={12} className="text-green-400" />
                                      Applicability Rules
                                    </p>
                                    <div className="text-xs text-gray-300 space-y-1">
                                      {enhanced.selfDescribing.applicabilityRules.ageRange && (
                                        <p>Age: {enhanced.selfDescribing.applicabilityRules.ageRange.min || 0} - {enhanced.selfDescribing.applicabilityRules.ageRange.max || 'any'}</p>
                                      )}
                                      {enhanced.selfDescribing.applicabilityRules.diagnoses && (
                                        <p>Diagnoses: {enhanced.selfDescribing.applicabilityRules.diagnoses.join(', ')}</p>
                                      )}
                                      {enhanced.selfDescribing.applicabilityRules.losRange && (
                                        <p>LOS: {enhanced.selfDescribing.applicabilityRules.losRange.min || 0} - {enhanced.selfDescribing.applicabilityRules.losRange.max || 'any'} days</p>
                                      )}
                                      {enhanced.selfDescribing.applicabilityRules.requiredSources && (
                                        <p>Required Sources: {enhanced.selfDescribing.applicabilityRules.requiredSources.join(', ')}</p>
                                      )}
                                    </div>
                                  </div>
                                )}
                      
                                {/* Contraindications */}
                                {enhanced.selfDescribing.contraindications && (
                                  <div>
                                    <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                                      <AlertTriangle size={12} className="text-yellow-400" />
                                      Contraindications
                                    </p>
                                    <div className="text-xs text-gray-300 space-y-1">
                                      {enhanced.selfDescribing.contraindications.excludeDiagnoses && (
                                        <p>Exclude diagnoses: {enhanced.selfDescribing.contraindications.excludeDiagnoses.join(', ')}</p>
                                      )}
                                      {enhanced.selfDescribing.contraindications.excludeCognitiveStatus && (
                                        <p>Exclude cognitive status: {enhanced.selfDescribing.contraindications.excludeCognitiveStatus.join(', ')}</p>
                                      )}
                                      {enhanced.selfDescribing.contraindications.excludeAgeRange && (
                                        <p>Exclude age: {enhanced.selfDescribing.contraindications.excludeAgeRange.min || 0} - {enhanced.selfDescribing.contraindications.excludeAgeRange.max || 'any'}</p>
                                      )}
                                    </div>
                                  </div>
                                )}
                      
                                {/* Validation Results */}
                                {enhanced.selfDescribing.validationResults && (
                                  <div>
                                    <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                                      <Beaker size={12} className="text-blue-400" />
                                      Validation Results
                                    </p>
                                    <div className="text-xs text-gray-300">
                                      <p>Accuracy: {((enhanced.selfDescribing.validationResults.accuracy || 0) * 100).toFixed(0)}% | 
                                         Precision: {((enhanced.selfDescribing.validationResults.precision || 0) * 100).toFixed(0)}% | 
                                         Recall: {((enhanced.selfDescribing.validationResults.recall || 0) * 100).toFixed(0)}%</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="grid grid-cols-3 gap-4 p-4 rounded-xl bg-white/5">
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Sample Size</p>
                            <p className="text-lg font-semibold text-white">{pattern.sampleSize}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Success Rate</p>
                            <p className="text-lg font-semibold text-green-400">
                              {(pattern.successRate * 100).toFixed(0)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Lift vs Baseline</p>
                            <div className="flex items-center gap-1">
                              <TrendingUp size={16} className="text-cyan-400" />
                              <p className="text-lg font-semibold text-cyan-400">
                                +{(pattern.liftVsBaseline * 100).toFixed(0)}%
                              </p>
                            </div>
                          </div>
                        </div>

                        {pattern.statisticallySignificant && (
                          <p className="text-xs text-gray-500 mt-3 text-center">
                            Statistically significant (p &lt; 0.05)
                          </p>
                        )}
                      </div>
                    )})}
        </div>
      )}

      {patternList.length === 0 && !isLoading && (
        <div className="glass-card p-8 text-center">
          <Sparkles size={48} className="text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No Patterns Yet</h3>
          <p className="text-gray-400">
            Patterns will be discovered as more decision traces and outcomes are recorded.
            Advance the timeline to see patterns emerge.
          </p>
        </div>
      )}
    </div>
  )
}
