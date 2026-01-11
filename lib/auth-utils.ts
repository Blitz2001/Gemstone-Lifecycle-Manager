import { createClient } from '@/lib/supabase/server'

/**
 * Get the current user's role (client-side version)
 * @returns 'admin' | 'user' | null
 */
export async function getCurrentUserRoleClient(): Promise<'admin' | 'user' | null> {
    try {
        const { createClient: createBrowserClient } = await import('@/lib/supabase/client')
        const supabase = createBrowserClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return null

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        return (profile?.role as 'admin' | 'user') || 'user'
    } catch (error) {
        console.error('Error fetching user role:', error)
        return null
    }
}

/**
 * Get the current user's role (server-side version)
 * @returns 'admin' | 'user' | null
 */
export async function getCurrentUserRole(): Promise<'admin' | 'user' | null> {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return null

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        return (profile?.role as 'admin' | 'user') || 'user'
    } catch (error) {
        console.error('Error fetching user role:', error)
        return null
    }
}

/**
 * Check if the current user is an admin
 * @returns boolean
 */
export async function isAdmin(): Promise<boolean> {
    const role = await getCurrentUserRole()
    return role === 'admin'
}

/**
 * Server-side helper to require admin access
 * Throws error if user is not admin
 */
export async function requireAdmin() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { success: false, error: 'Not authenticated' }
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') {
        return { success: false, error: 'Admin access required. Contact your administrator.' }
    }

    return { success: true }
}
