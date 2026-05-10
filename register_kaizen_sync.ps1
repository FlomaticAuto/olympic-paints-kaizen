# Register Kaizen Sync as a daily scheduled task.
# Run ONCE as Administrator in PowerShell.

$taskName = "Olympic Paints - Kaizen Daily Sync"
$taskPath = "\Olympic Paints\"
$batFile  = "C:\Users\quint\olympic-paints-kaizen\run_kaizen_sync.bat"
$logFile  = "C:\Users\quint\OneDrive\1.Projects\1.Olympic Paints\logs\kaizen_sync.log"

$trigger  = New-ScheduledTaskTrigger -Daily -At "07:30"
$action   = New-ScheduledTaskAction `
    -Execute "cmd.exe" `
    -Argument "/c `"$batFile`" >> `"$logFile`" 2>&1"
$settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 15) `
    -StartWhenAvailable `
    -WakeToRun `
    -MultipleInstances IgnoreNew

$existing = Get-ScheduledTask -TaskName $taskName -TaskPath $taskPath -ErrorAction SilentlyContinue
if ($existing) {
    Set-ScheduledTask -TaskName $taskName -TaskPath $taskPath `
        -Trigger $trigger -Action $action -Settings $settings
    Write-Host "Updated: $taskName"
} else {
    Register-ScheduledTask `
        -TaskName $taskName -TaskPath $taskPath `
        -Trigger $trigger -Action $action -Settings $settings `
        -RunLevel Highest -Force
    Write-Host "Registered: $taskName"
}

Write-Host "Runs daily at 07:30 SAST"
Write-Host "Log: $logFile"
Write-Host ""
Write-Host "Test immediately:"
Write-Host "  Start-ScheduledTask -TaskName '$taskName' -TaskPath '$taskPath'"
