'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LotStage } from '@/lib/state-machine'
// import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts' // Commented out until install verified

interface ElectricBurnReportProps {
    lotId: string
    stageData: any // JSONB
}

export function ElectricBurnReport({ lotId, stageData }: ElectricBurnReportProps) {

    if (!stageData || !stageData.color_distribution) {
        return (
            <Card>
                <CardHeader><CardTitle>Electric Burn Analytics</CardTitle></CardHeader>
                <CardContent>No data available for report.</CardContent>
            </Card>
        )
    }

    const colors = stageData.color_distribution
    const clarity = stageData.clarity_distribution

    return (
        <Card className="col-span-2">
            <CardHeader>
                <CardTitle>Electric Burn Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
                {/* 1. Detailed Results Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b">
                                <th className="text-left font-medium py-2">Source</th>
                                <th className="text-left font-medium py-2">Color</th>
                                <th className="text-left font-medium py-2">Clarity</th>
                                <th className="text-right font-medium py-2">Weight (ct)</th>
                                <th className="text-right font-medium py-2">Pieces</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(stageData.breakdown || [])
                                .filter((item: any) => (item.carats || 0) > 0)
                                .map((item: any, idx: number) => (
                                    <tr key={idx} className="border-b last:border-0 hover:bg-muted/50">
                                        <td className="py-2 text-muted-foreground">{item.source_type || '-'}</td>
                                        <td className="py-2 font-medium">{item.color}</td>
                                        <td className="py-2">{item.clarity}</td>
                                        <td className="py-2 text-right font-mono">{item.carats}</td>
                                        <td className="py-2 text-right font-mono">{item.pieces || '-'}</td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>

                {/* 2. Distributions & Notes (Grid Layout) */}
                <div className="grid md:grid-cols-2 gap-8 pt-4 border-t">
                    <div>
                        <h4 className="font-semibold mb-4">Color Distribution</h4>
                        <div className="space-y-2">
                            {Object.entries(colors).map(([key, val]) => (
                                <div key={key} className="flex justify-between text-sm">
                                    <span className="capitalize">{key}</span>
                                    <span className="font-mono">{Number(val).toFixed(1)}%</span>
                                </div>
                            ))}
                        </div>
                        {/* <div className="h-[200px] mt-4 bg-muted/20 flex items-center justify-center text-xs text-muted-foreground">
                Chart Visualization (Requires Recharts)
            </div> */}
                    </div>

                    <div>
                        <h4 className="font-semibold mb-4">Clarity Distribution</h4>
                        <div className="space-y-2">
                            {Object.entries(clarity).map(([key, val]) => (
                                <div key={key} className="flex justify-between text-sm">
                                    <span className="capitalize">{key}</span>
                                    <span className="font-mono">{Number(val).toFixed(1)}%</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="col-span-2 border-t pt-4">
                        <h4 className="font-semibold mb-2">Notes</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-muted-foreground block">Pre-Burn</span>
                                <p>{stageData.pre_burn_notes || 'N/A'}</p>
                            </div>
                            <div>
                                <span className="text-muted-foreground block">Post-Burn</span>
                                <p>{stageData.post_burn_notes || 'N/A'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
