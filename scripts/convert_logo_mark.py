from pathlib import Path
from PIL import Image

# Choose the minimal logo mark JPG
src = Path('/home/maul/.gemini/antigravity-cli/brain/bd2ba726-350a-4804-8038-d72aa494def7/logo_mark_minimal_1795403801106.jpg')
# Destination transparent PNG in the brain folder
dst = Path('/home/maul/.gemini/antigravity-cli/brain/bd2ba726-350a-4804-8038-d72aa494def7/logo_mark.png')

im = Image.open(src).convert('RGBA')
new_data = []
for pixel in im.getdata():
    # consider near‑white as transparent
    if pixel[0] > 250 and pixel[1] > 250 and pixel[2] > 250:
        new_data.append((255, 255, 255, 0))
    else:
        new_data.append(pixel)
im.putdata(new_data)
im.save(dst, 'PNG')
print('Converted logo mark to PNG')
