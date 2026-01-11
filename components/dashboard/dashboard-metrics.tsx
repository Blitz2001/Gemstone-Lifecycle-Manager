import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, Wallet, TrendingUp, ShoppingCart } from "lucide-react"

interface DashboardMetricsProps {
    metrics: {
        total_investment: number
        projected_revenue: number
        realized_revenue: number
        realized_profit: number
        pending_sales: number
    }
}

export function DashboardMetrics({ metrics }: DashboardMetricsProps) {
    // Determine overall profitability color
    const profitColor = metrics.realized_profit >= 0 ? "text-green-600" : "text-red-600"

    const formatCurrency = (val: number) => {
        return val.toLocaleString('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 0, maximumFractionDigits: 0 })
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Total Investment
                    </CardTitle>
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(metrics.total_investment)}</div>
                    <p className="text-xs text-muted-foreground">
                        Cumulative Cost (Active Lots)
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Active Valuation
                    </CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(metrics.projected_revenue)}</div>
                    <p className="text-xs text-muted-foreground">
                        {metrics.pending_sales} lots Pending Sale
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Realized Revenue
                    </CardTitle>
                    <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(metrics.realized_revenue)}</div>
                    <p className="text-xs text-muted-foreground">
                        Total Sales to date
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Realized Profit
                    </CardTitle>
                    <TrendingUp className={`h-4 w-4 ${metrics.realized_profit >= 0 ? "text-green-500" : "text-red-500"}`} />
                </CardHeader>
                <CardContent>
                    <div className={`text-2xl font-bold ${profitColor}`}>
                        {metrics.realized_profit >= 0 ? '+' : ''}{formatCurrency(metrics.realized_profit)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Net Profit on Closed Lots
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
