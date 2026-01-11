import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { logout } from '@/lib/actions'
import Link from 'next/link'
import { KanbanBoard } from '@/components/dashboard/kanban-board'
import { DashboardMetrics } from '@/components/dashboard/dashboard-metrics'
import { getDashboardMetrics } from '@/lib/actions'
import { Plus } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Fetch High-Level Metrics
  const metrics = await getDashboardMetrics()

  return (
    <div className="container mx-auto py-6 space-y-6 h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex justify-between items-center flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Production Floor</h1>
          <p className="text-muted-foreground">Manage lot lifecycle and stage transitions</p>
        </div>
        <div className="flex gap-2 items-center">
          <form action={logout}>
            <Button variant="ghost" size="sm">Sign Out</Button>
          </form>
          <Link href="/lots/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Lot
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex-shrink-0">
        <DashboardMetrics metrics={metrics} />
      </div>

      <div className="flex-1 overflow-hidden min-h-0 bg-background/50 border rounded-xl p-4 shadow-inner">
        <KanbanBoard />
      </div>
    </div>
  )
}
