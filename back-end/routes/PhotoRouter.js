// routes/PhotoRouter.js

const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const Photo = require("../db/photoModel.js");
const User = require("../db/userModel.js");
const verifyToken = require("../middleware/verifyToken");

// ----------------------
// 1) Cấu hình Multer để lưu file vào ./images
// ----------------------

// Thư mục images nằm ở gốc project (cùng cấp với index.js)
const IMAGE_DIR = path.join(__dirname, "../images");
if (!fs.existsSync(IMAGE_DIR)) {
  fs.mkdirSync(IMAGE_DIR);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, IMAGE_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, uniqueSuffix + ext);
  },
});

function fileFilter(req, file, cb) {
  const allowedExts = [".jpg", ".jpeg", ".png", ".gif"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new Error("Chỉ chấp nhận định dạng ảnh: .jpg, .jpeg, .png, .gif"),
      false
    );
  }
}

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

router.get("/file/:filename", (req, res) => {
  const filename = req.params.filename;
  if (filename.includes("..")) {
    return res.status(400).json({ error: "Invalid filename" });
  }
  const fullPath = path.join(IMAGE_DIR, filename);
  fs.stat(fullPath, (err, stats) => {
    if (err || !stats.isFile()) {
      return res.status(404).json({ error: "File not found" });
    }
    return res.sendFile(fullPath);
  });
});

router.use(verifyToken);

router.post("/new", upload.single("photo"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Chưa có file ảnh được gửi lên." });
  }

  const userId = req.userId;
  const savedFileName = req.file.filename;

  try {
    const newPhoto = new Photo({
      file_name: savedFileName,
      date_time: new Date(),
      user_id: userId,
      comments: [],
    });
    await newPhoto.save();

    return res.status(200).json({
      message: "Ảnh đã được upload và lưu thành công",
      photo: {
        _id: newPhoto._id,
        file_name: newPhoto.file_name,
        date_time: newPhoto.date_time,
        user_id: newPhoto.user_id,
      },
    });
  } catch (err) {
    console.error("Lỗi khi tạo Photo object:", err);
    return res.status(500).json({ error: "Lỗi máy chủ khi lưu ảnh." });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(400).json({ error: "ID người dùng không hợp lệ." });
    }

    const photos = await Photo.find({ user_id: req.params.id });

    const result = await Promise.all(
      photos.map(async (photo) => {
        const photoObj = {
          _id: photo._id,
          user_id: photo.user_id,
          file_name: photo.file_name,
          date_time: photo.date_time,
          comments: [],
        };

        for (const comment of photo.comments) {
          const commenter = await User.findById(
            comment.user_id,
            "_id first_name last_name"
          );
          if (commenter) {
            photoObj.comments.push({
              _id: comment._id,
              comment: comment.comment,
              date_time: comment.date_time,
              user: commenter,
            });
          }
        }

        return photoObj;
      })
    );

    return res.status(200).json(result);
  } catch (err) {
    console.error("Lỗi GET /api/photosOfUser/:id:", err);
    return res.status(400).json({
      error: "Lỗi trong quá trình truy vấn ảnh hoặc ID không hợp lệ.",
    });
  }
});

router.post("/comment/:photo_id", async (req, res) => {
  const { photo_id } = req.params;
  const { comment } = req.body;
  const userId = req.userId;

  if (!comment || !comment.trim()) {
    return res.status(400).json({ error: "Bình luận không được để trống." });
  }

  try {
    const photo = await Photo.findById(photo_id);
    if (!photo) {
      return res.status(404).json({ error: "Không tìm thấy ảnh." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "Không tìm thấy user." });
    }

    const newComment = {
      comment: comment.trim(),
      date_time: new Date(),
      user_id: user._id,
    };

    photo.comments.push(newComment);
    await photo.save();

    return res.status(200).json({
      message: "Thêm bình luận thành công",
      comment: newComment,
    });
  } catch (err) {
    console.error("Lỗi thêm bình luận:", err);
    return res.status(500).json({ error: "Lỗi máy chủ." });
  }
});

router.put("/comment/:photo_id/:comment_id", async (req, res) => {
  const { photo_id, comment_id } = req.params;
  const userId = req.userId;
  const text = (req.body.comment || "").trim();

  if (!text) return res.status(400).json({ error: "Bình luận trống." });

  try {
    const photo = await Photo.findById(photo_id);
    const comment = photo?.comments.id(comment_id);

    if (!photo || !comment)
      return res.status(404).json({ error: "Không tìm thấy ảnh hoặc bình luận." });

    if (comment.user_id.toString() !== userId)
      return res.status(403).json({ error: "Không có quyền sửa." });

    comment.comment = text;
    await photo.save();

    res.json({ message: "Đã sửa bình luận.", comment });
  } catch (err) {
    console.error("Lỗi sửa bình luận:", err);
    res.status(500).json({ error: "Lỗi máy chủ." });
  }
});


module.exports = router;
