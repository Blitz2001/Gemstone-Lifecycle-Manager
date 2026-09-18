'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calculator, ArrowRight, DollarSign, Scale, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from '@/lib/utils'

export function RoiCalculator() {
    const [isOpen, setIsOpen] = useState(false)

    // Inputs
    const [purchasePrice, setPurchasePrice] = useState<string>('')
    const [initialWeight, setInitialWeight] = useState<string>('')
    const [weightUnit, setWeightUnit] = useState<'ct' | 'g'>('g') // Default to grams for rough
    const [cleanStonePct, setCleanStonePct] = useState<number>(30) // Default conservative estimate
    const [wastePct, setWastePct] = useState<number>(65) // Cutting loss
    const [processingBudget, setProcessingBudget] = useState<string>('')

    // Split
    const [geudaPct, setGeudaPct] = useState<number>(70)
    // Other % is derived or explicit? Let's make it linked.

    // Market Estimates
    const [geudaPrice, setGeudaPrice] = useState<string>('')
    const [otherPrice, setOtherPrice] = useState<string>('')

    // Calculation Engine
    const results = useMemo(() => {
        // Parse Inputs
        const price = parseFloat(purchasePrice) || 0
        const weightRaw = parseFloat(initialWeight) || 0
        const budget = parseFloat(processingBudget) || 0
        const pGeuda = parseFloat(geudaPrice) || 0
        const pOther = parseFloat(otherPrice) || 0

        // 1. Unit Conversion
        const initialCt = weightUnit === 'g' ? weightRaw * 5 : weightRaw

        // 2. Usable Rough
        const usableCt = initialCt * (cleanStonePct / 100)

        // 3. Finished Yield (after cutting waste)
        const finishedCt = usableCt * (1 - (wastePct / 100))

        // 4. Categorize
        const cGeuda = finishedCt * (geudaPct / 100)
        const cOther = finishedCt * ((100 - geudaPct) / 100)

        // 5. Financials
        const investment = price + budget
        const revGeuda = cGeuda * pGeuda
        const revOther = cOther * pOther
        const revenue = revGeuda + revOther
        const profit = revenue - investment
        const roi = investment > 0 ? (profit / investment) * 100 : 0

        // 6. Break-even
        // To break even: Revenue >= Investment
        // (cGeuda * BE_Price) + revOther = Investment
        // cGeuda * BE_Price = Investment - revOther
        // BE_Price = (Investment - revOther) / cGeuda
        let breakEvenGeuda = 0
        if (cGeuda > 0) {
            breakEvenGeuda = (investment - revOther) / cGeuda
        }

        return {
            initialCt,
            usableCt,
            finishedCt,
            cGeuda,
            cOther,
            investment,
            revenue,
            profit,
            roi,
            breakEvenGeuda
        }
    }, [purchasePrice, initialWeight, weightUnit, cleanStonePct, wastePct, processingBudget, geudaPct, geudaPrice, otherPrice])

    // Decision Logic
    let decision: 'BUY' | 'CAUTION' | 'LOSS' = 'LOSS'
    let decisionColor = 'text-red-400 border-red-500/30 bg-red-500/10'
    let decisionIcon = <XCircle className="h-5 w-5" />
    let decisionText = "Projected Loss. Cost basis exceeds market value."

    if (results.profit > 0) {
        if (results.roi > 15) {
            decision = 'BUY'
            decisionColor = 'text-green-400 border-green-500/30 bg-green-500/10'
            decisionIcon = <CheckCircle className="h-5 w-5" />
            decisionText = `Solid Investment. Est. Profit ${results.profit.toLocaleString()}.`
        } else {
            decision = 'CAUTION'
            decisionColor = 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10'
            decisionIcon = <AlertTriangle className="h-5 w-5" />
            decisionText = "Risky. Slim margins (<15%). Re-evaluate waste."
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 bg-white/5 border-white/10 hover:bg-white/10 hover:text-white">
                    <Calculator className="h-4 w-4" />
                    Calculator
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl bg-[#0a0a0f] border-white/10 text-white backdrop-blur-xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Calculator className="h-5 w-5 text-blue-400" />
                        Buying Decision Agent
                    </DialogTitle>
                    <DialogDescription>
                        Evaluate rough gemstone investment potential. Standalone tool.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    {/* LEFT: INPUTS */}
                    <div className="space-y-4">
                        <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-4">
                            <h3 className="text-sm font-semibold text-blue-200 uppercase tracking-wider">1. Initial Investment (LKR)</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Purchase Price (LKR)</Label>
                                    <div className="relative">
                                        <Input
                                            type="number"
                                            placeholder="0.00"
                                            className="bg-black/20 border-white/10"
                                            value={purchasePrice}
                                            onChange={e => setPurchasePrice(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Process Budget (LKR)</Label>
                                    <div className="relative">
                                        <Input
                                            type="number"
                                            placeholder="e.g. Burn + Cut"
                                            className="bg-black/20 border-white/10"
                                            value={processingBudget}
                                            onChange={e => setProcessingBudget(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-2 space-y-2">
                                    <Label>Initial Weight</Label>
                                    <Input
                                        type="number"
                                        placeholder="0.00"
                                        className="bg-black/20 border-white/10"
                                        value={initialWeight}
                                        onChange={e => setInitialWeight(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Unit</Label>
                                    <div className="flex bg-black/20 rounded-md border border-white/10 p-1">
                                        <button
                                            onClick={() => setWeightUnit('g')}
                                            className={cn("flex-1 text-xs rounded py-1", weightUnit === 'g' ? "bg-blue-500/20 text-blue-200" : "text-muted-foreground")}
                                        >
                                            g
                                        </button>
                                        <button
                                            onClick={() => setWeightUnit('ct')}
                                            className={cn("flex-1 text-xs rounded py-1", weightUnit === 'ct' ? "bg-blue-500/20 text-blue-200" : "text-muted-foreground")}
                                        >
                                            ct
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-4">
                            <h3 className="text-sm font-semibold text-purple-200 uppercase tracking-wider">2. Yield Estimations</h3>

                            <div className="space-y-2">
                                <div className="flex justify-between text-xs">
                                    <Label>Clean Stone Ratio (Usable)</Label>
                                    <span className="text-muted-foreground">{cleanStonePct}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0" max="100"
                                    value={cleanStonePct}
                                    onChange={e => setCleanStonePct(Number(e.target.value))}
                                    className="w-full accent-purple-500 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-xs">
                                    <Label>Cutting Waste (Loss)</Label>
                                    <span className="text-muted-foreground text-red-300">{wastePct}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0" max="95"
                                    value={wastePct}
                                    onChange={e => setWastePct(Number(e.target.value))}
                                    className="w-full accent-red-500 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>

                            <div className="pt-2 flex justify-between text-xs text-muted-foreground border-t border-white/5">
                                <span>Est. Usable Rough: <b>{results.usableCt.toFixed(1)} ct</b></span>
                                <span>Est. Finished Yield: <b className="text-white">{results.finishedCt.toFixed(2)} ct</b></span>
                            </div>
                        </div>

                        <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-4">
                            <h3 className="text-sm font-semibold text-orange-200 uppercase tracking-wider">3. Market Predictions</h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-blue-300">Geuda %</Label>
                                    <Input
                                        type="number"
                                        className="bg-black/20 border-white/10 text-blue-200"
                                        value={geudaPct}
                                        onChange={e => setGeudaPct(Math.min(100, Math.max(0, Number(e.target.value))))}
                                    />
                                    <p className="text-[10px] text-muted-foreground">Est. {results.cGeuda.toFixed(2)} ct</p>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-orange-300">Other %</Label>
                                    <Input
                                        type="number"
                                        className="bg-black/20 border-white/10 text-orange-200"
                                        disabled
                                        value={(100 - geudaPct).toFixed(0)}
                                    />
                                    <p className="text-[10px] text-muted-foreground">Est. {results.cOther.toFixed(2)} ct</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-blue-300">Geuda Price (LKR/ct)</Label>
                                    <Input
                                        type="number"
                                        className="bg-black/20 border-white/10"
                                        placeholder="0"
                                        value={geudaPrice}
                                        onChange={e => setGeudaPrice(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-orange-300">Other Price (LKR/ct)</Label>
                                    <Input
                                        type="number"
                                        className="bg-black/20 border-white/10"
                                        placeholder="0"
                                        value={otherPrice}
                                        onChange={e => setOtherPrice(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: REPORT CARD */}
                    <div className="space-y-6">
                        <div className={cn("border rounded-xl p-6 flex flex-col items-center justify-center text-center space-y-2 transition-colors", decisionColor)}>
                            {decisionIcon}
                            <h2 className="text-2xl font-bold tracking-tight">{decision}</h2>
                            <p className="text-sm opacity-90 max-w-[200px] mx-auto">{decisionText}</p>
                            <div className="mt-4 pt-4 border-t border-black/10 w-full flex justify-between text-sm font-medium">
                                <span>ROI</span>
                                <span>{results.roi.toFixed(1)}%</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                                <div className="text-xs text-muted-foreground">Total Investment</div>
                                <div className="text-xl font-bold font-mono mt-1 text-white">
                                    LKR {results.investment.toLocaleString()}
                                </div>
                            </div>
                            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                                <div className="text-xs text-muted-foreground">Est. Revenue</div>
                                <div className="text-xl font-bold font-mono mt-1 text-green-400">
                                    LKR {results.revenue.toLocaleString()}
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-4">
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Break-even Analysis</h3>

                            <div className="space-y-1">
                                <div className="flex justify-between items-center text-sm">
                                    <span>Net Profit / (Loss)</span>
                                    <span className={cn("font-mono font-bold", results.profit >= 0 ? "text-green-400" : "text-red-400")}>
                                        {results.profit > 0 ? "+" : ""}LKR {results.profit.toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            <div className="bg-blue-500/10 border border-blue-500/20 rounded p-3 text-xs text-blue-200">
                                <span className="font-semibold block mb-1">Break-even Price (Geuda):</span>
                                To avoid loss, you must sell your Geuda stones for at least
                                <span className="font-bold font-mono text-white ml-1">
                                    LKR {results.breakEvenGeuda > 0 ? results.breakEvenGeuda.toLocaleString(undefined, { maximumFractionDigits: 0 }) : 0} /ct
                                </span>
                                <br />(Assuming 'Other' stones sell at estimated price).
                            </div>
                        </div>

                        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                            <h3 className="text-sm font-semibold mb-2">Result Forecast</h3>
                            <div className="space-y-2 text-sm text-muted-foreground">
                                <div className="flex justify-between">
                                    <span>Geuda (Finished)</span>
                                    <span className="text-white">{results.cGeuda.toFixed(2)} ct</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Other (Finished)</span>
                                    <span className="text-white">{results.cOther.toFixed(2)} ct</span>
                                </div>
                                <div className="flex justify-between pt-2 border-t border-white/10 mt-2">
                                    <span>Total Finished Yield</span>
                                    <span className="text-white font-bold">{results.finishedCt.toFixed(2)} ct</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
