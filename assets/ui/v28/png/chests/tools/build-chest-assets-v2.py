#!/usr/bin/env python3
from __future__ import annotations

import csv
import importlib.util
import io
import json
import shutil
import zipfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy.ndimage import binary_propagation, distance_transform_edt, label


ROOT = Path(__file__).resolve().parents[2]
GEN = ROOT / "generated_images"
V1 = ROOT / "output" / "diceduel-chest-assets"
OUT = ROOT / "output" / "diceduel-chest-assets-v2"
ASSET_ROOT = OUT / "assets" / "ui" / "v28" / "png" / "chests"
SRC_ROOT = ASSET_ROOT / "src"
PREVIEW_ROOT = OUT / "control-composites"
STAGES = ("common", "rare", "epic", "legendary")

MODEL = {
    "common": {
        "closed": "exec-173660b4-67b4-46f2-b8e9-cab6fdd9a0e9.png",
        "body": "exec-ba33bb7a-a397-441f-8d79-4df9318de173.png",
        "lid_inner": "exec-585060aa-e943-404a-81bb-922a6c79c0e6.png",
        "open": "exec-bfc85d21-8bcb-419e-bfbb-7efa8675ecba.png",
        "card": "exec-d2f34284-181f-4b7a-a268-9ea5f2cdc0e4.png",
    },
    "rare": {
        "closed": "exec-85047ef5-a357-4262-ad74-a3b644105b84.png",
        "body": "exec-671e6ef1-9c8a-4423-bd52-c9d9225efba8.png",
        "lid_inner": "exec-40bfba3b-aa77-4b97-bc0d-915fae0e86f2.png",
        "open": "exec-cb65e3fc-c443-4b33-a96d-1aa884188832.png",
        "card": "exec-5589962d-3ce7-4891-a245-30da25d9fbeb.png",
    },
    "epic": {
        "closed": "exec-c867a111-5616-4733-9b7e-e82c23793ebd.png",
        "body": "exec-4d904ab9-f615-4bce-b99b-8beef63d85e3.png",
        "lid_inner": "exec-59caaab1-471b-4425-9516-6432ec24b715.png",
        "open": "exec-9c571dc6-f969-45d3-b7c4-f7291512f01e.png",
        "card": "exec-48f1044a-b3d0-420a-9252-e2857260d4e7.png",
    },
    "legendary": {
        "closed": "exec-b450e667-2d02-41b0-bfd6-d39432b7f694.png",
        "body": "exec-f4162efa-97c6-4a15-b7ed-579bea35119e.png",
        "lid_inner": "exec-afbc4609-8466-4300-a45f-4ed4fcef750c.png",
        "open": "exec-1153c940-8bff-47e0-a807-5e94caa52636.png",
        "card": "exec-dd8d67ca-7238-4c73-b522-8738c4840389.png",
    },
}

CARD_BACK = "exec-96a96a3c-4f77-4a41-9dca-71a03474cb03.png"
SAPPHIRE_REFERENCE = "exec-0f8d3b51-a0c1-465e-9e86-dd2ee2e97f6c.png"

# The image model kept the same 1254 square composition for all closed edits.
CLOSED_CROP = (43, 142, 1212, 1110)
BODY_CROPS = {
    "common": (40, 190, 1215, 1112),
    "rare": (42, 225, 1215, 1120),
    "epic": (42, 215, 1215, 1112),
    "legendary": (15, 220, 1240, 1112),
}
INNER_CROPS = {
    "common": (45, 140, 1210, 1045),
    "rare": None,
    "epic": None,
    "legendary": None,
}
CARD_CROP = (120, 0, 1134, 1254)


