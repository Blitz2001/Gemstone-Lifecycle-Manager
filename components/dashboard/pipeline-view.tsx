'use client'

import { useState, useEffect } from 'react'
import { getDashboardLots } from '@/lib/actions'
import { LotStage, STAGE_DISPLAY_NAMES, STAGE_SEQUENCE, normalizeStage } from '@/lib/state-machine'
import { Card } from "@/components/ui/card"
import Link from 'next/link'
import { Badge } from "@/components/ui/badge"
import { Loader2, Search, Filter, LayoutGrid, List } from 'lucide-react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { KanbanBoard } from '@/components/dashboard/kanban-board'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

// Define columns strictly by sequence
const COLUMNS = Object.keys(STAGE_SEQUENCE).sort((a, b) => STAGE_SEQUENCE[a as LotStage] - STAGE_SEQUENCE[b as LotStage]) as LotStage[]

export function PipelineView() {
    const [lots, setLots] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [activeStage, setActiveStage] = useState<LotStage>(LotStage.PROCUREMENT)
    const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table')

    useEffect(() => {
        async function fetchLots() {
            try {
                const data = await getDashboardLots()
                setLots(data)

                // Optional: Auto-select first stage with lots if Procurement is empty?
                // For now, default to Procurement is safer/standard.
            } catch (error) {
                console.error("Failed to fetch dashboard lots", error)
            } finally {
                setLoading(false)
            }
        }
        fetchLots()
    }, [])

    if (loading) {
        return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-white/50" /></div>
    }

    // Filter lots
    const filteredLots = lots.filter(lot =>
        lot.lot_code.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // Helper: Count lots per stage (for badges)
    const getStageCount = (stage: LotStage) => {
        return filteredLots.filter(l => {
            const normalizedCurrent = normalizeStage(l.current_stage)
            if (stage === LotStage.SOLD) return normalizedCurrent === LotStage.SOLD || (normalizedCurrent === LotStage.SELL_READY && l.is_finalized)
            if (stage === LotStage.SELL_READY) return !l.is_finalized && normalizedCurrent === LotStage.SELL_READY
            return normalizedCurrent === stage
        }).length
    }

    // Filter lots for CURRENT active stage
    const currentStageLots = filteredLots.filter(l => {
        const normalizedCurrent = normalizeStage(l.current_stage)

        if (activeStage === LotStage.SOLD) {
            if (normalizedCurrent === LotStage.SOLD) return true
            if (normalizedCurrent === LotStage.SELL_READY && l.is_finalized) return true
            return false
        }
        if (activeStage === LotStage.SELL_READY) {
            if (l.is_finalized) return false
            return normalizedCurrent === LotStage.SELL_READY
        }
        return normalizedCurrent === activeStage
    })

    return (
        <div className="h-full flex flex-col gap-4">
            {/* Controls: Search, View Switcher & Stage Tabs */}
            <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    {/* Search Bar */}
                    <div className="relative w-full max-w-md">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/50" />
                        <Input
                            type="search"
                            placeholder="Search lots by code..."
                            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:bg-white/10 transition-colors backdrop-blur-sm h-10 rounded-full"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* View Switcher: Table View vs Kanban Board */}
                    <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1 backdrop-blur-sm self-start sm:self-auto">
                        <button
                            type="button"
                            onClick={() => setViewMode('table')}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                                viewMode === 'table'
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "text-white/60 hover:text-white"
                            )}
                        >
                            <List className="w-3.5 h-3.5" />
                            Table View
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('kanban')}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                                viewMode === 'kanban'
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "text-white/60 hover:text-white"
                            )}
                        >
                            <LayoutGrid className="w-3.5 h-3.5" />
                            Kanban Board
                        </button>
                    </div>
                </div>

                {/* Stage Tabs (Only in Table View) */}
                {viewMode === 'table' && (
                    <div className="flex overflow-x-auto pb-1 gap-2 no-scrollbar">
                        {COLUMNS.map(stage => {
                            const count = getStageCount(stage)
                            const isActive = activeStage === stage

                            return (
                                <button
                                    key={stage}
                                    onClick={() => setActiveStage(stage)}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap border",
                                        isActive
                                            ? "bg-primary text-primary-foreground border-primary shadow-[0_0_15px_rgba(var(--primary),0.5)]"
                                            : "bg-white/5 text-white/60 border-white/5 hover:bg-white/10 hover:text-white hover:border-white/10"
                                    )}
                                >
                                    {STAGE_DISPLAY_NAMES[stage]}
                                    <Badge
                                        variant="secondary"
                                        className={cn(
                                            "ml-1 text-[10px] h-5 px-1.5 min-w-[1.25rem]",
                                            isActive ? "bg-white/20 text-white" : "bg-black/20 text-white/50"
                                        )}
                                    >
                                        {count}
                                    </Badge>
                                </button>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* View Content */}
            {viewMode === 'kanban' ? (
                <div className="flex-1 overflow-y-auto min-h-0 pt-2">
                    <KanbanBoard initialLots={lots} searchQuery={searchQuery} showSearch={false} />
                </div>
            ) : (
                /* Table View */
                <div className="flex-1 bg-white/5 border border-white/10 rounded-xl overflow-hidden backdrop-blur-md shadow-2xl relative">
                    <div className="absolute inset-0 overflow-auto">
                        <Table>
                            <TableHeader className="bg-white/5 sticky top-0 backdrop-blur-md z-10">
                                <TableRow className="border-white/10 hover:bg-transparent">
                                    <TableHead className="text-white/70 w-[150px]">Lot Code</TableHead>
                                    <TableHead className="text-white/70">Metrics (Weight/Pcs)</TableHead>
                                    <TableHead className="text-white/70">Cost</TableHead>
                                    <TableHead className="text-white/70">Date</TableHead>
                                    <TableHead className="text-white/70 text-right">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {currentStageLots.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-64 text-center text-white/30 italic">
                                            No lots found in {STAGE_DISPLAY_NAMES[activeStage]}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    currentStageLots.map(lot => (
                                        <TableRow
                                            key={lot.id}
                                            className="border-white/5 hover:bg-white/5 transition-colors group cursor-pointer"
                                        >
                                            <TableCell className="font-medium text-white">
                                                <Link href={`/lots/${lot.id}`} className="block w-full h-full">
                                                    {lot.lot_code}
                                                </Link>
                                            </TableCell>
                                            <TableCell className="text-white/80">
                                                <Link href={`/lots/${lot.id}`} className="block w-full h-full">
                                                    <div className="flex flex-col">
                                                        <span>{lot.current_weight?.toFixed(2)} cts</span>
                                                        <span className="text-xs text-white/40">{lot.current_pieces} pcs</span>
                                                    </div>
                                                </Link>
                                            </TableCell>
                                            <TableCell className="text-white/80">
                                                <Link href={`/lots/${lot.id}`} className="block w-full h-full">
                                                    {(Number(lot.total_cost) || (Number(lot.purchase_price) || 0)).toLocaleString()}
                                                </Link>
                                            </TableCell>
                                            <TableCell className="text-white/60 text-xs">
                                                <Link href={`/lots/${lot.id}`} className="block w-full h-full">
                                                    {new Date(lot.created_at).toLocaleDateString()}
                                                </Link>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Link href={`/lots/${lot.id}`} className="block w-full h-full">
                                                    {lot.is_finalized && (
                                                        <Badge variant="outline" className="text-[10px] border-emerald-500/50 text-emerald-400 bg-emerald-500/10">
                                                            SEALED
                                                        </Badge>
                                                    )}
                                                    {!lot.is_finalized && (
                                                        <span className="text-xs text-white/40">Active</span>
                                                    )}
                                                </Link>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}
        </div>
    )
}
