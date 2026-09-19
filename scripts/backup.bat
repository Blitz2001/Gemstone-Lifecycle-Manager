@echo off
rem Runs the Supabase backup and appends the output to backups\backup.log.
rem Used by Windows Task Scheduler (see README "Backups").
cd /d "%~dp0.."
if not exist backups mkdir backups
node scripts\backup.mjs >> backups\backup.log 2>&1