def atomic_write(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_bytes(data)
    tmp.replace(path)


def load_rgba(path: Path) -> Image.Image:
    return Image.open(path).convert("RGBA")


def remove_model_checker(im: Image.Image) -> Image.Image:
    """Convert the image model's baked checkerboard to alpha.

    Only checker-like, nearly neutral bright pixels connected to the canvas
    edge are removed.  Painted silver and ivory inside the asset stay intact.
    The final production silhouette is supplied by the validated V1 masks.
    """
    rgb = np.asarray(im.convert("RGB"))
    spread = rgb.max(axis=2).astype(np.int16) - rgb.min(axis=2).astype(np.int16)
    mean = rgb.mean(axis=2)
    candidate = (spread <= 8) & (mean >= 155)
    seed = np.zeros(candidate.shape, dtype=bool)
    seed[0] = candidate[0]
    seed[-1] = candidate[-1]
    seed[:, 0] = candidate[:, 0]
    seed[:, -1] = candidate[:, -1]
    background = binary_propagation(seed, mask=candidate)
    rgba = np.empty((*rgb.shape[:2], 4), dtype=np.uint8)
    rgba[:, :, :3] = rgb
    rgba[:, :, 3] = np.where(background, 0, 255).astype(np.uint8)
    rgba[background, :3] = 0
    return Image.fromarray(rgba, "RGBA")


def load_model(path: Path) -> Image.Image:
    im = Image.open(path)
    if "A" in im.getbands():
        rgba = im.convert("RGBA")
        lo, hi = rgba.getchannel("A").getextrema()
        if lo < hi:
            return keep_largest_alpha_component(rgba)
    return keep_largest_alpha_component(remove_model_checker(im))


def keep_largest_alpha_component(im: Image.Image) -> Image.Image:
    """Discard detached matte specks without changing the painted object."""
    arr = np.asarray(im.convert("RGBA")).copy()
    components, count = label(arr[:, :, 3] > 8, structure=np.ones((3, 3), dtype=np.uint8))
    if count <= 1:
        return Image.fromarray(arr, "RGBA")
    sizes = np.bincount(components.ravel())
    sizes[0] = 0
    keep = components == int(sizes.argmax())
    arr[~keep] = 0
    return Image.fromarray(arr, "RGBA")


def alpha_bbox(im: Image.Image, threshold: int = 8):
    a = np.asarray(im.getchannel("A"))
    yy, xx = np.where(a > threshold)
    if not len(xx):
        return None
    return int(xx.min()), int(yy.min()), int(xx.max()) + 1, int(yy.max()) + 1


def resize_crop(im: Image.Image, crop, size) -> Image.Image:
    return im.crop(crop).resize(size, Image.Resampling.LANCZOS)


def edge_fill_rgba(im: Image.Image) -> Image.Image:
    """Extend painted RGB beneath transparent edge pixels before masking."""
    arr = np.asarray(im.convert("RGBA")).copy()
    valid = arr[:, :, 3] > 8
    if valid.all() or not valid.any():
        return Image.fromarray(arr, "RGBA")
    _, indices = distance_transform_edt(~valid, return_indices=True)
    missing = ~valid
    arr[missing, :3] = arr[indices[0][missing], indices[1][missing], :3]
    arr[:, :, 3] = 255
    return Image.fromarray(arr, "RGBA")


def texture_on_canvas(im: Image.Image, crop, box, canvas_size=(1024, 1024)) -> Image.Image:
    x0, y0, x1, y1 = box
    patch = edge_fill_rgba(im.crop(crop)).resize((x1 - x0, y1 - y0), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    canvas.paste(patch, (x0, y0))
    return canvas


def with_mask(texture: Image.Image, mask: Image.Image) -> Image.Image:
    out = texture.convert("RGBA")
    out.putalpha(mask.convert("L"))
    arr = np.asarray(out).copy()
    arr[arr[:, :, 3] == 0, :3] = 0
    return Image.fromarray(arr, "RGBA")


def clean_alpha(im: Image.Image) -> Image.Image:
    arr = np.asarray(im.convert("RGBA")).copy()
    a = arr[:, :, 3]
    a[a < 6] = 0
    a[a > 249] = 255
    arr[:, :, 3] = a
    arr[a == 0, :3] = 0
    return Image.fromarray(arr, "RGBA")


def fit_rgba(im: Image.Image, target_box, canvas_size=(1024, 1024)) -> Image.Image:
    bbox = alpha_bbox(im)
    if bbox is None:
        raise ValueError("image model output has no alpha")
    obj = im.crop(bbox)
    x0, y0, x1, y1 = target_box
    scale = min((x1 - x0) / obj.width, (y1 - y0) / obj.height)
    w = max(1, round(obj.width * scale))
    h = max(1, round(obj.height * scale))
    obj = obj.resize((w, h), Image.Resampling.LANCZOS)
    px = (x0 + x1 - w) // 2
    py = y1 - h
    canvas = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    canvas.alpha_composite(obj, (px, py))
    return clean_alpha(canvas)


def png_bytes(im: Image.Image) -> bytes:
    b = io.BytesIO()
    im.save(b, "PNG", optimize=True)
    return b.getvalue()


def webp_bytes(im: Image.Image) -> bytes:
    b = io.BytesIO()
    im.save(b, "WEBP", quality=90, method=6, exact=True, lossless=False, alpha_quality=100)
    return b.getvalue()


def save_pair(src: Image.Image, rel: str, stem: str, target_size) -> None:
    src = clean_alpha(src)
    target = clean_alpha(src.resize(target_size, Image.Resampling.LANCZOS))
    atomic_write(SRC_ROOT / rel / f"{stem}.png", png_bytes(src))
    atomic_write(ASSET_ROOT / rel / f"{stem}.webp", webp_bytes(target))


def v1_source(rel: str, stem: str) -> Image.Image:
    return load_rgba(V1 / "assets" / "ui" / "v28" / "png" / "chests" / "src" / rel / f"{stem}.png")


def build_stage(stage: str) -> None:
    paths = MODEL[stage]
    closed_model = load_model(GEN / paths["closed"])
    common_closed_mask = v1_source("common", "chest-common-closed").getchannel("A")
    body_mask = v1_source("common", "chest-common-body").getchannel("A")
    lid_mask = v1_source("common", "chest-common-lid").getchannel("A")

    closed_crop = alpha_bbox(closed_model) or CLOSED_CROP
    closed_texture = texture_on_canvas(closed_model, closed_crop, (112, 184, 914, 906))
    closed = with_mask(closed_texture, common_closed_mask)

    body_model = load_model(GEN / paths["body"])
    body_crop = alpha_bbox(body_model) or BODY_CROPS[stage]
    body_texture = texture_on_canvas(body_model, body_crop, (112, 400, 914, 906))
    body = with_mask(body_texture, body_mask)
    ba = np.asarray(body).copy()
    ca = np.asarray(closed)
    ma = np.asarray(body_mask)
    yy = np.arange(1024)[:, None]
    lower = (yy >= 480) & (ma > 0)
    ba[lower, :3] = ca[lower, :3]
    ba[lower, 3] = ma[lower]
    body = Image.fromarray(ba, "RGBA")

    lid = with_mask(closed.copy(), lid_mask)

    inner_model = load_model(GEN / paths["lid_inner"])
    inner_crop = alpha_bbox(inner_model) or INNER_CROPS[stage]
    if inner_crop is None:
        raise ValueError(f"missing lid-inner crop for {stage}")
    inner_texture = texture_on_canvas(inner_model, inner_crop, (112, 184, 914, 506))
    lid_inner = with_mask(inner_texture, lid_mask)

    open_model = load_model(GEN / paths["open"])
    open_image = fit_rgba(open_model, (56, 48, 968, 916))

    base = f"chest-{stage}"
    save_pair(body, stage, base + "-body", (512, 512))
    save_pair(lid, stage, base + "-lid", (512, 512))
    save_pair(lid_inner, stage, base + "-lid-inner", (512, 512))
    save_pair(closed, stage, base + "-closed", (512, 512))
    save_pair(open_image, stage, base + "-open", (512, 512))

    for suffix, target_size in (("light", (512, 512)), ("rays", (1024, 1024))):
        old = v1_source(stage, f"{base}-{suffix}")
        save_pair(old, stage, f"{base}-{suffix}", target_size)

    card_model = load_model(GEN / paths["card"])
    card_mask = v1_source("common", "chest-card-front-common").getchannel("A")
    card_crop = alpha_bbox(card_model) or CARD_CROP
    card_texture = texture_on_canvas(card_model, card_crop, (0, 0, 1024, 1408), (1024, 1408))
    card = with_mask(card_texture, card_mask)
    save_pair(card, stage, f"chest-card-front-{stage}", (512, 704))


def build_shared() -> None:
    for stem, target in (("chest-shadow", (512, 256)), ("chest-sparkle", (128, 128))):
        save_pair(v1_source("shared", stem), "shared", stem, target)

    card_model = load_model(GEN / CARD_BACK)
    card_mask = v1_source("shared", "chest-card-back").getchannel("A")
    bbox = alpha_bbox(card_model) or (20, 0, 1004, 1536)
    card_texture = texture_on_canvas(card_model, bbox, (0, 0, 1024, 1408), (1024, 1408))
    card = with_mask(card_texture, card_mask)
    save_pair(card, "shared", "chest-card-back", (512, 704))


def load_v1_validator():
    path = ROOT / "tools" / "chest-assets" / "build-chest-assets.py"
    spec = importlib.util.spec_from_file_location("v1_chest_builder", path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    module.OUT = OUT
    module.ASSET_ROOT = ASSET_ROOT
    module.SRC_ROOT = SRC_ROOT
    module.PREVIEW_ROOT = PREVIEW_ROOT
    return module


def build_style_comparison() -> None:
    ref = load_rgba(GEN / SAPPHIRE_REFERENCE)
    bbox = alpha_bbox(ref) or (0, 0, ref.width, ref.height)
    ref = ref.crop(bbox)
    ref.thumbnail((390, 390), Image.Resampling.LANCZOS)
    board = Image.new("RGBA", (1040, 4 * 430 + 70), (8, 17, 31, 255))
    draw = ImageDraw.Draw(board)
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 24)
    for i, stage in enumerate(STAGES):
        chest = load_rgba(ASSET_ROOT / stage / f"chest-{stage}-closed.webp")
        chest.thumbnail((430, 430), Image.Resampling.LANCZOS)
        y = 50 + i * 430
        board.alpha_composite(chest, (40, y))
        board.alpha_composite(ref, (590 + (390 - ref.width) // 2, y + (390 - ref.height) // 2))
        draw.text((40, y - 32), stage.upper(), fill=(246, 214, 121, 255), font=font)
    draw.text((590, 12), "SAPPHIRE CROWN STYLE REFERENCE", fill=(230, 236, 247, 255), font=font)
    atomic_write(OUT / "style-comparison.png", png_bytes(board))


def write_imagegen_manifest() -> None:
    lines = [
        "# Image-generation manifest",
        "",
        "Every visible chest and card surface in V2 was generated with the built-in image model.",
        "Pillow is used only for whole-image fitting, alpha masks, layer separation, format conversion, previews and validation.",
        "No visible asset was constructed from geometric drawing primitives.",
        "",
        "Shared prompt anchor:",
        "",
        "> painted fantasy game asset, ornate treasure chest, front view, camera slightly above, soft studio light from top left, gold fittings with specular highlights, clean edges, no text, no watermark, isolated on plain background, centered, symmetrical",
        "",
        "| stage | closed | body edit | lid-inner edit | open edit | card front |",
        "|---|---|---|---|---|---|",
    ]
    for stage in STAGES:
        m = MODEL[stage]
        lines.append(f"| {stage} | {m['closed']} | {m['body']} | {m['lid_inner']} | {m['open']} | {m['card']} |")
    lines += ["", f"Card back: `{CARD_BACK}`", f"Comparison reference: `{SAPPHIRE_REFERENCE}`", ""]
    atomic_write(OUT / "imagegen-manifest.md", ("\n".join(lines)).encode())


def package_zip() -> Path:
    path = ROOT / "output" / "diceduel-chest-assets-v2.zip"
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED, compresslevel=7) as z:
        for p in sorted(q for q in OUT.rglob("*") if q.is_file()):
            z.writestr("diceduel-chest-assets-v2/" + str(p.relative_to(OUT)), p.read_bytes())
        z.writestr("diceduel-chest-assets-v2/tools/build-chest-assets-v2.py", Path(__file__).read_bytes())
        validator = Path(__file__).with_name("validate-chest-assets-v2.py")
        z.writestr("diceduel-chest-assets-v2/tools/validate-chest-assets-v2.py", validator.read_bytes())
    atomic_write(path, buf.getvalue())
    with zipfile.ZipFile(path) as z:
        assert z.testzip() is None
    return path


def main() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)
    for stage in STAGES:
        print(f"building {stage}", flush=True)
        build_stage(stage)
    build_shared()
    validator = load_v1_validator()
    rows = validator.validation_rows()
    validator.validate_exact(rows)
    validator.make_control_composites()
    validator.write_reports(rows)
    build_style_comparison()
    write_imagegen_manifest()
    zip_path = package_zip()
    print(json.dumps({
        "status": "PASS",
        "webp": len(list(ASSET_ROOT.glob("*/*.webp"))),
        "png_sources": len(list(SRC_ROOT.glob("*/*.png"))),
        "zip": str(zip_path),
        "zip_bytes": zip_path.stat().st_size,
    }, indent=2))


if __name__ == "__main__":
    main()
