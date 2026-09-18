import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { Separator } from '@/components/ui/separator'
import { ReportControls } from '@/components/lot/report-controls'

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

    // Derived Data
    const buyingPrice = Number(lot.purchase_price) || 0
    const totalCost = logs?.reduce((sum, l) => sum + (Number(l.cost) || 0), 0) || 0
    const sellReadyLog = logs?.find(l => l.stage === 'SELL_READY')
    const soldLog = logs?.find(l => l.stage === 'SOLD')

    // Financials
    const valuation = sellReadyLog?.data?.valuations?.reduce((sum: number, v: any) => sum + (v.total_val || 0), 0) || 0
    const soldPrice = soldLog?.data?.sold_price || 0

    // Profit Calcs
    const realizedProfit = soldPrice > 0 ? soldPrice - totalCost - buyingPrice : 0
    const totalInvestment = buyingPrice + totalCost
    const projectedProfit = valuation > 0 ? valuation - totalInvestment : 0

    // Helper to extract weight at a given stage log
    const getStageWeight = (log: any): number | null => {
        if (log.stage === 'PROCUREMENT') return lot.initial_weight
        if (log.stage === 'ELECTRIC_BURN' && log.data?.breakdown) {
            return log.data.breakdown.reduce((sum: number, item: any) => sum + (Number(item.carats) || 0), 0)
        }
        if (log.stage === 'SELL_READY') {
            if (log.data?.new_weight) return log.data.new_weight
            if (log.data?.valuations) return log.data.valuations.reduce((sum: number, v: any) => sum + (Number(v.carats) || 0), 0)
        }
        if (log.data?.measurements) {
            const values = Object.values(log.data.measurements) as any[]
            const sum = values.reduce((s, v) => s + (Number(v.carats) || 0), 0)
            if (sum > 0) return sum
        }
        return null
    }

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
                        <div className="text-xl font-bold">{lot.current_stage}</div>
                        {lot.is_finalized && <span className="text-xs border px-2 py-0.5 rounded bg-gray-100">FINALIZED</span>}
                    </div>
                </div>
            </div>

            {/* SPECS GRID */}
            <div className="grid grid-cols-4 gap-4 mb-8">
                <div className="border p-3 rounded">
                    <div className="text-xs uppercase text-gray-500">Buying Price</div>
                    <div className="font-mono text-lg">{formatCurrency(buyingPrice)}</div>
                </div>
                <div className="border p-3 rounded">
                    <div className="text-xs uppercase text-gray-500">Total Investment</div>
                    <div className="font-mono text-lg">{formatCurrency(totalInvestment)}</div>
                    <div className="text-[10px] text-gray-400">price + process</div>
                </div>
                <div className="border p-3 rounded bg-blue-50">
                    <div className="text-xs uppercase text-blue-800">Projected Profit</div>
                    <div className="font-mono text-lg font-bold text-blue-700">
                        {valuation > 0 ? formatCurrency(projectedProfit) : '-'}
                    </div>
                    <div className="text-[10px] text-blue-400">based on valuation</div>
                </div>
                <div className="border p-3 rounded bg-green-50">
                    <div className="text-xs uppercase text-green-800">Realized Profit</div>
                    <div className={`font-mono text-lg font-bold ${realizedProfit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                        {soldPrice > 0 ? formatCurrency(realizedProfit) : '-'}
                    </div>
                </div>
            </div>

            {/* TIMELINE */}
            <div className="mb-8">
                <h3 className="text-lg font-bold mb-3 border-b flex items-center">
                    Production Timeline & Weight Loss
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
                        return (
                            <div key={log.id} className="grid grid-cols-12 py-3 border-b text-sm items-start">
                                <div className="col-span-2 font-semibold text-gray-600">
                                    {format(new Date(log.entered_at), 'MMM dd')}
                                </div>
                                <div className="col-span-3 font-bold">
                                    {log.stage}
                                </div>
                                <div className="col-span-2 text-right font-mono pr-4">
                                    {weight ? `${weight.toFixed(2)} cts` : '-'}
                                </div>
                                <div className="col-span-3 text-gray-600 text-xs">
                                    {/* Specific Details */}
                                    {log.stage === 'ELECTRIC_BURN' && log.metrics?.yield_percent && (
                                        <span className="text-blue-600 font-bold">Yield: {log.metrics.yield_percent.toFixed(1)}%</span>
                                    )}
                                    {log.stage === 'SOLD' && (
                                        <span>Sold to {log.data?.buyer}</span>
                                    )}
                                    {/* Show breakdown summary if available */}
                                    {log.data?.breakdown && log.stage === 'ELECTRIC_BURN' && (
                                        <div className="mt-1 text-[10px]">
                                            {log.data.breakdown.length} items created
                                        </div>
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

            {/* VALUATION BREAKDOWN */}
            {sellReadyLog && sellReadyLog.data?.valuations && (
                <div className="mb-8 avoid-break">
                    <h3 className="text-lg font-bold mb-3 border-b">Valuation / Stock</h3>
                    <table className="w-full text-sm text-left">
                        <thead>
                            <tr className="bg-gray-100 border-b">
                                <th className="p-2">Type</th>
                                <th className="p-2 text-right">Carats</th>
                                <th className="p-2 text-right">Price/Ct</th>
                                <th className="p-2 text-right">Total Val</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sellReadyLog.data.valuations.map((v: any, i: number) => (
                                <tr key={i} className="border-b">
                                    <td className="p-2 font-medium">{v.type}</td>
                                    <td className="p-2 text-right">{v.carats?.toFixed(2)}</td>
                                    <td className="p-2 text-right">{formatCurrency(v.price_per_carat)}</td>
                                    <td className="p-2 text-right font-medium">{formatCurrency(v.total_val)}</td>
                                </tr>
                            ))}
                            <tr className="bg-gray-50 font-bold border-t-2 border-black">
                                <td className="p-2">TOTAL PREDICTED</td>
                                <td className="p-2 text-right">{getStageWeight(sellReadyLog)?.toFixed(2)}</td>
                                <td className="p-2"></td>
                                <td className="p-2 text-right">{formatCurrency(valuation)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}

            {/* PHOTOS */}
            {assets && assets.length > 0 && (
                <div className="mb-8 avoid-break">
                    <h3 className="text-lg font-bold mb-3 border-b">Evidence & Assets</h3>
                    <div className="grid grid-cols-3 gap-4">
                        {assets.map((asset) => (
                            <div key={asset.id} className="border p-1 rounded">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/lot-evidence/${asset.file_path}`}
                                    alt="Evidence"
                                    className="w-full h-40 object-cover rounded bg-gray-100"
                                />
                                <div className="text-[10px] text-gray-500 mt-1 truncate px-1">
                                    {asset.file_path.split('/')[1]} {/* Show Stage Name */}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="mt-12 text-center text-xs text-gray-400 border-t pt-4">
                Generated by Gemstone Lifecycle Management • {new Date().toLocaleString()}
            </div>
        </div>
    )
}
