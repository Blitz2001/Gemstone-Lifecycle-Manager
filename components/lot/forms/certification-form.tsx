'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Award, ExternalLink } from 'lucide-react'

interface CertificationFormProps {
    onChange: (data: any) => void
}

const LAB_OPTIONS = [
    "GIA (Gemological Institute of America)",
    "GRS (GemResearch Swisslab)",
    "IGI (International Gemological Institute)",
    "Lotus Gemology (Bangkok)",
    "SSEF (Swiss Gemmological Institute)",
    "CGL (Ceylon Gem Laboratory)",
    "AIGS (Asian Institute of Gemological Sciences)",
    "EGL (European Gemological Laboratory)",
    "GIC (Gemmological Institute of Colombo)",
    "Other / Custom Lab"
]

const CLARITY_GRADES = ["FL", "IF", "VVS1", "VVS2", "VS1", "VS2", "SI1", "SI2", "I1"]
const CUT_SHAPES = ["Cushion", "Oval", "Round Brilliant", "Emerald Cut", "Pear", "Heart", "Marquise", "Princess", "Radiant", "Cabochon"]
const TREATMENT_OPTIONS = [
    "Unheated / Natural (No Indications of Heating)",
    "Heated / Thermal Treatment",
    "Beryllium Diffusion",
    "Minor Clarity Enhanced (Oil)",
    "Irradiated"
]

