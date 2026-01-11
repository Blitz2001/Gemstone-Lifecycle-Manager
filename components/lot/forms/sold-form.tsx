'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface SoldFormProps {
    onChange: (data: any) => void
    totalCost?: number
}

export function SoldForm({ onChange, totalCost = 0 }: SoldFormProps) {
    const [formData, setFormData] = useState({
        sold_price: '',
        buyer: '',
        sale_date: new Date().toISOString().split('T')[0],
        payment_mode: '',
        notes: ''
    })

    useEffect(() => {
        // Validate and pass data up
        const isValid = formData.sold_price && formData.buyer && formData.sale_date

        if (isValid) {
            onChange({
                sold_price: Number(formData.sold_price),
                buyer: formData.buyer,
                sale_date: new Date(formData.sale_date).toISOString(),
                payment_mode: formData.payment_mode,
                notes: formData.notes
            })
        } else {
            // Pass partial/invalid data? Usually better to pass nothing or validation flags.
            // Here we rely on the parent to check required fields, so we pass what we have 
            // but parent validation will fail if fields are missing.
            onChange({
                ...formData,
                sold_price: Number(formData.sold_price) // Ensure number
            })
        }
    }, [formData, onChange])

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const soldPrice = Number(formData.sold_price) || 0
    const profit = soldPrice - totalCost
    const margin = totalCost > 0 ? (profit / totalCost) * 100 : 0

    return (
        <div className="space-y-4 border rounded-md p-4 bg-green-50/50">
            <h4 className="text-sm font-semibold mb-2 text-green-800">Finalize Sale</h4>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="sold_price">Final Sale Price</Label>
                    <Input
                        id="sold_price"
                        type="number"
                        placeholder="0.00"
                        value={formData.sold_price}
                        onChange={(e) => handleChange('sold_price', e.target.value)}
                        className="font-bold text-lg"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="sale_date">Date of Sale</Label>
                    <Input
                        id="sale_date"
                        type="date"
                        value={formData.sale_date}
                        onChange={(e) => handleChange('sale_date', e.target.value)}
                        required
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="buyer">Buyer Name</Label>
                    <Input
                        id="buyer"
                        placeholder="e.g., John Doe or Company Ltd"
                        value={formData.buyer}
                        onChange={(e) => handleChange('buyer', e.target.value)}
                        required
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="payment_mode">Payment Mode (Optional)</Label>
                    <Input
                        id="payment_mode"
                        placeholder="e.g., Bank Transfer, Cheque"
                        value={formData.payment_mode}
                        onChange={(e) => handleChange('payment_mode', e.target.value)}
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="notes">Notes / Remarks</Label>
                <Textarea
                    id="notes"
                    placeholder="Any final comments..."
                    value={formData.notes}
                    onChange={(e) => handleChange('notes', e.target.value)}
                />
            </div>

            {/* Live Profit Calculation */}
            {soldPrice > 0 && totalCost > 0 && (
                <div className={`p-4 rounded-md border text-center transition-colors ${profit >= 0 ? 'bg-green-100 border-green-200 text-green-800' : 'bg-red-100 border-red-200 text-red-800'}`}>
                    <div className="text-xs uppercase font-semibold opacity-70">Realized Profit</div>
                    <div className="text-2xl font-bold">
                        {profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-sm font-medium mt-1">
                        Margin: {margin.toFixed(1)}%
                    </div>
                </div>
            )}

            <p className="text-xs text-muted-foreground mt-4 text-center">
                ⚠️ Confirming this sale will <strong>FINALIZE</strong> the lot and lock it from further edits.
            </p>
        </div>
    )
}
