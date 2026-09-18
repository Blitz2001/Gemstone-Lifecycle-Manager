'use client'

import { useState, useRef } from 'react'
import { Upload, X, Image as ImageIcon } from 'lucide-react'
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
            <Label htmlFor={name}>Rough Stone Evidence Image (Optional)</Label>

            {!previewUrl ? (
                <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors rounded-lg p-5 flex flex-col items-center justify-center gap-2 cursor-pointer bg-muted/10 hover:bg-muted/20 text-center"
                >
                    <div className="p-2.5 rounded-full bg-primary/10 text-primary">
                        <Upload className="h-5 w-5" />
                    </div>
                    <div>
                        <span className="text-sm font-medium text-foreground">Click to upload rough stone photo</span>
                        <p className="text-xs text-muted-foreground mt-0.5">JPEG, PNG, WEBP (up to 10MB)</p>
                    </div>
                </div>
            ) : (
                <div className="relative border rounded-lg p-3 bg-muted/20 flex items-center gap-3">
                    <div className="relative h-16 w-16 rounded-md overflow-hidden bg-black/40 border shrink-0 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={previewUrl}
                            alt="Rough stones preview"
                            className="h-full w-full object-cover"
                        />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate text-foreground">{fileName}</p>
                        <p className="text-xs text-muted-foreground">{fileSize} &bull; Attached for upload</p>
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={handleClear}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
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