export function CertificationForm({ onChange }: CertificationFormProps) {
    const [labName, setLabName] = useState<string>(LAB_OPTIONS[0])
    const [customLab, setCustomLab] = useState<string>('')
    const [reportNumber, setReportNumber] = useState<string>('')
    const [certificateDate, setCertificateDate] = useState<string>(new Date().toISOString().split('T')[0])
    const [verifiedCarat, setVerifiedCarat] = useState<string>('')
    const [colorGrade, setColorGrade] = useState<string>('Royal Blue')
    const [clarityGrade, setClarityGrade] = useState<string>('VVS1')
    const [cutShape, setCutShape] = useState<string>('Cushion')
    const [treatmentStatus, setTreatmentStatus] = useState<string>(TREATMENT_OPTIONS[0])
    const [reportUrl, setReportUrl] = useState<string>('')
    const [notes, setNotes] = useState<string>('')

    useEffect(() => {
        const finalLabName = labName === "Other / Custom Lab" ? (customLab || "Custom Lab") : labName
        onChange({
            lab_name: finalLabName,
            report_number: reportNumber,
            certificate_date: certificateDate,
            verified_carat: verifiedCarat ? Number(verifiedCarat) : undefined,
            color_grade: colorGrade,
            clarity_grade: clarityGrade,
            cut_shape: cutShape,
            treatment_status: treatmentStatus,
            report_url: reportUrl,
            notes: notes
        })
    }, [labName, customLab, reportNumber, certificateDate, verifiedCarat, colorGrade, clarityGrade, cutShape, treatmentStatus, reportUrl, notes, onChange])

    return (
        <div className="space-y-4 border rounded-xl p-4 bg-muted/30">
            <div className="flex items-center gap-2 border-b pb-3">
                <Award className="w-5 h-5 text-amber-500" />
                <h4 className="font-semibold text-sm">Laboratory Certification Report</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Lab Name */}
                <div className="space-y-2">
                    <Label htmlFor="lab-select" className="text-xs font-medium">Gemological Laboratory *</Label>
                    <Select value={labName} onValueChange={setLabName}>
                        <SelectTrigger id="lab-select">
                            <SelectValue placeholder="Select Laboratory" />
                        </SelectTrigger>
                        <SelectContent>
                            {LAB_OPTIONS.map((lab) => (
                                <SelectItem key={lab} value={lab}>{lab}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {labName === "Other / Custom Lab" && (
                        <Input
                            placeholder="Enter Custom Laboratory Name"
                            value={customLab}
                            onChange={(e) => setCustomLab(e.target.value)}
                            className="mt-2 text-xs"
                        />
                    )}
                </div>

                {/* Report Number */}
                <div className="space-y-2">
                    <Label htmlFor="report-num" className="text-xs font-medium">Certificate / Report # *</Label>
                    <Input
                        id="report-num"
                        placeholder="e.g. GIA 24891230"
                        value={reportNumber}
                        onChange={(e) => setReportNumber(e.target.value)}
                        className="font-mono text-sm"
                    />
                </div>

                {/* Verified Carat Weight */}
                <div className="space-y-2">
                    <Label htmlFor="verified-carat" className="text-xs font-medium">Lab Verified Carat Weight (ct)</Label>
                    <Input
                        id="verified-carat"
                        type="number"
                        step="0.01"
                        placeholder="e.g. 4.25"
                        value={verifiedCarat}
                        onChange={(e) => setVerifiedCarat(e.target.value)}
                    />
                </div>

                {/* Certificate Date */}
                <div className="space-y-2">
                    <Label htmlFor="cert-date" className="text-xs font-medium">Certificate Issue Date</Label>
                    <Input
                        id="cert-date"
                        type="date"
                        value={certificateDate}
                        onChange={(e) => setCertificateDate(e.target.value)}
                    />
                </div>

                {/* Color Grade */}
                <div className="space-y-2">
                    <Label htmlFor="color-grade" className="text-xs font-medium">Color Grade / Designation</Label>
                    <Input
                        id="color-grade"
                        placeholder="e.g. Royal Blue, Cornflower, Pigeon Blood"
                        value={colorGrade}
                        onChange={(e) => setColorGrade(e.target.value)}
                    />
                </div>

                {/* Clarity Grade */}
                <div className="space-y-2">
                    <Label htmlFor="clarity-grade" className="text-xs font-medium">Clarity Grade</Label>
                    <Select value={clarityGrade} onValueChange={setClarityGrade}>
                        <SelectTrigger id="clarity-grade">
                            <SelectValue placeholder="Select Clarity" />
                        </SelectTrigger>
                        <SelectContent>
                            {CLARITY_GRADES.map((grade) => (
                                <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Cut & Shape */}
                <div className="space-y-2">
                    <Label htmlFor="cut-shape" className="text-xs font-medium">Cut & Shape</Label>
                    <Select value={cutShape} onValueChange={setCutShape}>
                        <SelectTrigger id="cut-shape">
                            <SelectValue placeholder="Select Shape" />
                        </SelectTrigger>
                        <SelectContent>
                            {CUT_SHAPES.map((shape) => (
                                <SelectItem key={shape} value={shape}>{shape}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Treatment Status */}
                <div className="space-y-2">
                    <Label htmlFor="treatment-status" className="text-xs font-medium">Thermal / Treatment Status</Label>
                    <Select value={treatmentStatus} onValueChange={setTreatmentStatus}>
                        <SelectTrigger id="treatment-status">
                            <SelectValue placeholder="Select Treatment Status" />
                        </SelectTrigger>
                        <SelectContent>
                            {TREATMENT_OPTIONS.map((t) => (
                                <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Online Report Verification URL */}
            <div className="space-y-2 pt-2">
                <Label htmlFor="report-url" className="text-xs font-medium flex items-center gap-1">
                    <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
                    Online Verification URL (Optional)
                </Label>
                <Input
                    id="report-url"
                    type="url"
                    placeholder="https://www.gia.edu/report-check?reportno=..."
                    value={reportUrl}
                    onChange={(e) => setReportUrl(e.target.value)}
                    className="text-xs"
                />
            </div>

            {/* Gemologist Comments / Notes */}
            <div className="space-y-2">
                <Label htmlFor="cert-notes" className="text-xs font-medium">Lab Comments & Special Notes</Label>
                <Textarea
                    id="cert-notes"
                    placeholder="e.g. Origin opinion: Sri Lanka (Ceylon). No indication of thermal treatment."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="text-xs"
                />
            </div>
        </div>
    )
}
