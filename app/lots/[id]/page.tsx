import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { TransitionControls } from '@/components/lot/transition-controls'
import { LotStage, STAGE_DISPLAY_NAMES } from '@/lib/state-machine'
import { StageTimeline } from '@/components/lot/stage-timeline'
import { LotCompositionDisplay } from '@/components/lot/lot-composition-display'
import { TransformationLineage } from '@/components/lot/transformation-lineage'
import { ValuationSummary } from '@/components/lot/valuation-summary'
import { GasBurnReport } from '@/components/lot/gas-burn-report'
import { SaleSummary } from '@/components/lot/sale-summary'
import { EvidenceUpload } from '@/components/lot/evidence-upload'
import { extractMetrics } from '@/lib/metrics'
import { MetricsDisplay } from '@/components/lot/metrics-display'
import { createStorageBucket } from '@/lib/setup-actions'
import { PartialSalesManager } from '@/components/lot/partial-sales-manager'
import { PartialSalesHistory } from '@/components/lot/partial-sales-history'
import { getCurrentUserRole } from '@/lib/auth-utils'
import { DeleteLotButton } from '@/components/lot/delete-lot-button'
import { CertificationReport } from '@/components/lot/certification-report'

export default async function LotPage({ params }: { params: Promise<{ id: string }> }) {
    const supabase = await createClient()
    const { id } = await params

    // Ensure storage bucket exists (Auto-Fix for Dev)
    await createStorageBucket()

    // Debug log to verify ID
    console.log('Fetching Lot ID:', id);

    const { data: lot, error: lotError } = await supabase
        .from('lots')
        .select('*')
        .eq('id', id)
        .single()

    if (lotError && lotError.code !== 'PGRST116') {
        console.error('Error fetching lot:', lotError);
    }

    if (!lot) {
        notFound()
    }

    // Fetch ALL logs to reconstruct history
    const { data: logs } = await supabase
        .from('stage_logs')
        .select('*')
        .eq('lot_id', id)
        .order('sequence_number', { ascending: true })

    // 1. Get Initial Composition from Procurement
    const procurementLog = logs?.find(l => l.stage === LotStage.PROCUREMENT)
    const initialComposition = procurementLog?.data?.rough_composition || {}

    // 2. Compute Current Composition & Total Cost
    let currentComposition = { ...initialComposition }
    // Initialize with Lot Purchase Price (if any) + Sum of Processing Costs
    let totalCost = (Number(lot.purchase_price) || 0)

    if (logs) {
        logs.forEach(log => {
            // Cost calculation
            totalCost += (Number(log.cost) || 0)

            if (log.stage === 'ELECTRIC_BURN' && log.data?.breakdown) {
                // TRANSFORMATION: Wipe previous types and set new Color/Clarity types
                currentComposition = {}
                log.data.breakdown.forEach((item: any) => {
                    const key = `${item.color} ${item.clarity}`
                    currentComposition[key] = {
                        carats: item.carats,
                        pieces: item.pieces || 0
                    }
                })
            } else if (log.stage === 'GAS_BURN' && log.data?.breakdown) {
                // TRANSFORMATION (Gas Burn): Wipe previous and set new from Gas Burn results
                currentComposition = {}
                log.data.breakdown.forEach((item: any) => {
                    // IF it's a source type (remainder), use JUST the name (e.g. "Silky Geuda")
                    // ELSE use Color + Clarity (e.g. "Royal Blue IF")
                    const isSourceType = initialComposition && initialComposition[item.color]
                    const key = isSourceType ? item.color : `${item.color} ${item.clarity}`

                    currentComposition[key] = {
                        carats: item.carats,
                        pieces: item.pieces || 0
                    }
                })
            } else if (log.data?.measurements) {
                // If this stage recorded new measurements, update the tracking
                Object.entries(log.data.measurements).forEach(([type, stats]: [string, any]) => {
                    if (currentComposition[type]) {
                        currentComposition[type] = {
                            ...currentComposition[type],
                            carats: stats.carats, // Update to new current weight
                            pieces: stats.pieces
                        }
                    }
                })
            }
        })
    }

    // 3. Extract Metrics (Electric Burn / Intelligence)
    const metrics = extractMetrics(logs || [], lot.current_stage as LotStage)

    // 4. Get active valuations and sales history for Partial Sales
    const sellReadyLog = logs?.find(l => l.stage === 'SELL_READY')
    const valuations = sellReadyLog?.data?.valuations || []
    const salesHistory = sellReadyLog?.data?.sales_history || []

    // In SELL_READY stage, reflect live remaining inventory after any partial sales
    if (lot.current_stage === 'SELL_READY' && valuations.length > 0) {
        currentComposition = {}
        valuations.forEach((item: any) => {
            currentComposition[item.type] = {
                carats: Number(item.carats) || 0,
                pieces: Number(item.pieces) || 0
            }
        })
    }

    // 5. Get current user role for RBAC
    const userRole = await getCurrentUserRole()
    const isAdmin = userRole === 'admin'

    return (
        <div className="container mx-auto py-6 space-y-6">
            {/* Actions Header */}
            <div className="flex justify-between items-center">
                <Link href="/" className="text-muted-foreground hover:text-foreground flex items-center gap-1">
                    &larr; Back to Dashboard
                </Link>
                <div className="flex gap-2">
                    <Link href={`/lots/${id}/report`}>
                        <Button variant="outline" size="sm">
                            Print Report
                        </Button>
                    </Link>
                    <DeleteLotButton lotId={lot.id} lotCode={lot.lot_code} isAdmin={isAdmin} />
                </div>
            </div>

            {/* Main Header */}
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{lot.lot_code}</h1>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-1">
                        {lot.purchase_date ? (
                            <span className="font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
                                Buying Date: {new Date(lot.purchase_date).toLocaleDateString(undefined, { dateStyle: 'long' })}
                            </span>
                        ) : (
                            <span>Created on {new Date(lot.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}</span>
                        )}
                        {lot.supplier && (
                            <>
                                <span>•</span>
                                <span>Supplier: <strong className="text-foreground">{lot.supplier}</strong></span>
                            </>
                        )}
                    </div>
                </div>
                <div className="text-left md:text-right">
                    <div className="text-sm text-muted-foreground uppercase tracking-widest">Current Stage</div>
                    <div className="text-2xl font-bold mb-1">
                        {(lot.current_stage === 'SELL_READY' && lot.is_finalized)
                            ? 'Sold'
                            : (STAGE_DISPLAY_NAMES[lot.current_stage as LotStage] || lot.current_stage)}
                    </div>

                    {/* Total Cost Display */}
                    <div className="text-sm font-medium text-muted-foreground">
                        Total Cost: <span className="text-foreground font-bold">LKR {totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                </div>
            </div>

            {/* Procurement Overview Metadata Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-muted/30 p-4 rounded-xl border">
                <div>
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold block">Buying Date</span>
                    <span className="font-bold text-sm text-foreground">
                        {lot.purchase_date ? new Date(lot.purchase_date).toLocaleDateString(undefined, { dateStyle: 'medium' }) : 'Not Specified'}
                    </span>
                </div>
                <div>
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold block">Supplier</span>
                    <span className="font-bold text-sm text-foreground">{lot.supplier || 'N/A'}</span>
                </div>
                <div>
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold block">Purchase Price</span>
                    <span className="font-bold text-sm text-foreground">LKR {(Number(lot.purchase_price) || 0).toLocaleString()}</span>
                </div>
                <div>
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold block">Initial Rough Weight</span>
                    <span className="font-bold text-sm text-foreground">{lot.initial_weight || 0} ct</span>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="grid gap-6">
                <TransitionControls
                    lotId={lot.id}
                    currentStage={lot.current_stage as LotStage}
                    isFinalized={lot.is_finalized}
                    composition={currentComposition}
                    totalCost={totalCost}
                    valuations={valuations}
                    isAdmin={isAdmin}
                />

                {/* Partial Sales Manager (SELL_READY only) */}
                {lot.current_stage === 'SELL_READY' && !lot.is_finalized && (
                    <PartialSalesManager
                        lotId={lot.id}
                        valuations={valuations}
                        isFinalized={lot.is_finalized}
                        isAdmin={isAdmin}
                    />
                )}

                {/* Partial Sales History */}
                {lot.current_stage === 'SELL_READY' && salesHistory.length > 0 && (
                    <PartialSalesHistory salesHistory={salesHistory} />
                )}

                {/* Evidence Upload (Current Stage) */}
                <div className="grid md:grid-cols-1 gap-4">
                    <EvidenceUpload
                        lotId={lot.id}
                        stage={lot.current_stage}
                        isFinalized={lot.is_finalized}
                    />
                </div>

                {/* Metrics Display (Intelligence) - Only shows if metrics exist */}
                {metrics && (
                    <div className="grid md:grid-cols-1 gap-4">
                        <MetricsDisplay metrics={metrics} />
                    </div>
                )}

                {/* LOGIC: Find Electric Burn Data for Lineage */}
                {(() => {
                    const electricBurnLog = logs?.find(l => l.stage === 'ELECTRIC_BURN' && l.data?.breakdown)
                    if (electricBurnLog) {
                        return (
                            <div className="grid md:grid-cols-1 gap-4">
                                <TransformationLineage breakdown={electricBurnLog.data.breakdown} />
                            </div>
                        )
                    }
                    return null
                })()}

                {/* LOGIC: Find Gas Burn Data for Report */}
                {(() => {
                    // Get the LATEST gas burn log to reflect current state
                    const gasBurnLogs = logs?.filter(l => l.stage === 'GAS_BURN' && l.data?.breakdown)
                    const gasBurnLog = gasBurnLogs?.[gasBurnLogs.length - 1]

                    if (gasBurnLog) {
                        return (
                            <div className="grid md:grid-cols-1 gap-4">
                                <GasBurnReport
                                    lotId={lot.id}
                                    stageData={gasBurnLog.data}
                                    initialComposition={initialComposition}
                                    currentComposition={currentComposition}
                                    currentStage={lot.current_stage}
                                />
                            </div>
                        )
                    }
                    return null
                })()}

                {/* LOGIC: Find Certification Data for Report */}
                {(() => {
                    const certLog = logs?.find(l => (l.stage === 'CERTIFICATION' || l.stage === LotStage.CERTIFICATION) && l.data)
                    if (certLog) {
                        return (
                            <div className="grid md:grid-cols-1 gap-4">
                                <CertificationReport data={certLog.data} />
                            </div>
                        )
                    }
                    return null
                })()}

                {/* LOGIC: Find Sold Data (Final Results) */}
                {(() => {
                    // PRIMARY: If Finalized in SELL_READY, the Sell Ready log contains the sale data
                    if (lot.is_finalized && (lot.current_stage === 'SELL_READY' || lot.current_stage === 'SOLD')) {
                        const targetLog = logs?.find(l => l.stage === 'SELL_READY' || l.stage === 'SOLD')
                        if (targetLog) {
                            return (
                                <div className="grid md:grid-cols-1 gap-4">
                                    <SaleSummary
                                        saleData={targetLog.data}
                                        totalCost={totalCost}
                                        createdAt={lot.created_at}
                                    />
                                </div>
                            )
                        }
                    }

                    // FALLBACK: Scan for any log with sold_price (Legacy/Safety)
                    const existingSoldLog = logs?.find(l => l.data?.sold_price)
                    if (existingSoldLog) {
                        return (
                            <div className="grid md:grid-cols-1 gap-4">
                                <SaleSummary
                                    saleData={existingSoldLog.data}
                                    totalCost={totalCost}
                                    createdAt={lot.created_at}
                                />
                            </div>
                        )
                    }
                    return null
                })()}

                {/* LOGIC: Find Sell Ready Prediction Data */}
                {(() => {
                    const sellReadyLog = logs?.find(l => l.stage === 'SELL_READY' && l.data?.valuations)
                    if (sellReadyLog) {
                        return (
                            <div className="grid md:grid-cols-1 gap-4">
                                <ValuationSummary
                                    valuations={sellReadyLog.data.valuations}
                                    totalCost={totalCost}
                                />
                            </div>
                        )
                    }
                    return null
                })()}

                {/* LOGIC: Cut & Polish "Finished vs Unfinished" Intelligence */}
                {(() => {
                    const gasBurnLog = logs?.find(l => l.stage === 'GAS_BURN' && l.data?.breakdown)
                    if (gasBurnLog && (lot.current_stage === 'CUT_POLISH' || lot.current_stage === 'ELECTRIC_BURN')) {
                        const sourceKeys = Object.keys(initialComposition)

                        // Use currentComposition to get the LIVE weights (sync with Report/Analysis)
                        const finished: any[] = []
                        const needsBurn: any[] = []

                        Object.entries(currentComposition).forEach(([key, stats]) => {
                            // Check if it's a source type (remainder)
                            // Note: 'key' is "Color Clarity" or just "Color" for source types
                            const isSource = sourceKeys.includes(key)

                            const { pieces, carats } = stats as { pieces: number, carats: number }

                            if (isSource) {
                                needsBurn.push({ name: key, pieces, carats })
                            } else {
                                finished.push({ name: key, pieces, carats })
                            }
                        })

                        if (finished.length > 0 || needsBurn.length > 0) {
                            return (
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
                                            <div className="flex flex-col space-y-1.5 p-6">
                                                <h3 className="font-semibold leading-none tracking-tight">Processing Status (Post Gas Burn)</h3>
                                                <p className="text-sm text-muted-foreground">Stones separated by color transformation response.</p>
                                            </div>
                                            <div className="p-6 pt-0 grid md:grid-cols-2 gap-6">
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-3 w-3 rounded-full bg-green-500" />
                                                        <h4 className="font-medium text-sm">Finished Transformation (Ready to Sell)</h4>
                                                    </div>
                                                    {finished.length > 0 ? (
                                                        <div className="space-y-2">
                                                            {finished.map((item: any, idx: number) => (
                                                                <div key={idx} className="text-sm border p-2 rounded bg-green-50/50 flex justify-between">
                                                                    <span>{item.name}</span>
                                                                    <span className="font-mono text-muted-foreground">{item.carats.toFixed(2)} ct</span>
                                                                </div>
                                                            ))}
                                                            <div className="text-xs text-muted-foreground text-right border-t pt-2 mt-2">
                                                                Total: {finished.reduce((a: number, b: any) => a + b.carats, 0).toFixed(2)} ct
                                                            </div>
                                                        </div>
                                                    ) : <div className="text-sm text-muted-foreground italic">No finished stones.</div>}
                                                </div>

                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-3 w-3 rounded-full bg-orange-500" />
                                                        <h4 className="font-medium text-sm">Needs Electric Burn</h4>
                                                    </div>
                                                    {needsBurn.length > 0 ? (
                                                        <div className="space-y-2">
                                                            {needsBurn.map((item: any, idx: number) => (
                                                                <div key={idx} className="text-sm border p-2 rounded bg-orange-50/50 flex justify-between">
                                                                    <span>{item.name}</span>
                                                                    <span className="font-mono text-muted-foreground">{item.carats.toFixed(2)} ct</span>
                                                                </div>
                                                            ))}
                                                            <div className="text-xs text-muted-foreground text-right border-t pt-2 mt-2">
                                                                Total: {needsBurn.reduce((a: number, b: any) => a + b.carats, 0).toFixed(2)} ct
                                                            </div>
                                                        </div>
                                                    ) : <div className="text-sm text-muted-foreground italic">No stones needing burn.</div>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        }
                    }
                    return null
                })()}

                {/* Composition Details (Initial vs Current) */}
                <div className="grid md:grid-cols-1 gap-4">
                    <LotCompositionDisplay
                        composition={initialComposition}
                        currentComposition={currentComposition}
                    />
                </div>

                {/* Timeline */}
                <StageTimeline currentStage={lot.current_stage} logs={logs || []} isFinalized={lot.is_finalized} purchaseDate={lot.purchase_date} />
            </div>
        </div>
    )
}
