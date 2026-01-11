import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface TransformationItem {
    color: string
    clarity: string
    source_type?: string
    pieces: number
    carats: number
}

interface TransformationLineageProps {
    breakdown: TransformationItem[]
}

export function TransformationLineage({ breakdown }: TransformationLineageProps) {
    if (!breakdown || breakdown.length === 0) return null

    // Group items by Source Type
    const grouped = breakdown.reduce((acc, item) => {
        const source = item.source_type || 'Unknown Source'
        if (!acc[source]) {
            acc[source] = []
        }
        acc[source].push(item)
        return acc
    }, {} as Record<string, TransformationItem[]>)

    return (
        <Card className="col-span-full border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-blue-700">
                    Transformation Lineage (Input → Output)
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {Object.entries(grouped).map(([source, items]) => {
                        const totalSourceWeight = items.reduce((sum, i) => sum + i.carats, 0)

                        return (
                            <div key={source} className="border rounded-md bg-muted/10 overflow-hidden">
                                {/* Source Header */}
                                <div className="bg-muted/50 px-3 py-2 border-b flex justify-between items-center">
                                    <div className="font-semibold text-sm flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-slate-400"></div>
                                        {source}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        Total Output: <span className="font-medium text-foreground">{totalSourceWeight.toFixed(2)} cts</span>
                                    </div>
                                </div>

                                {/* Result Rows */}
                                <div className="divide-y">
                                    {items.map((item, idx) => (
                                        <div key={idx} className="grid grid-cols-12 gap-2 px-3 py-2 text-sm hover:bg-muted/10 items-center">
                                            <div className="col-span-1 text-center text-muted-foreground">↳</div>
                                            <div className="col-span-5 font-medium text-blue-600">
                                                {item.color} <span className="text-muted-foreground font-normal text-xs ml-1">({item.clarity})</span>
                                            </div>
                                            <div className="col-span-3 text-right text-muted-foreground text-xs">
                                                {item.pieces} pcs
                                            </div>
                                            <div className="col-span-3 text-right font-semibold">
                                                {item.carats.toFixed(2)} cts
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    )
}
