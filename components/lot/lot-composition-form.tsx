'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2 } from 'lucide-react'

// Default types to start with (but user can edit/add more)
const DEFAULT_TYPES = [
    'Silky Geuda',
    'Milky Geuda',
    'Young Geuda',
    'Dum Geuda',
    'Yellow',
    'Pink',
    'Non Shape / Other',
    'Blue Shape'
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

    return (
        <div className="border rounded-md p-4 bg-muted/20">
            <h3 className="font-semibold mb-2">Rough Composition</h3>
            <div className="grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground mb-2">
                <div className="col-span-5">Type</div>
                <div className="col-span-3 text-center">Pieces</div>
                <div className="col-span-3 text-center">Carats</div>
                <div className="col-span-1"></div>
            </div>

            <div className="space-y-2">
                {rows.map((row, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-5">
                            <Input
                                placeholder="Gem Type"
                                value={row.type}
                                onChange={(e) => updateRow(index, 'type', e.target.value)}
                            />
                        </div>
                        <Input
                            type="number"
                            min="0"
                            className="col-span-3 h-10 text-center"
                            placeholder="0"
                            value={row.pieces || ''}
                            onChange={(e) => updateRow(index, 'pieces', e.target.value)}
                        />
                        <Input
                            type="number"
                            min="0"
                            step="0.01"
                            className="col-span-3 h-10 text-center"
                            placeholder="0.00"
                            value={row.carats || ''}
                            onChange={(e) => updateRow(index, 'carats', e.target.value)}
                        />
                        <div className="col-span-1 flex justify-center">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeRow(index)}
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4 w-full dashed border-muted-foreground/50"
                onClick={addRow}
            >
                <Plus className="h-4 w-4 mr-2" /> Add Gem Type
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
