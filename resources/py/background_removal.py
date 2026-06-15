import os

import numpy as np
from PIL import Image, ImageFilter
from rembg import new_session
from rembg.bg import alpha_matting_cutout


DEFAULT_MODEL = "u2net"
FALLBACK_MODEL = "u2net"


def model_home():
    return os.path.expanduser(
        os.environ.get(
            "U2NET_HOME",
            os.path.join(os.environ.get("XDG_DATA_HOME", "~"), ".u2net"),
        )
    )


def model_path(model_name):
    return os.path.join(model_home(), f"{model_name}.onnx")


def create_background_session(allow_download=False):
    requested_model = os.environ.get("PLANT_BUD_BACKGROUND_MODEL", DEFAULT_MODEL).strip()
    model_names = [requested_model]
    if requested_model != FALLBACK_MODEL:
        model_names.append(FALLBACK_MODEL)

    last_error = None
    for model_name in model_names:
        if not allow_download and not os.path.isfile(model_path(model_name)):
            continue

        try:
            return new_session(model_name)
        except Exception as exc:
            last_error = exc

    if not allow_download:
        raise RuntimeError(
            "No prepared background-removal model was found. "
            "Run `npm run setup:python` to install it."
        )

    raise RuntimeError("No background-removal model could be loaded") from last_error


