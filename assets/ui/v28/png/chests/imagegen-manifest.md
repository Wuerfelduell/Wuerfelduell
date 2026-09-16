# Image-generation manifest

Every visible chest and card surface in V2 was generated with the built-in image model.
Pillow is used only for whole-image fitting, alpha masks, layer separation, format conversion, previews and validation.
No visible asset was constructed from geometric drawing primitives.

Shared prompt anchor:

> painted fantasy game asset, ornate treasure chest, front view, camera slightly above, soft studio light from top left, gold fittings with specular highlights, clean edges, no text, no watermark, isolated on plain background, centered, symmetrical

| stage | closed | body edit | lid-inner edit | open edit | card front |
|---|---|---|---|---|---|
| common | exec-173660b4-67b4-46f2-b8e9-cab6fdd9a0e9.png | exec-ba33bb7a-a397-441f-8d79-4df9318de173.png | exec-585060aa-e943-404a-81bb-922a6c79c0e6.png | exec-bfc85d21-8bcb-419e-bfbb-7efa8675ecba.png | exec-d2f34284-181f-4b7a-a268-9ea5f2cdc0e4.png |
| rare | exec-85047ef5-a357-4262-ad74-a3b644105b84.png | exec-671e6ef1-9c8a-4423-bd52-c9d9225efba8.png | exec-40bfba3b-aa77-4b97-bc0d-915fae0e86f2.png | exec-cb65e3fc-c443-4b33-a96d-1aa884188832.png | exec-5589962d-3ce7-4891-a245-30da25d9fbeb.png |
| epic | exec-c867a111-5616-4733-9b7e-e82c23793ebd.png | exec-4d904ab9-f615-4bce-b99b-8beef63d85e3.png | exec-59caaab1-471b-4425-9516-6432ec24b715.png | exec-9c571dc6-f969-45d3-b7c4-f7291512f01e.png | exec-48f1044a-b3d0-420a-9252-e2857260d4e7.png |
| legendary | exec-b450e667-2d02-41b0-bfd6-d39432b7f694.png | exec-f4162efa-97c6-4a15-b7ed-579bea35119e.png | exec-afbc4609-8466-4300-a45f-4ed4fcef750c.png | exec-1153c940-8bff-47e0-a807-5e94caa52636.png | exec-dd8d67ca-7238-4c73-b522-8738c4840389.png |

Card back: `exec-96a96a3c-4f77-4a41-9dca-71a03474cb03.png`
Comparison reference: `exec-0f8d3b51-a0c1-465e-9e86-dd2ee2e97f6c.png`
