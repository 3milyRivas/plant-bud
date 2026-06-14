import base64
import io

from flask import Flask, jsonify, request
from flask_cors import CORS
from PIL import Image

from background_removal import (
    auto_crop_alpha,
    center_on_canvas,
    create_background_session,
    remove_background,
)

app = Flask(__name__)
CORS(app)

session = create_background_session()


def decode(data_url):
    return base64.b64decode(data_url.split(",")[1])


@app.route('/remove-background', methods=['POST'])
@app.route('/process', methods=['POST'])
def process():
    try:
        data = request.json
        image_bytes = decode(data['image'])

        input_img = Image.open(io.BytesIO(image_bytes)).convert("RGBA")

        output_img = remove_background(input_img, session)

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
