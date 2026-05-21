const path = require("path");

const OSS = require("ali-oss");
const dotenv = require("dotenv");
const express = require("express");
const multer = require("multer");

dotenv.config();

const app = express();
const host = process.env.HOST || "0.0.0.0";
const port = Number(process.env.PORT || 3000);

const requiredEnv = [
  "OSS_REGION",
  "OSS_BUCKET",
  "OSS_ACCESS_KEY_ID",
  "OSS_ACCESS_KEY_SECRET",
];

const missingEnv = requiredEnv.filter((key) => !process.env[key]);
const ossEnabled = missingEnv.length === 0;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});

let ossClient = null;

if (ossEnabled) {
  ossClient = new OSS({
    region: process.env.OSS_REGION,
    bucket: process.env.OSS_BUCKET,
    accessKeyId: process.env.OSS_ACCESS_KEY_ID,
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
    secure: true,
  });
} else {
  console.warn(
    `[upload disabled] missing OSS config: ${missingEnv.join(", ")}`
  );
}

function normalizeBaseUrl(url) {
  if (!url) return null;
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function parseBooleanEnv(value, fallback = false) {
  if (value == null || value === "") {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function resolveObjectExtension(mimetype) {
  if (mimetype === "image/png") return ".png";
  if (mimetype === "image/webp") return ".webp";
  return ".jpg";
}

function buildObjectKey(extension) {
  const prefix = (process.env.OSS_OBJECT_PREFIX || "welcoming-pine").replace(
    /^\/+|\/+$/g,
    ""
  );
  const useDatePath = parseBooleanEnv(process.env.OSS_OBJECT_DATE_PATH, true);
  const now = new Date();
  const timestamp = [
    now.getUTCFullYear(),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
    String(now.getUTCDate()).padStart(2, "0"),
    "-",
    String(now.getUTCHours()).padStart(2, "0"),
    String(now.getUTCMinutes()).padStart(2, "0"),
    String(now.getUTCSeconds()).padStart(2, "0"),
  ].join("");
  const fileName = `Welcoming_Pine-${timestamp}${extension}`;

  if (!prefix) {
    return fileName;
  }

  if (!useDatePath) {
    return `${prefix}/${fileName}`;
  }
  const datePath = [
    now.getUTCFullYear(),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
    String(now.getUTCDate()).padStart(2, "0"),
  ].join("-");

  return `${prefix}/${datePath}/${fileName}`;
}

function buildPublicUrl(objectKey) {
  const customBaseUrl = normalizeBaseUrl(process.env.OSS_PUBLIC_BASE_URL);
  if (customBaseUrl) {
    return `${customBaseUrl}/${objectKey}`;
  }

  return `https://${process.env.OSS_BUCKET}.${process.env.OSS_REGION}.aliyuncs.com/${objectKey}`;
}

app.use("/static", express.static(path.join(__dirname, "static")));

app.get("/son.css", (_req, res) => {
  res.sendFile(path.join(__dirname, "son.css"));
});

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "son.html"));
});

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    ossEnabled,
  });
});

app.post("/api/upload", upload.single("image"), async (req, res) => {
  if (!ossEnabled || !ossClient) {
    return res.status(503).json({
      error: "OSS is not configured on the server.",
      missingEnv,
    });
  }

  if (!req.file) {
    return res.status(400).json({
      error: "No image file was provided.",
    });
  }

  try {
    const extension = resolveObjectExtension(req.file.mimetype);
    const objectKey = buildObjectKey(extension);

    await ossClient.put(objectKey, req.file.buffer, {
      headers: {
        "Content-Type": req.file.mimetype || "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });

    return res.json({
      url: buildPublicUrl(objectKey),
      objectKey,
    });
  } catch (error) {
    console.error("[upload failed]", error);
    return res.status(500).json({
      error: "Failed to upload image to OSS.",
    });
  }
});

app.listen(port, host, () => {
  const displayHost = host === "0.0.0.0" ? "localhost" : host;
  console.log(`Welcoming Pine server listening on http://${displayHost}:${port}`);
  if (host === "0.0.0.0") {
    console.log(
      `LAN access enabled. Open http://<this-machine-ip>:${port} from devices on the same network.`
    );
  }
});
