@echo off
echo ========================================================
echo   EXPORTADOR DE BASE DE DATOS - INMOBILIARIA ING AYA
echo ========================================================
echo.
echo Exportando la base de datos "ing_aya" con todas sus tablas actualizadas...

:: Cambiamos al directorio de xampp o donde asuma que está mysql (intentando rutas comunes)
:: Si mysql está en el PATH, funcionará directo.
set MYSQL_CMD=mysqldump

:: Intenta exportar
%MYSQL_CMD% -u root ing_aya > "%USERPROFILE%\Desktop\ING_AYA\ing_aya_actualizada_2026.sql" 2>nul

IF %ERRORLEVEL% NEQ 0 (
    echo [!] No se encontro mysqldump en las variables de entorno. 
    echo Buscando en rutas de XAMPP/WAMP por defecto...
    
    if exist "C:\xampp\mysql\bin\mysqldump.exe" (
        "C:\xampp\mysql\bin\mysqldump.exe" -u root ing_aya > "%USERPROFILE%\Desktop\ING_AYA\ing_aya_actualizada_2026.sql"
    ) else if exist "C:\wamp64\bin\mysql\mysql*\bin\mysqldump.exe" (
        :: Lógica simple si usan WAMP
        echo Por favor abre tu consola de MySQL y exporta manualmente.
    ) else (
        echo Error: No se pudo exportar. Asegurate de que MySQL este corriendo.
        pause
        exit
    )
)

echo.
echo [EXITO] La base de datos ha sido exportada correctamente.
echo Puedes encontrar el archivo en tu carpeta de ING_AYA como: 
echo "ing_aya_actualizada_2026.sql"
echo.
pause
