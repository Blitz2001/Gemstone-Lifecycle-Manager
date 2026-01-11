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
import { requireAdmin } from '@/lib/auth-utils'

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
    redirect('/')
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
    cost: number = 0
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

    // 6. PERFORM MUTATION (Pseudo-Transaction via Sequential Writes)
    // Note: Supabase doesn't support true transactions via Client unless using RPC.
    // We will sequence writes carefully. If one fails, we risk inconsistency, 
    // but RLS and Constraints help. For production, ideally use a Postgres Function (RPC).
    // However, for this implementation, we will use chained operations which is standard for Supabase JS.

    try {
        const user = (await supabase.auth.getUser()).data.user

        let userId = user?.id

        // DEVELOPMENT FALLBACK: If no active session, find ANY valid user.
        if (!userId) {
            // Priority 1: Check Profiles (Public)
            const { data: profiles } = await supabase.from('profiles').select('id').limit(1)

            if (profiles && profiles.length > 0) {
                userId = profiles[0].id
            } else {
                // Priority 2: Check Auth Users (Admin) - Requires Service Key
                // This covers cases where User exists but Profile is missing
                try {
                    // Dynamic import to avoid circular dep issues or basic context issues
                    const { createAdminClient } = await import('@/lib/supabase/admin')
                    const adminClient = createAdminClient()
                    const { data: { users } } = await adminClient.auth.admin.listUsers({ perPage: 1 })

                    if (users && users.length > 0) {
                        userId = users[0].id
                    }
                } catch (e) {
                    console.warn("Could not use Admin Client for fallback:", e)
                }
            }

            if (!userId) {
                return { success: false, error: 'DEV ERROR: No users exist in DB. Please Sign Up once to create a valid User ID.' }
            }
        }

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
                    exited_at: targetLog.exited_at || new Date().toISOString() // Keep existing exit time if set, else close it
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
                    updated_at: new Date().toISOString()
                })
                .eq('id', lotId)

            if (finalizeError) {
                return { success: false, error: `Failed to finalize lot: ${finalizeError.message}` }
            }

            revalidatePath(`/lots/${lotId}`)
            revalidatePath('/dashboard')
            return { success: true }
        }

        // STANDARD TRANSITION (Move to next physical stage)

        // A. Close Previous Stage (Update Exited At)
        // We update the stage_log for the current stage where exited_at is NULL
        const { error: closeError } = await supabase
            .from('stage_logs')
            .update({ exited_at: new Date().toISOString() })
            .eq('lot_id', lotId)
            .eq('stage', currentStage)
            .is('exited_at', null)

        if (closeError) {
            // If we fail here, it might be due to mismatched Enum values still?
            // But we are using normalized 'currentStage'.
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
                entered_at: new Date().toISOString(),
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
            updated_at: new Date().toISOString()
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
        revalidatePath('/dashboard')

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
        return { success: false, error: 'Insufficient stock.' }
    }

    // Deduct
    item.pieces -= soldPieces
    item.carats -= soldCarats

    // Remove if empty or keep? (Lets remove if pieces 0)
    if (item.pieces <= 0) {
        valuations.splice(itemIndex, 1)
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
                is_finalized: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', lotId)

        if (finalizeError) {
            console.error("Auto-finalization failed:", finalizeError)
        }
    }

    revalidatePath(`/lots/${lotId}`)
    revalidatePath('/dashboard')
    return { success: true }
}

/**
 * Fetches assets for a lot from DB using Admin Client (Bypass RLS)
 */
