'use client'

import { useState, useEffect, useCallback } from 'react'
import { LotStage, ALLOWED_TRANSITIONS, STAGE_DISPLAY_NAMES, normalizeStage } from '@/lib/state-machine'
import { transitionLotStage, reopenLot, recordPartialSale } from '@/lib/actions'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { BreakdownForm } from './forms/breakdown-form'
import { SellReadyForm } from './forms/sell-ready-form'
import { SoldForm } from './forms/sold-form'
import { CertificationForm } from './forms/certification-form'
import { LockOpen, ShoppingCart } from 'lucide-react'

interface TransitionControlsProps {
    lotId: string
    currentStage: LotStage
    isFinalized: boolean
    composition: Record<string, { pieces: number, carats: number }>
    totalCost: number
    valuations?: any[]
    isAdmin: boolean
}

export function TransitionControls({ lotId, currentStage, isFinalized, composition, totalCost, valuations = [], isAdmin }: TransitionControlsProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [cost, setCost] = useState<string>('')
    const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0])
    const [weightInputs, setWeightInputs] = useState<Record<string, string>>({})
    const [piecesInputs, setPiecesInputs] = useState<Record<string, string>>({})
    const [mounted, setMounted] = useState(false)

    // State for Partial Sales
    const [partialSaleItem, setPartialSaleItem] = useState<any>(null)
    const [partialSaleQty, setPartialSaleQty] = useState<{ carats: string, pieces: string, price: string, buyer: string, notes: string }>({
        carats: '', pieces: '', price: '', buyer: '', notes: ''
    })

    // State for Breakdown Data (Gas Burn & Electric Burn)
    const [breakdownData, setBreakdownData] = useState<any>(null)

    // ... (Handlers)

    const handlePartialSale = async () => {
        if (!partialSaleItem) return

        setLoading(true)
        setError(null)

        try {
            const soldCarats = Number(partialSaleQty.carats) || 0
            const soldPieces = Number(partialSaleQty.pieces) || 0
            const price = Number(partialSaleQty.price) || 0

            // Validation
            if (soldPieces > partialSaleItem.pieces || soldCarats > partialSaleItem.carats) {
                setError("Cannot sell more than available stock.")
                setLoading(false)
                return
            }

            const result = await recordPartialSale(
                lotId,
                partialSaleItem.type,
                soldCarats,
                soldPieces,
                price,
                partialSaleQty.buyer,
                partialSaleQty.notes,
                new Date().toISOString()
            )

            if (!result.success) {
                setError(result.error || 'Failed to record sale')
            } else {
                setIsOpen(false)
                setPartialSaleItem(null) // Reset
                // Reset form
                setPartialSaleQty({ carats: '', pieces: '', price: '', buyer: '', notes: '' })
            }
        } catch (err) {
            setError('An unexpected error occurred')
        } finally {
            setLoading(false)
        }
    }

    // State for Sell Ready / Valuation Data
    const [sellReadyData, setSellReadyData] = useState<any>(null)

    // State for Sold Data
    const [soldData, setSoldData] = useState<any>(null)

    // State for Certification Data
    const [certificationData, setCertificationData] = useState<any>(null)

    // Stable handler to prevent infinite loop in BreakdownForm effect
    const onBreakdownChange = useCallback((data: any) => {
        setBreakdownData(data)
    }, [])

    const onSellReadyChange = useCallback((data: any) => {
        setSellReadyData(data)
    }, [])

    const onSoldChange = useCallback((data: any) => {
        setSoldData(data)
    }, [])

    const onCertificationChange = useCallback((data: any) => {
        setCertificationData(data)
    }, [])

    // Fix Hydration Error: Radix UI IDs mismatch on server/client.
    useEffect(() => {
        setMounted(true)
    }, [])

    const handleReopen = async () => {
        if (!confirm('Are you sure you want to reopen this lot? This allows further modifications.')) return
        setLoading(true)
        const res = await reopenLot(lotId)
        if (!res.success) {
            alert(res.error)
        }
        setLoading(false)
    }

    const [selectedTargetStage, setSelectedTargetStage] = useState<LotStage | null>(null)

    // Normalize Stage: Handle cases where DB has 'Sell Ready' (display name) or 'SELL_READY' (legacy)
    const workingStage = normalizeStage(currentStage) || currentStage

    // Determine possible next stages
    const nextStages = ALLOWED_TRANSITIONS[workingStage] || []
    const nextStage = (selectedTargetStage && nextStages.includes(selectedTargetStage)) ? selectedTargetStage : nextStages?.[0]

    // if (!mounted) return null // Removed to force visibility

    if (isFinalized) {
        return (
            <Card className="p-4 bg-muted/50 border-dashed flex justify-between items-center">
                <div className="flex items-center gap-2 text-muted-foreground p-2">
                    <span>Lot Finalized. No further transitions allowed.</span>
                </div>
                <Button variant="outline" size="sm" onClick={handleReopen} disabled={loading}>
                    <LockOpen className="w-4 h-4 mr-2" />
                    Reopen Lot
                </Button>
            </Card>
        )
    }

    if (!nextStage) {
        return (
            <Card className="p-4 bg-red-50 border-red-200 border-dashed">
                <div className="text-red-600 text-sm">
                    Debug: No transition found from "{currentStage}" (normalized: "{workingStage}").
                    Allowed keys: {Object.keys(ALLOWED_TRANSITIONS).join(', ')}
                </div>
            </Card>
        )
    }

    const handleWeightChange = (type: string, value: string) => {
        setWeightInputs(prev => ({ ...prev, [type]: value }))
    }
    const handlePiecesChange = (type: string, value: string) => {
        setPiecesInputs(prev => ({ ...prev, [type]: value }))
    }

    const handleTransition = async () => {
        setLoading(true)
        setError(null)

        let data: any = {}
        let totalNewWeight = 0
        const costPerCt = Number(cost) || 0

        if (nextStage === LotStage.GAS_BURN || nextStage === LotStage.ELECTRIC_BURN) {
            // Validate specific form data (Breakdown)
            // Ensure we filter out any 0-carat entries (e.g. remainders entered as 0 or empty rows)
            // This prevents "consumed" stones from appearing as results or being carried over.
            const userEnteredRows = (breakdownData?.breakdown || [])
                .filter((r: any) => (r.carats || 0) > 0)
                .map((r: any) => ({
                    ...r,
                    clarity: (r.clarity && r.clarity.trim() !== '') ? r.clarity : '-'
                }))

            // Note: We'll check if we have ANY data (user entered OR auto-carryover) after calculating auto-carryover.

            // --- AUTO-CARRYOVER LOGIC ---
            // Identify stones from composition that were NOT touched (neither as transformed source nor remainder)
            // and automatically add them to the next stage.
            const touchedKeys = new Set(userEnteredRows.map((r: any) => r.source_type).filter(Boolean))
            const autoCarryOver: any[] = []

            Object.entries(composition || {}).forEach(([key, stats]) => {
                if (!touchedKeys.has(key) && ((stats.carats || 0) > 0 || (stats.pieces || 0) > 0)) {
                    // This stone type was ignored by the user -> assume it passes through unchanged.
                    autoCarryOver.push({
                        color: key,            // Maintain the full key name (e.g. "Royal Blue IF")
                        clarity: '-',          // Default clarity for source types
                        source_type: key,      // Track lineage
                        pieces: stats.pieces || 0,
                        carats: stats.carats || 0
                    })
                }
            })

            // Merge auto-carryover items into breakdown
            breakdownData.breakdown = [...userEnteredRows, ...autoCarryOver]

            // Re-validate final payload
            if (breakdownData.breakdown.length === 0) {
                setError("No data to transition.")
                setLoading(false)
                return
            }

            // Ensure all rows have valid data (should be valid now)
            const validRows = breakdownData.breakdown.filter((r: any) => r.color && r.carats > 0)

            data = breakdownData
            totalNewWeight = validRows.reduce((sum: number, r: any) => sum + r.carats, 0)
            data.new_weight = totalNewWeight
        } else if (nextStage === LotStage.CERTIFICATION) {
            // Validate Certification Data
            if (!certificationData?.lab_name || !certificationData?.report_number) {
                setError("Laboratory name and report number are required.")
                setLoading(false)
                return
            }
            data = certificationData
            totalNewWeight = certificationData.verified_carat || Object.values(composition || {}).reduce((sum, s) => sum + s.carats, 0)
            data.new_weight = totalNewWeight

        } else if (nextStage === LotStage.SELL_READY) {
            // Validate Sell Ready Data
            if (!sellReadyData?.valuations || sellReadyData.valuations.length === 0) {
                setError("Valuation data is missing.")
                setLoading(false)
                return
            }

            data = sellReadyData
            // For Sell Ready, new weight is usually same as previous, so we calculate it from composition 
            // (or current values if inputs were allowed, but they are locked).
            totalNewWeight = Object.values(composition || {}).reduce((sum, s) => sum + s.carats, 0)
            data.new_weight = totalNewWeight

        } else if (nextStage === LotStage.SOLD) {
            // Validate Sold Data
            if (!soldData?.sold_price || !soldData?.buyer || !soldData?.sale_date) {
                setError("Please complete all required sale details.")
                setLoading(false)
                return
            }
            data = soldData
            // Weight doesn't change on sale usually, but we keep track
            const currentTotalWeight = Object.values(composition || {}).reduce((sum, s) => sum + s.carats, 0)
            data.new_weight = currentTotalWeight

        } else {
            // Standard Flow: Structure data capturing new weights AND PIECES for each refined type
            const measurement_data = Object.entries(composition || {}).reduce((acc: any, [type, stats]) => {
                acc[type] = {
                    pieces: piecesInputs[type] ? Number(piecesInputs[type]) : (stats.pieces || 0),
                    carats: weightInputs[type] ? Number(weightInputs[type]) : (stats.carats || 0),
                    previous_carats: stats.carats || 0,
                    previous_pieces: stats.pieces || 0
                }
                return acc
            }, {})

            totalNewWeight = Object.values(measurement_data).reduce((sum: number, item: any) => sum + item.carats, 0)

            data = {
                measurements: measurement_data,
                new_weight: totalNewWeight
            }
        }

        const finalCost = costPerCt * totalNewWeight

        try {
            const result = await transitionLotStage(lotId, nextStage, data, finalCost, date)
            if (!result.success) {
                setError(result.error || 'Transition failed')
            } else {
                setIsOpen(false)
            }
        } catch (e: any) {
            console.error(e)
            setError(e.message || 'An unexpected error occurred')
        } finally {
            setLoading(false)
        }
    }

    // 0. RBAC Check
    if (!isAdmin) {
        return (
            <Card className="p-4 bg-muted/50 border-dashed">
                <div className="flex items-center justify-center text-muted-foreground gap-2">
                    <LockOpen className="w-4 h-4" />
                    <span className="text-sm">Admin access required to manage lot transitions</span>
                </div>
            </Card>
        )
    }

    return (
        <Card className="p-4 bg-muted/50 border-dashed">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <h3 className="font-semibold">Workflow Actions</h3>
                    <p className="text-sm text-muted-foreground">Move to next stage: {STAGE_DISPLAY_NAMES[nextStage]}</p>
                </div>

                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button>Advance to {STAGE_DISPLAY_NAMES[nextStage]}</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Confirm Transition</DialogTitle>
                            <DialogDescription>
                                Moving from {STAGE_DISPLAY_NAMES[workingStage]} to {STAGE_DISPLAY_NAMES[nextStage]}.
                                {(nextStage === LotStage.GAS_BURN || nextStage === LotStage.ELECTRIC_BURN)
                                    ? " Enter the detailed breakdown of the resulting stones."
                                    : nextStage === LotStage.SELL_READY
                                        ? " Enter valuation and predicted pricing."
                                        : nextStage === LotStage.SOLD
                                            ? " Enter final sale details to close this lot."
                                            : " Enter the new measurements for each gem type."}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-4 py-4">
                            {error && <div className="text-red-500 text-sm">{error}</div>}

                            {/* Target Stage Selection (If multiple options exist like Gas Burn -> Cut & Polish OR Electric Burn) */}
                            {nextStages.length > 1 && (
                                <div className="flex items-center gap-3 bg-muted p-3 rounded-lg border">
                                    <Label className="font-semibold text-xs text-muted-foreground uppercase tracking-wider whitespace-nowrap">Target Stage:</Label>
                                    <div className="flex gap-2">
                                        {nextStages.map(stage => (
                                            <Button
                                                key={stage}
                                                type="button"
                                                size="sm"
                                                variant={nextStage === stage ? "default" : "outline"}
                                                onClick={() => setSelectedTargetStage(stage)}
                                                className="text-xs"
                                            >
                                                {STAGE_DISPLAY_NAMES[stage]}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* NEW: Date and Cost Inputs */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="date" className="text-right">Date</Label>
                                    <Input
                                        id="date"
                                        type="date"
                                        className="col-span-3"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="cost" className="text-right">Cost<br /><span className="text-xs text-muted-foreground">(/Ct)</span></Label>
                                    <div className="col-span-3 space-y-1">
                                        <Input
                                            id="cost"
                                            type="number"
                                            placeholder="0.00"
                                            value={cost}
                                            onChange={(e) => setCost(e.target.value)}
                                        />
                                        {/* Preview Total Cost */}
                                        {(() => {
                                            let estimatedWeight = 0
                                            if (nextStage === LotStage.GAS_BURN || nextStage === LotStage.ELECTRIC_BURN) {
                                                const manual = (breakdownData?.breakdown || [])
                                                    .filter((r: any) => (r.carats || 0) > 0)
                                                    .reduce((sum: number, r: any) => sum + Number(r.carats), 0)
                                                estimatedWeight = manual
                                            } else {
                                                estimatedWeight = Object.entries(composition || {}).reduce((sum, [type, stats]) => {
                                                    const cw = weightInputs[type] ? Number(weightInputs[type]) : stats.carats
                                                    return sum + cw
                                                }, 0)
                                            }

                                            const total = (Number(cost) || 0) * estimatedWeight

                                            // Conditional minimal display
                                            if (!cost) return null

                                            return (
                                                <div className="text-xs text-right text-muted-foreground leading-tight">
                                                    Est: {estimatedWeight.toFixed(2)}ct × {cost} = <b>{total.toLocaleString()}</b>
                                                </div>
                                            )
                                        })()}
                                    </div>
                                </div>
                            </div>

                            {/* ELECTRIC BURN / GAS BURN: Show Detailed Breakdown Form */}
                            {(nextStage === LotStage.GAS_BURN || nextStage === LotStage.ELECTRIC_BURN) ? (
                                <BreakdownForm
                                    composition={composition}
                                    onChange={onBreakdownChange}
                                />
                            ) : nextStage === LotStage.CERTIFICATION ? (
                                <CertificationForm
                                    onChange={onCertificationChange}
                                />
                            ) : nextStage === LotStage.SELL_READY ? (
                                /* SELL READY: Valuation Form */
                                <SellReadyForm
                                    composition={composition}
                                    onChange={onSellReadyChange}
                                    totalCost={totalCost}
                                />
                            ) : nextStage === LotStage.SOLD ? (
                                /* SOLD: Final Sale Form */
                                <SoldForm
                                    onChange={onSoldChange}
                                    totalCost={totalCost}
                                />
                            ) : (
                                /* Standard Measurement Form for other stages */
                                <div className="border rounded-md">
                                    <div className="grid grid-cols-12 gap-2 p-2 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
                                        <div className="col-span-3">Type</div>
                                        <div className="col-span-2 text-center">Prev (ct/pc)</div>
                                        <div className="col-span-2 text-center">New Pcs</div>
                                        <div className="col-span-2 text-center">New Wgt</div>
                                        <div className="col-span-2 text-right">Wgt Loss</div>
                                        <div className="col-span-1 text-right">Pcs Diff</div>
                                    </div>
                                    {Object.entries(composition || {}).map(([type, stats]) => {
                                        const currentWeight = weightInputs[type] ? Number(weightInputs[type]) : stats.carats
                                        const currentPieces = piecesInputs[type] ? Number(piecesInputs[type]) : stats.pieces

                                        const weightLoss = stats.carats - currentWeight
                                        const weightLossPercent = stats.carats > 0 ? (weightLoss / stats.carats) * 100 : 0

                                        const pcsDiff = currentPieces - stats.pieces

                                        return (
                                            <div key={type} className="grid grid-cols-12 gap-2 p-2 items-center text-sm border-b last:border-0">
                                                <div className="col-span-3 font-medium truncate" title={type}>{type}</div>
                                                <div className="col-span-2 text-center text-muted-foreground text-xs">
                                                    {stats.carats.toFixed(2)} / {stats.pieces}
                                                </div>
                                                <div className="col-span-2">
                                                    <Input
                                                        type="number"
                                                        className="h-8 text-center"
                                                        placeholder={stats.pieces.toString()}
                                                        onChange={(e) => handlePiecesChange(type, e.target.value)}
                                                    />
                                                </div>
                                                <div className="col-span-2">
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        className="h-8 text-center"
                                                        placeholder={stats.carats.toString()}
                                                        onChange={(e) => handleWeightChange(type, e.target.value)}
                                                    />
                                                </div>
                                                <div className={`col-span-2 text-right font-medium ${weightLoss > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                                    {weightLoss.toFixed(2)} <span className="text-xs text-muted-foreground">({weightLossPercent.toFixed(1)}%)</span>
                                                </div>
                                                <div className={`col-span-1 text-right text-xs font-medium ${pcsDiff !== 0 ? 'text-blue-500' : 'text-muted-foreground'}`}>
                                                    {pcsDiff > 0 ? `+${pcsDiff}` : pcsDiff}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}

                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={loading}>Cancel</Button>
                            <Button onClick={handleTransition} disabled={loading}>
                                {loading ? 'Processing...' : 'Confirm Move'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </Card>
    )
}
