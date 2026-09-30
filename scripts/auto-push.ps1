# مراقب تلقائي PowerShell: أي تعديل → commit + push
# التشغيل: powershell -ExecutionPolicy Bypass -File scripts/auto-push.ps1
$Root = Split-Path (Split-Path $MyInvocation.MyCommand.Path -Parent) -Parent
Set-Location -LiteralPath $Root
Write-Host "👀 مراقبة تلقائية: $Root" -ForegroundColor Green

$Watcher = New-Object System.IO.FileSystemWatcher
$Watcher.Path = $Root
$Watcher.IncludeSubdirectories = $true
$Watcher.Filter = "*.*"
$Watcher.NotifyFilter = [System.IO.NotifyFilters]::LastWrite, [System.IO.NotifyFilters]::FileName
$Watcher.EnableRaisingEvents = $true

$Timer = $null
$Action = {
    if ($global:Timer) { $global:Timer.Dispose() }
    $global:Timer = New-Object Timers.Timer(3000)
    $global:Timer.AutoReset = $false
    Register-ObjectEvent -InputObject $global:Timer -EventName Elapsed -Action {
        Set-Location -LiteralPath $using:Root
        $status = git status --porcelain
        if (-not $status) { Write-Host "✅ لا جديد" -ForegroundColor Gray; return }
        $msg = "تحديث تلقائي — $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
        git add -A
        git commit -m $msg
        git push origin main
        if ($?) { Write-Host "🚀 اترفع ✅" -ForegroundColor Green } else { Write-Host "❌ فشل الرفع" -ForegroundColor Red }
        Unregister-Event -SourceIdentifier $EventSubscriber.SourceIdentifier
    } | Out-Null
    $global:Timer.Start()
}

Register-ObjectEvent -InputObject $Watcher -EventName Changed -Action $Action | Out-Null
Register-ObjectEvent -InputObject $Watcher -EventName Created -Action $Action | Out-Null
Register-ObjectEvent -InputObject $Watcher -EventName Renamed -Action $Action | Out-Null
Write-Host "اضغط Ctrl+C للإيقاف"
while ($true) { Start-Sleep -Seconds 1 }
