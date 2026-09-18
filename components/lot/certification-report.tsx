'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Award, ExternalLink, FileCheck, ShieldCheck } from 'lucide-react'

interface CertificationReportProps {
    data: {
        lab_name?: string
        report_number?: string
        certificate_date?: string
        verified_carat?: number
        color_grade?: string
        clarity_grade?: string
        cut_shape?: string
        treatment_status?: string
        report_url?: string
        notes?: string
    }
}

export function CertificationReport({ data }: CertificationReportProps) {
    if (!data || (!data.lab_name && !data.report_number)) return null

    return (
        <Card className="p-5 border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-background to-background shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 mb-4">
                <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-amber-500/10 rounded-lg text-amber-600">
                        <Award className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-lg">{data.lab_name || 'Lab Certificate'}</h3>
                            <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 bg-emerald-500/10 text-xs font-semibold gap-1">
                                <ShieldCheck className="w-3 h-3" />
                                Verified Report
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono">
                            Report #{data.report_number || 'N/A'} {data.certificate_date && `• Dated ${data.certificate_date}`}
                        </p>
                    </div>
                </div>

                {data.report_url && (
                    <a
                        href={data.report_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-md border border-blue-200 transition-colors"
                    >
                        <FileCheck className="w-3.5 h-3.5" />
                        Verify Online
                        <ExternalLink className="w-3 h-3" />
                    </a>
                )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {data.verified_carat !== undefined && (
                    <div className="p-2.5 bg-muted/40 rounded-lg">
                        <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Lab Weight</span>
                        <span className="font-bold text-sm text-foreground">{data.verified_carat.toFixed(2)} ct</span>
                    </div>
                )}
                {data.color_grade && (
                    <div className="p-2.5 bg-muted/40 rounded-lg">
                        <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Color Grade</span>
                        <span className="font-semibold text-foreground">{data.color_grade}</span>
                    </div>
                )}
                {data.clarity_grade && (
                    <div className="p-2.5 bg-muted/40 rounded-lg">
                        <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Clarity</span>
                        <span className="font-semibold text-foreground">{data.clarity_grade}</span>
                    </div>
                )}
                {data.cut_shape && (
                    <div className="p-2.5 bg-muted/40 rounded-lg">
                        <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Shape / Cut</span>
                        <span className="font-semibold text-foreground">{data.cut_shape}</span>
                    </div>
                )}
            </div>

            {data.treatment_status && (
                <div className="mt-3 pt-3 border-t text-xs flex items-center justify-between">
                    <span className="text-muted-foreground font-medium">Treatment Comment:</span>
                    <span className="font-semibold text-foreground">{data.treatment_status}</span>
                </div>
            )}

            {data.notes && (
                <div className="mt-2 text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-md italic">
                    "{data.notes}"
                </div>
            )}
        </Card>
    )
}
