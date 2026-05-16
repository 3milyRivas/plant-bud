import base64
import io
import json
import sys

from PIL import Image
from rembg import new_session, remove


session = new_session("u2net")


def decode(data_url):
    return base64.b64decode(data_url.split(",", 1)[1])


def auto_crop_alpha(img):
    bbox = img.getbbox()
    if bbox:
        return img.crop(bbox)
    return img


def center_on_canvas(img, size=1024):
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))

    img.thumbnail((int(size * 0.8), int(size * 0.8)))

    x = (size - img.width) // 2
    y = (size - img.height) // 2

    canvas.paste(img, (x, y), img)
    return canvas


def process_image(data_url):
    image_bytes = decode(data_url)
    input_img = Image.open(io.BytesIO(image_bytes)).convert("RGBA")

    buffer = io.BytesIO()
    input_img.save(buffer, format="PNG")

    output_bytes = remove(buffer.getvalue(), session=session)
    output_img = Image.open(io.BytesIO(output_bytes)).convert("RGBA")
    output_img = auto_crop_alpha(output_img)
    output_img = center_on_canvas(output_img, 1024)

    final_buffer = io.BytesIO()
    output_img.save(final_buffer, format="PNG")

    encoded = base64.b64encode(final_buffer.getvalue()).decode()

    return {
        "image": f"data:image/png;base64,{encoded}",
        "width": 1024,
        "height": 1024,
    }


def main():
    try:
        data = json.load(sys.stdin)
        print(json.dumps(process_image(data["image"])), flush=True)
    except Exception as exc:
        print(json.dumps({"error": str(exc)}), file=sys.stderr, flush=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
