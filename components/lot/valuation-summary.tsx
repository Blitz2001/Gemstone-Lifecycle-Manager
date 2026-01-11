import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface ValuationItem {
    type: string
    pieces: number
    carats: number
    price_per_carat: number
    total_val: number
    margin_percent?: number
}

interface ValuationSummaryProps {
    valuations: ValuationItem[]
    totalCost: number
}

export function ValuationSummary({ valuations, totalCost }: ValuationSummaryProps) {
    if (!valuations || valuations.length === 0) return null

    const totalProjectedRevenue = valuations.reduce((sum, v) => sum + (v.total_val || 0), 0)
    const projectedProfit = totalProjectedRevenue - totalCost
    const roi = totalCost > 0 ? (projectedProfit / totalCost) * 100 : 0

    return (
        <Card className="col-span-full border-l-4 border-l-green-500 shadow-md">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-semibold text-green-800">
                    Financial Projection (Sell Ready)
                </CardTitle>
                <div className="flex gap-2">
                    <Badge variant={projectedProfit >= 0 ? "default" : "destructive"} className="text-xs">
                        ROI: {roi.toFixed(1)}%
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {/* Summary Metrics */}
                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="bg-muted/30 p-3 rounded-md text-center border">
                            <div className="text-xs text-muted-foreground uppercase tracking-wider">Total Cost</div>
                            <div className="text-lg font-semibold text-muted-foreground">
                                {totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                        </div>
                        <div className="bg-green-50 p-3 rounded-md text-center border border-green-100">
                            <div className="text-xs text-green-700 uppercase tracking-wider">Projected Revenue</div>
                            <div className="text-xl font-bold text-green-700">
                                {totalProjectedRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                        </div>
                        <div className={`p-3 rounded-md text-center border ${projectedProfit >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-red-50 border-red-100'}`}>
                            <div className={`text-xs uppercase tracking-wider ${projectedProfit >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                                Projected Profit
                            </div>
                            <div className={`text-xl font-bold ${projectedProfit >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                                {projectedProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                        </div>
                    </div>

                    {/* Detailed Table */}
                    <div className="overflow-hidden border rounded-md">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 text-muted-foreground text-xs font-medium border-b">
                                <tr>
                                    <th className="px-3 py-2 text-left">Gem Type</th>
                                    <th className="px-3 py-2 text-right">Stock</th>
                                    <th className="px-3 py-2 text-right">Predicted Price/Ct</th>
                                    <th className="px-3 py-2 text-right">Margin %</th>
                                    <th className="px-3 py-2 text-right">Total Value</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {valuations.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-muted/10 group">
                                        <td className="px-3 py-2 font-medium">{item.type}</td>
                                        <td className="px-3 py-2 text-right text-muted-foreground">
                                            {item.pieces} pcs / {item.carats.toFixed(2)} ct
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                            {item.price_per_carat.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold
                                                ${(item.margin_percent || 0) >= 20 ? 'bg-green-100 text-green-700' :
                                                    (item.margin_percent || 0) > 0 ? 'bg-yellow-100 text-yellow-700' :
                                                        'bg-red-100 text-red-700'}`}>
                                                {item.margin_percent?.toFixed(1)}%
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 text-right font-semibold">
                                            {item.total_val.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
