import re

path = r'C:\Users\danil\Desktop\ING_AYA\ING_AYA-Django\FRONT-END-ING-AYA-2026\PANEL DE ADMINISTRACION\admin_dashboard.html'
with open(path, 'r', encoding='utf-8') as f:
    html = f.read()

# Replace the opening tags
html = re.sub(r'<div class="card-box">\s*<div class="table-responsive">', r'<div class="table-container card-box">', html)

# Replace the closing tags. We find </table> and then two </div>. We replace with </table> and ONE </div>.
# We will use regex for that as well.
html = re.sub(r'</table>\s*</div>\s*</div>', r'</table>\n                        </div>', html)

with open(path, 'w', encoding='utf-8') as f:
    f.write(html)

print("Done")
