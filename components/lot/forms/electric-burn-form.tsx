'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2 } from 'lucide-react'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

export interface BreakdownItem {
    id: string
    color: string
    clarity: string
    source_type?: string // Optional input source
    pieces: number
    carats: number
}

interface ElectricBurnFormProps {
    composition?: Record<string, { pieces: number, carats: number }>
    onChange: (data: { breakdown: Omit<BreakdownItem, 'id'>[] }) => void
}

// Hardcoded for now. In a real app, fetch from system_config.
const COLORS = [
    "Royal Blue", "Cornflower Blue", "Blue",
    "Fancy Yellow", "Yellow",
    "Create White", "White",
    "Pink", "Padparadscha",
    "Other/Mixed"
]

const CLARITIES = [
    "IF", "VVS", "VS", "SI", "I", "Loupe Clean", "Eye Clean"
]

export function ElectricBurnForm({ composition, onChange }: ElectricBurnFormProps) {
    const [rows, setRows] = useState<BreakdownItem[]>([
        { id: '1', color: '', clarity: '', source_type: '', pieces: 0, carats: 0 }
    ])

    // Derive source types from composition
    const sourceTypes = composition ? Object.keys(composition).sort() : []

    useEffect(() => {
        // Propagate changes to parent
        const cleanData = rows.map(({ id, ...rest }) => rest)
        onChange({ breakdown: cleanData })
    }, [rows, onChange])

    const addRow = () => {
        setRows(prev => [
            ...prev,
            { id: Math.random().toString(36).substring(7), color: '', clarity: '', source_type: '', pieces: 0, carats: 0 }
        ])
    }

    const removeRow = (id: string) => {
        if (rows.length > 1) {
            setRows(prev => prev.filter(r => r.id !== id))
        }
    }

    const updateRow = (id: string, field: keyof BreakdownItem, value: any) => {
        setRows(prev => prev.map(r => {
            if (r.id === id) {
                return { ...r, [field]: value }
            }
            return r
        }))
    }

    return (
        <div className="space-y-4 border rounded-md p-4 bg-muted/20">
            <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-semibold">Result Breakdown</h4>
                <Button variant="outline" size="sm" onClick={addRow} className="gap-2">
                    <Plus className="h-3 w-3" /> Add Row
                </Button>
            </div>

            <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-2">
                    {sourceTypes.length > 0 && <div className="col-span-3">Source Type</div>}
                    {/* Adjust columns if Source Type is present */}
                    <div className={sourceTypes.length > 0 ? "col-span-2" : "col-span-3"}>Color</div>
                    <div className={sourceTypes.length > 0 ? "col-span-2" : "col-span-3"}>Clarity</div>
                    <div className="col-span-2 text-center">Pcs</div>
                    <div className="col-span-2 text-center">Weight (ct)</div>
                    <div className="col-span-1"></div>
                </div>

                {rows.map((row) => (
                    <div key={row.id} className="grid grid-cols-12 gap-2 items-start">
                        {/* Source Type Select (Optional) */}
                        {sourceTypes.length > 0 && (
                            <div className="col-span-3">
                                <Select
                                    value={row.source_type}
                                    onValueChange={(val) => updateRow(row.id, 'source_type', val)}
                                >
                                    <SelectTrigger className="h-8 text-xs">
                                        <SelectValue placeholder="Source" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {sourceTypes.map(t => (
                                            <SelectItem key={t} value={t}>
                                                {t} <span className="text-muted-foreground ml-2">({composition?.[t]?.carats?.toFixed(2) ?? 0} ct)</span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Color Select */}
                        <div className={sourceTypes.length > 0 ? "col-span-2" : "col-span-3"}>
                            <Select
                                value={row.color}
                                onValueChange={(val) => updateRow(row.id, 'color', val)}
                            >
                                <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Color" />
                                </SelectTrigger>
                                <SelectContent>
                                    {COLORS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Clarity Select */}
                        <div className={sourceTypes.length > 0 ? "col-span-2" : "col-span-3"}>
                            <Select
                                value={row.clarity}
                                onValueChange={(val) => updateRow(row.id, 'clarity', val)}
                            >
                                <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Clarity" />
                                </SelectTrigger>
                                <SelectContent>
                                    {CLARITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Pieces Input */}
                        <div className="col-span-2">
                            <Input
                                type="number"
                                className="h-8 text-center text-xs"
                                placeholder="0"
                                value={row.pieces || ''}
                                onChange={(e) => updateRow(row.id, 'pieces', Number(e.target.value))}
                            />
                        </div>

                        {/* Weight Input */}
                        <div className="col-span-2">
                            <Input
                                type="number"
                                step="0.01"
                                className="h-8 text-center text-xs"
                                placeholder="0.00"
                                value={row.carats || ''}
                                onChange={(e) => updateRow(row.id, 'carats', Number(e.target.value))}
                            />
                        </div>

                        {/* Delete Action */}
                        <div className="col-span-1 flex justify-center">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => removeRow(row.id)}
                                disabled={rows.length === 1}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="text-right text-xs text-muted-foreground pt-2 border-t">
                Total Output: <span className="font-bold text-foreground">{rows.reduce((sum, r) => sum + (r.carats || 0), 0).toFixed(2)} cts</span>
            </div>
        </div>
    )
}
