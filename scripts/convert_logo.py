from pathlib import Path
from PIL import Image

src = Path('/home/maul/.gemini/antigravity-cli/brain/bd2ba726-350a-4804-8038-d72aa494def7/inventaris_investa_logo_horizontal_1795403398460.jpg')
dst = Path('/home/maul/.gemini/antigravity-cli/brain/bd2ba726-350a-4804-8038-d72aa494def7/inventaris_investa_logo_horizontal.png')

im = Image.open(src).convert('RGBA')
# replace white background with transparent
datas = im.getdata()
new_data = []
for item in datas:
    if item[0] > 250 and item[1] > 250 and item[2] > 250:
        new_data.append((255, 255, 255, 0))
    else:
        new_data.append(item)
im.putdata(new_data)
im.save(dst, 'PNG')
print('Converted')