'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2, Info } from 'lucide-react'
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

interface BreakdownFormProps {
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
    "IF", "VVS", "VS", "VS1", "VS2", "SI", "SI1", "SI2", "I", "Loupe Clean", "Eye Clean"
]

export function BreakdownForm({ composition, onChange }: BreakdownFormProps) {
    // State for Transformed Stones (Color Changed)
    const [transformedRows, setTransformedRows] = useState<BreakdownItem[]>([
        { id: 't1', color: '', clarity: '-', pieces: 0, carats: 0 }
    ])

    // State for Remainder Stones (Source Type Retained)
    const [remainderRows, setRemainderRows] = useState<BreakdownItem[]>([])

    // Derive source types from composition
    const sourceTypes = composition ? Object.keys(composition).sort() : []

    useEffect(() => {
        // Combine both sets of rows for the parent component
        const cleanTransformed = transformedRows
            .filter(r => r.color && r.carats > 0) // Basic filtering
            .map(({ id, ...rest }) => rest)

        const cleanRemainders = remainderRows
            .map(({ id, source_type, ...rest }) => ({
                ...rest,
                // For remainders, the 'color' field holds the source type name as requested
                color: source_type || '',
                source_type: source_type
            }))
            .filter(r => r.color && r.carats > 0)

        // Note: We send all rows, validation happens in parent or on submit
        // However, for ongoing 'onChange', we might want to send incomplete rows 
        // effectively to let the user type.
        // Let's just strip IDs and send everything like before.

        const allData = [
            ...transformedRows.map(({ id, ...rest }) => ({
                ...rest,
                clarity: rest.clarity || '-'
            })),
            ...remainderRows.map(({ id, ...rest }) => ({
                ...rest,
                color: rest.source_type || '', // Map source_type to color for backend
                clarity: rest.clarity || '-'
            }))
        ]

        onChange({ breakdown: allData })
    }, [transformedRows, remainderRows, onChange])

    // --- Transformed Helpers ---
    const addTransformedRow = () => {
        setTransformedRows(prev => [
            ...prev,
            { id: Math.random().toString(36).substring(7), color: '', clarity: '-', pieces: 0, carats: 0 }
        ])
    }
    const removeTransformedRow = (id: string) => {
        if (transformedRows.length > 1) {
            setTransformedRows(prev => prev.filter(r => r.id !== id))
        } else {
            // Reset if last one
            setTransformedRows([{ id: Math.random().toString(36).substring(7), color: '', clarity: '-', pieces: 0, carats: 0 }])
        }
    }
    const updateTransformedRow = (id: string, field: keyof BreakdownItem, value: any) => {
        setTransformedRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
    }

    // --- Remainder Helpers ---
    const addRemainderRow = () => {
        setRemainderRows(prev => [
            ...prev,
            { id: Math.random().toString(36).substring(7), color: '', clarity: '-', source_type: '', pieces: 0, carats: 0 }
        ])
    }
    const removeRemainderRow = (id: string) => {
        setRemainderRows(prev => prev.filter(r => r.id !== id))
    }
    const updateRemainderRow = (id: string, field: keyof BreakdownItem, value: any) => {
        setRemainderRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
    }

    // --- Auto-Carryover Calculations ---
    const usedSourceTypes = new Set([
        ...transformedRows.map(r => r.source_type),
        ...remainderRows.map(r => r.source_type)
    ].filter(Boolean))

    const autoCarryOverStones = sourceTypes.filter(t => !usedSourceTypes.has(t))

    const autoCarryOverWeight = autoCarryOverStones.reduce((sum, key) => {
        return sum + (composition?.[key]?.carats || 0)
    }, 0)

    const totalWeight = [
        ...transformedRows,
        ...remainderRows
    ].reduce((sum, r) => sum + (r.carats || 0), 0) + autoCarryOverWeight

    return (
        <div className="space-y-6">
            {/* SECTION 1: TRANSFORMED RESULTS */}
            <div className="space-y-4 border rounded-md p-4 bg-white/5 border-white/10">
                <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-semibold">Transformed Results (Color Change)</h4>
                    <Button variant="outline" size="sm" onClick={addTransformedRow} className="gap-2 bg-white/5 border-white/10 hover:bg-white/10">
                        <Plus className="h-3 w-3" /> Add Row
                    </Button>
                </div>

                <div className="space-y-2">
                    <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-2">
                        {sourceTypes.length > 0 && <div className="col-span-3">Source</div>}
                        <div className={sourceTypes.length > 0 ? "col-span-2" : "col-span-3"}>Color</div>
                        <div className={sourceTypes.length > 0 ? "col-span-2" : "col-span-3"}>Clarity</div>
                        <div className="col-span-2 text-center">Pcs</div>
                        <div className="col-span-2 text-center">Weight (ct)</div>
                        <div className="col-span-1"></div>
                    </div>

                    {transformedRows.map((row) => (
                        <div key={row.id} className="grid grid-cols-12 gap-2 items-start">
                            {/* Source Type Select (Restored) */}
                            {sourceTypes.length > 0 && (
                                <div className="col-span-3">
                                    <Select
                                        value={row.source_type}
                                        onValueChange={(val) => updateTransformedRow(row.id, 'source_type', val)}
                                    >
                                        <SelectTrigger className="h-8 text-xs w-full bg-black/20 border-white/10">
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

                            {/* Standard Colors Only */}
                            <div className={sourceTypes.length > 0 ? "col-span-2" : "col-span-3"}>
                                <Select
                                    value={row.color}
                                    onValueChange={(val) => updateTransformedRow(row.id, 'color', val)}
                                >
                                    <SelectTrigger className="h-8 text-xs w-full bg-black/20 border-white/10">
                                        <SelectValue placeholder="Select Color" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {COLORS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className={sourceTypes.length > 0 ? "col-span-2" : "col-span-3"}>
                                <Select
                                    value={row.clarity}
                                    onValueChange={(val) => updateTransformedRow(row.id, 'clarity', val)}
                                >
                                    <SelectTrigger className="h-8 text-xs w-full bg-black/20 border-white/10">
                                        <SelectValue placeholder="Clarity" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CLARITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="col-span-2">
                                <Input
                                    type="number"
                                    className="h-8 text-center text-xs bg-black/20 border-white/10"
                                    placeholder="0"
                                    value={row.pieces || ''}
                                    onChange={(e) => updateTransformedRow(row.id, 'pieces', Number(e.target.value))}
                                />
                            </div>

                            <div className="col-span-2">
                                <Input
                                    type="number"
                                    step="0.01"
                                    className="h-8 text-center text-xs bg-black/20 border-white/10"
                                    placeholder="0.00"
                                    value={row.carats || ''}
                                    onChange={(e) => updateTransformedRow(row.id, 'carats', Number(e.target.value))}
                                />
                            </div>

                            <div className="col-span-1 flex justify-center">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => removeTransformedRow(row.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* SECTION 2: REMAINDERS */}
            {sourceTypes.length > 0 && (
                <div className="space-y-4 border rounded-md p-4 bg-white/5 border-white/10">
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="text-sm font-semibold text-orange-200">Remainders (Unchanged / Needs Burn)</h4>
                        <Button variant="outline" size="sm" onClick={addRemainderRow} className="gap-2 border-orange-500/30 hover:bg-orange-500/20 hover:text-orange-100 text-orange-200/80">
                            <Plus className="h-3 w-3" /> Add Remainder
                        </Button>
                    </div>

                    {remainderRows.length === 0 ? (
                        <div className="text-xs text-muted-foreground italic px-2">No remainders recorded.</div>
                    ) : (
                        <div className="space-y-2">
                            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-orange-200/70 px-2">
                                <div className="col-span-6">Original Type</div>
                                <div className="col-span-2 text-center">Pcs</div>
                                <div className="col-span-3 text-center">Weight (ct)</div>
                                <div className="col-span-1"></div>
                            </div>

                            {remainderRows.map((row) => (
                                <div key={row.id} className="grid grid-cols-12 gap-2 items-start">
                                    {/* Source Types Only */}
                                    <div className="col-span-6">
                                        <Select
                                            value={row.source_type}
                                            onValueChange={(val) => updateRemainderRow(row.id, 'source_type', val)}
                                        >
                                            <SelectTrigger className="h-8 text-xs w-full bg-black/20 border-white/10 text-orange-100">
                                                <SelectValue placeholder="Original Type" />
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

                                    <div className="col-span-2">
                                        <Input
                                            type="number"
                                            className="h-8 text-center text-xs bg-black/20 border-white/10 text-orange-100"
                                            placeholder="0"
                                            value={row.pieces || ''}
                                            onChange={(e) => updateRemainderRow(row.id, 'pieces', Number(e.target.value))}
                                        />
                                    </div>

                                    <div className="col-span-3">
                                        <Input
                                            type="number"
                                            step="0.01"
                                            className="h-8 text-center text-xs bg-black/20 border-white/10 text-orange-100"
                                            placeholder="0.00"
                                            value={row.carats || ''}
                                            onChange={(e) => updateRemainderRow(row.id, 'carats', Number(e.target.value))}
                                        />
                                    </div>

                                    <div className="col-span-1 flex justify-center">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-orange-400 hover:text-orange-200 hover:bg-orange-500/20"
                                            onClick={() => removeRemainderRow(row.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* SECTION 3: AUTO-CARRYOVER PREVIEW */}
            {autoCarryOverStones.length > 0 && (
                <div className="space-y-4 border rounded-md p-4 bg-white/5 border-white/10">
                    <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                            <Info className="h-4 w-4 text-blue-400" />
                            <h4 className="text-sm font-semibold text-blue-200">Auto-Carryover (Will be preserved)</h4>
                        </div>
                    </div>
                    <div className="text-xs text-blue-200/70 px-2 mb-2">
                        The following stones are not selected above and will automatically move to the next stage unchanged.
                    </div>

                    <div className="space-y-2">
                        <div className="grid grid-cols-12 gap-2 text-xs font-medium text-blue-200/70 px-2 border-b border-white/10 pb-1">
                            <div className="col-span-6">Original Type</div>
                            <div className="col-span-2 text-center">Pcs</div>
                            <div className="col-span-3 text-center">Weight (ct)</div>
                            <div className="col-span-1"></div>
                        </div>

                        {autoCarryOverStones.map((key) => {
                            const stats = composition?.[key]
                            if (!stats) return null
                            return (
                                <div key={key} className="grid grid-cols-12 gap-2 py-1 px-2 text-sm text-blue-100 items-center">
                                    <div className="col-span-6 font-medium">{key}</div>
                                    <div className="col-span-2 text-center font-mono">{stats.pieces}</div>
                                    <div className="col-span-3 text-center font-mono">{stats.carats.toFixed(2)}</div>
                                    <div className="col-span-1"></div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            <div className="text-right text-xs text-muted-foreground pt-2 border-t">
                Total Output: <span className="font-bold text-foreground">{totalWeight.toFixed(2)} cts</span>
            </div>
        </div>
    )
}