export async function getLotAssets(lotId: string, stage?: string) {
    try {
        const { createAdminClient } = await import('@/lib/supabase/admin')
        const supabase = createAdminClient()

        let query = supabase
            .from('lot_assets')
            .select('*')
            .eq('lot_id', lotId)

        if (stage) {
            query = query.ilike('file_path', `${lotId}/${stage}/%`)
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
 * Registers an asset in the DB using Admin Client (Bypass RLS)
 */
export async function registerLotAsset(lotId: string, filePath: string, fileType: string) {
    try {
        const { createAdminClient } = await import('@/lib/supabase/admin')
        const supabase = createAdminClient()

        const { error } = await supabase
            .from('lot_assets')
            .insert({
                lot_id: lotId,
                file_path: filePath,
                file_type: fileType
            })

        if (error) {
            console.error('Asset Registration Error:', error)
            return { success: false, error: error.message }
        }

        revalidatePath(`/lots/${lotId}`)
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

/**
 * Uploads evidence to Storage AND registers in DB (Bypass RLS)
 */
export async function uploadLotEvidence(formData: FormData) {
    try {
        const { createAdminClient } = await import('@/lib/supabase/admin')
        const supabase = createAdminClient()

        const file = formData.get('file') as File
        const lotId = formData.get('lotId') as string
        const stage = formData.get('stage') as string

        if (!file || !lotId || !stage) {
            return { success: false, error: 'Missing required fields' }
        }

        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
        const filePath = `${lotId}/${stage}/${fileName}`

        // 1. Upload to Storage (Admin)
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('lot-evidence')
            .upload(filePath, file)

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
            return { success: false, error: `DB Error: ${dbError.message}` }
        }

        revalidatePath(`/lots/${lotId}`)
        return { success: true }
    } catch (error: any) {
        return { success: false, error: `System Error: ${error.message}` }
    }
}

/**
 * Fetches all lots for the Kanban Dashboard
 */
export async function getDashboardLots() {
    try {
        const { createAdminClient } = await import('@/lib/supabase/admin')
        const supabase = createAdminClient()

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

        // 4. Enrich Lots
        const enrichedLots = lots.map(lot => {
            const purchaseCost = Number(lot.purchase_price) || 0
            const processingCost = lotCosts[lot.id] || 0
            return {
                ...lot,
                total_cost: purchaseCost + processingCost
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

        // 1. Active Investment (Not Finalized)
        if (!lot.is_finalized) {
            total_investment += totalLotCost
        }
        if (stage === LotStage.SELL_READY) {
            // Check if finalized (Sold)
            if (lot.is_finalized) {
                // Treat as SOLD
                // Find sale log (stored in SELL_READY log)
                const soldLog = logs.find(l => l.lot_id === lot.id && normalizeStage(l.stage) === LotStage.SELL_READY)
                if (soldLog?.data?.sold_price) {
                    const price = Number(soldLog.data.sold_price) || 0
                    realized_revenue += price

                    // Profit = Price - Total Cost (Logs + Purchase Price)
                    const logCost = lotCosts[lot.id] || 0
                    const purchaseCost = Number(lot.purchase_price) || 0
                    const totalLotCost = logCost + purchaseCost

                    realized_profit += (price - totalLotCost)
                }
            } else {
                // Treat as Pending Sale (Projected)
                pending_sales++

                // Find SELL_READY log
                const sellLog = logs.find(l => l.lot_id === lot.id && normalizeStage(l.stage) === LotStage.SELL_READY)

                // Add Partial Sales Revenue & Profit (if any)
                if (sellLog?.data?.sales_history && Array.isArray(sellLog.data.sales_history)) {
                    sellLog.data.sales_history.forEach((sale: any) => {
                        const salePrice = Number(sale.price) || 0
                        realized_revenue += salePrice
                        // Partial profit = sale price (no cost deduction since lot is still active)
                        // We'll calculate final profit when lot is finalized
                        // For now, just track revenue
                    })
                }

                // Find valuation in logs for projected revenue
                if (sellLog?.data?.valuations) {
                    const val = sellLog.data.valuations.reduce((sum: number, v: any) => sum + (Number(v.total_val) || 0), 0)
                    projected_revenue += val
                }
            }
        } else if (stage === LotStage.SOLD) {
            // (Strict 'Sold' stage if any exists in legacy data)
            const soldLog = logs.find(l => l.lot_id === lot.id && normalizeStage(l.stage) === LotStage.SOLD)
            if (soldLog?.data?.sold_price) {
                const price = Number(soldLog.data.sold_price) || 0

                // Profit = Price - Total Cost (Logs + Purchase Price)
                const logCost = lotCosts[lot.id] || 0
                const purchaseCost = Number(lot.purchase_price) || 0
                const totalLotCost = logCost + purchaseCost

                realized_revenue += price
                realized_profit += (price - totalLotCost)
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
