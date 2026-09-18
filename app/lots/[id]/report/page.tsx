import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { Separator } from '@/components/ui/separator'
import { ReportControls } from '@/components/lot/report-controls'
import { LotStage, STAGE_DISPLAY_NAMES } from '@/lib/state-machine'

// Helper for currency
const formatCurrency = (val: number) => {
    return val.toLocaleString('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 })
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

    // Derived Financial Data
    const buyingPrice = Number(lot.purchase_price) || 0
    const totalProcessingCost = logs?.reduce((sum, l) => sum + (Number(l.cost) || 0), 0) || 0
    const totalInvestment = buyingPrice + totalProcessingCost

    const sellReadyLog = logs?.find(l => l.stage === 'SELL_READY' || l.stage === LotStage.SELL_READY)
    const soldLog = logs?.find(l => l.stage === 'SOLD' || l.stage === LotStage.SOLD)
    const certLog = logs?.find(l => l.stage === 'CERTIFICATION' || l.stage === LotStage.CERTIFICATION)

    // Valuations & Sales
    const valuations = sellReadyLog?.data?.valuations || []
    const salesHistory: any[] = sellReadyLog?.data?.sales_history || []
    const valuationTotal = valuations.reduce((sum: number, v: any) => sum + (Number(v.total_val) || 0), 0)

    const partialSalesTotal = salesHistory.reduce((sum: number, s: any) => sum + (Number(s.price) || 0), 0)
    const finalSalePrice = Number(sellReadyLog?.data?.sold_price || soldLog?.data?.sold_price || 0)
    const totalRealizedRevenue = finalSalePrice > 0 ? finalSalePrice : partialSalesTotal

    // Profit Calculations
    const realizedProfit = totalRealizedRevenue > 0 ? totalRealizedRevenue - totalInvestment : 0
    const projectedProfit = valuationTotal > 0 ? (totalRealizedRevenue + valuationTotal) - totalInvestment : 0

    // Helper to extract weight at a given stage log
    const getStageWeight = (log: any): number | null => {
        if (log.stage === 'PROCUREMENT' || log.stage === LotStage.PROCUREMENT) return lot.initial_weight

        if ((log.stage === 'GAS_BURN' || log.stage === LotStage.GAS_BURN) && log.data?.breakdown) {
            return log.data.breakdown.reduce((sum: number, item: any) => sum + (Number(item.carats) || 0), 0)
        }

        if ((log.stage === 'ELECTRIC_BURN' || log.stage === LotStage.ELECTRIC_BURN) && log.data?.breakdown) {
            return log.data.breakdown.reduce((sum: number, item: any) => sum + (Number(item.carats) || 0), 0)
        }

        if (log.stage === 'CERTIFICATION' || log.stage === LotStage.CERTIFICATION) {
            if (log.data?.verified_carat) return Number(log.data.verified_carat)
        }

        if (log.stage === 'SELL_READY' || log.stage === LotStage.SELL_READY) {
            if (log.data?.valuations && log.data.valuations.length > 0) {
                return log.data.valuations.reduce((sum: number, v: any) => sum + (Number(v.carats) || 0), 0)
            }
            if (log.data?.new_weight) return Number(log.data.new_weight)
        }

        if (log.data?.new_weight) return Number(log.data.new_weight)

        if (log.data?.measurements) {
            const values = Object.values(log.data.measurements) as any[]
            const sum = values.reduce((s, v) => s + (Number(v.carats) || 0), 0)
            if (sum > 0) return sum
        }
        return null
    }

    const currentStageName = (lot.current_stage === 'SELL_READY' && lot.is_finalized)
        ? 'Sold'
        : (STAGE_DISPLAY_NAMES[lot.current_stage as LotStage] || lot.current_stage)

    return (
        <div className="container mx-auto py-8 max-w-4xl bg-white text-black min-h-screen">
            {/* Print Control (Hidden when printing) */}
            <ReportControls lotId={id} />

            {/* HEADER */}
            <div className="mb-6 border-b pb-4">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight mb-2">{lot.lot_code}</h1>
                        <p className="text-sm text-gray-500">
                            Buying Date: <strong className="text-gray-800">{lot.purchase_date ? format(new Date(lot.purchase_date), 'PPP') : 'N/A'}</strong> • Supplier: {lot.supplier || 'N/A'}
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="text-sm uppercase tracking-wider text-gray-500">Current Stage</div>
                        <div className="text-xl font-bold">{currentStageName}</div>
                        {lot.is_finalized && <span className="text-xs border px-2 py-0.5 rounded bg-gray-100 font-semibold">FINALIZED / SOLD</span>}
                    </div>
                </div>
            </div>

            {/* SPECS GRID */}
            <div className="grid grid-cols-4 gap-4 mb-8">
                <div className="border p-3 rounded">
                    <div className="text-xs uppercase text-gray-500 font-semibold">Buying Price</div>
                    <div className="font-mono text-lg">{formatCurrency(buyingPrice)}</div>
                </div>
                <div className="border p-3 rounded">
                    <div className="text-xs uppercase text-gray-500 font-semibold">Total Investment</div>
                    <div className="font-mono text-lg">{formatCurrency(totalInvestment)}</div>
                    <div className="text-[10px] text-gray-400">purchase + processing</div>
                </div>
                <div className="border p-3 rounded bg-blue-50">
                    <div className="text-xs uppercase text-blue-800 font-semibold">Projected Profit</div>
                    <div className="font-mono text-lg font-bold text-blue-700">
                        {valuationTotal > 0 ? formatCurrency(projectedProfit) : '-'}
                    </div>
                    <div className="text-[10px] text-blue-400">based on active valuation</div>
                </div>
                <div className="border p-3 rounded bg-green-50">
                    <div className="text-xs uppercase text-green-800 font-semibold">Realized Revenue</div>
                    <div className="font-mono text-lg font-bold text-green-700">
                        {totalRealizedRevenue > 0 ? formatCurrency(totalRealizedRevenue) : '-'}
                    </div>
                    {totalRealizedRevenue > 0 && (
                        <div className={`text-[11px] font-semibold ${realizedProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            Net: {formatCurrency(realizedProfit)}
                        </div>
                    )}
                </div>
            </div>

            {/* TIMELINE */}
            <div className="mb-8">
                <h3 className="text-lg font-bold mb-3 border-b flex items-center">
                    Production Timeline & Weight Tracking
                </h3>
                <div className="space-y-0">
                    {/* Header Row */}
                    <div className="grid grid-cols-12 py-2 border-b text-xs font-bold uppercase text-gray-500">
                        <div className="col-span-2">Date</div>
                        <div className="col-span-3">Stage</div>
                        <div className="col-span-2 text-right pr-4">Weight</div>
                        <div className="col-span-3">Details / Yield</div>
                        <div className="col-span-2 text-right">Cost Added</div>
                    </div>

                    {logs?.map((log) => {
                        const weight = getStageWeight(log)
                        const stageLabel = STAGE_DISPLAY_NAMES[log.stage as LotStage] || log.stage
                        return (
                            <div key={log.id} className="grid grid-cols-12 py-3 border-b text-sm items-start">
                                <div className="col-span-2 font-semibold text-gray-600">
                                    {format(new Date(log.entered_at), 'MMM dd, yyyy')}
                                </div>
                                <div className="col-span-3 font-bold">
                                    {stageLabel}
                                </div>
                                <div className="col-span-2 text-right font-mono pr-4">
                                    {weight ? `${weight.toFixed(2)} cts` : '-'}
                                </div>
                                <div className="col-span-3 text-gray-600 text-xs">
                                    {log.stage === 'GAS_BURN' && log.data?.breakdown && (
                                        <span>{log.data.breakdown.length} stone groups cataloged</span>
                                    )}
                                    {log.stage === 'ELECTRIC_BURN' && log.data?.breakdown && (
                                        <span>{log.data.breakdown.length} items transformed</span>
                                    )}
                                    {log.stage === 'CERTIFICATION' && log.data?.lab_name && (
                                        <span className="font-medium text-amber-700">{log.data.lab_name} (#{log.data.report_number})</span>
                                    )}
                                    {log.stage === 'SELL_READY' && log.data?.valuations && (
                                        <span>{log.data.valuations.length} valuation items listed</span>
                                    )}
                                    {log.data?.buyer && (
                                        <span>Sold to {log.data.buyer}</span>
                                    )}
                                </div>
                                <div className="col-span-2 text-right font-mono text-gray-500">
                                    {Number(log.cost) > 0 ? formatCurrency(Number(log.cost)) : '-'}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* LAB CERTIFICATION REPORT CARD (IF CERTIFIED) */}
            {certLog && certLog.data && (
                <div className="mb-8 p-4 border rounded-lg bg-amber-50/40 avoid-break">
                    <h3 className="text-lg font-bold mb-2 text-amber-900 flex items-center gap-2">
                        📜 Gemological Laboratory Certification
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-3">
                        <div>
                            <span className="text-xs text-gray-500 uppercase block font-semibold">Laboratory</span>
                            <span className="font-bold text-gray-900">{certLog.data.lab_name || 'N/A'}</span>
                        </div>
                        <div>
                            <span className="text-xs text-gray-500 uppercase block font-semibold">Report Number</span>
                            <span className="font-mono font-bold text-gray-900">{certLog.data.report_number || 'N/A'}</span>
                        </div>
                        <div>
                            <span className="text-xs text-gray-500 uppercase block font-semibold">Verified Weight</span>
                            <span className="font-bold text-gray-900">{certLog.data.verified_carat ? `${Number(certLog.data.verified_carat).toFixed(2)} ct` : 'N/A'}</span>
                        </div>
                        <div>
                            <span className="text-xs text-gray-500 uppercase block font-semibold">Color & Clarity</span>
                            <span className="font-bold text-gray-900">{certLog.data.color_grade || '-'} • {certLog.data.clarity_grade || '-'}</span>
                        </div>
                        <div>
                            <span className="text-xs text-gray-500 uppercase block font-semibold">Cut / Shape</span>
                            <span className="font-bold text-gray-900">{certLog.data.cut_shape || 'N/A'}</span>
                        </div>
                        <div className="col-span-2">
                            <span className="text-xs text-gray-500 uppercase block font-semibold">Treatment Status</span>
                            <span className="font-bold text-emerald-800">{certLog.data.treatment_status || 'Unspecified'}</span>
                        </div>
                        {certLog.data.report_url && (
                            <div>
                                <span className="text-xs text-gray-500 uppercase block font-semibold">Online Verification</span>
                                <a href={certLog.data.report_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-xs break-all">
                                    Check Lab Report
                                </a>
                            </div>
                        )}
                    </div>
                    {certLog.data.notes && (
                        <div className="mt-3 text-xs text-gray-600 italic border-t pt-2">
                            "{certLog.data.notes}"
                        </div>
                    )}
                </div>
            )}

            {/* PARTIAL SALES HISTORY (IF ANY SALES RECORDED) */}
            {salesHistory.length > 0 && (
                <div className="mb-8 avoid-break">
                    <h3 className="text-lg font-bold mb-3 border-b">Sales History</h3>
                    <table className="w-full text-sm text-left border">
                        <thead>
                            <tr className="bg-gray-100 border-b text-xs uppercase font-bold text-gray-600">
                                <th className="p-2">Date</th>
                                <th className="p-2">Buyer</th>
                                <th className="p-2">Item Type</th>
                                <th className="p-2 text-right">Pcs</th>
                                <th className="p-2 text-right">Carats</th>
                                <th className="p-2 text-right">Sale Price</th>
                            </tr>
                        </thead>
                        <tbody>
                            {salesHistory.map((sale: any, idx: number) => (
                                <tr key={sale.id || idx} className="border-b">
                                    <td className="p-2 font-mono text-xs">{sale.date ? format(new Date(sale.date), 'MMM dd, yyyy') : '-'}</td>
                                    <td className="p-2 font-medium">{sale.buyer || 'Unknown'}</td>
                                    <td className="p-2">{sale.item_type}</td>
                                    <td className="p-2 text-right">{sale.sold_pieces || '-'}</td>
                                    <td className="p-2 text-right font-mono">{Number(sale.sold_carats || 0).toFixed(2)}</td>
                                    <td className="p-2 text-right font-mono font-semibold">{formatCurrency(Number(sale.price) || 0)}</td>
                                </tr>
                            ))}
                            <tr className="bg-green-50 font-bold border-t-2 border-black">
                                <td colSpan={3} className="p-2">TOTAL SALES RECORDED</td>
                                <td className="p-2 text-right">{salesHistory.reduce((sum, s) => sum + (Number(s.sold_pieces) || 0), 0)}</td>
                                <td className="p-2 text-right font-mono">{salesHistory.reduce((sum, s) => sum + (Number(s.sold_carats) || 0), 0).toFixed(2)}</td>
                                <td className="p-2 text-right font-mono text-green-800">{formatCurrency(partialSalesTotal)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}

            {/* CURRENT VALUATION / ACTIVE STOCK */}
            {valuations.length > 0 && (
                <div className="mb-8 avoid-break">
                    <h3 className="text-lg font-bold mb-3 border-b">Remaining Inventory & Valuations</h3>
                    <table className="w-full text-sm text-left border">
                        <thead>
                            <tr className="bg-gray-100 border-b text-xs uppercase font-bold text-gray-600">
                                <th className="p-2">Type</th>
                                <th className="p-2 text-right">Pcs</th>
                                <th className="p-2 text-right">Carats</th>
                                <th className="p-2 text-right">Price/Ct</th>
                                <th className="p-2 text-right">Total Val</th>
                            </tr>
                        </thead>
                        <tbody>
                            {valuations.map((v: any, i: number) => (
                                <tr key={i} className="border-b">
                                    <td className="p-2 font-medium">{v.type}</td>
                                    <td className="p-2 text-right">{v.pieces || '-'}</td>
                                    <td className="p-2 text-right font-mono">{Number(v.carats || 0).toFixed(2)}</td>
                                    <td className="p-2 text-right font-mono">{formatCurrency(Number(v.price_per_carat) || 0)}</td>
                                    <td className="p-2 text-right font-mono font-medium">{formatCurrency(Number(v.total_val) || 0)}</td>
                                </tr>
                            ))}
                            <tr className="bg-gray-50 font-bold border-t-2 border-black">
                                <td className="p-2">ACTIVE VALUATION TOTAL</td>
                                <td className="p-2 text-right">{valuations.reduce((sum: number, v: any) => sum + (Number(v.pieces) || 0), 0)}</td>
                                <td className="p-2 text-right font-mono">{valuations.reduce((sum: number, v: any) => sum + (Number(v.carats) || 0), 0).toFixed(2)}</td>
                                <td className="p-2"></td>
                                <td className="p-2 text-right font-mono text-blue-800">{formatCurrency(valuationTotal)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}

            {/* PHOTOS */}
            {assets && assets.length > 0 && (
                <div className="mb-8 avoid-break">
                    <h3 className="text-lg font-bold mb-3 border-b">Evidence & Media Assets</h3>
                    <div className="grid grid-cols-3 gap-4">
                        {assets.map((asset) => (
                            <div key={asset.id} className="border p-1 rounded">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/lot-evidence/${asset.file_path}`}
                                    alt="Evidence"
                                    className="w-full h-40 object-cover rounded bg-gray-100"
                                />
                                <div className="text-[10px] text-gray-500 mt-1 truncate px-1 font-mono">
                                    {asset.file_path.split('/')[1]}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="mt-12 text-center text-xs text-gray-400 border-t pt-4">
                Generated by Gemstone Lifecycle Management System • {new Date().toLocaleString()}
            </div>
        </div>
    )
}
