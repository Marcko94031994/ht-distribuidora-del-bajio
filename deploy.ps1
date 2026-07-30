# deploy.ps1
# Script para empaquetar el frontend y el backend de HTLogistics para producción

Write-Host "========================================="
Write-Host " Preparando release de HTLogistics..."
Write-Host "========================================="

$rootDir = Get-Location
$frontendDir = Join-Path $rootDir "frontend"
$apiDir = Join-Path $rootDir "api\HTLogistics.Api"
$publishDir = Join-Path $rootDir "publish"

# 1. Limpiar carpeta de publicación previa
Write-Host "`n[1/4] Limpiando carpetas anteriores..."
if (Test-Path $publishDir) {
    Remove-Item -Recurse -Force $publishDir
}
$wwwrootDir = Join-Path $apiDir "wwwroot"
if (Test-Path $wwwrootDir) {
    Remove-Item -Recurse -Force $wwwrootDir
}

# 2. Compilar Frontend
Write-Host "`n[2/4] Compilando Frontend (React/Vite)..."
Set-Location $frontendDir
npm run build

# Mover el frontend compilado a wwwroot del API
Write-Host "      Moviendo build a wwwroot..."
Copy-Item -Path "dist\*" -Destination $wwwrootDir -Recurse -Force

# 3. Publicar Backend (API)
Write-Host "`n[3/4] Publicando Backend (.NET 8)..."
Set-Location $apiDir
dotnet publish -c Release -o $publishDir

# 4. Comprimir el resultado (Formato tar.gz)
Write-Host "`n[4/4] Comprimiendo archivos de producción..."
Set-Location $rootDir
$tarFile = "deploy.tar.gz"
if (Test-Path $tarFile) { Remove-Item $tarFile -Force }

# Usando el comando tar incluido en Windows
tar -czvf $tarFile -C "$publishDir" .

Write-Host "`n========================================="
Write-Host " ¡Proceso Completado!"
Write-Host "========================================="
Write-Host "Sube el archivo $tarFile a tu servidor."
Write-Host "En el servidor, extrae el contenido en la carpeta de inetpub (ej. C:\inetpub\wwwroot\HTLogistics) y asegúrate de que el Application Pool esté configurado como 'No Managed Code'."
