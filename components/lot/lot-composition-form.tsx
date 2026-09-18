'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2, Layers, Sparkles } from 'lucide-react'

// Default gem types for Ceylon Corundum procurement
const DEFAULT_TYPES = [
    'Silky Geuda',
    'Milky Geuda',
    'Young Geuda',
    'Dum Geuda',
    'Yellow Sapphire',
    'Pink Sapphire',
    'Blue Shape Rough',
    'Non Shape / Corundum'
]

export function LotCompositionForm({ name }: { name: string }) {
    const [rows, setRows] = useState(
        DEFAULT_TYPES.map(type => ({ type, pieces: 0, carats: 0 }))
    )

    const updateRow = (index: number, field: 'type' | 'pieces' | 'carats', value: string) => {
        const newRows = [...rows]
        if (field === 'type') {
            newRows[index] = { ...newRows[index], type: value }
        } else {
            newRows[index] = { ...newRows[index], [field]: Number(value) }
        }
        setRows(newRows)
    }

    const addRow = () => {
        setRows([...rows, { type: '', pieces: 0, carats: 0 }])
    }

    const removeRow = (index: number) => {
        setRows(rows.filter((_, i) => i !== index))
    }

    const totalPieces = rows.reduce((acc, row) => acc + (Number(row.pieces) || 0), 0)
    const totalCarats = rows.reduce((acc, row) => acc + (Number(row.carats) || 0), 0)

    return (
        <div className="border border-white/5 rounded-2xl p-5 bg-white/[0.02]">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    <h3 className="font-serif font-bold text-sm text-white">Rough Mineral Composition Matrix</h3>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                    OPTIONAL INTAKE BREAKDOWN
                </span>
            </div>

            <p className="text-xs text-slate-400 mb-4 font-sans">
                Specify initial geuda and rough varieties. If left at 0, lot will be tracked as single aggregate parcel.
            </p>

            <div className="hidden md:grid grid-cols-12 gap-2 text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-400 mb-2 px-2">
                <div className="col-span-5">Mineral Classification</div>
                <div className="col-span-3 text-center">Pieces</div>
                <div className="col-span-3 text-center">Carats (ct)</div>
                <div className="col-span-1"></div>
            </div>

            <div className="space-y-2">
                {rows.map((row, index) => (
                    <div 
                        key={index} 
                        className="flex flex-col md:grid md:grid-cols-12 gap-2 items-start md:items-center p-3 md:p-1.5 border border-white/5 md:border-transparent rounded-xl bg-white/[0.01] hover:bg-white/[0.03] transition-colors"
                    >
                        <div className="w-full md:col-span-5">
                            <label className="text-[10px] uppercase font-mono text-slate-400 md:hidden mb-1 block">Type</label>
                            <Input
                                placeholder="e.g. Silky Geuda"
                                value={row.type}
                                onChange={(e) => updateRow(index, 'type', e.target.value)}
                                className="h-9 bg-slate-900/50 border-white/10 text-xs text-white placeholder:text-slate-600 focus:border-blue-500/50 rounded-lg"
                            />
                        </div>
                        <div className="flex w-full gap-2 md:contents">
                            <div className="flex-1 md:col-span-3">
                                <label className="text-[10px] uppercase font-mono text-slate-400 md:hidden mb-1 block text-center">Pieces</label>
                                <Input
                                    type="number"
                                    min="0"
                                    className="h-9 text-center w-full bg-slate-900/50 border-white/10 text-xs font-mono text-white placeholder:text-slate-600 focus:border-blue-500/50 rounded-lg"
                                    placeholder="0"
                                    value={row.pieces || ''}
                                    onChange={(e) => updateRow(index, 'pieces', e.target.value)}
                                />
                            </div>
                            <div className="flex-1 md:col-span-3">
                                <label className="text-[10px] uppercase font-mono text-slate-400 md:hidden mb-1 block text-center">Carats</label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className="h-9 text-center w-full bg-slate-900/50 border-white/10 text-xs font-mono text-white placeholder:text-slate-600 focus:border-blue-500/50 rounded-lg"
                                    placeholder="0.00"
                                    value={row.carats || ''}
                                    onChange={(e) => updateRow(index, 'carats', e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="w-full md:w-auto md:col-span-1 flex justify-end md:justify-center mt-1 md:mt-0">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeRow(index)}
                                className="h-8 w-8 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Live Tally Bar */}
            <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs font-mono text-slate-400 px-2">
                <span>Sum Tally:</span>
                <div className="flex items-center gap-3">
                    <span>Pieces: <strong className="text-white">{totalPieces}</strong></span>
                    <span className="text-slate-600">|</span>
                    <span>Total Weight: <strong className="text-emerald-400">{totalCarats.toFixed(2)} ct</strong></span>
                </div>
            </div>

            <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3 w-full border-dashed border-white/10 hover:border-blue-400/40 hover:bg-blue-500/[0.04] text-slate-300 text-xs rounded-xl h-9 transition-all"
                onClick={addRow}
            >
                <Plus className="h-3.5 w-3.5 mr-1.5 text-blue-400" />
                Add Mineral Variety
            </Button>

            {/* Hidden input to submit JSON data */}
            <input type="hidden" name={name} value={JSON.stringify(rows.reduce((acc: any, row) => {
                if ((row.pieces > 0 || row.carats > 0) && row.type.trim() !== '') {
                    acc[row.type] = { pieces: row.pieces, carats: row.carats }
                }
                return acc
            }, {}))} />
        </div>
    )
}
