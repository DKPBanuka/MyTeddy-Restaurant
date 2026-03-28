
$services = @("auth-service", "inventory-service", "order-service", "api-gateway")
$pids = @()

Write-Host "Starting MyTeddy Microservices..." -ForegroundColor Cyan

foreach ($service in $services) {
    Write-Host "Starting $service..." -ForegroundColor Green
    $job = Start-Process -FilePath "npx" -ArgumentList "nest", "start", $service -NoNewWindow -PassThru -WorkingDirectory "./apps/backend"
    $pids += $job.Id
    Start-Sleep -Seconds 5
}

Write-Host "`nAll services started." -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop all services (or kill PIDs: $($pids -join ', '))" -ForegroundColor Yellow

# Keep script running to allow stopping them all at once
try {
    while ($true) { Start-Sleep -Seconds 1 }
} finally {
    Write-Host "`nStopping all services..." -ForegroundColor Red
    foreach ($pid in $pids) {
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    }
}
