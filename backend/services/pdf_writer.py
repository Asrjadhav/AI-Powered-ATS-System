"""
A small PDF writer with no third-party library.

It supports exactly what the offer letter needs: the PDF standard fonts (Times, Helvetica),
wrapped paragraphs made of mixed regular / bold / superscript runs, lines, filled polygons and
full-page PNG images (the letterhead). Text is written uncompressed, so the PDF text can be read back
(and tested) directly.

Coordinates are PDF points with the origin at the bottom-left of an A4 page.
"""

import re
import struct
from dataclasses import dataclass, replace
from typing import List, Sequence, Tuple

from services.pdf_font_metrics import WIDTHS

PAGE_WIDTH = 595.28
PAGE_HEIGHT = 841.89

BASE_FONTS = {"T": "Times-Roman", "TB": "Times-Bold", "H": "Helvetica", "HB": "Helvetica-Bold"}
_FONT_OBJECT_IDS = {"T": 3, "TB": 4, "H": 5, "HB": 6}
Color = Tuple[float, float, float]
BLACK: Color = (0.0, 0.0, 0.0)


def rgb(hex_color: str) -> Color:
    value = hex_color.lstrip("#")
    return tuple(int(value[i:i + 2], 16) / 255.0 for i in (0, 2, 4))  # type: ignore[return-value]


def text_width(text: str, font: str, size: float) -> float:
    table = WIDTHS[font]
    default = table["n"]
    return sum(table.get(ch, default) for ch in text) * size / 1000.0


def _pdf_string(text: str) -> bytes:
    raw = text.encode("cp1252", "replace")
    return raw.replace(b"\\", b"\\\\").replace(b"(", b"\\(").replace(b")", b"\\)")


def _num(value: float) -> str:
    return f"{value:.2f}".rstrip("0").rstrip(".") or "0"


@dataclass(frozen=True)
class Run:
    """A piece of text in one style. `rise` > 0 raises it (superscript) and is used with a smaller size."""
    text: str
    font: str = "T"
    size: float = 12.0
    rise: float = 0.0
    color: Color = BLACK
    underline: bool = False


def superscript(text: str, font: str, size: float, color: Color = BLACK) -> Run:
    return Run(text, font, size * 0.62, rise=size * 0.38, color=color)


def wrap(runs: Sequence[Run], max_width: float) -> List[List[Run]]:
    """Breaks runs into lines no wider than max_width, keeping each piece's own style.

    Text that touches across runs ("10" then a superscript "th") is one word and is never split.
    """
    lines: List[List[Run]] = [[]]
    state = {"width": 0.0}
    word: List[Run] = []

    def trim(line: List[Run]) -> None:
        while line and line[-1].text.isspace():
            state["width"] -= text_width(line[-1].text, line[-1].font, line[-1].size)
            line.pop()

    def flush() -> None:
        nonlocal word
        if not word:
            return
        word_width = line_width(word)
        if state["width"] + word_width > max_width and lines[-1]:
            trim(lines[-1])
            lines.append([])
            state["width"] = 0.0
        lines[-1].extend(word)
        state["width"] += word_width
        word = []

    for run in runs:
        for token in re.findall(r"\s+|\S+", run.text):
            piece = replace(run, text=token)
            if token.isspace():
                flush()
                if lines[-1]:
                    lines[-1].append(piece)
                    state["width"] += text_width(token, run.font, run.size)
            else:
                word.append(piece)
    flush()
    trim(lines[-1])
    return [line for line in lines if line]


def line_width(runs: Sequence[Run]) -> float:
    return sum(text_width(r.text, r.font, r.size) for r in runs)


class Page:
    def __init__(self) -> None:
        self._ops: List[bytes] = []
        self._image_names: List[str] = []

    # -- shapes
    def fill_polygon(self, points: Sequence[Tuple[float, float]], color: Color) -> None:
        path = " ".join(
            f"{_num(x)} {_num(y)} {'m' if i == 0 else 'l'}" for i, (x, y) in enumerate(points)
        )
        self._ops.append(f"{_num(color[0])} {_num(color[1])} {_num(color[2])} rg {path} h f".encode())

    def line(self, x1: float, y1: float, x2: float, y2: float, color: Color = BLACK, width: float = 1.0) -> None:
        self._ops.append(
            f"{_num(width)} w {_num(color[0])} {_num(color[1])} {_num(color[2])} RG "
            f"{_num(x1)} {_num(y1)} m {_num(x2)} {_num(y2)} l S".encode()
        )

    def image(self, name: str, x: float, y: float, width: float, height: float) -> None:
        if name not in self._image_names:
            self._image_names.append(name)
        self._ops.append(f"q {_num(width)} 0 0 {_num(height)} {_num(x)} {_num(y)} cm /{name} Do Q".encode())

    # -- text
    def text_line(self, x: float, y: float, runs: Sequence[Run]) -> float:
        """Draws runs on one baseline starting at x; returns the x where the line ends."""
        if not runs:
            return x
        parts = [f"BT {_num(x)} {_num(y)} Td".encode()]
        cursor = x
        underlines = []
        for run in runs:
            parts.append(
                f"/{run.font} {_num(run.size)} Tf {_num(run.rise)} Ts "
                f"{_num(run.color[0])} {_num(run.color[1])} {_num(run.color[2])} rg (".encode()
                + _pdf_string(run.text) + b") Tj"
            )
            width = text_width(run.text, run.font, run.size)
            if run.underline and run.text.strip():
                underlines.append((cursor, cursor + width, run.size, run.color))
            cursor += width
        parts.append(b"0 Ts ET")
        self._ops.append(b" ".join(parts))
        for start, end, size, color in underlines:
            self.line(start, y - size * 0.14, end, y - size * 0.14, color, max(0.5, size * 0.05))
        return cursor

    def paragraph(self, x: float, y: float, runs: Sequence[Run], max_width: float, leading: float) -> float:
        """Draws wrapped runs starting with the first baseline at y; returns the baseline for the next line."""
        for line in wrap(runs, max_width):
            self.text_line(x, y, line)
            y -= leading
        return y

    def centered(self, center_x: float, y: float, runs: Sequence[Run]) -> None:
        self.text_line(center_x - line_width(runs) / 2.0, y, runs)

    def right_aligned(self, right_x: float, y: float, runs: Sequence[Run]) -> None:
        self.text_line(right_x - line_width(runs), y, runs)

    def content(self) -> bytes:
        return b"\n".join(self._ops)

    @property
    def image_names(self) -> List[str]:
        return list(self._image_names)


