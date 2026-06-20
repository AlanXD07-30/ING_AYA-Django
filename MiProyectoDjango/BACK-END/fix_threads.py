import re

with open('C:\\Users\\Pepe\\Desktop\\ING_AYA\\MiProyectoDjango\\BACK-END\\api\\views.py', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'hilo_correo = threading\.Thread\(target=([^,]+),\s*args=\(([^)]+)\)\)\s*hilo_correo\.start\(\)', r'\1(\2)', content)

content = re.sub(r't = threading\.Thread\(target=([^,]+),\s*args=\(([\s\S]*?)\)\)\s*t\.start\(\)', r'\1(\2)', content)

with open('C:\\Users\\Pepe\\Desktop\\ING_AYA\\MiProyectoDjango\\BACK-END\\api\\views.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
