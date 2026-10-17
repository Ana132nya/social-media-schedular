const express = require("express");
const multer = require("multer");
const path = require("node:path");
const fs = require("node:fs");

const router = express.Router();

const UPLOADS_DIR = path.join(__dirname, "..", "uploads");

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer disk storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const sanitizedExt = path.extname(file.originalname).toLowerCase() || ".png";
    cb(null, `upload-${uniqueSuffix}${sanitizedExt}`);
  },
});

// File filter for image types only
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/svg+xml",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files (JPG, PNG, WebP, GIF, SVG) are allowed"), false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  },
  fileFilter,
});

// Upload endpoint accepts 'image' or 'file' field
router.post("/", (req, res) => {
  const uploadSingle = upload.fields([
    { name: "image", maxCount: 1 },
    { name: "file", maxCount: 1 },
  ]);

  uploadSingle(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "File size exceeds 10MB limit" });
      }
      return res.status(400).json({ message: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }

    const uploadedFile = (req.files?.image && req.files.image[0]) || (req.files?.file && req.files.file[0]);

    if (!uploadedFile) {
      return res.status(400).json({ message: "Please select an image file to upload" });
    }

    const fileUrl = `/uploads/${uploadedFile.filename}`;

    return res.status(201).json({
      message: "Image uploaded successfully",
      url: fileUrl,
      filename: uploadedFile.filename,
      originalName: uploadedFile.originalname,
      mimetype: uploadedFile.mimetype,
      size: uploadedFile.size,
    });
  });
});

module.exports = router;
