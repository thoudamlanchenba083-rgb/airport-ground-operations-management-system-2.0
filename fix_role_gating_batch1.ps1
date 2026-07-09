# fix_role_gating_batch1.ps1
# Fixes frontend write-control visibility to match actual backend permissions.
# Run this from your repo root: C:\Users\user\airport-ground-operations-management-system-2.0
#
# Covers: FlightsTab, GatesTab, AirlinesTab, AircraftTab, BaggageTab, Dashboard
# Safe to re-run — each replace only fires if the old pattern is still present.

$ErrorActionPreference = 'Stop'

function Replace-InFile($path, $old, $new, $label) {
    if (-not (Test-Path $path)) {
        Write-Host "SKIP (file not found): $path" -ForegroundColor Yellow
        return
    }
    $content = Get-Content -Raw -Path $path
    if ($content.Contains($old)) {
        $content = $content.Replace($old, $new)
        Set-Content -Path $path -Value $content -NoNewline
        Write-Host "FIXED: $label ($path)" -ForegroundColor Green
    } elseif ($content.Contains($new)) {
        Write-Host "ALREADY FIXED: $label ($path)" -ForegroundColor Cyan
    } else {
        Write-Host "PATTERN NOT FOUND (check manually): $label ($path)" -ForegroundColor Red
    }
}

# ---------- FlightsTab.jsx (ADMIN, GROUND_STAFF) ----------
$p = "frontend\src\components\flights\FlightsTab.jsx"
Replace-InFile $p "const isViewer = user?.role === 'VIEWER'" "const canWrite = user?.role === 'ADMIN' || user?.role === 'GROUND_STAFF'" "FlightsTab definition"
Replace-InFile $p "{!isViewer && (" "{canWrite && (" "FlightsTab toolbar button"
Replace-InFile $p "{!isViewer && <th" "{canWrite && <th" "FlightsTab Actions header"

# ---------- GatesTab.jsx (ADMIN, GATE_MANAGER, OPERATIONS_MANAGER, GROUND_STAFF) ----------
$p = "frontend\src\components\gates\GatesTab.jsx"
Replace-InFile $p "const isViewer = user?.role === 'VIEWER'" "const canWrite = ['ADMIN', 'GATE_MANAGER', 'OPERATIONS_MANAGER', 'GROUND_STAFF'].includes(user?.role)" "GatesTab definition"
Replace-InFile $p "{!isViewer && (" "{canWrite && (" "GatesTab controls"

# ---------- AircraftTab.jsx (ADMIN, GROUND_STAFF) ----------
$p = "frontend\src\components\flights\AircraftTab.jsx"
Replace-InFile $p "const isViewer = user?.role === 'VIEWER'" "const canWrite = user?.role === 'ADMIN' || user?.role === 'GROUND_STAFF'" "AircraftTab definition"
Replace-InFile $p "{!isViewer && (" "{canWrite && (" "AircraftTab button"

# ---------- BaggageTab.jsx (ADMIN, BAGGAGE_SUPERVISOR, GROUND_STAFF) ----------
$p = "frontend\src\components\baggage\BaggageTab.jsx"
Replace-InFile $p "const isViewer = user?.role === 'VIEWER'" "const canWrite = ['ADMIN', 'BAGGAGE_SUPERVISOR', 'GROUND_STAFF'].includes(user?.role)" "BaggageTab definition"
Replace-InFile $p "{!isViewer && (`n          <button`n            onClick={() => setShowForm(v => !v)}" "{canWrite && (`n          <button`n            onClick={() => setShowForm(v => !v)}" "BaggageTab toolbar button"
Replace-InFile $p "{showForm && !isViewer && (" "{showForm && canWrite && (" "BaggageTab form wrapper"
Replace-InFile $p "                  {!isViewer && (" "                  {canWrite && (" "BaggageTab row actions"

# ---------- Dashboard.jsx (ADMIN, GROUND_STAFF) ----------
$p = "frontend\src\pages\Dashboard.jsx"
Replace-InFile $p "const isViewer = user?.role === 'VIEWER'" "const canWrite = user?.role === 'ADMIN' || user?.role === 'GROUND_STAFF'" "Dashboard definition"
Replace-InFile $p "{!isViewer && <th className=`"px-5 py-3 font-medium`">Actions</th>}" "{canWrite && <th className=`"px-5 py-3 font-medium`">Actions</th>}" "Dashboard Actions header"
Replace-InFile $p "colSpan={isViewer ? 6 : 7}" "colSpan={canWrite ? 7 : 6}" "Dashboard colSpan"
Replace-InFile $p "                    {!isViewer && (" "                    {canWrite && (" "Dashboard row actions"

Write-Host ""
Write-Host "Done. Review the output above for any RED 'PATTERN NOT FOUND' lines - those need a manual check." -ForegroundColor White
