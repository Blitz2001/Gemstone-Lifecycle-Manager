import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface SaleData {
    sold_price: number
    buyer: string
    sale_date: string
    payment_mode?: string
    notes?: string
}

interface SaleSummaryProps {
    saleData: SaleData
    totalCost: number
    createdAt?: string
}

export function SaleSummary({ saleData, totalCost, createdAt }: SaleSummaryProps) {
    if (!saleData) return null

    const soldPrice = saleData.sold_price || 0
    const profit = soldPrice - totalCost
    const margin = totalCost > 0 ? (profit / totalCost) * 100 : 0

    const formattedDate = new Date(saleData.sale_date).toLocaleDateString()

    // Calculate Duration
    let daysHeld = 0
    if (createdAt && saleData.sale_date) {
        const start = new Date(createdAt).getTime()
        const end = new Date(saleData.sale_date).getTime()
        const diff = end - start
        daysHeld = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
    }

    return (
        <Card className="col-span-full border-l-4 border-l-purple-500 shadow-md bg-purple-50/20">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div className="flex flex-col">
                    <CardTitle className="text-base font-semibold text-purple-800">
                        Final Sale Record
                    </CardTitle>
                    <span className="text-xs text-muted-foreground">Sold on {formattedDate} to {saleData.buyer}</span>
                </div>
                <div className="flex gap-2">
                    <Badge variant={profit >= 0 ? "default" : "destructive"} className="text-xs">
                        Realized ROI: {margin.toFixed(1)}%
                    </Badge>
                    <Badge variant="outline" className="text-xs border-purple-200 text-purple-700 bg-purple-50">
                        FINALIZED
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-4 gap-4">
                    <div className="bg-background p-3 rounded-md text-center border">
                        <div className="text-xs text-muted-foreground uppercase tracking-wider">Total Investment</div>
                        <div className="text-lg font-semibold text-muted-foreground">
                            {totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                    </div>
                    <div className="bg-purple-100 p-3 rounded-md text-center border border-purple-200">
                        <div className="text-xs text-purple-800 uppercase tracking-wider">Sold Price</div>
                        <div className="text-xl font-bold text-purple-800">
                            {soldPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                    </div>
                    <div className={`p-3 rounded-md text-center border ${profit >= 0 ? 'bg-green-100 border-green-200' : 'bg-red-100 border-red-200'}`}>
                        <div className={`text-xs uppercase tracking-wider ${profit >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                            Net Profit
                        </div>
                        <div className={`text-xl font-bold ${profit >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                            {profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                    </div>
                    <div className="bg-background p-3 rounded-md text-center border">
                        <div className="text-xs text-muted-foreground uppercase tracking-wider">Time Held</div>
                        <div className="text-lg font-semibold text-foreground">
                            {daysHeld} Days
                        </div>
                    </div>
                </div>

                {(saleData.payment_mode || saleData.notes) && (
                    <div className="mt-4 text-xs text-muted-foreground border-t pt-2 grid grid-cols-2 gap-4">
                        {saleData.payment_mode && (
                            <div>
                                <span className="font-semibold">Payment Mode:</span> {saleData.payment_mode}
                            </div>
                        )}
                        {saleData.notes && (
                            <div>
                                <span className="font-semibold">Notes:</span> {saleData.notes}
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
