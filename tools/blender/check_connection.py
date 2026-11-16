#!/usr/bin/env python3
"""Verify a local Blender process, scene round-trip and web-ready GLB export."""

import argparse
import json
from pathlib import Path
import shutil
import struct
import subprocess
import sys


def blender_worker(output):
    # Executed by Blender's Python, in a separate factory-startup process.
    import bpy

    blend = output / "connection.blend"
    glb = output / "connection.glb"
    original_objects = sorted(obj.name for obj in bpy.context.scene.objects)
    bpy.ops.wm.save_as_mainfile(filepath=str(blend))
    bpy.ops.export_scene.gltf(
        filepath=str(glb), export_format="GLB", export_cameras=False,
        export_lights=False,
    )
    bpy.ops.wm.open_mainfile(filepath=str(blend))
    report = {
        "blender_version": bpy.app.version_string,
        "blender_binary": bpy.app.binary_path,
        "background": bpy.app.background,
        "scene_objects": original_objects,
        "scene_reopened": (
            Path(bpy.data.filepath) == blend
            and sorted(obj.name for obj in bpy.context.scene.objects) == original_objects
        ),
        "blend": str(blend),
        "glb": str(glb),
    }
    (output / "connection.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8",
    )


def check_glb(path):
    data = path.read_bytes()
    if len(data) < 20:
        raise RuntimeError("Blender produced an incomplete GLB file")
    magic, version, length = struct.unpack_from("<4sII", data)
    chunk_length, chunk_type = struct.unpack_from("<II", data, 12)
    if (magic, version, length) != (b"glTF", 2, len(data)):
        raise RuntimeError("Invalid GLB 2.0 header")
    if chunk_type != 0x4E4F534A or 20 + chunk_length > len(data):
        raise RuntimeError("Invalid GLB JSON chunk")
    document = json.loads(data[20:20 + chunk_length])
    if document.get("asset", {}).get("version") != "2.0" or not document.get("meshes"):
        raise RuntimeError("GLB export has no glTF 2.0 mesh")
    return len(document["meshes"])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--blender", default="blender", help="Blender executable or full path")
    parser.add_argument("--output", required=True, type=Path, help="New or empty output directory")
    args = parser.parse_args()
    binary = shutil.which(args.blender)
    if not binary:
        parser.error("Blender was not found. Supply its executable with --blender.")
    output = args.output.expanduser().resolve()
    if output.exists() and (not output.is_dir() or any(output.iterdir())):
        parser.error("Choose a new or empty --output directory.")
    output.mkdir(parents=True, exist_ok=True)
    command = [
        binary, "--background", "--factory-startup", "--python-exit-code", "1",
        "--python", str(Path(__file__).resolve()), "--", "--blender-worker", str(output),
    ]
    try:
        result = subprocess.run(command, capture_output=True, text=True, timeout=90)
        log = output / "blender.log"
        log.write_text(result.stdout + result.stderr, encoding="utf-8")
        if result.returncode:
            raise RuntimeError(f"Blender exited with {result.returncode}; see {log}")
        report_file = output / "connection.json"
        report = json.loads(report_file.read_text(encoding="utf-8"))
        blend = output / "connection.blend"
        if not report["scene_reopened"] or not blend.is_file() or not blend.stat().st_size:
            raise RuntimeError("The Blender scene save/reopen check failed")
        report["exported_meshes"] = check_glb(output / "connection.glb")
        report["status"] = "ready"
        report_file.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
        print(json.dumps(report, ensure_ascii=False, indent=2))
    except (OSError, ValueError, KeyError, RuntimeError, subprocess.TimeoutExpired) as error:
        print(f"Blender connection check failed: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    worker_args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    if worker_args and worker_args[0] == "--blender-worker":
        blender_worker(Path(worker_args[1]))
    else:
        raise SystemExit(main())
