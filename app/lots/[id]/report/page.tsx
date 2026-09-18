import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { format } from 'date-fns'
import { ReportControls } from '@/components/lot/report-controls'
import { LotStage, STAGE_DISPLAY_NAMES } from '@/lib/state-machine'
import { VaultShell } from '@/components/layout/vault-shell'
import { 
    Scale, 
    DollarSign, 
    Calendar, 
    Gem, 
    Award,
    Camera,
    CheckCircle2 
} from 'lucide-react'

// Helper for currency
const formatCurrency = (val: number) => {
    return `LKR ${(val || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export default async function LotReportPage({ params }: { params: Promise<{ id: string }> }) {
    const supabase = await createClient()
    const { id } = await params

    // 1. Fetch Lot
    const { data: lot } = await supabase.from('lots').select('*').eq('id', id).single()
    if (!lot) notFound()

    // 2. Fetch Logs
    const { data: logs } = await supabase
        .from('stage_logs')
        .select('*')
        .eq('lot_id', id)
        .order('sequence_number', { ascending: true })

    // 3. Fetch Assets (Photos)
    const { data: assets } = await supabase
        .from('lot_assets')
        .select('*')
        .eq('lot_id', id)
        .order('created_at', { ascending: true })

    // Derived Financial Data from Database
    const buyingPrice = Number(lot.purchase_price) || 0
    const totalProcessingCost = logs?.reduce((sum, l) => sum + (Number(l.cost) || 0), 0) || 0
    const totalInvestment = buyingPrice + totalProcessingCost

    const sellReadyLog = logs?.find(l => l.stage === 'SELL_READY' || l.stage === LotStage.SELL_READY)
    const soldLog = logs?.find(l => l.stage === 'SOLD' || l.stage === LotStage.SOLD)
    const certLog = logs?.find(l => l.stage === 'CERTIFICATION' || l.stage === LotStage.CERTIFICATION)

    // Valuations & Sales from Real Data
    const valuations: any[] = sellReadyLog?.data?.valuations || []
    const salesHistory: any[] = sellReadyLog?.data?.sales_history || []
    const valuationTotal = valuations.reduce((sum: number, v: any) => sum + (Number(v.total_val) || 0), 0)

    const partialSalesTotal = salesHistory.reduce((sum: number, s: any) => sum + (Number(s.price) || 0), 0)
    const finalSalePrice = Number(sellReadyLog?.data?.sold_price || soldLog?.data?.sold_price || 0)
    const totalRealizedRevenue = finalSalePrice > 0 ? finalSalePrice : partialSalesTotal
    const realizedProfit = totalRealizedRevenue > 0 ? totalRealizedRevenue - totalInvestment : 0

    const initialWeight = Number(lot.initial_weight) || 0
    const currentWeight = Number(lot.current_weight) || initialWeight
    const recoveryRate = initialWeight > 0 ? ((currentWeight / initialWeight) * 100).toFixed(1) : '100.0'
    const kerfLoss = initialWeight > 0 ? (initialWeight - currentWeight).toFixed(2) : '0.00'
    const kerfLossPct = (100 - Number(recoveryRate)).toFixed(1)

    return (
        <VaultShell>
            <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto w-full">
                {/* 1. Print & Navigation Controls */}
                <ReportControls lotId={id} />

                {/* 2. Master Gemological Dossier Document */}
                <article className="obsidian-card rounded-3xl p-6 sm:p-10 lg:p-12 border border-white/10 shadow-2xl relative overflow-hidden print:bg-white print:text-black print:p-0 print:border-none print:shadow-none">
                    {/* Header Crest */}
                    <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-white/10 print:border-black/20 relative">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-amber-500/40 p-2 flex items-center justify-center shadow-[0_0_20px_rgba(212,161,55,0.25)] shrink-0 print:border-black/30">
                                <Image
                                    src="/logo.png"
                                    alt="Vault Crest"
                                    width={44}
                                    height={44}
                                    className="object-contain"
                                />
                            </div>
                            <div>
                                <div className="text-[10px] uppercase tracking-[0.25em] text-amber-400 font-mono font-bold print:text-black">
                                    Gemstone Lifecycle Audit Dossier
                                </div>
                                <h1 className="text-2xl sm:text-3xl font-bold font-serif text-white print:text-black tracking-tight mt-0.5">
                                    {lot.lot_code}
                                </h1>
                            </div>
                        </div>

                        <div className="text-left sm:text-right font-mono text-xs text-slate-400 print:text-black">
                            <span className="text-[10px] uppercase text-slate-500 print:text-black block">Generated On</span>
                            <span className="text-white print:text-black font-bold">{new Date().toLocaleString()}</span>
                            <div className="mt-1">
                                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-semibold uppercase print:border-black/30 print:text-black">
                                    Stage: {STAGE_DISPLAY_NAMES[lot.current_stage as LotStage] || lot.current_stage}
                                </span>
                            </div>
                        </div>
                    </header>

                    {/* Section 1: Lot Overview & Weight Provenance */}
                    <section className="py-6 border-b border-white/10 print:border-black/20">
                        <div className="flex items-center gap-2 mb-4">
                            <Gem className="w-4 h-4 text-amber-400 print:text-black" />
                            <h2 className="font-serif font-bold text-base text-white print:text-black">
                                Provenance &amp; Weight Specifications
                            </h2>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 print:border-black/20 print:bg-transparent">
                                <span className="text-[10px] text-slate-500 print:text-black block">Supplier / Source</span>
                                <span className="font-bold text-white print:text-black text-sm">{lot.supplier || 'N/A'}</span>
                            </div>

                            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 print:border-black/20 print:bg-transparent">
                                <span className="text-[10px] text-slate-500 print:text-black block">Acquisition Date</span>
                                <span className="font-bold text-white print:text-black text-sm">
                                    {lot.purchase_date ? new Date(lot.purchase_date).toLocaleDateString() : new Date(lot.created_at).toLocaleDateString()}
                                </span>
                            </div>

                            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 print:border-black/20 print:bg-transparent">
                                <span className="text-[10px] text-slate-500 print:text-black block">Initial Rough Mass</span>
                                <span className="font-bold text-white print:text-black text-sm">{initialWeight.toFixed(2)} ct</span>
                            </div>

                            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 print:border-black/20 print:bg-transparent">
                                <span className="text-[10px] text-slate-500 print:text-black block">Current Cut Mass</span>
                                <span className="font-bold text-emerald-400 print:text-black text-sm">{currentWeight.toFixed(2)} ct</span>
                                <span className="text-[10px] text-slate-500 print:text-black block mt-0.5">{recoveryRate}% retention</span>
                            </div>
                        </div>
                    </section>

                    {/* Section 2: Chronological Lifecycle Stages & Processing Costs */}
                    <section className="py-6 border-b border-white/10 print:border-black/20">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Scale className="w-4 h-4 text-amber-400 print:text-black" />
                                <h2 className="font-serif font-bold text-base text-white print:text-black">
                                    Stage History &amp; Operational Costs
                                </h2>
                            </div>
                            <span className="text-[10px] font-mono text-slate-500 print:text-black">
                                {logs?.length || 0} RECORDED STAGES
                            </span>
                        </div>

                        <div className="overflow-x-auto rounded-xl border border-white/5 print:border-black/20">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-white/[0.03] print:bg-black/5 font-mono uppercase text-[10px] text-slate-400 print:text-black">
                                    <tr>
                                        <th className="p-3">Sequence</th>
                                        <th className="p-3">Stage</th>
                                        <th className="p-3">Timestamp</th>
                                        <th className="p-3">Operational Notes / Summary</th>
                                        <th className="p-3 text-right">Cost (LKR)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 print:divide-black/10">
                                    {/* Line Item: Rough Procurement */}
                                    <tr className="hover:bg-white/[0.02]">
                                        <td className="p-3 font-mono text-slate-500 print:text-black">01</td>
                                        <td className="p-3 font-semibold text-amber-400 print:text-black">PROCUREMENT</td>
                                        <td className="p-3 font-mono text-slate-400 print:text-black">
                                            {lot.purchase_date ? new Date(lot.purchase_date).toLocaleDateString() : new Date(lot.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="p-3 text-slate-300 print:text-black">
                                            Initial rough parcel acquisition from {lot.supplier || 'Supplier'} ({initialWeight.toFixed(2)} ct)
                                        </td>
                                        <td className="p-3 text-right font-mono font-bold text-white print:text-black">
                                            {formatCurrency(buyingPrice)}
                                        </td>
                                    </tr>

                                    {/* Every Subsequent Stage Log */}
                                    {logs?.filter(l => l.stage !== 'PROCUREMENT').map((log, idx) => (
                                        <tr key={log.id || idx} className="hover:bg-white/[0.02]">
                                            <td className="p-3 font-mono text-slate-500 print:text-black">
                                                {String(log.sequence_number || idx + 2).padStart(2, '0')}
                                            </td>
                                            <td className="p-3 font-semibold text-white print:text-black">
                                                {STAGE_DISPLAY_NAMES[log.stage as LotStage] || log.stage}
                                            </td>
                                            <td className="p-3 font-mono text-slate-400 print:text-black">
                                                {log.entered_at ? new Date(log.entered_at).toLocaleDateString() : '-'}
                                            </td>
                                            <td className="p-3 text-slate-300 print:text-black">
                                                {log.stage === 'GAS_BURN' && log.data?.temperature && `Gas burn @ ${log.data.temperature}°C (${log.data.duration_hours || '-'}h)`}
                                                {log.stage === 'ELECTRIC_BURN' && log.data?.temperature && `Electric burn @ ${log.data.temperature}°C (${log.data.duration_hours || '-'}h)`}
                                                {log.stage === 'CERTIFICATION' && log.data?.lab_name && `Certified by ${log.data.lab_name} (#${log.data.certificate_number || '-'})`}
                                                {log.stage === 'SELL_READY' && 'Valuation & inventory appraisal established'}
                                                {log.stage === 'SOLD' && `Lot finalized and sold`}
                                                {!['GAS_BURN', 'ELECTRIC_BURN', 'CERTIFICATION', 'SELL_READY', 'SOLD'].includes(log.stage) && (log.data?.notes || 'Stage operations completed')}
                                            </td>
                                            <td className="p-3 text-right font-mono font-bold text-white print:text-black">
                                                {formatCurrency(Number(log.cost) || 0)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Financial Totals Reconciliation Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 font-mono">
                            <div className="bg-white/[0.02] border border-white/5 print:border-black/20 rounded-xl p-4">
                                <span className="text-[10px] text-slate-500 print:text-black uppercase block font-semibold">Total Cost (Investment)</span>
                                <div className="text-xl font-bold font-serif text-white print:text-black mt-1">
                                    {formatCurrency(totalInvestment)}
                                </div>
                                <span className="text-[10px] text-slate-500 print:text-black">
                                    Rough: {formatCurrency(buyingPrice)} + Processing: {formatCurrency(totalProcessingCost)}
                                </span>
                            </div>

                            <div className="bg-white/[0.02] border border-white/5 print:border-black/20 rounded-xl p-4">
                                <span className="text-[10px] text-slate-500 print:text-black uppercase font-semibold">Realized Revenue</span>
                                <div className="text-xl font-bold font-serif text-white print:text-black mt-1">
                                    {formatCurrency(totalRealizedRevenue)}
                                </div>
                                <span className="text-[10px] text-slate-500 print:text-black">
                                    {salesHistory.length > 0 ? `${salesHistory.length} recorded sales` : 'Pending lot sales'}
                                </span>
                            </div>

                            <div className={`rounded-xl p-4 border ${realizedProfit >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'} print:border-black/20`}>
                                <span className={`text-[10px] uppercase font-semibold block ${realizedProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'} print:text-black`}>
                                    Realized Net Profit
                                </span>
                                <div className={`text-xl font-bold font-serif mt-1 ${realizedProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'} print:text-black`}>
                                    {realizedProfit >= 0 ? '+' : ''}{formatCurrency(realizedProfit)}
                                </div>
                                <span className={`text-[10px] ${realizedProfit >= 0 ? 'text-emerald-400/80' : 'text-rose-400/80'} print:text-black`}>
                                    Revenue minus total investment
                                </span>
                            </div>
                        </div>
                    </section>

                    {/* Section 3: Certification Details (If Certified) */}
                    {certLog && certLog.data && (certLog.data.lab_name || certLog.data.certificate_number) && (
                        <section className="py-6 border-b border-white/10 print:border-black/20">
                            <div className="flex items-center gap-2 mb-4">
                                <Award className="w-4 h-4 text-yellow-400 print:text-black" />
                                <h2 className="font-serif font-bold text-base text-white print:text-black">
                                    Laboratory Certification &amp; Assay
                                </h2>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono bg-white/[0.02] border border-white/5 print:border-black/20 p-4 rounded-xl">
                                <div>
                                    <span className="text-[10px] text-slate-500 print:text-black uppercase block">Lab Name</span>
                                    <span className="font-bold text-white print:text-black">{certLog.data.lab_name || 'N/A'}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-500 print:text-black uppercase block">Certificate #</span>
                                    <span className="font-bold text-white print:text-black">{certLog.data.certificate_number || 'N/A'}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-500 print:text-black uppercase block">Color &amp; Clarity</span>
                                    <span className="font-bold text-white print:text-black">
                                        {certLog.data.color_grade || '-'} • {certLog.data.clarity_grade || '-'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-500 print:text-black uppercase block">Treatment Status</span>
                                    <span className="font-bold text-emerald-400 print:text-black">{certLog.data.treatment_status || 'Unheated / Natural'}</span>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Section 4: Sales History (If any recorded) */}
                    {salesHistory.length > 0 && (
                        <section className="py-6 border-b border-white/10 print:border-black/20">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <DollarSign className="w-4 h-4 text-emerald-400 print:text-black" />
                                    <h2 className="font-serif font-bold text-base text-white print:text-black">
                                        Recorded Sales Ledger
                                    </h2>
                                </div>
                                <span className="text-[10px] font-mono text-slate-500 print:text-black">
                                    {salesHistory.length} TRANSACTIONS
                                </span>
                            </div>

                            <div className="overflow-x-auto rounded-xl border border-white/5 print:border-black/20">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-white/[0.03] print:bg-black/5 font-mono uppercase text-[10px] text-slate-400 print:text-black">
                                        <tr>
                                            <th className="p-3">Date</th>
                                            <th className="p-3">Buyer</th>
                                            <th className="p-3">Item Type</th>
                                            <th className="p-3 text-right">Pieces</th>
                                            <th className="p-3 text-right">Carats</th>
                                            <th className="p-3 text-right">Sale Amount (LKR)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5 print:divide-black/10">
                                        {salesHistory.map((sale: any, idx: number) => (
                                            <tr key={sale.id || idx} className="hover:bg-white/[0.02]">
                                                <td className="p-3 font-mono text-slate-400 print:text-black">
                                                    {sale.date ? format(new Date(sale.date), 'MMM dd, yyyy') : '-'}
                                                </td>
                                                <td className="p-3 font-semibold text-white print:text-black">{sale.buyer || 'Unknown'}</td>
                                                <td className="p-3 text-slate-300 print:text-black">{sale.item_type}</td>
                                                <td className="p-3 text-right font-mono text-slate-300 print:text-black">{sale.sold_pieces || '-'}</td>
                                                <td className="p-3 text-right font-mono text-slate-300 print:text-black">{Number(sale.sold_carats || 0).toFixed(2)}</td>
                                                <td className="p-3 text-right font-mono font-bold text-emerald-400 print:text-black">
                                                    {formatCurrency(Number(sale.price) || 0)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}

                    {/* Section 5: Valuations & Remaining Inventory (If Available) */}
                    {valuations.length > 0 && (
                        <section className="py-6 border-b border-white/10 print:border-black/20">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Gem className="w-4 h-4 text-amber-400 print:text-black" />
                                    <h2 className="font-serif font-bold text-base text-white print:text-black">
                                        Remaining Inventory &amp; Appraisals
                                    </h2>
                                </div>
                                <span className="text-[10px] font-mono text-slate-500 print:text-black">
                                    TOTAL VALUATION: {formatCurrency(valuationTotal)}
                                </span>
                            </div>

                            <div className="overflow-x-auto rounded-xl border border-white/5 print:border-black/20">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-white/[0.03] print:bg-black/5 font-mono uppercase text-[10px] text-slate-400 print:text-black">
                                        <tr>
                                            <th className="p-3">Variety / Cut Item</th>
                                            <th className="p-3 text-right">Pieces</th>
                                            <th className="p-3 text-right">Carats</th>
                                            <th className="p-3 text-right">Price Per Carat</th>
                                            <th className="p-3 text-right">Total Appraised Value</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5 print:divide-black/10">
                                        {valuations.map((v: any, idx: number) => (
                                            <tr key={idx} className="hover:bg-white/[0.02]">
                                                <td className="p-3 font-semibold text-white print:text-black">{v.type}</td>
                                                <td className="p-3 text-right font-mono text-slate-300 print:text-black">{v.pieces || '-'}</td>
                                                <td className="p-3 text-right font-mono text-slate-300 print:text-black">{Number(v.carats || 0).toFixed(2)}</td>
                                                <td className="p-3 text-right font-mono text-slate-400 print:text-black">{formatCurrency(Number(v.price_per_carat) || 0)}</td>
                                                <td className="p-3 text-right font-mono font-bold text-amber-300 print:text-black">
                                                    {formatCurrency(Number(v.total_val) || 0)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}

                    {/* Section 6: Uploaded Media & Photographic Evidence */}
                    {assets && assets.length > 0 && (
                        <section className="py-6 border-b border-white/10 print:border-black/20">
                            <div className="flex items-center gap-2 mb-4">
                                <Camera className="w-4 h-4 text-blue-400 print:text-black" />
                                <h2 className="font-serif font-bold text-base text-white print:text-black">
                                    Verified Photographic Evidence ({assets.length})
                                </h2>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                {assets.map((asset) => (
                                    <div key={asset.id} className="rounded-xl border border-white/5 print:border-black/20 p-1 bg-white/[0.02] print:bg-transparent">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/lot-evidence/${asset.file_path}`}
                                            alt="Evidence"
                                            className="w-full h-36 object-cover rounded-lg bg-slate-900"
                                        />
                                        <div className="text-[10px] text-slate-400 print:text-black font-mono mt-1 px-1 truncate">
                                            {asset.file_path.split('/').pop()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Footer */}
                    <footer className="pt-6 text-center text-xs font-mono text-slate-500 print:text-black">
                        Gemstone Processing &amp; Lifecycle Management System • Certified Digital Record
                    </footer>
                </article>
            </div>
        </VaultShell>
    )
}
