#!/usr/bin/env node
/**
 * Local backup of all business data (Supabase Free has no automatic backups).
 *
 *   npm run backup
 *
 * Writes to ./backups (git-ignored, never commit it - it holds financial data):
 *   backups/<timestamp>/<table>.json   every table, fully paginated and row-count verified
 *   backups/<timestamp>/users.json     auth users (id, email, dates - no passwords)
 *   backups/<timestamp>/manifest.json  row counts and file counts
 *   backups/lot-evidence/...           mirror of the photo bucket (only new files are downloaded)
 *
 * Uses SUPABASE_SERVICE_ROLE_KEY, so run it only on a machine you trust.
 * Env (optional): BACKUP_DIR (default ./backups), BACKUP_KEEP (default 30 data snapshots).
 */
import { createClient } from '@supabase/supabase-js'
import { mkdir, writeFile, readdir, rm, rename, access } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
for (const envFile of ['.env.local', '.env']) {
    try {
        process.loadEnvFile(path.join(ROOT, envFile)) // does not override variables already set
    } catch {
        // file missing - fall back to the real environment
    }
}

const BUCKET = 'lot-evidence'
const TABLES = [
    ['profiles', 'id'],
    ['system_config', 'key'],
    ['lots', 'id'],
    ['stage_logs', 'id'],
    ['processing_costs', 'id'],
    ['lot_assets', 'id'],
]
const PAGE_SIZE = 1000
const KEEP = Number(process.env.BACKUP_KEEP) > 0 ? Number(process.env.BACKUP_KEEP) : 30
const BACKUP_DIR = path.resolve(process.env.BACKUP_DIR || path.join(ROOT, 'backups'))
const SNAPSHOT_PATTERN = /^\d{4}-\d{2}-\d{2}T[\d-]+Z$/

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (expected in .env.local).')
    process.exit(1)
}

const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
})

async function exists(p) {
    try {
        await access(p)
        return true
    } catch {
        return false
    }
}

async function exportTable(table, orderKey) {
    const { count, error: countError } = await supabase.from(table).select('*', { count: 'exact', head: true })
    if (countError) throw new Error(`${table}: count failed - ${countError.message}`)

    const rows = []
    for (let from = 0; ; from += PAGE_SIZE) {
        const { data, error } = await supabase
            .from(table)
            .select('*')
            .order(orderKey, { ascending: true })
            .range(from, from + PAGE_SIZE - 1)
        if (error) throw new Error(`${table}: fetch failed - ${error.message}`)
        rows.push(...data)
        if (data.length < PAGE_SIZE) break
    }

    if (rows.length !== count) {
        throw new Error(`${table}: expected ${count} rows but fetched ${rows.length} (data changed mid-backup? re-run)`)
    }
    return rows
}

async function exportUsers() {
    const users = []
    for (let page = 1; ; page++) {
        const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
        if (error) throw new Error(`auth users: ${error.message}`)
        users.push(...data.users.map((u) => ({
            id: u.id,
            email: u.email,
            created_at: u.created_at,
            last_sign_in_at: u.last_sign_in_at,
        })))
        if (data.users.length < 1000) break
    }
    return users
}

async function listBucketFiles(prefix = '') {
    const files = []
    const limit = 100
    for (let offset = 0; ; offset += limit) {
        const { data, error } = await supabase.storage.from(BUCKET).list(prefix, {
            limit,
            offset,
            sortBy: { column: 'name', order: 'asc' },
        })
        if (error) throw new Error(`storage list "${prefix}": ${error.message}`)
        for (const item of data) {
            const itemPath = prefix ? `${prefix}/${item.name}` : item.name
            if (item.id === null) files.push(...(await listBucketFiles(itemPath))) // folder
            else files.push(itemPath)
        }
        if (data.length < limit) break
    }
    return files
}

async function mirrorBucket() {
    const mirrorRoot = path.join(BACKUP_DIR, BUCKET)
    const remoteFiles = await listBucketFiles()
    let downloaded = 0

    for (const remotePath of remoteFiles) {
        const target = path.resolve(mirrorRoot, remotePath)
        if (!target.startsWith(mirrorRoot + path.sep)) {
            throw new Error(`Refusing to write outside the backup folder: ${remotePath}`)
        }
        if (await exists(target)) continue // files are immutable (random names), so skip existing ones

        const { data, error } = await supabase.storage.from(BUCKET).download(remotePath)
        if (error) throw new Error(`storage download "${remotePath}": ${error.message}`)
        await mkdir(path.dirname(target), { recursive: true })
        await writeFile(target, Buffer.from(await data.arrayBuffer()))
        downloaded++
    }
    return { total: remoteFiles.length, downloaded }
}

async function pruneSnapshots() {
    const entries = await readdir(BACKUP_DIR, { withFileTypes: true })
    const snapshots = entries.filter((e) => e.isDirectory() && SNAPSHOT_PATTERN.test(e.name)).map((e) => e.name).sort()
    for (const old of snapshots.slice(0, Math.max(0, snapshots.length - KEEP))) {
        await rm(path.join(BACKUP_DIR, old), { recursive: true, force: true })
    }
    // Leftovers from interrupted runs
    for (const e of entries) {
        if (e.isDirectory() && e.name.endsWith('.partial')) {
            await rm(path.join(BACKUP_DIR, e.name), { recursive: true, force: true })
        }
    }
    return Math.max(0, snapshots.length - KEEP)
}

async function main() {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const partialDir = path.join(BACKUP_DIR, `${stamp}.partial`)
    const finalDir = path.join(BACKUP_DIR, stamp)
    await mkdir(partialDir, { recursive: true })

    try {
        const manifest = { created_at: new Date().toISOString(), supabase_url: url, tables: {} }

        for (const [table, orderKey] of TABLES) {
            const rows = await exportTable(table, orderKey)
            await writeFile(path.join(partialDir, `${table}.json`), JSON.stringify(rows, null, 2))
            manifest.tables[table] = rows.length
            console.log(`  ${table}: ${rows.length} rows`)
        }

        const users = await exportUsers()
        await writeFile(path.join(partialDir, 'users.json'), JSON.stringify(users, null, 2))
        manifest.users = users.length
        console.log(`  auth users: ${users.length}`)

        manifest.evidence_files = await mirrorBucket()
        console.log(`  ${BUCKET}: ${manifest.evidence_files.total} files (${manifest.evidence_files.downloaded} new)`)

        await writeFile(path.join(partialDir, 'manifest.json'), JSON.stringify(manifest, null, 2))
        // Only a fully written snapshot ever gets a real name
        await rename(partialDir, finalDir)
    } catch (error) {
        await rm(partialDir, { recursive: true, force: true })
        throw error
    }

    const pruned = await pruneSnapshots()
    console.log(`Backup complete: ${finalDir}${pruned ? ` (pruned ${pruned} old snapshot(s))` : ''}`)
}

console.log(`[${new Date().toISOString()}] Starting Supabase backup`)
main().catch((error) => {
    console.error(`Backup FAILED: ${error.message}`)
    process.exit(1)
})
