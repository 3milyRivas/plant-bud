import base64
import io
import json
import sys

from PIL import Image

from background_removal import (
    auto_crop_alpha,
    center_on_canvas,
    create_background_session,
    remove_background,
)


session = create_background_session()


def decode(data_url):
    return base64.b64decode(data_url.split(",", 1)[1])


def process_image(data_url):
    image_bytes = decode(data_url)
    input_img = Image.open(io.BytesIO(image_bytes)).convert("RGBA")
    output_img = remove_background(input_img, session)
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
