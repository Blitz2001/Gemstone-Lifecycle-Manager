'use client'

import { useFormStatus } from 'react-dom'
import { Loader2, Plus } from 'lucide-react'

export function CreateLotSubmitButton() {
    const { pending } = useFormStatus()

    return (
        <button 
            type="submit" 
            disabled={pending} 
            className="w-full h-11 gold-btn rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(212,161,55,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
            {pending ? (
                <>
                    <Loader2 className="h-4 w-4 animate-spin text-black" />
                    <span className="font-mono text-xs tracking-wider uppercase text-black">Registering Lot...</span>
                </>
            ) : (
                <>
                    <Plus className="h-4 w-4 text-black" />
                    <span className="text-black font-bold">Register Gemstone Lot</span>
                </>
            )}
        </button>
    )
}
