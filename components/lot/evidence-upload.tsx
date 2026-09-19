'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getLotAssets, uploadLotEvidence, deleteLotAsset } from '@/lib/actions'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
} from '@/components/ui/dialog'
import { Loader2, Upload, Maximize2, Trash2, ExternalLink } from 'lucide-react'
import Image from 'next/image'

interface EvidenceUploadProps {
    lotId: string
    stage: string
    isFinalized: boolean
    isAdmin?: boolean
}

export function EvidenceUpload({ lotId, stage, isFinalized, isAdmin = false }: EvidenceUploadProps) {
    const [uploading, setUploading] = useState(false)
    const [assets, setAssets] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedAsset, setSelectedAsset] = useState<any | null>(null)
    const [assetToDelete, setAssetToDelete] = useState<any | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)
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
            await loadAssets()

        } catch (error: any) {
            console.error("Upload failed:", error)
            alert(`Upload failed: ${error.message}`)
        } finally {
            setUploading(false)
            // Reset input
            e.target.value = ''
        }
    }

    // 3. Handle Deletion using Server Action
    async function handleDelete(asset: any) {
        if (!asset) return
        setDeletingId(asset.id)

        try {
            const result = await deleteLotAsset(asset.id, lotId)
            if (!result.success) {
                throw new Error(result.error || 'Failed to delete photo')
            }

            // Remove locally
            setAssets(prev => prev.filter(a => a.id !== asset.id))
            if (selectedAsset?.id === asset.id) {
                setSelectedAsset(null)
            }
            setAssetToDelete(null)
        } catch (error: any) {
            console.error("Delete failed:", error)
            alert(`Delete failed: ${error.message}`)
        } finally {
            setDeletingId(null)
        }
    }

    // Helper to get public URL (Storage is public, so client can generate this)
    const getPublicUrl = (path: string) => {
        return supabase.storage.from('lot-evidence').getPublicUrl(path).data.publicUrl
    }

    return (
        <>
            <Card>
                <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-2">
                    <div>
                        <CardTitle className="text-base font-semibold">Stage Evidence ({stage})</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Inspection photos and lab documentation recorded for this stage.
                        </p>
                    </div>
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
                        <div className="flex justify-center p-6"><Loader2 className="animate-spin text-muted-foreground" /></div>
                    ) : assets.length === 0 ? (
                        <div className="text-sm text-muted-foreground text-center p-6 border border-dashed rounded-md">
                            No photos uploaded for this stage yet.
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {assets.map((asset) => {
                                const url = getPublicUrl(asset.file_path)
                                return (
                                    <div
                                        key={asset.id}
                                        onClick={() => setSelectedAsset(asset)}
                                        className="relative group aspect-square rounded-lg overflow-hidden border bg-muted cursor-pointer shadow-sm hover:shadow-md transition-shadow"
                                    >
                                        <Image
                                            src={url}
                                            alt="Stage Evidence"
                                            fill
                                            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
                                            className="object-cover transition-transform duration-200 group-hover:scale-105"
                                        />

                                        {/* Hover Overlay with Quick Actions */}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                                            <div className="flex justify-end">
                                                {isAdmin && !isFinalized && (
                                                    <Button
                                                        type="button"
                                                        size="icon"
                                                        variant="destructive"
                                                        className="h-7 w-7 rounded-full shadow-sm hover:bg-destructive/90"
                                                        title="Delete photo"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setAssetToDelete(asset)
                                                        }}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                )}
                                            </div>
                                            <div className="flex items-center justify-center">
                                                <div className="flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-xs font-medium">
                                                    <Maximize2 className="h-3 w-3" />
                                                    <span>View</span>
                                                </div>
                                            </div>
                                            <div className="h-5" />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Lightbox / High-Resolution Zoom Modal */}
            <Dialog open={!!selectedAsset} onOpenChange={(open) => !open && setSelectedAsset(null)}>
                <DialogContent className="max-w-4xl p-4 sm:p-6 bg-background/95 backdrop-blur-md">
                    <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b">
                        <div>
                            <DialogTitle className="text-base font-semibold">
                                Stage Evidence: {stage}
                            </DialogTitle>
                            {selectedAsset?.created_at && (
                                <DialogDescription className="text-xs">
                                    Uploaded on {new Date(selectedAsset.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                                </DialogDescription>
                            )}
                        </div>
                        {selectedAsset && (
                            <div className="flex items-center gap-2 pr-6">
                                <a
                                    href={getPublicUrl(selectedAsset.file_path)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border rounded px-2.5 py-1 transition-colors"
                                >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    <span>Full Size</span>
                                </a>

                                {isAdmin && !isFinalized && (
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="sm"
                                        className="h-7 text-xs px-2.5 gap-1"
                                        onClick={() => setAssetToDelete(selectedAsset)}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        <span>Delete</span>
                                    </Button>
                                )}
                            </div>
                        )}
                    </DialogHeader>

                    {selectedAsset && (
                        <div className="relative mt-3 flex items-center justify-center min-h-[300px] max-h-[75vh] overflow-hidden rounded-lg bg-black/5 dark:bg-black/40 border">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={getPublicUrl(selectedAsset.file_path)}
                                alt="Stage Evidence Zoom"
                                className="max-h-[72vh] w-auto max-w-full object-contain rounded-md"
                            />
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Admin Delete Confirmation Dialog */}
            <Dialog open={!!assetToDelete} onOpenChange={(open) => !open && setAssetToDelete(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Delete Evidence Photo</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to permanently delete this evidence photo? It will be removed from both the database and cloud storage.
                        </DialogDescription>
                    </DialogHeader>

                    {assetToDelete && (
                        <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border my-2">
                            <div className="relative h-12 w-12 rounded bg-black/20 overflow-hidden border shrink-0">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={getPublicUrl(assetToDelete.file_path)}
                                    alt="Thumbnail"
                                    className="h-full w-full object-cover"
                                />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-mono text-muted-foreground truncate">
                                    {assetToDelete.file_path}
                                </p>
                                <span className="text-[11px] text-destructive font-medium">
                                    Cannot be undone
                                </span>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setAssetToDelete(null)}
                            disabled={!!deletingId}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={() => handleDelete(assetToDelete)}
                            disabled={!!deletingId}
                        >
                            {deletingId ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                'Delete Photo'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}

