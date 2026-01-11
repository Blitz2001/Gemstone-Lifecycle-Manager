'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'

interface PartialSalesHistoryProps {
    salesHistory: any[]
}

export function PartialSalesHistory({ salesHistory }: PartialSalesHistoryProps) {
    if (!salesHistory || salesHistory.length === 0) return null

    // Calculate totals
    const totalRevenue = salesHistory.reduce((sum, sale) => sum + (Number(sale.price) || 0), 0)
    const totalPieces = salesHistory.reduce((sum, sale) => sum + (Number(sale.sold_pieces) || 0), 0)
    const totalCarats = salesHistory.reduce((sum, sale) => sum + (Number(sale.sold_carats) || 0), 0)

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>Partial Sales History</CardTitle>
                    <Badge variant="secondary" className="text-xs">
                        {salesHistory.length} {salesHistory.length === 1 ? 'Sale' : 'Sales'}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
                    <div>
                        <div className="text-xs text-muted-foreground">Total Revenue</div>
                        <div className="text-lg font-bold text-emerald-600">
                            LKR {totalRevenue.toLocaleString()}
                        </div>
                    </div>
                    <div>
                        <div className="text-xs text-muted-foreground">Total Pieces</div>
                        <div className="text-lg font-bold">{totalPieces}</div>
                    </div>
                    <div>
                        <div className="text-xs text-muted-foreground">Total Carats</div>
                        <div className="text-lg font-bold">{totalCarats.toFixed(2)}</div>
                    </div>
                </div>

                {/* Sales List */}
                <div className="space-y-3">
                    {salesHistory.map((sale, idx) => (
                        <div
                            key={sale.id || idx}
                            className="p-4 border rounded-lg bg-card hover:bg-muted/20 transition-colors"
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div>
                                    <div className="font-semibold text-primary">{sale.item_type}</div>
                                    <div className="text-xs text-muted-foreground">
                                        {format(new Date(sale.date), 'MMM dd, yyyy • h:mm a')}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-lg font-bold text-emerald-600">
                                        LKR {Number(sale.price).toLocaleString()}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-muted-foreground">Quantity:</span>{' '}
                                    <span className="font-medium">
                                        {sale.sold_pieces} pcs / {Number(sale.sold_carats).toFixed(2)} cts
                                    </span>
                                </div>
                                {sale.buyer && (
                                    <div>
                                        <span className="text-muted-foreground">Buyer:</span>{' '}
                                        <span className="font-medium">{sale.buyer}</span>
                                    </div>
                                )}
                            </div>

                            {sale.notes && (
                                <div className="mt-2 text-sm text-muted-foreground italic">
                                    "{sale.notes}"
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
