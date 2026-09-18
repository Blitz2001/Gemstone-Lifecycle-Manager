import { notFound } from 'next/navigation'
import SetupDevUserClient from './setup-client'

export const dynamic = 'force-dynamic'

export default function SetupDevUserPage() {
    if (process.env.NODE_ENV === 'production') {
        notFound()
    }

    return <SetupDevUserClient />
}
