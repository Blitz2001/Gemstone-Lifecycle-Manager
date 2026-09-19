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

export type AuthCheck =
    | { success: true; userId: string }
    | { success: false; error: string }

/**
 * Server-side helper to require an authenticated session.
 * Must guard every server action, including ones that use the service-role
 * client: middleware is not a sufficient authorization boundary for actions.
 */
export async function requireUser(): Promise<AuthCheck> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { success: false, error: 'Not authenticated' }
    }

    return { success: true, userId: user.id }
}

/**
 * Server-side helper to require admin access.
 * Returns a failure result (does not throw) if the user is not an admin.
 */
export async function requireAdmin(): Promise<AuthCheck> {
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

    return { success: true, userId: user.id }
}
