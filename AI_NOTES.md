# AI Notes

这个文件给后续接手本仓库的 AI / agent 使用，记录已经确认过的关键约束，避免重复踩坑。

## 接手分界

当前仓库已经标记出“接手前 / 接手后起点”的分界，后续排查问题或回看版本时优先使用这两个 tag：

- `before-takeover` -> `f05eff9`
- `after-takeover-start` -> `cd4e4a3`

含义：

- `f05eff9` 是接手前最后一个提交，作者是 `琪`
- `cd4e4a3` 是接手后第一个提交，作者是 `GitHub0327`

常用命令：

```bash
git diff before-takeover after-takeover-start
git switch --detach before-takeover
git switch --detach after-takeover-start
git switch main
```

说明：

- 如果工作区有未提交改动，切版本前先提交或 `git stash`
- 需要继续新增阶段分界时，优先继续使用 tag，而不是只靠口头描述

## 项目结构

- `son.html`：主交互页面，绝大多数前端逻辑都在这里
- `son.css`：页面样式
- `server.js`：Node.js + Express 后端，负责接收图片并上传到 OSS
- `static/`：前端素材目录

## 保存与导出

当前“保存”功能的正确行为是：

1. 导出对象是左侧 `.left` 区域
2. 导出内容必须是“滚动条位于最左侧时”的完整页面状态
3. 不能导出当前滚动位置
4. 不能在导出时让现场页面发生明显位移或闪烁

当前实现方式：

- 使用离屏 clone 渲染，不直接修改正在展示的 `.left`
- 导出副本中：
  - `scrollLeft = 0`
  - `scrollTop = 0`
  - 所有 `.parallax` 元素的 `transform` 被重置为 `translateX(0px)`
- 使用 `html2canvas` 渲染后，再做内容裁切
- 裁切完成后补白底

## 已确认过的坑

### 1. 不要直接改 live DOM 导出

之前通过修改 `.left` 的 `overflow` / `width` / `height` 做导出，会导致页面明显闪动和位移。

结论：

- 导出必须在离屏副本上完成

### 2. 不要把导出范围绑定到当前滚动状态

页面滚动时，`.parallax` 元素会被写入行内 `transform`。即使 clone 的容器滚动归零，如果不手动重置这些 `transform`，导出仍然会保留“当前滚动后”的状态。

结论：

- 导出时必须清零 `.parallax` 的位移

### 3. 线条粗细问题和视口有关

枝干黑线宽度来自滑杆写入的 `px` 值，但很多布局位置来自 `vw`。如果导出时把 `html2canvas` 的 `windowWidth` 改成整张长图宽度，会让整体比例关系变化，导致枝干在导出图里看起来明显变细。

结论：

- 不要把 `windowWidth` 改成 `exportClone.scrollWidth`
- 当前导出使用浏览器当前视口尺寸作为 `windowWidth` / `windowHeight`

### 4. 空白裁切必须基于透明背景

如果 `html2canvas` 使用默认白底，整张图都是不透明的，后续按透明像素裁切空白不会生效。

结论：

- 渲染时使用 `backgroundColor: null`
- 裁切后再手动铺白底

### 5. PNG 曾导致上传失败

导出为 PNG 时，长图文件体积明显增大，容易触发上传失败或变慢。

结论：

- 当前导出格式使用 `JPEG`
- 后端上传限制已经提高到 `50MB`

## OSS 配置规则

环境变量说明：

- `OSS_BUCKET` 只能填 bucket 名，不能带路径
- 路径前缀放在 `OSS_OBJECT_PREFIX`

正确例子：

```env
OSS_BUCKET=lirujinzhi-web
OSS_OBJECT_PREFIX=media/welcoming-pine-result
```

以上会生成：

```text
media/welcoming-pine-result/<uuid>.jpg
```

错误例子：

```env
OSS_BUCKET=lirujinzhi-web/media/
```

### 路径策略

- 默认带日期目录
- 默认生成 `prefix/YYYY-MM-DD/uuid.ext`
- 如果显式设置 `OSS_OBJECT_DATE_PATH=false`，才会退回到 `prefix/uuid.ext`

## 当前期望行为

保存成功时：

- 上传到 OSS
- 返回公开 URL
- 前端展示二维码
- 保存流程开始后，页面其它交互会被锁定
- 二维码弹层出现后，只有点击卡片内 `关闭` 才会恢复操作

交互快捷键：

- 按 `F` 进入全屏
- 再按一次 `F` 退出全屏
- 这个能力不要在页面 UI 中额外展示，只保留在文档说明中

上传失败时：

- 自动回退到本地下载
- 兜底下载完成后应自动解除交互锁定

重置行为：

- `Reset` 需要恢复关键词勾选状态、图像显隐、枝干粗细、像素化效果、随机诗句、图片位置、滚动位置和保存弹层状态

## 修改建议

后续如果要继续改“保存/导出”逻辑，请遵守：

1. 一次只改一个问题
2. 不要同时改导出比例、裁切规则、上传格式、滚动状态
3. 每次改动后优先验证这四件事：
   - 页面保存时是否闪烁
   - 导出是否是最左侧完整状态
   - 枝干粗细是否与页面一致
   - 导出图是否没有多余大面积空白
