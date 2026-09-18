import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { ArrowLeft, Gem } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LotStage } from '@/lib/state-machine'
import { requireAdmin } from '@/lib/auth-utils'
import { LotCompositionForm } from '@/components/lot/lot-composition-form'
import { ProcurementImagePicker } from '@/components/lot/procurement-image-picker'
import { CreateLotSubmitButton } from '@/components/lot/create-lot-submit-button'
import { VaultShell } from '@/components/layout/vault-shell'

export default async function NewLotPage() {
    // 0. Page-level Admin Guard
    const adminCheck = await requireAdmin()
    if (!adminCheck.success) {
        redirect('/')
    }

    async function createLot(formData: FormData) {
        'use server'

        // Action-level Admin Guard
        const check = await requireAdmin()
        if (!check.success) {
            throw new Error(check.error || 'Unauthorized: Admin privileges required')
        }

        const supabase = await createClient()

        const lot_code = formData.get('lot_code') as string
        const supplier = formData.get('supplier') as string
        const purchase_price = Number(formData.get('purchase_price'))
        const purchase_date = formData.get('purchase_date') as string || null
        const initial_weight = Number(formData.get('initial_weight'))

        // Parse Composition JSON safely
        let rough_composition = {}
        try {
            const rough_composition_json = formData.get('rough_composition') as string
            if (rough_composition_json) {
                rough_composition = JSON.parse(rough_composition_json)
            }
        } catch {
            rough_composition = {}
        }

        // 1. Create Lot in database
        const { data: lot, error: lotError } = await supabase
            .from('lots')
            .insert({
                lot_code,
                supplier,
                purchase_price,
                purchase_date,
                initial_weight,
                current_weight: initial_weight,
                current_stage: LotStage.PROCUREMENT,
            })
            .select()
            .single()

        if (lotError || !lot) {
            console.error('Failed to create lot:', lotError)
            throw new Error(`Failed to create lot: ${lotError?.message || 'Database error'}`)
        }

        // 2. Handle Optional Rough Stone Image Upload
        const roughImage = formData.get('rough_image') as File | null
        let evidenceFilePath: string | null = null

        if (roughImage && roughImage.size > 0 && roughImage.name) {
            try {
                const { createAdminClient } = await import('@/lib/supabase/admin')
                const adminSupabase = createAdminClient()

                const fileExt = roughImage.name.split('.').pop() || 'jpg'
                const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
                const filePath = `${lot.id}/${LotStage.PROCUREMENT}/${fileName}`

                const { error: uploadError } = await adminSupabase.storage
                    .from('lot-evidence')
                    .upload(filePath, roughImage, {
                        contentType: roughImage.type || 'image/jpeg',
                        upsert: false
                    })

                if (!uploadError) {
                    evidenceFilePath = filePath
                    await adminSupabase
                        .from('lot_assets')
                        .insert({
                            lot_id: lot.id,
                            file_path: filePath,
                            file_type: roughImage.type || 'image/jpeg'
                        })
                } else {
                    console.error('Storage upload error for procurement image:', uploadError)
                }
            } catch (uploadErr) {
                console.error('Failed to process procurement image upload:', uploadErr)
            }
        }

        // 3. Create Initial Log with Composition Data and optional evidence photo
        const { error: logError } = await supabase
            .from('stage_logs')
            .insert({
                lot_id: lot.id,
                stage: LotStage.PROCUREMENT,
                sequence_number: 1,
                entered_at: purchase_date ? new Date(purchase_date).toISOString() : new Date().toISOString(),
                cost: 0,
                data: {
                    rough_composition,
                    ...(evidenceFilePath ? { evidence_photo: evidenceFilePath } : {})
                }
            })

        if (logError) {
            console.error('Failed to create procurement stage log:', logError)
        }

        revalidatePath('/')
        redirect(`/lots/${lot.id}`)
    }

    return (
        <VaultShell>
            <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto w-full space-y-5">
                {/* Back to Dashboard link */}
                <div>
                    <Link 
                        href="/" 
                        className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-amber-300 transition-colors"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Back to Dashboard
                    </Link>
                </div>

                {/* Main Luxury Intake Card */}
                <div className="obsidian-card rounded-2xl p-6 sm:p-8 border border-white/5 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

                    {/* Card Header */}
                    <div className="mb-6 pb-4 border-b border-white/5 flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                                    <Gem className="w-3.5 h-3.5" />
                                </div>
                                <h1 className="text-xl sm:text-2xl font-bold font-serif text-white tracking-tight">
                                    Register New Lot
                                </h1>
                            </div>
                            <p className="text-xs text-slate-400 font-sans">
                                Intake procurement record, rough composition breakdown, and photographic evidence.
                            </p>
                        </div>
                        <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 uppercase">
                            Stage: Procurement
                        </span>
                    </div>

                    <form action={createLot} className="space-y-5">
                        {/* Row 1: Lot Code & Supplier */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="lot_code" className="text-xs font-mono uppercase text-slate-300">
                                    Lot Code
                                </Label>
                                <Input 
                                    id="lot_code" 
                                    name="lot_code" 
                                    placeholder="e.g. LT-2026-001" 
                                    required 
                                    className="bg-slate-900/60 border-white/10 text-sm font-mono text-white focus:border-amber-500/50 rounded-xl h-10"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="supplier" className="text-xs font-mono uppercase text-slate-300">
                                    Supplier / Source
                                </Label>
                                <Input 
                                    id="supplier" 
                                    name="supplier" 
                                    placeholder="Supplier Name or Concession" 
                                    required 
                                    className="bg-slate-900/60 border-white/10 text-sm text-white focus:border-amber-500/50 rounded-xl h-10"
                                />
                            </div>
                        </div>

                        {/* Row 2: Purchase Price & Buying Date */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="purchase_price" className="text-xs font-mono uppercase text-slate-300">
                                    Purchase Price (LKR)
                                </Label>
                                <Input 
                                    id="purchase_price" 
                                    name="purchase_price" 
                                    type="number" 
                                    min="0" 
                                    step="0.01" 
                                    placeholder="0.00" 
                                    required 
                                    className="bg-slate-900/60 border-white/10 text-sm font-mono text-white focus:border-amber-500/50 rounded-xl h-10"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="purchase_date" className="text-xs font-mono uppercase text-slate-300">
                                    Buying Date
                                </Label>
                                <Input 
                                    id="purchase_date" 
                                    name="purchase_date" 
                                    type="date" 
                                    defaultValue={new Date().toISOString().split('T')[0]}
                                    required 
                                    className="bg-slate-900/60 border-white/10 text-sm text-white focus:border-amber-500/50 rounded-xl h-10"
                                />
                            </div>
                        </div>

                        {/* Row 3: Initial Weight */}
                        <div className="space-y-1.5">
                            <Label htmlFor="initial_weight" className="text-xs font-mono uppercase text-slate-300">
                                Initial Weight (Carats)
                            </Label>
                            <Input 
                                id="initial_weight" 
                                name="initial_weight" 
                                type="number" 
                                min="0" 
                                step="0.01" 
                                placeholder="0.00" 
                                required 
                                className="bg-slate-900/60 border-white/10 text-sm font-mono text-white focus:border-amber-500/50 rounded-xl h-10"
                            />
                        </div>

                        {/* Optional Rough Evidence Photo Upload */}
                        <div className="pt-1">
                            <ProcurementImagePicker name="rough_image" />
                        </div>

                        {/* Rough Composition Breakdown */}
                        <div className="pt-1">
                            <LotCompositionForm name="rough_composition" />
                        </div>

                        {/* Submit Button */}
                        <div className="pt-3">
                            <CreateLotSubmitButton />
                        </div>
                    </form>
                </div>
            </div>
        </VaultShell>
    )
}
