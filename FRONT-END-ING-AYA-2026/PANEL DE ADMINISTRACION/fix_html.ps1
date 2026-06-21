$html = Get-Content -Raw -Path "admin_dashboard.html"

# Replace the opening tags
$html = $html -replace '<div class="card-box">\s*<div class="table-responsive">', '<div class="table-container card-box">'

# Replace the closing tags
$html = $html -replace '</table>\s*</div>\s*</div>', "</table>`r`n                        </div>"

Set-Content -Path "admin_dashboard.html" -Value $html
Write-Host "Done"
