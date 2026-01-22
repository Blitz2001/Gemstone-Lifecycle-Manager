import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LotStage } from '@/lib/state-machine'
import { LotCompositionForm } from '@/components/lot/lot-composition-form'

export default async function NewLotPage() {

    async function createLot(formData: FormData) {
        'use server'
        const supabase = await createClient()

        const lot_code = formData.get('lot_code') as string
        const supplier = formData.get('supplier') as string
        const purchase_price = Number(formData.get('purchase_price'))
        const purchase_date = formData.get('purchase_date') as string || null
        const initial_weight = Number(formData.get('initial_weight'))

        // Parse Composition JSON
        const rough_composition_json = formData.get('rough_composition') as string
        const rough_composition = rough_composition_json ? JSON.parse(rough_composition_json) : {}

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

        if (lotError) {
            console.error(lotError)
            return
        }

        // 2. Create Initial Log with Composition Data
        const { error: logError } = await supabase
            .from('stage_logs')
            .insert({
                lot_id: lot.id,
                stage: LotStage.PROCUREMENT,
                sequence_number: 1,
                entered_at: new Date().toISOString(),
                cost: 0,
                data: {
                    rough_composition
                } // storing the breakdown in the JSONB column
            })

        if (logError) {
            console.error(logError)
        }

        redirect(`/lots/${lot.id}`)
    }

    return (
        <div className="container mx-auto py-8 max-w-2xl">
            <Card>
                <CardHeader>
                    <CardTitle>Register New Lot (Procurement)</CardTitle>
                </CardHeader>
                <CardContent>
                    <form action={createLot} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="lot_code">Lot Code</Label>
                                <Input id="lot_code" name="lot_code" placeholder="LT-2024-XXX" required />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="supplier">Supplier</Label>
                                <Input id="supplier" name="supplier" placeholder="Supplier Name" required />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="purchase_price">Purchase Price (LKR)</Label>
                                <Input id="purchase_price" name="purchase_price" type="number" min="0" step="0.01" required />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="purchase_date">Buying Date</Label>
                                <Input id="purchase_date" name="purchase_date" type="date" required />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="initial_weight">Initial Weight (Carats)</Label>
                                <Input id="initial_weight" name="initial_weight" type="number" min="0" step="0.01" required />
                            </div>
                        </div>

                        <LotCompositionForm name="rough_composition" />

                        <div className="pt-4">
                            <Button type="submit" className="w-full">Create Lot</Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
