import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
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
import { ElectricBurnReport } from '@/components/lot/electric-burn-report'
import { VaultShell } from '@/components/layout/vault-shell'
import { 
  ArrowLeft, 
  FileText, 
  Gem, 
  Scale, 
  DollarSign, 
  Calendar, 
  Camera,
  Layers
} from 'lucide-react'

export default async function LotPage({ params }: { params: Promise<{ id: string }> }) {
    const supabase = await createClient()
    const { id } = await params

    // Ensure storage bucket exists
    await createStorageBucket()

    const { data: lot, error: lotError } = await supabase
        .from('lots')
        .select('*')
        .eq('id', id)
        .single()

    if (lotError && lotError.code !== 'PGRST116') {
        console.error('Error fetching lot:', lotError)
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

    // Fetch Assets (Photos)
    const { data: assets } = await supabase
        .from('lot_assets')
        .select('*')
        .eq('lot_id', id)
        .order('created_at', { ascending: true })

    // 1. Get Initial Composition from Procurement
    const procurementLog = logs?.find(l => l.stage === LotStage.PROCUREMENT)
    const initialComposition = procurementLog?.data?.rough_composition || {}

    // 2. Compute Current Composition & Total Cost
    let currentComposition = { ...initialComposition }
    let totalCost = (Number(lot.purchase_price) || 0)

    if (logs) {
        logs.forEach(log => {
            totalCost += (Number(log.cost) || 0)

            if (log.stage === 'ELECTRIC_BURN' && log.data?.breakdown) {
                currentComposition = {}
                log.data.breakdown.forEach((item: any) => {
                    const key = `${item.color} ${item.clarity}`
                    currentComposition[key] = {
                        carats: item.carats,
                        pieces: item.pieces || 0
                    }
                })
            } else if (log.stage === 'GAS_BURN' && log.data?.breakdown) {
                currentComposition = {}
                log.data.breakdown.forEach((item: any) => {
                    const isSourceType = initialComposition && initialComposition[item.color]
                    const key = isSourceType ? item.color : `${item.color} ${item.clarity}`

                    currentComposition[key] = {
                        carats: item.carats,
                        pieces: item.pieces || 0
                    }
                })
            } else if (log.data?.measurements) {
                Object.entries(log.data.measurements).forEach(([type, stats]: [string, any]) => {
                    if (currentComposition[type]) {
                        currentComposition[type] = {
                            ...currentComposition[type],
                            carats: stats.carats,
                            pieces: stats.pieces
                        }
                    }
                })
            }
        })
    }

    // 3. Extract Metrics
    const metrics = extractMetrics(logs || [], lot.current_stage as LotStage)

    // 4. Get active valuations and sales history for Partial Sales
    const sellReadyLog = logs?.find(l => l.stage === 'SELL_READY')
    const valuations = sellReadyLog?.data?.valuations || []
    const salesHistory = sellReadyLog?.data?.sales_history || []

    if (lot.current_stage === 'SELL_READY' && valuations.length > 0) {
        currentComposition = {}
        valuations.forEach((item: any) => {
            currentComposition[item.type] = {
                carats: Number(item.carats) || 0,
                pieces: Number(item.pieces) || 0
            }
        })
    }

    // 5. User role for RBAC
    const userRole = await getCurrentUserRole()
    const isAdmin = userRole === 'admin'

    // Calculations for Header
    const initialWt = Number(lot.initial_weight) || 0
    const currentWt = Number(lot.current_weight) || initialWt
    const yieldRate = initialWt > 0 ? ((currentWt / initialWt) * 100).toFixed(1) : '100.0'
    const lossRate = (100 - Number(yieldRate)).toFixed(1)

    const stageDisplayName = (lot.current_stage === 'SELL_READY' && lot.is_finalized)
        ? 'Sold'
        : (STAGE_DISPLAY_NAMES[lot.current_stage as LotStage] || lot.current_stage)

    const formatCurrency = (val: number) => {
        return `LKR ${(val || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    }

    return (
        <VaultShell>
            <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1500px] mx-auto w-full">
                {/* 1. TOP BREADCRUMB & ACTION CONTROLS */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <Link 
                        href="/" 
                        className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-amber-300 transition-colors"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Back to Dashboard
                    </Link>

                    <div className="flex items-center gap-2.5 self-end sm:self-auto">
                        <Link href={`/lots/${id}/report`}>
                            <button className="bg-white/[0.04] hover:bg-white/10 text-white border border-white/10 px-3.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all">
                                <FileText className="w-3.5 h-3.5 text-amber-400" />
                                <span>Print Dossier</span>
                            </button>
                        </Link>
                        <DeleteLotButton lotId={lot.id} lotCode={lot.lot_code} isAdmin={isAdmin} />
                    </div>
                </div>

                {/* 2. LOT OVERVIEW HERO CARD */}
                <div className="obsidian-card rounded-2xl p-6 border border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold font-mono">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                    STAGE: {stageDisplayName.toUpperCase()}
                                </span>
                                {lot.is_finalized && (
                                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                        SEALED
                                    </span>
                                )}
                            </div>

                            <h1 className="text-2xl lg:text-3xl font-bold font-serif text-white tracking-tight flex items-center gap-2.5">
                                <span>{lot.lot_code}</span>
                                {lot.supplier && (
                                    <span className="text-slate-400 font-sans font-normal text-sm">
                                        • {lot.supplier}
                                    </span>
                                )}
                            </h1>

                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-2 font-mono">
                                {lot.purchase_date ? (
                                    <span className="flex items-center gap-1 text-slate-300">
                                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                        Buying Date: {new Date(lot.purchase_date).toLocaleDateString(undefined, { dateStyle: 'long' })}
                                    </span>
                                ) : (
                                    <span>Created {new Date(lot.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}</span>
                                )}
                            </div>
                        </div>

                        {/* Top Right Financial & Weight Snapshot */}
                        <div className="flex flex-wrap items-center gap-4 lg:gap-6 font-mono text-xs">
                            <div className="bg-white/[0.02] border border-white/5 rounded-xl px-4 py-2.5">
                                <span className="text-[10px] uppercase text-slate-500 block font-semibold">Rough Mass</span>
                                <span className="text-white font-bold text-sm">{initialWt.toFixed(2)} <span className="text-slate-400 text-xs">ct</span></span>
                            </div>
                            <div className="bg-white/[0.02] border border-white/5 rounded-xl px-4 py-2.5">
                                <span className="text-[10px] uppercase text-slate-500 block font-semibold">Current Cut</span>
                                <span className="text-emerald-400 font-bold text-sm">{currentWt.toFixed(2)} <span className="text-slate-400 text-xs">ct</span></span>
                            </div>
                            <div className="bg-white/[0.02] border border-white/5 rounded-xl px-4 py-2.5">
                                <span className="text-[10px] uppercase text-slate-500 block font-semibold">Retention Yield</span>
                                <span className="text-white font-bold text-sm">{yieldRate}% <span className="text-rose-400 text-xs font-normal">(-{lossRate}%)</span></span>
                            </div>
                            <div className="bg-white/[0.02] border border-white/5 rounded-xl px-4 py-2.5">
                                <span className="text-[10px] uppercase text-slate-500 block font-semibold">Total Cost</span>
                                <span className="text-amber-300 font-bold text-base font-serif">{formatCurrency(totalCost)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. MATERIAL RETENTION MATRIX */}
                <section aria-label="Material Retention Matrix" className="obsidian-card rounded-2xl p-6 border border-white/5">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Scale className="w-4 h-4 text-emerald-400" />
                            <h2 className="font-serif font-bold text-base text-white">
                                Weight Retention &amp; Carat Yield
                            </h2>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">
                            BASELINE: {initialWt.toFixed(2)} ct
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3.5">
                            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block mb-1">
                                Initial Rough Weight
                            </span>
                            <div className="text-xl font-bold font-serif text-white">
                                {initialWt.toFixed(2)} <span className="text-xs font-sans font-normal text-slate-400">ct</span>
                            </div>
                        </div>

                        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3.5">
                            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block mb-1">
                                Current Cut Weight
                            </span>
                            <div className="text-xl font-bold font-serif text-emerald-400">
                                {currentWt.toFixed(2)} <span className="text-xs font-sans font-normal text-slate-400">ct</span>
                            </div>
                            <span className="text-[10px] text-emerald-400 font-mono">{yieldRate}% Net Retention</span>
                        </div>

                        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3.5">
                            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block mb-1">
                                Kerf &amp; Faceting Loss
                            </span>
                            <div className="text-xl font-bold font-serif text-rose-400">
                                {(initialWt - currentWt).toFixed(2)} <span className="text-xs font-sans font-normal text-slate-400">ct</span>
                            </div>
                            <span className="text-[10px] text-rose-400 font-mono">-{lossRate}% Kerf Loss</span>
                        </div>
                    </div>

                    {/* Proportional Retention Bar */}
                    <div className="space-y-1.5">
                        <div className="h-2.5 w-full bg-slate-900 rounded-full overflow-hidden flex border border-white/5">
                            <div 
                                className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full rounded-l-full" 
                                style={{ width: `${yieldRate}%` }} 
                            />
                            <div 
                                className="bg-rose-500/70 h-full rounded-r-full" 
                                style={{ width: `${lossRate}%` }} 
                            />
                        </div>
                        <div className="flex justify-between text-[10px] font-mono text-slate-400 pt-0.5">
                            <span className="text-emerald-400">Yield: {currentWt.toFixed(2)} ct ({yieldRate}%)</span>
                            <span className="text-rose-400">Loss: {(initialWt - currentWt).toFixed(2)} ct ({lossRate}%)</span>
                        </div>
                    </div>
                </section>

                {/* 4. STAGE TRANSITION CONTROLLER */}
                <section aria-label="Stage Transition Controller">
                    <TransitionControls
                        lotId={lot.id}
                        currentStage={lot.current_stage as LotStage}
                        isFinalized={lot.is_finalized}
                        composition={currentComposition}
                        totalCost={totalCost}
                        valuations={valuations}
                        isAdmin={isAdmin}
                    />
                </section>

                {/* 5. PARTIAL SALES CONTROLS (IF SELL_READY STAGE) */}
                {lot.current_stage === 'SELL_READY' && !lot.is_finalized && valuations.length > 0 && (
                    <section aria-label="Partial Sales Manager">
                        <PartialSalesManager
                            lotId={lot.id}
                            valuations={valuations}
                            isFinalized={lot.is_finalized}
                            isAdmin={isAdmin}
                        />
                    </section>
                )}

                {/* 6. PARTIAL SALES HISTORY */}
                {lot.current_stage === 'SELL_READY' && salesHistory.length > 0 && (
                    <section aria-label="Sales History">
                        <PartialSalesHistory salesHistory={salesHistory} />
                    </section>
                )}

                {/* 7. EVIDENCE UPLOAD CONTROLLER */}
                <section aria-label="Evidence Upload" className="obsidian-card rounded-2xl p-6 border border-white/5">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Camera className="w-4 h-4 text-amber-400" />
                            <h2 className="font-serif font-bold text-base text-white">
                                Stage Photographic Evidence
                            </h2>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">
                            STAGE: {lot.current_stage}
                        </span>
                    </div>

                    <EvidenceUpload
                        lotId={lot.id}
                        stage={lot.current_stage}
                        isFinalized={lot.is_finalized}
                        isAdmin={isAdmin}
                    />
                </section>

                {/* 8. GENUINE STAGE REPORTS (ELECTRIC BURN, GAS BURN, CERTIFICATION, SOLD, VALUATIONS) */}
                
                {/* Electric Burn Report & Transformation Lineage */}
                {(() => {
                    const electricBurnLog = logs?.find(l => l.stage === 'ELECTRIC_BURN' && l.data?.breakdown)
                    if (electricBurnLog) {
                        return (
                            <div className="space-y-4">
                                <ElectricBurnReport lotId={lot.id} stageData={electricBurnLog.data} />
                                <TransformationLineage breakdown={electricBurnLog.data.breakdown} />
                            </div>
                        )
                    }
                    return null
                })()}

                {/* Gas Burn Report */}
                {(() => {
                    const gasBurnLog = logs?.slice().reverse().find(l => l.stage === 'GAS_BURN' && l.data?.breakdown)
                    if (gasBurnLog) {
                        return (
                            <GasBurnReport
                                lotId={lot.id}
                                stageData={gasBurnLog.data}
                                initialComposition={initialComposition}
                            />
                        )
                    }
                    return null
                })()}

                {/* Certification Report */}
                {(() => {
                    const certLog = logs?.find(l => (l.stage === 'CERTIFICATION' || l.stage === LotStage.CERTIFICATION) && l.data)
                    if (certLog && (certLog.data.lab_name || certLog.data.certificate_number)) {
                        return <CertificationReport data={certLog.data} />
                    }
                    return null
                })()}

                {/* Sold / Final Sale Summary */}
                {(() => {
                    const soldLog = logs?.find(l => l.stage === 'SOLD' && l.data?.sold_price)
                    if (soldLog) {
                        return (
                            <SaleSummary
                                saleData={soldLog.data}
                                totalCost={totalCost}
                                createdAt={lot.created_at}
                            />
                        )
                    }
                    const existingSoldLog = logs?.find(l => l.data?.sold_price)
                    if (existingSoldLog) {
                        return (
                            <SaleSummary
                                saleData={existingSoldLog.data}
                                totalCost={totalCost}
                                createdAt={lot.created_at}
                            />
                        )
                    }
                    return null
                })()}

                {/* Valuation Summary */}
                {(() => {
                    const sellReadyLogWithVal = logs?.find(l => l.stage === 'SELL_READY' && l.data?.valuations)
                    if (sellReadyLogWithVal) {
                        return (
                            <ValuationSummary
                                valuations={sellReadyLogWithVal.data.valuations}
                                totalCost={totalCost}
                            />
                        )
                    }
                    return null
                })()}

                {/* Cut & Polish Finished vs Needs Burn Separation */}
                {(() => {
                    const gasBurnLog = logs?.find(l => l.stage === 'GAS_BURN' && l.data?.breakdown)
                    if (gasBurnLog && (lot.current_stage === 'CUT_POLISH' || lot.current_stage === 'ELECTRIC_BURN')) {
                        const sourceKeys = Object.keys(initialComposition)
                        const finished: any[] = []
                        const needsBurn: any[] = []

                        Object.entries(currentComposition).forEach(([key, stats]) => {
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
                                <div className="obsidian-card rounded-2xl p-6 border border-white/5 space-y-4">
                                    <div>
                                        <h3 className="font-serif font-bold text-base text-white">
                                            Processing Status (Post Gas Burn)
                                        </h3>
                                        <p className="text-xs text-slate-400">
                                            Stones separated by color transformation response.
                                        </p>
                                    </div>
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <div className="space-y-3 bg-white/[0.02] border border-white/5 rounded-xl p-4">
                                            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                                                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                                Finished Transformation (Ready to Sell)
                                            </div>
                                            {finished.length > 0 ? (
                                                <div className="space-y-2">
                                                    {finished.map((item: any, idx: number) => (
                                                        <div key={idx} className="text-xs border border-white/5 p-2 rounded-lg bg-emerald-500/5 flex justify-between font-mono">
                                                            <span className="text-slate-200">{item.name}</span>
                                                            <span className="text-emerald-400 font-bold">{item.carats.toFixed(2)} ct</span>
                                                        </div>
                                                    ))}
                                                    <div className="text-[11px] text-slate-400 text-right border-t border-white/5 pt-2 font-mono">
                                                        Total: {finished.reduce((a: number, b: any) => a + b.carats, 0).toFixed(2)} ct
                                                    </div>
                                                </div>
                                            ) : <div className="text-xs text-slate-500 italic">No finished stones yet.</div>}
                                        </div>

                                        <div className="space-y-3 bg-white/[0.02] border border-white/5 rounded-xl p-4">
                                            <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
                                                <span className="w-2 h-2 rounded-full bg-amber-400" />
                                                Needs Electric Burn
                                            </div>
                                            {needsBurn.length > 0 ? (
                                                <div className="space-y-2">
                                                    {needsBurn.map((item: any, idx: number) => (
                                                        <div key={idx} className="text-xs border border-white/5 p-2 rounded-lg bg-amber-500/5 flex justify-between font-mono">
                                                            <span className="text-slate-200">{item.name}</span>
                                                            <span className="text-amber-400 font-bold">{item.carats.toFixed(2)} ct</span>
                                                        </div>
                                                    ))}
                                                    <div className="text-[11px] text-slate-400 text-right border-t border-white/5 pt-2 font-mono">
                                                        Total: {needsBurn.reduce((a: number, b: any) => a + b.carats, 0).toFixed(2)} ct
                                                    </div>
                                                </div>
                                            ) : <div className="text-xs text-slate-500 italic">No stones needing electric burn.</div>}
                                        </div>
                                    </div>
                                </div>
                            )
                        }
                    }
                    return null
                })()}

                {/* 9. MINERAL COMPOSITION DISPLAY */}
                <section aria-label="Mineral Composition Analysis">
                    <LotCompositionDisplay
                        composition={initialComposition}
                        currentComposition={currentComposition}
                    />
                </section>

                {/* 10. CHRONOLOGICAL CRAFT TIMELINE */}
                <section aria-label="Chronological Craft Ledger">
                    <StageTimeline 
                        currentStage={lot.current_stage} 
                        logs={logs || []} 
                        isFinalized={lot.is_finalized} 
                        purchaseDate={lot.purchase_date} 
                    />
                </section>

                {/* 11. GENUINE MEDIA ASSETS GALLERY */}
                {assets && assets.length > 0 && (
                    <section aria-label="Uploaded Media Assets" className="obsidian-card rounded-2xl p-6 border border-white/5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Camera className="w-4 h-4 text-blue-400" />
                                <h2 className="font-serif font-bold text-base text-white">
                                    Archived Media Assets ({assets.length})
                                </h2>
                            </div>
                            <span className="text-[10px] font-mono text-slate-400">
                                SUPABASE EVIDENCE STORAGE
                            </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                            {assets.map((asset) => (
                                <div key={asset.id} className="bg-white/[0.02] border border-white/5 rounded-xl p-2 group hover:border-white/20 transition-all">
                                    <div className="relative h-40 w-full rounded-lg overflow-hidden bg-slate-900 flex items-center justify-center">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/lot-evidence/${asset.file_path}`}
                                            alt={`Asset ${asset.file_path}`}
                                            className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                                        />
                                    </div>
                                    <div className="p-2">
                                        <span className="text-[10px] text-slate-400 font-mono truncate block">
                                            {asset.file_path.split('/').pop()}
                                        </span>
                                        <span className="text-[9px] text-slate-500 font-mono block">
                                            {new Date(asset.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </VaultShell>
    )
}
