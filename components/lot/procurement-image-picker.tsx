'use client'

import { useState, useRef } from 'react'
import { Upload, X, Camera, Image as ImageIcon, Sparkles } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

interface ProcurementImagePickerProps {
    name?: string
}

export function ProcurementImagePicker({ name = 'rough_image' }: ProcurementImagePickerProps) {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [fileName, setFileName] = useState<string | null>(null)
    const [fileSize, setFileSize] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setFileName(file.name)
            setFileSize((file.size / (1024 * 1024)).toFixed(2) + ' MB')
            const url = URL.createObjectURL(file)
            setPreviewUrl(url)
        } else {
            setPreviewUrl(null)
            setFileName(null)
            setFileSize(null)
        }
    }

    const handleClear = () => {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl)
        }
        setPreviewUrl(null)
        setFileName(null)
        setFileSize(null)
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <Label htmlFor={name} className="text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-blue-400" />
                    Rough Parcel Telemetry Photo (Optional)
                </Label>
                <span className="text-[10px] text-slate-500 font-mono">SUPPORTS RAW / JPEG / PNG</span>
            </div>

            {!previewUrl ? (
                <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border border-dashed border-white/10 hover:border-blue-500/40 transition-all rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer bg-white/[0.02] hover:bg-blue-500/[0.03] text-center group"
                >
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Upload className="h-5 w-5" />
                    </div>
                    <div>
                        <span className="text-xs font-medium text-slate-200 group-hover:text-blue-300 transition-colors">
                            Select or drag rough parcel specimen photo
                        </span>
                        <p className="text-[11px] text-slate-500 mt-0.5 font-mono">High-resolution macro intake recommended (Max 10MB)</p>
                    </div>
                </div>
            ) : (
                <div className="relative border border-white/10 rounded-xl p-3 bg-white/[0.03] flex items-center gap-3.5">
                    <div className="relative h-16 w-16 rounded-lg overflow-hidden bg-black/60 border border-white/10 shrink-0 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={previewUrl}
                            alt="Rough parcel preview"
                            className="h-full w-full object-cover"
                        />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate text-white">{fileName}</p>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">{fileSize} • Ready for Vault Storage</p>
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={handleClear}
                        className="h-8 w-8 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg shrink-0"
                        title="Remove image"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            )}

            <input
                ref={fileInputRef}
                id={name}
                name={name}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
            />
        </div>
    )
}