def analyze_image_detail(input_img):
    sample = input_img.convert("RGB")
    sample.thumbnail((512, 512), Image.Resampling.LANCZOS)
    rgb = np.asarray(sample, dtype=np.float32)
    luminance = rgb[:, :, 0] * 0.299 + rgb[:, :, 1] * 0.587 + rgb[:, :, 2] * 0.114

    horizontal = np.abs(np.diff(luminance, axis=1))
    vertical = np.abs(np.diff(luminance, axis=0))
    global_edge_density = (
        float(np.mean(horizontal > 14)) + float(np.mean(vertical > 14))
    ) / 2
    global_strong_edge_density = (
        float(np.mean(horizontal > 32)) + float(np.mean(vertical > 32))
    ) / 2

    border_size = max(2, min(rgb.shape[:2]) // 35)
    border = np.concatenate(
        (
            rgb[:border_size, :, :].reshape(-1, 3),
            rgb[-border_size:, :, :].reshape(-1, 3),
            rgb[:, :border_size, :].reshape(-1, 3),
            rgb[:, -border_size:, :].reshape(-1, 3),
        )
    )
    probable_background = np.median(border, axis=0)
    foreground_hint = np.linalg.norm(rgb - probable_background, axis=2) > 22
    focused_edge_density = global_edge_density
    focused_strong_edge_density = global_strong_edge_density
    sparse_structure_score = 0.0

    rows, columns = np.where(foreground_hint)
    if len(rows) > 24:
        top, bottom = int(rows.min()), int(rows.max()) + 1
        left, right = int(columns.min()), int(columns.max()) + 1
        focused_luminance = luminance[top:bottom, left:right]
        focused_hint = foreground_hint[top:bottom, left:right]

        if min(focused_luminance.shape) > 2:
            focused_horizontal = np.abs(np.diff(focused_luminance, axis=1))
            focused_vertical = np.abs(np.diff(focused_luminance, axis=0))
            focused_edge_density = (
                float(np.mean(focused_horizontal > 14))
                + float(np.mean(focused_vertical > 14))
            ) / 2
            focused_strong_edge_density = (
                float(np.mean(focused_horizontal > 32))
                + float(np.mean(focused_vertical > 32))
            ) / 2

        occupancy = float(np.mean(focused_hint))
        sparse_structure_score = float(np.clip((0.42 - occupancy) / 0.42, 0, 1))

    detail_score = min(
        1.0,
        max(global_edge_density, focused_edge_density) * 2.4
        + max(global_strong_edge_density, focused_strong_edge_density) * 2.0
        + sparse_structure_score * 0.28,
    )

    if detail_score >= 0.34:
        level = "intricate"
        foreground_threshold = 210
        background_threshold = 4
        erode_size = 0
        raw_mask_protection = 1.0
    elif detail_score >= 0.18:
        level = "detailed"
        foreground_threshold = 225
        background_threshold = 6
        erode_size = 1
        raw_mask_protection = 0.92
    else:
        level = "simple"
        foreground_threshold = 238
        background_threshold = 10
        erode_size = 2
        raw_mask_protection = 0.72

    return {
        "level": level,
        "score": detail_score,
        "foreground_threshold": foreground_threshold,
        "background_threshold": background_threshold,
        "erode_size": erode_size,
        "raw_mask_protection": raw_mask_protection,
    }


def remove_background(input_img, session):
    source = input_img.convert("RGBA")
    source.thumbnail((2048, 2048), Image.Resampling.LANCZOS)
    rgb_source = source.convert("RGB")
    detail = analyze_image_detail(source)

    masks = session.predict(rgb_source)
    if not masks:
        raise RuntimeError("The background-removal model returned no mask")

    raw_mask = masks[0].convert("L")

    try:
        matte_output = alpha_matting_cutout(
            rgb_source,
            raw_mask,
            detail["foreground_threshold"],
            detail["background_threshold"],
            detail["erode_size"],
        ).convert("RGBA")
        output_img = source.copy()
        output_img.putalpha(matte_output.getchannel("A"))
    except Exception:
        output_img = source.copy()
        output_img.putalpha(raw_mask)

    output_img = protect_model_details(output_img, raw_mask, detail)
    output_img = recover_from_uniform_background(source, output_img, detail)
    output_img = clean_alpha_noise(output_img, detail)
    return output_img


def protect_model_details(output_img, raw_mask, detail):
    matte_alpha = np.asarray(output_img.getchannel("A"), dtype=np.float32)
    model_alpha = np.asarray(raw_mask, dtype=np.float32)

    # Alpha matting can erase narrow stems and leaf tips. Preserve confidence from
    # the segmentation model, with stronger protection on visually intricate assets.
    confidence_floor = {
        "intricate": 5,
        "detailed": 12,
        "simple": 30,
    }[detail["level"]]
    normalized_model = np.clip(
        (model_alpha - confidence_floor) / (255 - confidence_floor),
        0,
        1,
    )
    protected_model = normalized_model * 255.0 * detail["raw_mask_protection"]
    if detail["level"] == "intricate":
        protected_model = np.power(normalized_model, 0.88) * 255.0

    combined = np.maximum(matte_alpha, protected_model)
    output_img.putalpha(Image.fromarray(np.clip(combined, 0, 255).astype(np.uint8), mode="L"))
    return output_img


def recover_from_uniform_background(input_img, output_img, detail):
    source = np.asarray(input_img, dtype=np.float32)
    height, width = source.shape[:2]
    border_size = max(2, min(height, width) // 45)
    border = np.concatenate(
        (
            source[:border_size, :, :3].reshape(-1, 3),
            source[-border_size:, :, :3].reshape(-1, 3),
            source[:, :border_size, :3].reshape(-1, 3),
            source[:, -border_size:, :3].reshape(-1, 3),
        )
    )
    background = np.median(border, axis=0)
    border_distance = np.linalg.norm(border - background, axis=1)
    background_spread = float(np.percentile(border_distance, 85))

    # Color-guided recovery is safe on studio backgrounds. Gradient skies and
    # scenery stay under model control so clouds are not mistaken for foliage.
    if background_spread > 27:
        return output_img

    distance = np.linalg.norm(source[:, :, :3] - background, axis=2)
    contrast_start = 12 if detail["level"] == "intricate" else 16
    contrast_range = 38 if detail["level"] == "intricate" else 34
    color_alpha = np.clip((distance - contrast_start) / contrast_range, 0, 1) * 255

    model_alpha = np.asarray(output_img.getchannel("A"), dtype=np.uint8)
    candidate = color_alpha > (22 if detail["level"] == "intricate" else 34)
    connected = candidate & (model_alpha > 12)

    # Grow only through foreground-colored pixels connected to the detected object.
    # This recovers interrupted stems and leaf tips without restoring distant clutter.
    growth_steps = 10 if detail["level"] == "intricate" else 6
    for _ in range(growth_steps):
        expanded = np.asarray(
            Image.fromarray(connected.astype(np.uint8) * 255, mode="L").filter(
                ImageFilter.MaxFilter(5)
            )
        ) > 0
        next_connected = candidate & expanded
        if np.array_equal(next_connected, connected):
            break
        connected = next_connected

    recovered = np.where(connected, color_alpha, 0)
    protected_alpha = np.maximum(model_alpha, recovered.astype(np.uint8))
    output_img.putalpha(Image.fromarray(protected_alpha, mode="L"))
    return output_img


def clean_alpha_noise(output_img, detail):
    alpha = np.asarray(output_img.getchannel("A"), dtype=np.uint8)
    noise_floor = 3 if detail["level"] == "intricate" else 6
    alpha = np.where(alpha <= noise_floor, 0, alpha).astype(np.uint8)
    output_img.putalpha(Image.fromarray(alpha, mode="L"))
    return output_img


def auto_crop_alpha(img):
    alpha = np.asarray(img.getchannel("A"), dtype=np.uint8)
    meaningful_alpha = Image.fromarray(
        np.where(alpha >= 8, 255, 0).astype(np.uint8),
        mode="L",
    )
    bbox = meaningful_alpha.getbbox()
    return img.crop(bbox) if bbox else img


def center_on_canvas(img, size=1024):
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    img.thumbnail((int(size * 0.84), int(size * 0.84)), Image.Resampling.LANCZOS)
    x = (size - img.width) // 2
    y = (size - img.height) // 2
    canvas.paste(img, (x, y), img)
    return canvas
