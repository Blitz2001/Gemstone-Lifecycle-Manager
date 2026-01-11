import { LotStage } from './state-machine'

export interface LotMetrics {
    yieldPercentage?: number
    totalOutputWeight?: number
    colorDistribution?: { name: string; value: number }[]
    clarityDistribution?: { name: string; value: number }[]
    weightLoss?: number
}

export function extractMetrics(logs: any[], currentStage: LotStage): LotMetrics | null {
    // Only relevant for stages AFTER Electric Burn usually, or IF Electric Burn has data
    const electricBurnLog = logs.find(l => l.stage === LotStage.ELECTRIC_BURN)

    if (!electricBurnLog || !electricBurnLog.data || !electricBurnLog.data.breakdown) {
        return null
    }

    const startWeight = 0 // TODO: Need to find input weight to this stage.
    // Ideally we look at the 'current_weight' of the lot BEFORE this stage, 
    // or sum of weights from previous stage log.

    // For now, let's try to find the 'CUT_POLISH' log metrics or rough composition sum?
    // Let's rely on 'breakdown' sum vs 'rough_composition' sum for global yield.

    // 1. Calculate Total Output Weight
    const breakdown = electricBurnLog.data.breakdown as any[]
    const totalOutputWeight = breakdown.reduce((sum, item) => sum + (Number(item.carats) || 0), 0)

    // 2. Distributions
    const colorMap = new Map<string, number>()
    const clarityMap = new Map<string, number>()

    breakdown.forEach(item => {
        const weight = Number(item.carats) || 0

        // Color Dist (by Weight)
        const color = item.color || 'Unknown'
        colorMap.set(color, (colorMap.get(color) || 0) + weight)

        // Clarity Dist (by Weight)
        const clarity = item.clarity || 'Unknown'
        clarityMap.set(clarity, (clarityMap.get(clarity) || 0) + weight)
    })

    const colorDistribution = Array.from(colorMap.entries()).map(([name, value]) => ({ name, value }))
    const clarityDistribution = Array.from(clarityMap.entries()).map(([name, value]) => ({ name, value }))

    // 3. Yield Calculation
    // We need an initial weight basis. 
    // Option A: Compare to Initial Rough Weight (Global Yield)
    const procurementLog = logs.find(l => l.stage === LotStage.PROCUREMENT)
    let initialWeight = 0
    if (procurementLog?.data?.rough_composition) {
        initialWeight = Object.values(procurementLog.data.rough_composition).reduce((sum: number, item: any) => sum + (Number(item.carats) || 0), 0)
    }

    let yieldPercentage = 0
    if (initialWeight > 0) {
        yieldPercentage = (totalOutputWeight / initialWeight) * 100
    }

    return {
        yieldPercentage,
        totalOutputWeight,
        colorDistribution,
        clarityDistribution,
        weightLoss: initialWeight - totalOutputWeight
    }
}
