'use client'

import { Button } from '@/components/ui/button'
import { Printer, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface ReportControlsProps {
    lotId: string
}

export function ReportControls({ lotId }: ReportControlsProps) {
    return (
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden bg-[#0a0e1a] border border-white/10 p-4 rounded-2xl">
            {/* Return to Lot */}
            <Link href={`/lots/${lotId}`}>
                <Button 
                    variant="outline" 
                    size="sm"
                    className="bg-white/[0.03] border-white/10 hover:bg-white/10 text-slate-200 text-xs rounded-xl"
                >
                    <ArrowLeft className="mr-1.5 h-3.5 w-3.5 text-amber-400" />
                    <span>Return to Lot</span>
                </Button>
            </Link>

            {/* Print Dossier Button */}
            <button 
                type="button"
                onClick={() => typeof window !== 'undefined' && window.print()}
                className="gold-btn h-9 px-4 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-[0_0_20px_rgba(212,161,55,0.25)] cursor-pointer"
            >
                <Printer className="w-3.5 h-3.5 text-black" />
                <span className="text-black font-bold">Print Dossier (PDF)</span>
            </button>
        </div>
    )
}
