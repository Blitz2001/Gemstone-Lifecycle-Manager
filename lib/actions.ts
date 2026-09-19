'use server'

import { createClient } from '@/lib/supabase/server'
import {
    LotStage,
    validateTransition,
    validateStageData,
    getStageSequence,
    ALLOWED_TRANSITIONS,
    normalizeStage
} from '@/lib/state-machine'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAdmin, requireUser } from '@/lib/auth-utils'
import { buildTransitionTimestamp } from '@/lib/transition-date'

const EVIDENCE_MAX_BYTES = 10 * 1024 * 1024
const EVIDENCE_MIME_EXTENSIONS: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp'
}
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
// Stage is embedded in storage paths, so only allow plain enum-like tokens (no "/" or "..").
const STORAGE_STAGE_PATTERN = /^[A-Za-z0-9_ ]{1,40}$/

// AUTH ACTIONS

export async function login(formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) {
        return { error: 'Email and password are required' }
    }

    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword({
        email,
        password
    })

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/', 'layout')
    return { success: true }
}

export async function signup(formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) {
        return { error: 'Email and password are required' }
    }

    const supabase = await createClient()
    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`
        }
    })

    if (error) {
        return { error: error.message }
    }

    return { success: true, message: 'Check your email to confirm your account.' }
}

export async function logout() {
    const supabase = await createClient()
    await supabase.auth.signOut()

    revalidatePath('/', 'layout')
    redirect('/login')
}

export type TransitionResult = {
    success: boolean
    message?: string
    error?: string
}

/**
 * Transitions a Lot to the next stage strictly following business rules.
 * 
 * @param lotId - The ID of the lot to transition
 * @param nextStage - The target stage (must be valid next step)
 * @param data - Stage specific data (JSONB)
 * @param cost - Operational cost for this stage (must be >= 0)
 */
export async function transitionLotStage(
    lotId: string,
    nextStage: LotStage,
    data: any = {},
    cost: number = 0,
    transitionDate?: string
): Promise<TransitionResult> {
    // 0. CHECK: Admin Access
    const adminCheck = await requireAdmin()
    if (!adminCheck.success) {
        return adminCheck
    }

    const supabase = await createClient()

    // 1. Get Current Lot State
    const { data: lot, error: lotError } = await supabase
        .from('lots')
        .select('id, current_stage, is_finalized, purchase_price')
        .eq('id', lotId)
        .single()

    if (lotError || !lot) {
        return { success: false, error: 'Lot not found' }
    }

    // 2. CHECK: Finalization Lock
    if (lot.is_finalized) {
        return { success: false, error: 'Lot is FINALIZED. No further changes allowed.' }
    }

    // 3. CHECK: Strict State Machine Transition
    const currentStage = normalizeStage(lot.current_stage) || (lot.current_stage as LotStage)
    const transitionCheck = validateTransition(currentStage, nextStage)

    if (!transitionCheck.valid) {
        return { success: false, error: transitionCheck.error }
    }

    // 4. CHECK: Data Validation (Schema Check)
    const dataCheck = validateStageData(nextStage, data)
    if (!dataCheck.valid) {
        return { success: false, error: `Data Validation Failed: ${dataCheck.error}` }
    }

    // 5. CHECK: Cost Validation
    if (cost < 0) {
        return { success: false, error: 'Cost cannot be negative' }
    }

    // 5.b Timestamp Generation
    // Manual date (if provided) + current time of day, so entries on one day keep their order.
    const timestamp = buildTransitionTimestamp(transitionDate)
    if (!timestamp) {
        return { success: false, error: 'Invalid transition date' }
    }

    // 6. PERFORM MUTATION (Pseudo-Transaction via Sequential Writes)
    // Note: Supabase doesn't support true transactions via Client unless using RPC.
    // We will sequence writes carefully. If one fails, we risk inconsistency, 
    // but RLS and Constraints help. For production, ideally use a Postgres Function (RPC).
    // However, for this implementation, we will use chained operations which is standard for Supabase JS.

    try {
        // The acting admin is always the authenticated caller (verified by requireAdmin above)
        const userId = adminCheck.userId

        // SPECIAL CASE: Selling (Finalizing)
        // The DB does not have a 'SOLD' stage enum. Sale data is stored in the SELL_READY log.
        if (nextStage === LotStage.SOLD) {
            // 1. Fetch the latest log for the current stage (ignoring exited_at, in case it was closed in a failed retry)
            const { data: existingLogs, error: fetchError } = await supabase
                .from('stage_logs')
                .select('*')
                .eq('lot_id', lotId)
                .eq('stage', currentStage) // SELL_READY
                .order('entered_at', { ascending: false })
                .limit(1)

            if (fetchError || !existingLogs || existingLogs.length === 0) {
                return { success: false, error: 'Could not find stage log to record sale.' }
            }
            const targetLog = existingLogs[0]

            // 2. Merge Data (Preserve Valuations, Add Sale Info)
            const mergedData = {
                ...targetLog.data,
                ...data
            }

            // 3. Update the log
            const { error: updateLogError } = await supabase
                .from('stage_logs')
                .update({
                    data: mergedData,
                    exited_at: targetLog.exited_at || timestamp // Keep existing exit time if set, else close it
                })
                .eq('id', targetLog.id)

            if (updateLogError) {
                return { success: false, error: `Failed to record sale: ${updateLogError.message}` }
            }

            // 4. Finalize Lot
            const { error: finalizeError } = await supabase
                .from('lots')
                .update({
                    is_finalized: true,
                    updated_at: timestamp
                })
                .eq('id', lotId)

            if (finalizeError) {
                return { success: false, error: `Failed to finalize lot: ${finalizeError.message}` }
            }

            revalidatePath(`/lots/${lotId}`)
            revalidatePath('/')
            return { success: true }
        }

        // STANDARD TRANSITION (Move to next physical stage)

        // A. Close Previous Stage (Update Exited At)
        // We update ANY stage_log for this lot where exited_at is NULL.
        // This is safer than matching 'stage' string which might have casing mismatches.
        const { error: closeError } = await supabase
            .from('stage_logs')
            .update({ exited_at: timestamp })
            .eq('lot_id', lotId)
            .is('exited_at', null)

        if (closeError) {
            console.error("Failed to close previous stage:", closeError)
            return { success: false, error: 'Failed to close previous stage' }
        }

        // B. Insert New Stage Log
        const { error: logError } = await supabase
            .from('stage_logs')
            .insert({
                lot_id: lotId,
                stage: nextStage,
                sequence_number: getStageSequence(nextStage),
                entered_at: timestamp,
                data: data,
                metrics: data.metrics || {},
                cost: cost,
                created_by: userId
            })

        if (logError) {
            // Critical: If this fails, we effectively closed the previous stage but didn't open new one.
            // This leaves the lot in limbo (detached state).
            // In a real RPC, this rolls back. Here, we return error.
            // The "Unique Active Stage" constraint might also trigger if we didn't close properly.
            return { success: false, error: `Failed to create log: ${logError.message}` }
        }

        // C. Update Lot Identity
        const updatePayload: any = {
            current_stage: nextStage,
            updated_at: timestamp
        }

        // If transforming, update current weight if provided in data
        if (data.new_weight) {
            updatePayload.current_weight = data.new_weight
        }

        // (No logic needed for is_finalized here since SOLD is handled above)

        const { error: updateError } = await supabase
            .from('lots')
            .update(updatePayload)
            .eq('id', lotId)

        if (updateError) {
            return { success: false, error: `Failed to update lot status: ${updateError.message}` }
        }

        revalidatePath(`/lots/${lotId}`)
        revalidatePath('/')

        return { success: true }

    } catch (error: any) {
        return { success: false, error: `System Error: ${error.message}` }
    }
}

/**
 * Emergency Action: Reopen a finalized lot.
 * Use with caution.
 */
export async function reopenLot(lotId: string) {
    // 0. CHECK: Admin Access
    const adminCheck = await requireAdmin()
    if (!adminCheck.success) {
        return adminCheck
    }

    const supabase = await createClient()

    // 1. Check if lot exists
    const { data: lot } = await supabase.from('lots').select('is_finalized').eq('id', lotId).single()
    if (!lot) return { success: false, error: 'Lot not found' }

    if (!lot.is_finalized) return { success: false, error: 'Lot is not finalized.' }

    // 2. Un-finalize
    const { error } = await supabase
        .from('lots')
        .update({ is_finalized: false })
        .eq('id', lotId)

    if (error) return { success: false, error: error.message }

    revalidatePath(`/lots/${lotId}`)
    revalidatePath('/')
    return { success: true }
}

/**
 * Record a partial sale (sell specific item/qty) without finalizing the lot.
 */
export async function recordPartialSale(
    lotId: string,
    itemType: string,
    soldCarats: number,
    soldPieces: number,
    price: number,
    buyer: string,
    notes: string,
    date: string
) {
    // 0. CHECK: Admin Access
    const adminCheck = await requireAdmin()
    if (!adminCheck.success) {
        return adminCheck
    }

    // Input validation: quantities must be real, positive numbers
    const inputsValid =
        Number.isFinite(soldCarats) && soldCarats > 0 &&
        Number.isInteger(soldPieces) && soldPieces > 0 &&
        Number.isFinite(price) && price >= 0 &&
        !Number.isNaN(new Date(date).getTime())
    if (!inputsValid) {
        return { success: false, error: 'Sale requires positive carats, a whole number of pieces, a non-negative price and a valid date.' }
    }

    const supabase = await createClient()

    // 1. Fetch current SELL_READY log
    const { data: logs, error: fetchError } = await supabase
        .from('stage_logs')
        .select('*')
        .eq('lot_id', lotId)
        .eq('stage', 'SELL_READY')
        .order('entered_at', { ascending: false })
        .limit(1)

    if (fetchError || !logs || logs.length === 0) {
        return { success: false, error: 'Active Sell Reference not found.' }
    }
    const targetLog = logs[0]
    const currentData = targetLog.data || {}
    const valuations = currentData.valuations || []
    const salesHistory = currentData.sales_history || []

    // 2. Find and deduct inventory
    const itemIndex = valuations.findIndex((v: any) => v.type === itemType)
    if (itemIndex === -1) {
        return { success: false, error: 'Item not found in inventory.' }
    }

    const item = valuations[itemIndex]

    // Validation
    if (soldPieces > item.pieces || soldCarats > item.carats) {
        return { success: false, error: 'Cannot sell more than available inventory stock.' }
    }

    // Deduct pieces and carats with precision rounding
    const remainingPieces = Math.max(0, item.pieces - soldPieces)
    const remainingCarats = Math.max(0, Math.round((item.carats - soldCarats) * 1000) / 1000)

    item.pieces = remainingPieces
    item.carats = remainingCarats

    // Pieces and carats must be exhausted together; otherwise the leftover stock
    // (and its value) would be silently deleted with the line item.
    if ((remainingPieces === 0) !== (remainingCarats === 0)) {
        return {
            success: false,
            error: 'Selling all pieces requires selling all carats of this item (and vice versa). Adjust the quantities.'
        }
    }

    // Recalculate remaining total_val for this line item or remove if exhausted
    if (item.pieces <= 0 || item.carats <= 0) {
        valuations.splice(itemIndex, 1)
    } else {
        const unitPrice = Number(item.price_per_carat) || 0
        item.total_val = Math.round(item.carats * unitPrice * 100) / 100
    }

    // 3. Record Sale
    const saleRecord = {
        id: crypto.randomUUID(),
        date,
        buyer,
        item_type: itemType,
        sold_carats: soldCarats,
        sold_pieces: soldPieces,
        price,
        notes
    }
    salesHistory.push(saleRecord)

    // 4. Update Log
    const newData = {
        ...currentData,
        valuations,
        sales_history: salesHistory
    }

    const { error: updateError } = await supabase
        .from('stage_logs')
        .update({ data: newData })
        .eq('id', targetLog.id)

    if (updateError) {
        return { success: false, error: updateError.message }
    }

    // Recalculate remaining active weight for the lot
    const remainingTotalCarats = valuations.reduce((sum: number, v: any) => sum + (Number(v.carats) || 0), 0)

    // 5. Check for Auto-Finalization (If inventory empty)
    if (valuations.length === 0) {
        // Calculate Total Revenue from Sales History
        const totalRevenue = salesHistory.reduce((sum: number, sale: any) => sum + (Number(sale.price) || 0), 0)

        // Update the log with the aggregated total revenue as 'sold_price'
        const finalizedData = {
            ...newData,
            sold_price: totalRevenue,
            buyer: 'Multiple (Partial Sales)' // Indicate origin
        }

        const { error: logUpdateError } = await supabase
            .from('stage_logs')
            .update({ data: finalizedData })
            .eq('id', targetLog.id)

        if (logUpdateError) {
            console.error("Failed to update final sale price:", logUpdateError)
        }

        const { error: finalizeError } = await supabase
            .from('lots')
            .update({
                current_weight: 0,
                is_finalized: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', lotId)

        if (finalizeError) {
            console.error("Auto-finalization failed:", finalizeError)
        }
    } else {
        // Lot still has remaining inventory: update current_weight to reflect remaining carats
        await supabase
            .from('lots')
            .update({
                current_weight: Math.round(remainingTotalCarats * 1000) / 1000,
                updated_at: new Date().toISOString()
            })
            .eq('id', lotId)
    }

    revalidatePath(`/lots/${lotId}`)
    revalidatePath('/')
    return { success: true }
}

/**
 * Fetches assets for a lot. Requires a signed-in user; runs under RLS.
 */
export async function getLotAssets(lotId: string, stage?: string) {
    try {
        const userCheck = await requireUser()
        if (!userCheck.success) return []

        if (!UUID_PATTERN.test(lotId)) return []
        if (stage && !STORAGE_STAGE_PATTERN.test(stage)) return []

        const supabase = await createClient()

        let query = supabase
            .from('lot_assets')
            .select('*')
            .eq('lot_id', lotId)

        if (stage) {
            // startsWith-style match; escape LIKE wildcards so "_" in stage names is literal
            const escapedStage = stage.replace(/[\\%_]/g, (c) => `\\${c}`)
            query = query.like('file_path', `${lotId}/${escapedStage}/%`)
        }

        const { data, error } = await query

        if (error) {
            console.error('Asset Fetch Error:', error)
            return []
        }

        return data || []
    } catch (error) {
        console.error('Asset Fetch System Error:', error)
        return []
    }
}

/**
 * Uploads evidence to Storage AND registers in DB.
 * Admin only. Uses the service-role client for the write, so every input is validated here.
 */
export async function uploadLotEvidence(formData: FormData) {
    // 0. CHECK: Admin Access
    const adminCheck = await requireAdmin()
    if (!adminCheck.success) {
        return adminCheck
    }

    try {
        const file = formData.get('file')
        const lotId = formData.get('lotId')
        const stage = formData.get('stage')

        if (!(file instanceof File) || typeof lotId !== 'string' || typeof stage !== 'string' || !lotId || !stage) {
            return { success: false, error: 'Missing required fields' }
        }

        if (!UUID_PATTERN.test(lotId) || !STORAGE_STAGE_PATTERN.test(stage)) {
            return { success: false, error: 'Invalid lot or stage' }
        }

        const fileExt = EVIDENCE_MIME_EXTENSIONS[file.type]
        if (!fileExt) {
            return { success: false, error: 'Only PNG, JPEG or WebP images are allowed' }
        }
        if (file.size === 0 || file.size > EVIDENCE_MAX_BYTES) {
            return { success: false, error: 'Image must be between 1 byte and 10MB' }
        }

        const { createAdminClient } = await import('@/lib/supabase/admin')
        const supabase = createAdminClient()

        // The lot must exist; never write into a folder for an arbitrary ID
        const { data: lot } = await supabase.from('lots').select('id').eq('id', lotId).maybeSingle()
        if (!lot) {
            return { success: false, error: 'Lot not found' }
        }

        const fileName = `${crypto.randomUUID()}.${fileExt}`
        const filePath = `${lotId}/${stage}/${fileName}`

        // 1. Upload to Storage (Admin)
        const { error: uploadError } = await supabase.storage
            .from('lot-evidence')
            .upload(filePath, file, { contentType: file.type, upsert: false })

        if (uploadError) {
            return { success: false, error: `Storage Error: ${uploadError.message}` }
        }

        // 2. Register in DB (Admin)
        const { error: dbError } = await supabase
            .from('lot_assets')
            .insert({
                lot_id: lotId,
                file_path: filePath,
                file_type: file.type
            })

        if (dbError) {
            // Don't leave an untracked file behind in storage
            await supabase.storage.from('lot-evidence').remove([filePath])
            return { success: false, error: `DB Error: ${dbError.message}` }
        }

        revalidatePath(`/lots/${lotId}`)
        return { success: true }
    } catch (error: any) {
        return { success: false, error: `System Error: ${error.message}` }
    }
}

/**
 * Fetches all lots for the Kanban Dashboard. Requires a signed-in user; runs under RLS.
 */
export async function getDashboardLots() {
    try {
        const userCheck = await requireUser()
        if (!userCheck.success) return []

        const supabase = await createClient()

        // 1. Fetch Lots
        const { data: lots, error } = await supabase
            .from('lots')
            .select('*')
            .order('created_at', { ascending: false })

        if (error || !lots) {
            console.error('Dashboard Fetch Error:', error)
            return []
        }

        // 2. Fetch Logs for Costs
        const lotIds = lots.map(l => l.id)
        const { data: logs } = await supabase
            .from('stage_logs')
            .select('lot_id, cost')
            .in('lot_id', lotIds)

        // 3. Map Costs
        const lotCosts: Record<string, number> = {}
        if (logs) {
            logs.forEach(l => {
                lotCosts[l.lot_id] = (lotCosts[l.lot_id] || 0) + (Number(l.cost) || 0)
            })
        }

        // 4. Fetch Primary Asset Images
        const { data: assets } = await supabase
            .from('lot_assets')
            .select('lot_id, file_path')
            .in('lot_id', lotIds)

        const lotImages: Record<string, string> = {}
        if (assets) {
            assets.forEach(a => {
                if (!lotImages[a.lot_id]) {
                    lotImages[a.lot_id] = a.file_path
                }
            })
        }

        // 5. Enrich Lots
        const enrichedLots = lots.map(lot => {
            const purchaseCost = Number(lot.purchase_price) || 0
            const processingCost = lotCosts[lot.id] || 0
            return {
                ...lot,
                total_cost: purchaseCost + processingCost,
                primary_image: lotImages[lot.id] || null
            }
        })

        return enrichedLots
    } catch (error) {
        console.error('Dashboard System Error:', error)
        return []
    }
}

/**
 * Fetches higher-level financial metrics for the Dashboard
 */
export async function getDashboardMetrics() {
    const supabase = await createClient()

    // 1. Fetch all lots to check status
    const { data: lots } = await supabase.from('lots').select('id, current_stage, is_finalized, purchase_price')

    // 2. Fetch all logs with meaningful data (Costs, Valuations, Sales)
    // optimizing by selecting only necessary fields
    const { data: logs } = await supabase
        .from('stage_logs')
        .select('lot_id, stage, cost, data')

    if (!lots || !logs) return {
        total_investment: 0,
        projected_revenue: 0,
        realized_revenue: 0,
        realized_profit: 0,
        pending_sales: 0
    }

    // Process Metrics
    let total_investment = 0
    let projected_revenue = 0
    let realized_revenue = 0
    let realized_profit = 0
    let pending_sales = 0

    // Map costs by Lot ID
    const lotCosts: Record<string, number> = {}
    logs.forEach(l => {
        const cost = Number(l.cost) || 0
        lotCosts[l.lot_id] = (lotCosts[l.lot_id] || 0) + cost
    })

    // Calculate Metrics Loop
    lots.forEach(lot => {
        const stage = normalizeStage(lot.current_stage)
        const purchaseCost = Number(lot.purchase_price) || 0
        const processingCost = lotCosts[lot.id] || 0
        const totalLotCost = purchaseCost + processingCost

        if (lot.is_finalized || stage === LotStage.SOLD) {
            // Closed / Finalized Lot:
            // Look for sale info in SELL_READY log or legacy SOLD stage log
            const finalLog = logs.find(l => l.lot_id === lot.id && (normalizeStage(l.stage) === LotStage.SELL_READY || normalizeStage(l.stage) === LotStage.SOLD))
            if (finalLog?.data?.sold_price) {
                const price = Number(finalLog.data.sold_price) || 0
                realized_revenue += price
                realized_profit += (price - totalLotCost)
            }
        } else {
            // Active Lot (Not Finalized)
            if (stage === LotStage.SELL_READY) {
                pending_sales++

                const sellLog = logs.find(l => l.lot_id === lot.id && normalizeStage(l.stage) === LotStage.SELL_READY)
                const valuations: any[] = sellLog?.data?.valuations || []
                const salesHistory: any[] = sellLog?.data?.sales_history || []

                // Active projected revenue from remaining valuations
                if (valuations.length > 0) {
                    const val = valuations.reduce((sum: number, v: any) => sum + (Number(v.total_val) || 0), 0)
                    projected_revenue += val
                }

                if (salesHistory.length > 0) {
                    // Proportional Cost Allocation (COGS)
                    const remainingCarats = valuations.reduce((sum: number, v: any) => sum + (Number(v.carats) || 0), 0)
                    const soldCaratsTotal = salesHistory.reduce((sum: number, s: any) => sum + (Number(s.sold_carats) || 0), 0)
                    const totalSellReadyCarats = remainingCarats + soldCaratsTotal

                    const soldPortionRatio = totalSellReadyCarats > 0 ? (soldCaratsTotal / totalSellReadyCarats) : 0
                    const soldPortionCost = totalLotCost * soldPortionRatio
                    const remainingActiveCost = totalLotCost - soldPortionCost

                    // Active investment accounts for the unsold inventory only
                    total_investment += remainingActiveCost

                    // Sales revenue and net realized profit on the sold portion
                    const lotPartialRevenue = salesHistory.reduce((sum: number, s: any) => sum + (Number(s.price) || 0), 0)
                    realized_revenue += lotPartialRevenue
                    realized_profit += (lotPartialRevenue - soldPortionCost)
                } else {
                    // No sales yet: full lot cost is in active investment
                    total_investment += totalLotCost
                }
            } else {
                // Active pre-sale stages (Procurement, Gas Burn, Cut/Polish, Electric Burn, Certification)
                total_investment += totalLotCost
            }
        }
    })

    return {
        total_investment,
        projected_revenue,
        realized_revenue,
        realized_profit,
        pending_sales
    }
}

/**
 * Permanently deletes a lot and all associated logs, costs, and assets.
 * Requires Admin privileges.
 */
export async function deleteLot(lotId: string) {
    // 0. CHECK: Admin Access
    const adminCheck = await requireAdmin()
    if (!adminCheck.success) {
        return adminCheck
    }

    try {
        const { createAdminClient } = await import('@/lib/supabase/admin')
        const supabase = createAdminClient()

        // 1. Fetch and purge associated files from Supabase Storage
        const { data: assets } = await supabase
            .from('lot_assets')
            .select('file_path')
            .eq('lot_id', lotId)

        if (assets && assets.length > 0) {
            const filePaths = assets.map(a => a.file_path).filter(Boolean)
            if (filePaths.length > 0) {
                const { error: storageError } = await supabase.storage
                    .from('lot-evidence')
                    .remove(filePaths)

                if (storageError) {
                    console.error('Storage Removal Warning on Lot Deletion:', storageError)
                }
            }
        }

        // 2. Delete associated lot assets
        await supabase.from('lot_assets').delete().eq('lot_id', lotId)

        // 3. Delete associated processing costs
        await supabase.from('processing_costs').delete().eq('lot_id', lotId)

        // 4. Delete associated stage logs
        await supabase.from('stage_logs').delete().eq('lot_id', lotId)

        // 5. Delete the lot record itself
        const { error } = await supabase.from('lots').delete().eq('id', lotId)

        if (error) {
            console.error('Delete Lot Error:', error)
            return { success: false, error: `Failed to delete lot: ${error.message}` }
        }

        revalidatePath('/')
        return { success: true }
    } catch (error: any) {
        console.error('Delete Lot System Error:', error)
        return { success: false, error: `System Error: ${error.message}` }
    }
}

/**
 * Deletes a single lot evidence asset from both Storage and Database.
 * Requires Admin privileges.
 */
export async function deleteLotAsset(assetId: string, lotId: string) {
    const adminCheck = await requireAdmin()
    if (!adminCheck.success) {
        return adminCheck
    }

    try {
        const { createAdminClient } = await import('@/lib/supabase/admin')
        const supabase = createAdminClient()

        // Look up the asset server-side: never trust a client-supplied storage path
        const { data: asset } = await supabase
            .from('lot_assets')
            .select('id, file_path')
            .eq('id', assetId)
            .eq('lot_id', lotId)
            .maybeSingle()

        if (!asset) {
            return { success: false, error: 'Asset not found' }
        }

        // 1. Remove file from Supabase Storage
        if (asset.file_path) {
            const { error: storageError } = await supabase.storage
                .from('lot-evidence')
                .remove([asset.file_path])

            if (storageError) {
                console.error('Storage File Delete Warning:', storageError)
            }
        }

        // 2. Remove row from Database
        const { error: dbError } = await supabase
            .from('lot_assets')
            .delete()
            .eq('id', asset.id)

        if (dbError) {
            return { success: false, error: dbError.message }
        }

        revalidatePath(`/lots/${lotId}`)
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

