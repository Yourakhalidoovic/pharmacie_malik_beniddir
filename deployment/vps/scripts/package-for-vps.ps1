param(
  [string]$Output = "pharmacie-release.tgz"
)

$ErrorActionPreference = "Stop"

if (Test-Path $Output) {
  Remove-Item $Output -Force
}

$tarPath = "tar"

& $tarPath -czf $Output `
  --exclude=.git `
  --exclude=node_modules `
  --exclude=reference `
  --exclude=frontend/.next `
  --exclude=frontend/out `
  --exclude=backend/*.db `
  .

Write-Host "Release package created: $Output"
