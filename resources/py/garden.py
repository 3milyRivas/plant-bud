import base64
import io

from flask import Flask, jsonify, request
from flask_cors import CORS
from PIL import Image
from rembg import new_session, remove

app = Flask(__name__)
CORS(app)

session = new_session("u2net")

def decode(data_url):
    return base64.b64decode(data_url.split(",")[1])

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

@app.route('/remove-background', methods=['POST'])
@app.route('/process', methods=['POST'])
def process():
    try:
        data = request.json
        image_bytes = decode(data['image'])

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

        return jsonify({
            "image": f"data:image/png;base64,{encoded}",
            "width": 1024,
            "height": 1024
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False, threaded=True, use_reloader=False)
