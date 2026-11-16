# Blender 项目接入

本项目可通过 Blender 命令行和 Python `bpy` 制作场景，并导出供网页使用的
glTF 2.0 / GLB。当前工作环境已安装 Blender 4.3.2。

## 检查连接

从最新 `main` 的仓库根目录运行：

```sh
python3 tools/blender/check_connection.py --output /tmp/winter-blender-check
```

输出目录需要是新目录或空目录。Blender 不在 PATH 时，可指定可执行文件：

```sh
python3 tools/blender/check_connection.py --blender /usr/bin/blender --output /tmp/winter-blender-check-2
```

检查会启动独立的后台 Blender，使用默认场景验证实际读写与导出：

- 保存 `connection.blend`，重新打开并确认场景物件一致。
- 导出 `connection.glb`，检查 GLB 2.0 文件结构和实际网格数据。
- 写出 `connection.json` 和 `blender.log`；全部通过后返回 `status: ready`。

这些文件是接入测试用的默认立方体场景。生日蛋糕等正式资产应另行制作、检查后，
再接入 `dist/assets/`。此工具在运行命令的机器上控制 Blender；当前使用的是工作
环境中的 Blender CLI，连接状态不代表个人电脑上的 Blender MCP 已连接。

## 后续制作

在 Blender 中执行项目脚本：

```sh
blender --background --factory-startup --python path/to/scene.py
```

编辑已有场景时，在命令中指定 `.blend` 路径。模型可导出为 GLB，静态画面可渲染
为图片；接入网页前，应核对移动端性能、纹理大小、灯光及交互坐标。
