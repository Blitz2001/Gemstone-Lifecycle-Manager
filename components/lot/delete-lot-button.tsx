'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { deleteLot } from '@/lib/actions'
import { Trash2 } from 'lucide-react'

interface DeleteLotButtonProps {
    lotId: string
    lotCode: string
    isAdmin: boolean
}

export function DeleteLotButton({ lotId, lotCode, isAdmin }: DeleteLotButtonProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()

    if (!isAdmin) return null

    const handleDelete = async () => {
        setLoading(true)
        setError(null)

        try {
            const res = await deleteLot(lotId)
            if (!res.success) {
                setError(res.error || 'Failed to delete lot')
            } else {
                setIsOpen(false)
                router.push('/')
                router.refresh()
            }
        } catch (e: any) {
            setError(e.message || 'An error occurred during deletion')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="destructive" size="sm" className="gap-1.5">
                    <Trash2 className="w-4 h-4" />
                    Delete Lot
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="text-red-600">Delete Lot {lotCode}?</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to permanently delete lot <strong>{lotCode}</strong>?
                        This will delete all stage history, logs, valuation records, and uploaded assets.
                        <br />
                        <span className="font-semibold text-red-500">This action cannot be undone.</span>
                    </DialogDescription>
                </DialogHeader>

                {error && <div className="text-sm text-red-500 bg-red-50 p-2 rounded">{error}</div>}

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => setIsOpen(false)} disabled={loading}>
                        Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleDelete} disabled={loading}>
                        {loading ? 'Deleting...' : 'Confirm Delete'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
