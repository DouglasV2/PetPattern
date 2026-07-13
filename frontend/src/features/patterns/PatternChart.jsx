import { evidenceSignal } from '../../lib/patterns'
import { PatternCellStrip } from './PatternCellStrip'
import { PatternLineChart } from './PatternLineChart'

// A quiet visual for the pattern: numeric signals (scratching) read best as a
// line over 30 days with food markers; everything else as a 2-week tone strip.
// Both draw only from real logs and never invent data.
function PatternChart({ pattern, checkIns, foodLogs }) {
  if (pattern.type === 'ITCHING_ABOVE_BASELINE' || pattern.type === 'POSSIBLE_FOOD_TRIGGER') {
    return <PatternLineChart pattern={pattern} checkIns={checkIns} foodLogs={foodLogs} />
  }
  const sig = evidenceSignal(pattern)
  if (!sig) return null
  return <PatternCellStrip pattern={pattern} checkIns={checkIns} sig={sig} foodLogs={foodLogs} />
}

export { PatternChart }
