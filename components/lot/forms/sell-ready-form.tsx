'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ValuationItem {
    type: string
    pieces: number
    carats: number
    price_per_carat: number
    total_val: number
    margin_percent: number
}

interface SellReadyFormProps {
    composition: Record<string, { pieces: number, carats: number }>
    onChange: (data: { valuations: ValuationItem[] }) => void
    totalCost?: number
}

export function SellReadyForm({ composition, onChange, totalCost = 0 }: SellReadyFormProps) {
    const [valuations, setValuations] = useState<Record<string, ValuationItem>>({})

    // Initialize state from composition
    useEffect(() => {
        const initial: Record<string, ValuationItem> = {}
        Object.entries(composition || {}).forEach(([type, stats]) => {
            initial[type] = {
                type,
                pieces: stats.pieces,
                carats: stats.carats,
                price_per_carat: 0,
                total_val: 0,
                margin_percent: 0
            }
        })
        setValuations(initial)
    }, [composition])


    useEffect(() => {
        const data = Object.values(valuations)
        onChange({ valuations: data })
    }, [valuations, onChange])


    // Helper: Calculate implied margin based on Average Cost Method
    // Note: In real life, cost is not evenly distributed, but this is a good baseline for "Automation"
    const calculateMargin = (pricePerCarat: number) => {
        if (!totalCost) return 0
        const totalWeight = Object.values(composition || {}).reduce((sum, s) => sum + s.carats, 0)
        if (totalWeight === 0) return 0
        const avgCostPerCarat = totalCost / totalWeight

        // Margin % (ROI) = (Price - Cost) / Cost * 100
        if (avgCostPerCarat === 0) return 0
        return ((pricePerCarat - avgCostPerCarat) / avgCostPerCarat) * 100
    }

    const handlePriceChange = (type: string, price: number) => {
        setValuations(prev => {
            const item = prev[type]
            const total = price * item.carats
            const autoMargin = calculateMargin(price)

            return {
                ...prev,
                [type]: {
                    ...item,
                    price_per_carat: price,
                    total_val: total,
                    margin_percent: Number(autoMargin.toFixed(2))
                }
            }
        })
    }

    const handleTotalChange = (type: string, total: number) => {
        setValuations(prev => {
            const item = prev[type]
            const price = item.carats > 0 ? total / item.carats : 0
            const autoMargin = calculateMargin(price)

            return {
                ...prev,
                [type]: {
                    ...item,
                    total_val: total,
                    price_per_carat: Number(price.toFixed(2)),
                    margin_percent: Number(autoMargin.toFixed(2))
                }
            }
        })
    }

    const handleMarginChange = (type: string, margin: number) => {
        // If user manually changes margin, we COULD reserve-calc price,
        // but for now let's just update the margin field to avoid fighting.
        setValuations(prev => ({
            ...prev,
            [type]: { ...prev[type], margin_percent: margin }
        }))
    }

    const totalProjectedValue = Object.values(valuations).reduce((sum, v) => sum + v.total_val, 0)
    const projectedProfit = totalProjectedValue - totalCost
    const projectedROI = totalCost > 0 ? (projectedProfit / totalCost) * 100 : 0

    return (
        <div className="space-y-4 border rounded-md p-4 bg-muted/20">
            <h4 className="text-sm font-semibold mb-2">Valuation & Predictions</h4>

            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-2 border-b pb-2">
                <div className="col-span-3">Type</div>
                <div className="col-span-2 text-center">Stock (Pcs / Cts)</div>
                <div className="col-span-3 text-right">Predicted Price/Ct</div>
                <div className="col-span-2 text-right">Margin (Avg Cost)</div>
                <div className="col-span-2 text-right">Total Val</div>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {Object.values(valuations).map((item) => (
                    <div key={item.type} className="grid grid-cols-12 gap-2 items-center py-2 border-b last:border-0">
                        <div className="col-span-3 font-medium truncate" title={item.type}>{item.type}</div>

                        {/* Read-Only Stock Info */}
                        <div className="col-span-2 text-center text-sm tabular-nums">
                            {item.pieces} / {item.carats.toFixed(2)}
                        </div>

                        {/* Price Input */}
                        <div className="col-span-3">
                            <Input
                                type="number"
                                className="h-8 text-right text-xs"
                                placeholder="0.00"
                                value={item.price_per_carat || ''}
                                onChange={(e) => handlePriceChange(item.type, Number(e.target.value))}
                            />
                        </div>

                        {/* Margin Input */}
                        <div className="col-span-2 relative">
                            <Input
                                type="number"
                                className="h-8 text-right text-xs pr-6"
                                placeholder="0"
                                value={item.margin_percent || ''}
                                onChange={(e) => handleMarginChange(item.type, Number(e.target.value))}
                            />
                            <span className="absolute right-2 top-2 text-[10px] text-muted-foreground">%</span>
                        </div>

                        {/* Total Value (Bidirectional) */}
                        <div className="col-span-2">
                            <Input
                                type="number"
                                className="h-8 text-right text-xs font-semibold"
                                placeholder="0.00"
                                value={item.total_val || ''}
                                onChange={(e) => handleTotalChange(item.type, Number(e.target.value))}
                            />
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex flex-col gap-2 pt-2 border-t text-sm">
                <div className="flex justify-between text-muted-foreground text-xs">
                    <span>Processing Cost incl. Purchase: {totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    <span>* Margin calc based on avg cost</span>
                </div>
                <div className="flex justify-between items-center bg-background p-2 rounded border">
                    <span className="font-semibold">Projected Profit:
                        <span className={projectedProfit >= 0 ? "text-green-600 ml-2" : "text-red-500 ml-2"}>
                            {projectedProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                    </span>
                    <span className="font-semibold">Global ROI:
                        <span className={projectedROI >= 0 ? "text-green-600 ml-2" : "text-red-500 ml-2"}>
                            {projectedROI.toFixed(1)}%
                        </span>
                    </span>
                    <span className="font-bold text-lg text-primary ml-4">
                        Total: {totalProjectedValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                </div>
            </div>
        </div>
    )
}
