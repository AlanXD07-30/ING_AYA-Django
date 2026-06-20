import os
import glob

FRONTEND_DIR = r"C:\Users\Pepe\Desktop\ING_AYA\FRONT-END-ING-AYA-2026"
OLD_URL = "http://127.0.0.1:8000"
NEW_URL = "https://ingaya-django-production.up.railway.app"

# También por si acaso buscaron 'localhost'
OLD_URL_2 = "http://localhost:8000"

count = 0
for filepath in glob.glob(os.path.join(FRONTEND_DIR, "**", "*.js"), recursive=True):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        if OLD_URL in content or OLD_URL_2 in content:
            content = content.replace(OLD_URL, NEW_URL)
            content = content.replace(OLD_URL_2, NEW_URL)
            
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✅ Actualizado: {os.path.basename(filepath)}")
            count += 1
    except Exception as e:
        print(f"Error procesando {filepath}: {e}")

print(f"\n¡Proceso terminado! Se actualizaron {count} archivos JS para apuntar a producción.")
