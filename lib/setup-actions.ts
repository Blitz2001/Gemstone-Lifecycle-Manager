'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export async function createProfileForce(userId: string, email: string) {
    try {
        const supabase = createAdminClient()

        // Upsert profile to ensure it exists
        const { error } = await supabase.from('profiles').upsert({
            id: userId,
            full_name: 'Dev Admin',
            role: 'admin'
        })

        if (error) {
            console.error('Admin Profile Create Error:', error)
            return { success: false, error: error.message }
        }

        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function createDevUserForce() {
    try {
        const supabase = createAdminClient()
        const email = 'dev@gemstone.com'
        const password = 'devpassword123'

        // Check if user exists first to avoid error
        const { data: listData } = await supabase.auth.admin.listUsers()
        const existingUser = listData.users.find(u => u.email === email)

        let userId = existingUser?.id

        if (!userId) {
            const { data, error } = await supabase.auth.admin.createUser({
                email,
                password,
                email_confirm: true // Auto-confirm, no email sent
            })

            if (error) throw error
            userId = data.user.id
        }

        // Now ensure profile exists
        await createProfileForce(userId, email)

        return { success: true, userId }
    } catch (error: any) {
        console.error('Force Create Error:', error)
        return { success: false, error: error.message }
    }
}

export async function createStorageBucket() {
    try {
        const supabase = createAdminClient()

        // Create bucket
        const { data, error } = await supabase.storage.createBucket('lot-evidence', {
            public: true,
            fileSizeLimit: 10485760, // 10MB
            allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp']
        })

        if (error) {
            // Check if error is just "already exists"
            if (error.message.includes('already exists')) {
                return { success: true, message: 'Bucket already exists.' }
            }
            console.error('Storage Create Error:', error)
            return { success: false, error: error.message }
        }

        return { success: true, message: 'Bucket created successfully.' }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}
