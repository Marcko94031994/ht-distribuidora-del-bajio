# package_source.ps1
# Empaqueta el código fuente para que el servidor lo compile con Docker

Write-Host "Empaquetando código fuente..."
$rootDir = Get-Location
$tarFile = "source.tar.gz"

if (Test-Path $tarFile) { Remove-Item $tarFile -Force }

# Usar tar nativo de Windows excluyendo carpetas pesadas/innecesarias
# Nota: tar en Windows no soporta --exclude tan fácil, así que usamos un archivo temporal de exclusiones
$excludeFile = "exclude.txt"
"node_modules" | Out-File $excludeFile -Encoding ASCII
"dist" | Out-File $excludeFile -Encoding ASCII -Append
"bin" | Out-File $excludeFile -Encoding ASCII -Append
"obj" | Out-File $excludeFile -Encoding ASCII -Append
".git" | Out-File $excludeFile -Encoding ASCII -Append
"publish" | Out-File $excludeFile -Encoding ASCII -Append

tar -czvf $tarFile -X $excludeFile api frontend docker-compose.yml

Remove-Item $excludeFile -Force

Write-Host "Completado: $tarFile generado."