# ---------------------------------------------------------------- PNG images

PNG_SIGNATURE = bytes([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])

def read_png(data: bytes) -> Tuple[int, int, bytes]:
    """Reads an 8-bit RGB, non-interlaced PNG. Returns (width, height, the zlib-compressed pixel data).

    PDF can decode PNG's own compression and row filters (Predictor 15), so the compressed data is
    embedded as it is instead of being decoded here.
    """
    if data[:8] != PNG_SIGNATURE:
        raise ValueError("Not a PNG file.")
    pos, header, idat = 8, None, []
    while pos < len(data):
        length, kind = struct.unpack(">I4s", data[pos:pos + 8])
        chunk = data[pos + 8:pos + 8 + length]
        if kind == b"IHDR":
            header = struct.unpack(">IIBBBBB", chunk)
        elif kind == b"IDAT":
            idat.append(chunk)
        pos += 12 + length
    if header is None:
        raise ValueError("PNG header missing.")
    width, height, bit_depth, color_type, _compression, _filter, interlace = header
    if bit_depth != 8 or color_type != 2 or interlace != 0:
        raise ValueError("Only non-interlaced 8-bit RGB PNG images are supported.")
    return width, height, b"".join(idat)


# ---------------------------------------------------------------- the document

class PdfDocument:
    def __init__(self) -> None:
        self._pages: List[Page] = []
        self._images: dict = {}  # name -> (width, height, compressed pixels)

    def add_page(self) -> Page:
        page = Page()
        self._pages.append(page)
        return page

    def add_png(self, name: str, png_bytes: bytes) -> None:
        self._images[name] = read_png(png_bytes)

    def to_bytes(self) -> bytes:
        objects: List[bytes] = [b""] * 6  # 1 catalog, 2 pages, 3-6 fonts (filled below)
        objects[2] = b"<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman /Encoding /WinAnsiEncoding >>"
        objects[3] = b"<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold /Encoding /WinAnsiEncoding >>"
        objects[4] = b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"
        objects[5] = b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"

        def add(body: bytes) -> int:
            objects.append(body)
            return len(objects)

        image_ids = {}
        for name, (width, height, packed) in self._images.items():
            image_ids[name] = add(
                b"<< /Type /XObject /Subtype /Image /Width %d /Height %d /ColorSpace /DeviceRGB "
                b"/BitsPerComponent 8 /Filter /FlateDecode "
                b"/DecodeParms << /Predictor 15 /Colors 3 /BitsPerComponent 8 /Columns %d >> /Length %d >>\nstream\n"
                % (width, height, width, len(packed)) + packed + b"\nendstream"
            )

        page_ids = []
        for page in self._pages:
            stream = page.content()
            content_id = add(b"<< /Length %d >>\nstream\n" % len(stream) + stream + b"\nendstream")
            xobjects = "".join(f"/{n} {image_ids[n]} 0 R " for n in page.image_names)
            fonts = " ".join(f"/{key} {obj_id} 0 R" for key, obj_id in _FONT_OBJECT_IDS.items())
            page_ids.append(add(
                f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {_num(PAGE_WIDTH)} {_num(PAGE_HEIGHT)}] "
                f"/Resources << /Font << {fonts} >> /XObject << {xobjects}>> >> /Contents {content_id} 0 R >>".encode()
            ))

        objects[0] = b"<< /Type /Catalog /Pages 2 0 R >>"
        kids = " ".join(f"{i} 0 R" for i in page_ids)
        objects[1] = f"<< /Type /Pages /Kids [{kids}] /Count {len(page_ids)} >>".encode()

        pdf = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
        offsets = []
        for number, body in enumerate(objects, start=1):
            offsets.append(len(pdf))
            pdf += b"%d 0 obj\n" % number + body + b"\nendobj\n"
        xref_at = len(pdf)
        pdf += b"xref\n0 %d\n0000000000 65535 f \n" % (len(objects) + 1)
        for offset in offsets:
            pdf += b"%010d 00000 n \n" % offset
        pdf += b"trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n" % (len(objects) + 1, xref_at)
        return bytes(pdf)
