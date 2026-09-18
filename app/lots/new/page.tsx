import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { LotStage } from '@/lib/state-machine'
import { requireAdmin } from '@/lib/auth-utils'
import { LotCompositionForm } from '@/components/lot/lot-composition-form'
import { ProcurementImagePicker } from '@/components/lot/procurement-image-picker'
import { CreateLotSubmitButton } from '@/components/lot/create-lot-submit-button'

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

        // 1. Create Lot
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
        <div className="container mx-auto py-8 max-w-2xl">
            <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
            </Link>

            <Card>
                <CardHeader>
                    <CardTitle>Register New Lot (Procurement)</CardTitle>
                    <CardDescription>
                        Create an official gemstone lot record, rough composition breakdown, and initial photographic evidence.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={createLot} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="lot_code">Lot Code</Label>
                                <Input id="lot_code" name="lot_code" placeholder="LT-2026-XXX" required />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="supplier">Supplier</Label>
                                <Input id="supplier" name="supplier" placeholder="Supplier Name" required />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="purchase_price">Purchase Price (LKR)</Label>
                                <Input id="purchase_price" name="purchase_price" type="number" min="0" step="0.01" placeholder="0.00" required />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="purchase_date">Buying Date</Label>
                                <Input id="purchase_date" name="purchase_date" type="date" required />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="initial_weight">Initial Weight (Carats)</Label>
                                <Input id="initial_weight" name="initial_weight" type="number" min="0" step="0.01" placeholder="0.00" required />
                            </div>
                        </div>

                        {/* Optional Rough Evidence Photo Upload */}
                        <ProcurementImagePicker name="rough_image" />

                        {/* Rough Composition */}
                        <LotCompositionForm name="rough_composition" />

                        <div className="pt-2">
                            <CreateLotSubmitButton />
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
