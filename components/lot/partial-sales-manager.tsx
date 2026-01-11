'use client'

import { useState } from 'react'
import { recordPartialSale } from '@/lib/actions'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ShoppingCart } from 'lucide-react'

interface PartialSalesManagerProps {
    lotId: string
    valuations: any[]
    isFinalized: boolean
    isAdmin: boolean
}

export function PartialSalesManager({ lotId, valuations, isFinalized, isAdmin }: PartialSalesManagerProps) {
    const [selectedItem, setSelectedItem] = useState<any>(null)
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [saleData, setSaleData] = useState({
        pieces: '',
        carats: '',
        price: '',
        buyer: '',
        notes: ''
    })

    const handleSell = async () => {
        if (!selectedItem) return

        setLoading(true)
        setError(null)

        try {
            const soldCarats = Number(saleData.carats) || 0
            const soldPieces = Number(saleData.pieces) || 0
            const price = Number(saleData.price) || 0

            // Validation
            if (soldPieces > selectedItem.pieces || soldCarats > selectedItem.carats) {
                setError("Cannot sell more than available stock.")
                setLoading(false)
                return
            }

            if (soldPieces <= 0 || soldCarats <= 0 || price <= 0) {
                setError("Please enter valid quantities and price.")
                setLoading(false)
                return
            }

            const result = await recordPartialSale(
                lotId,
                selectedItem.type,
                soldCarats,
                soldPieces,
                price,
                saleData.buyer,
                saleData.notes,
                new Date().toISOString()
            )

            if (!result.success) {
                setError(result.error || 'Failed to record sale')
            } else {
                setIsOpen(false)
                setSelectedItem(null)
                setSaleData({ pieces: '', carats: '', price: '', buyer: '', notes: '' })
            }
        } catch (err) {
            setError('An unexpected error occurred')
        } finally {
            setLoading(false)
        }
    }

    if (isFinalized || valuations.length === 0) return null

    return (
        <Card>
            <CardHeader>
                <CardTitle>Active Inventory - Partial Sales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {valuations.map((item: any, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors">
                        <div>
                            <div className="font-medium text-primary">{item.type}</div>
                            <div className="text-xs text-muted-foreground">
                                {item.pieces} pcs / {item.carats.toFixed(2)} cts
                            </div>
                        </div>

                        {isAdmin && (
                            <Dialog open={isOpen && selectedItem?.type === item.type} onOpenChange={(open) => {
                                setIsOpen(open)
                                if (!open) {
                                    setSelectedItem(null)
                                    setError(null)
                                    setSaleData({ pieces: '', carats: '', price: '', buyer: '', notes: '' })
                                }
                            }}>
                                <DialogTrigger asChild>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            setSelectedItem(item)
                                            setIsOpen(true)
                                            // Pre-fill estimated price if available
                                            const estimatedPrice = item.price_per_carat ? (item.price_per_carat * item.carats) : 0
                                            setSaleData({
                                                pieces: '',
                                                carats: '',
                                                price: estimatedPrice > 0 ? estimatedPrice.toFixed(0) : '',
                                                buyer: '',
                                                notes: ''
                                            })
                                        }}
                                    >
                                        <ShoppingCart className="w-3 h-3 mr-2" />
                                        Sell Item
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Sell {item.type}</DialogTitle>
                                        <DialogDescription>
                                            Record a sale for specific pieces from this stock.
                                            <br />
                                            Available: {item.pieces} pcs / {item.carats.toFixed(2)} cts
                                        </DialogDescription>
                                    </DialogHeader>

                                    <div className="grid gap-4 py-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Pieces Sold</Label>
                                                <Input
                                                    type="number"
                                                    placeholder={`Max: ${item.pieces}`}
                                                    value={saleData.pieces}
                                                    onChange={(e) => setSaleData({ ...saleData, pieces: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Carats Sold</Label>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder={`Max: ${item.carats.toFixed(2)}`}
                                                    value={saleData.carats}
                                                    onChange={(e) => setSaleData({ ...saleData, carats: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Sale Price (LKR)</Label>
                                            <Input
                                                type="number"
                                                placeholder="Total Sale Price"
                                                value={saleData.price}
                                                onChange={(e) => setSaleData({ ...saleData, price: e.target.value })}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Buyer Name</Label>
                                            <Input
                                                placeholder="Buyer Name"
                                                value={saleData.buyer}
                                                onChange={(e) => setSaleData({ ...saleData, buyer: e.target.value })}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Notes (Optional)</Label>
                                            <Input
                                                placeholder="Optional notes..."
                                                value={saleData.notes}
                                                onChange={(e) => setSaleData({ ...saleData, notes: e.target.value })}
                                            />
                                        </div>

                                        {error && <div className="text-red-500 text-sm">{error}</div>}
                                    </div>

                                    <DialogFooter>
                                        <Button onClick={handleSell} disabled={loading}>
                                            {loading ? 'Recording...' : 'Confirm Sale'}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        )}
                    </div>
                ))}
            </CardContent>
        </Card >
    )
}
