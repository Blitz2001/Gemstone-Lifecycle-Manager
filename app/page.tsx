import { PipelineView } from '@/components/dashboard/pipeline-view'
import { DashboardMetrics } from '@/components/dashboard/dashboard-metrics'
import { getDashboardMetrics, getDashboardLots } from '@/lib/actions'
import { VaultShell } from '@/components/layout/vault-shell'
import { Gem } from 'lucide-react'

export default async function DashboardPage() {
  // Fetch High-Level Metrics & Lots Count from database
  const metrics = await getDashboardMetrics()
  const lots = await getDashboardLots()

  return (
    <VaultShell activeLotsCount={lots?.length || 0}>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto w-full flex-1 flex flex-col">
        {/* Executive Title & Subtitle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Gem className="w-4 h-4" />
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold font-serif text-white tracking-tight">
                Production Floor
              </h1>
            </div>
            <p className="text-xs text-slate-400 font-sans">
              Manage gemstone lot lifecycle, processing stages, and financial valuation.
            </p>
          </div>
        </div>

        {/* Real 4-Card Bento KPI Grid */}
        <section aria-label="Portfolio Metrics">
          <DashboardMetrics metrics={metrics} />
        </section>

        {/* Real Active Lots Pipeline Ledger */}
        <section id="active-lots" aria-label="Gemstone Lots Ledger" className="flex-1 flex flex-col min-h-0">
          <PipelineView />
        </section>
      </div>
    </VaultShell>
  )
}
