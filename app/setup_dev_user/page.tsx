'use client'

import { useState } from 'react'
import { createDevUserForce } from '@/lib/setup-actions'

export default function SetupDevUserPage() {
    const [status, setStatus] = useState<string>('Idle')

    const createDevUser = async () => {
        setStatus('Creating user (Admin Mode)...')

        try {
            const result = await createDevUserForce()

            if (result.success) {
                setStatus('Success! User Created via Admin API (No Email Needed). You can now use the app.')
            } else {
                setStatus(`Error: ${result.error}`)
            }
        } catch (e: any) {
            setStatus(`Unexpected Error: ${e.message}`)
        }
    }

    return (
        <div className="p-10">
            <h1 className="text-2xl font-bold mb-4">Setup Dev User</h1>
            <p className="mb-4">Create a default user (dev@gemstone.com) to enable database constraints.</p>
            <button
                onClick={createDevUser}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
                Create Dev User (Force)
            </button>

            <button
                onClick={async () => {
                    setStatus('Initializing Storage...')
                    const result = await import('@/lib/setup-actions').then(m => m.createStorageBucket())
                    if (result.success) setStatus(`Storage: ${result.message}`)
                    else setStatus(`Storage Error: ${result.error}`)
                }}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 ml-4"
            >
                Initialize Storage
            </button>

            <div className="mt-4 p-4 border rounded bg-gray-100">
                Status: <span className="font-mono">{status}</span>
            </div>
        </div>
    )
}
