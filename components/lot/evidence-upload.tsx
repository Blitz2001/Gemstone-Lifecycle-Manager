'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getLotAssets, uploadLotEvidence } from '@/lib/actions'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Loader2, Upload } from 'lucide-react'
import Image from 'next/image'

interface EvidenceUploadProps {
    lotId: string
    stage: string
    isFinalized: boolean
}

export function EvidenceUpload({ lotId, stage, isFinalized }: EvidenceUploadProps) {
    const [uploading, setUploading] = useState(false)
    const [assets, setAssets] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    // 1. Load existing assets using Server Action (Bypasses RLS)
    useEffect(() => {
        loadAssets()
    }, [lotId, stage])

    async function loadAssets() {
        try {
            const data = await getLotAssets(lotId, stage)
            setAssets(data)
        } catch (error) {
            console.error("Error loading assets:", error)
        } finally {
            setLoading(false)
        }
    }

    // 2. Handle Upload using Server Action (Bypasses RLS)
    async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
        if (!e.target.files || e.target.files.length === 0) return

        const file = e.target.files[0]
        setUploading(true)

        try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('lotId', lotId)
            formData.append('stage', stage)

            const result = await uploadLotEvidence(formData)

            if (!result.success) throw new Error(result.error)

            // Refresh assets list
            loadAssets()

        } catch (error: any) {
            console.error("Upload failed:", error)
            alert(`Upload failed: ${error.message}`)
        } finally {
            setUploading(false)
            // Reset input
            e.target.value = ''
        }
    }

    // Helper to get public URL (Storage is public, so client can generate this)
    const getPublicUrl = (path: string) => {
        return supabase.storage.from('lot-evidence').getPublicUrl(path).data.publicUrl
    }

    return (
        <Card>
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-2">
                <CardTitle className="text-base font-semibold">Stage Evidence ({stage})</CardTitle>
                {!isFinalized && (
                    <div className="flex items-center gap-2">
                        <label htmlFor="file-upload" className="cursor-pointer">
                            <div className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 rounded-md text-sm font-medium transition-colors">
                                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                                Upload Photo
                            </div>
                            <input
                                id="file-upload"
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleUpload}
                                disabled={uploading}
                            />
                        </label>
                    </div>
                )}
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center p-4"><Loader2 className="animate-spin text-muted-foreground" /></div>
                ) : assets.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center p-4 border border-dashed rounded-md">
                        No photos uploaded for this stage yet.
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {assets.map((asset) => (
                            <div key={asset.id} className="relative group aspect-square rounded-md overflow-hidden border bg-muted">
                                <Image
                                    src={getPublicUrl(asset.file_path)}
                                    alt="Evidence"
                                    fill
                                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
                                    className="object-cover transition-transform group-hover:scale-105"
                                />
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
