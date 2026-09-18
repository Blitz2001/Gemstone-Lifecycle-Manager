'use client'

import { useState, useRef } from 'react'
import { Upload, X, Camera } from 'lucide-react'
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
                    <Camera className="w-3.5 h-3.5 text-amber-400" />
                    Rough Parcel Photo (Optional)
                </Label>
                <span className="text-[10px] text-slate-500 font-mono">SUPPORTS RAW / JPEG / PNG</span>
            </div>

            {!previewUrl ? (
                <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border border-dashed border-white/10 hover:border-amber-500/40 active:border-amber-500 transition-all rounded-xl p-5 sm:p-6 flex flex-col items-center justify-center gap-2 cursor-pointer bg-white/[0.02] hover:bg-amber-500/[0.03] text-center group"
                >
                    <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-105 group-active:scale-95 transition-transform">
                        <Upload className="h-5 w-5" />
                    </div>
                    <div>
                        <span className="text-xs font-medium text-slate-200 group-hover:text-amber-300 transition-colors block">
                            Tap to take photo or choose from library
                        </span>
                        <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 font-mono">
                            High-resolution stone intake photo (Max 10MB)
                        </p>
                    </div>
                </div>
            ) : (
                <div className="relative border border-white/10 rounded-xl p-3 bg-white/[0.03] flex items-center gap-3.5">
                    {/* Thumbnail Preview */}
                    <div className="w-14 h-14 rounded-lg overflow-hidden border border-white/10 shrink-0 bg-slate-900 relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={previewUrl}
                            alt="Rough specimen preview"
                            className="w-full h-full object-cover"
                        />
                    </div>

                    <div className="flex-1 min-w-0">
                        <span className="text-xs font-semibold text-white block truncate">
                            {fileName}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                            {fileSize} • Ready to upload on submit
                        </span>
                    </div>

                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={handleClear}
                        className="h-9 w-9 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg shrink-0"
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
