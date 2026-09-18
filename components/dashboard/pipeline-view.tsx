'use client'

import { useState, useEffect } from 'react'
import { getDashboardLots } from '@/lib/actions'
import { LotStage, STAGE_DISPLAY_NAMES, STAGE_SEQUENCE, normalizeStage } from '@/lib/state-machine'
import Link from 'next/link'
import Image from 'next/image'
import { Badge } from "@/components/ui/badge"
import { Loader2, Search, LayoutGrid, List, ArrowUpRight, Gem, Calendar } from 'lucide-react'
import { Input } from "@/components/ui/input"
import { KanbanBoard } from '@/components/dashboard/kanban-board'
import { cn } from "@/lib/utils"

const COLUMNS = Object.keys(STAGE_SEQUENCE).sort((a, b) => STAGE_SEQUENCE[a as LotStage] - STAGE_SEQUENCE[b as LotStage]) as LotStage[]

const STAGE_COLORS: Record<string, { bg: string, text: string, border: string, dot: string }> = {
    PROCUREMENT: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20', dot: 'bg-indigo-400' },
    PERFORMING: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20', dot: 'bg-purple-400' },
    GAS_BURN: { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/20', dot: 'bg-pink-400' },
    CUT_POLISH: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20', dot: 'bg-cyan-400' },
    ELECTRIC_BURN: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', dot: 'bg-amber-400' },
    CERTIFICATION: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20', dot: 'bg-yellow-400' },
    SELL_READY: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', dot: 'bg-emerald-400' },
    SOLD: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20', dot: 'bg-slate-400' },
}

export function PipelineView() {
    const [lots, setLots] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [sortBy, setSortBy] = useState<'newest' | 'cost_high' | 'weight_high'>('newest')
    const [activeStage, setActiveStage] = useState<LotStage>(LotStage.PROCUREMENT)
    const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table')

    useEffect(() => {
        async function fetchLots() {
            try {
                const data = await getDashboardLots()
                setLots(data)
            } catch (error) {
                console.error("Failed to fetch dashboard lots", error)
            } finally {
                setLoading(false)
            }
        }
        fetchLots()
    }, [])

    if (loading) {
        return (
            <div className="flex h-[40vh] items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="animate-spin h-7 w-7 text-amber-400" />
                    <span className="text-xs text-slate-400 tracking-wider font-medium font-mono">LOADING LOTS...</span>
                </div>
            </div>
        )
    }

    // Filter lots
    let filteredLots = lots.filter(lot =>
        lot.lot_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lot.supplier?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lot.current_stage?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // Sort lots
    if (sortBy === 'cost_high') {
        filteredLots.sort((a, b) => (Number(b.total_cost) || 0) - (Number(a.total_cost) || 0))
    } else if (sortBy === 'weight_high') {
        filteredLots.sort((a, b) => (Number(b.current_weight) || 0) - (Number(a.current_weight) || 0))
    } else {
        filteredLots.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }

    // Helper: Count lots per stage
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
            return normalizedCurrent === LotStage.SOLD || (normalizedCurrent === LotStage.SELL_READY && l.is_finalized)
        }
        if (activeStage === LotStage.SELL_READY) {
            return !l.is_finalized && normalizedCurrent === LotStage.SELL_READY
        }
        return normalizedCurrent === activeStage
    })

    const formatCurrency = (val: number) => {
        return `LKR ${(val || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
    }

    const getSupabaseAssetUrl = (filePath: string | null) => {
        if (!filePath) return null
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qxxtlytyjkwqyumlxvvv.supabase.co'
        return `${supabaseUrl}/storage/v1/object/public/lot-evidence/${filePath}`
    }

    return (
        <div className="h-full flex flex-col gap-4">
            {/* Top Toolbar: Search, Sort, View Toggle */}
            <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    {/* Search & Sort */}
                    <div className="flex items-center gap-2.5 flex-1 max-w-lg">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                type="search"
                                placeholder="Search by lot code or supplier..."
                                className="pl-9 bg-slate-900/60 border-white/10 text-white placeholder:text-slate-500 focus:border-amber-500/50 focus:bg-slate-900/90 transition-all h-9 rounded-xl text-xs"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <select
                            aria-label="Sort lots"
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="bg-slate-900/60 border border-white/10 text-slate-300 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-amber-500/50 font-sans"
                        >
                            <option value="newest">Sort: Newest First</option>
                            <option value="cost_high">Sort: Highest Cost</option>
                            <option value="weight_high">Sort: Carat Weight</option>
                        </select>
                    </div>

                    {/* View Switcher: Table View vs Kanban Board */}
                    <div className="inline-flex rounded-xl border border-white/10 bg-slate-900/60 p-1 backdrop-blur-sm self-start sm:self-auto">
                        <button
                            type="button"
                            onClick={() => setViewMode('table')}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                                viewMode === 'table'
                                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm"
                                    : "text-slate-400 hover:text-white"
                            )}
                        >
                            <List className="w-3.5 h-3.5" />
                            Table View
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('kanban')}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                                viewMode === 'kanban'
                                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm"
                                    : "text-slate-400 hover:text-white"
                            )}
                        >
                            <LayoutGrid className="w-3.5 h-3.5" />
                            Kanban Board
                        </button>
                    </div>
                </div>

                {/* Stage Progression Tabs (Table View Only) */}
                {viewMode === 'table' && (
                    <div className="flex overflow-x-auto pb-1 gap-2 no-scrollbar border-b border-white/5 pt-1">
                        {COLUMNS.map(stage => {
                            const count = getStageCount(stage)
                            const isActive = activeStage === stage
                            const colorSpec = STAGE_COLORS[stage] || STAGE_COLORS.PROCUREMENT

                            return (
                                <button
                                    key={stage}
                                    onClick={() => setActiveStage(stage)}
                                    className={cn(
                                        "flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap border",
                                        isActive
                                            ? "bg-amber-500/15 border-amber-500/50 text-white shadow-sm shadow-amber-500/10"
                                            : "bg-slate-900/40 text-slate-400 border-white/5 hover:bg-slate-800/60 hover:text-white hover:border-white/10"
                                    )}
                                >
                                    <span className={cn("w-1.5 h-1.5 rounded-full", isActive ? "bg-amber-400" : colorSpec.dot)} />
                                    <span>{STAGE_DISPLAY_NAMES[stage]}</span>
                                    <span
                                        className={cn(
                                            "text-[10px] font-bold px-1.5 py-0.5 rounded-md min-w-[1.2rem] text-center font-mono",
                                            isActive ? "bg-amber-500 text-black" : "bg-white/5 text-slate-400"
                                        )}
                                    >
                                        {count}
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* View Content */}
            {viewMode === 'kanban' ? (
                <div className="flex-1 overflow-y-auto min-h-0 pt-1">
                    <KanbanBoard initialLots={lots} searchQuery={searchQuery} showSearch={false} />
                </div>
            ) : (
                /* Rich Specimen Table View */
                <div className="flex-1 obsidian-card rounded-2xl overflow-hidden shadow-2xl relative flex flex-col">
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/5 bg-slate-900/80 text-[10px] uppercase font-bold tracking-wider text-slate-400 sticky top-0 backdrop-blur-md z-10 font-mono">
                                    <th className="py-3.5 px-4 w-[280px]">Lot Specimen</th>
                                    <th className="py-3.5 px-4">Stage Status</th>
                                    <th className="py-3.5 px-4">Supplier &amp; Date</th>
                                    <th className="py-3.5 px-4">Weight &amp; Yield</th>
                                    <th className="py-3.5 px-4">Cost Basis</th>
                                    <th className="py-3.5 px-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-xs">
                                {currentStageLots.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="h-48 text-center text-slate-500 py-12">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <Gem className="w-7 h-7 text-slate-600 mb-1" />
                                                <p className="font-medium text-slate-400">No lots currently in {STAGE_DISPLAY_NAMES[activeStage]}</p>
                                                <p className="text-[11px] text-slate-600 max-w-sm">
                                                    Parcels transitioned to this stage in the production lifecycle will appear here.
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    currentStageLots.map(lot => {
                                        const initialWt = Number(lot.initial_weight) || 0
                                        const currentWt = Number(lot.current_weight) || initialWt
                                        const yieldRate = initialWt > 0 ? Math.min(100, Math.round((currentWt / initialWt) * 100)) : 100
                                        const lossRate = 100 - yieldRate
                                        const stageStyle = STAGE_COLORS[lot.current_stage] || STAGE_COLORS.PROCUREMENT
                                        const assetUrl = getSupabaseAssetUrl(lot.primary_image)

                                        return (
                                            <tr
                                                key={lot.id}
                                                className="hover:bg-white/[0.03] transition-colors group cursor-pointer"
                                            >
                                                {/* 1. Lot Code & Image */}
                                                <td className="py-3.5 px-4">
                                                    <Link href={`/lots/${lot.id}`} className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-white/10 overflow-hidden flex-shrink-0 flex items-center justify-center relative shadow-inner">
                                                            {assetUrl ? (
                                                                <Image
                                                                    src={assetUrl}
                                                                    alt={lot.lot_code}
                                                                    fill
                                                                    sizes="40px"
                                                                    className="object-cover"
                                                                />
                                                            ) : (
                                                                <Image
                                                                    src="/logo.png"
                                                                    alt="Logo"
                                                                    width={22}
                                                                    height={22}
                                                                    className="opacity-70 group-hover:opacity-100 transition-opacity"
                                                                />
                                                            )}
                                                        </div>

                                                        <div className="flex flex-col">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-white tracking-wide group-hover:text-amber-300 transition-colors font-mono">
                                                                    {lot.lot_code}
                                                                </span>
                                                                {lot.is_finalized && (
                                                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 uppercase font-mono">
                                                                        SEALED
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className="text-[11px] text-slate-400 mt-0.5">
                                                                {lot.current_pieces ? `${lot.current_pieces} pcs` : 'Single Parcel'}
                                                            </span>
                                                        </div>
                                                    </Link>
                                                </td>

                                                {/* 2. Stage Status */}
                                                <td className="py-3.5 px-4">
                                                    <Link href={`/lots/${lot.id}`}>
                                                        <span className={cn(
                                                            "inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border font-mono",
                                                            stageStyle.bg,
                                                            stageStyle.text,
                                                            stageStyle.border
                                                        )}>
                                                            <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", stageStyle.dot)} />
                                                            {STAGE_DISPLAY_NAMES[lot.current_stage as LotStage] || lot.current_stage}
                                                        </span>
                                                    </Link>
                                                </td>

                                                {/* 3. Supplier & Date */}
                                                <td className="py-3.5 px-4">
                                                    <Link href={`/lots/${lot.id}`} className="flex flex-col">
                                                        <span className="font-medium text-slate-200">
                                                            {lot.supplier || 'Unassigned'}
                                                        </span>
                                                        <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                                                            <Calendar className="w-3 h-3 text-slate-500" />
                                                            {lot.purchase_date 
                                                                ? new Date(lot.purchase_date).toLocaleDateString(undefined, { dateStyle: 'medium' })
                                                                : new Date(lot.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                                                        </span>
                                                    </Link>
                                                </td>

                                                {/* 4. Weight Retention & Kerf Yield */}
                                                <td className="py-3.5 px-4">
                                                    <Link href={`/lots/${lot.id}`} className="block w-44">
                                                        <div className="flex justify-between text-[11px] mb-1 font-mono">
                                                            <span className="text-white font-bold">{currentWt.toFixed(2)} ct</span>
                                                            <span className="text-slate-400">init: {initialWt.toFixed(2)} ct</span>
                                                        </div>
                                                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex">
                                                            <div className="bg-emerald-500 h-full rounded-l-full" style={{ width: `${yieldRate}%` }} />
                                                            <div className="bg-rose-500 h-full rounded-r-full" style={{ width: `${lossRate}%` }} />
                                                        </div>
                                                        <div className="flex justify-between text-[9px] mt-1 font-semibold font-mono">
                                                            <span className="text-emerald-400">{yieldRate}% YIELD</span>
                                                            <span className="text-rose-400">-{lossRate}% LOSS</span>
                                                        </div>
                                                    </Link>
                                                </td>

                                                {/* 5. Cost Basis */}
                                                <td className="py-3.5 px-4">
                                                    <Link href={`/lots/${lot.id}`} className="flex flex-col">
                                                        <span className="font-bold text-white font-serif text-sm">
                                                            {formatCurrency(Number(lot.total_cost) || Number(lot.purchase_price) || 0)}
                                                        </span>
                                                        {lot.purchase_price && (
                                                            <span className="text-[10px] text-slate-400 font-mono">
                                                                Rough: {formatCurrency(Number(lot.purchase_price) || 0)}
                                                            </span>
                                                        )}
                                                    </Link>
                                                </td>

                                                {/* 6. Action */}
                                                <td className="py-3.5 px-4 text-right">
                                                    <Link
                                                        href={`/lots/${lot.id}`}
                                                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 px-2.5 py-1.5 rounded-lg transition-all"
                                                    >
                                                        Details
                                                        <ArrowUpRight className="w-3.5 h-3.5" />
                                                    </Link>
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}
