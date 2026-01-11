'use client'

import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'

interface ReportControlsProps {
    lotId: string
}

export function ReportControls({ lotId }: ReportControlsProps) {
    return (
        <div className="mb-8 flex justify-between items-center print:hidden">
            <Button variant="outline" onClick={() => window.location.href = `/lots/${lotId}`}>
                &larr; Back to Lot
            </Button>
            <div className="flex gap-2">
                <div className="text-sm text-muted-foreground self-center mr-4">
                    Press Ctrl+P to save as PDF
                </div>
                <Button onClick={() => typeof window !== 'undefined' && window.print()}>
                    <Printer className="mr-2 h-4 w-4" /> Print Report
                </Button>
            </div>
        </div>
    )
}
