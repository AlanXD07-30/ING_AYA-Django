import re
with open(r'C:\Users\Pepe\Desktop\ING_AYA-Django\FRONT-END-ING-AYA-2026\PANEL DE ADMINISTRACION\admin.js', 'r', encoding='utf-8') as f:
    content = f.read()
content = re.sub(r'method:\s*[\'\"`]PATCH[\'\"`]', "method: 'POST'", content)
content = re.sub(r',\s*estado:\s*[\'\"`]CONFIRMADA[\'\"`]', '', content)
with open(r'C:\Users\Pepe\Desktop\ING_AYA-Django\FRONT-END-ING-AYA-2026\PANEL DE ADMINISTRACION\admin.js', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
