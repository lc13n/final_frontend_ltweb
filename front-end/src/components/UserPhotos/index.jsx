import React, { useEffect, useState } from "react";
import {
  Card,
  CardMedia,
  CardContent,
  Typography,
  Divider,
  Link as MuiLink,
  CircularProgress,
  Box,
  TextField,
  Button,
} from "@mui/material";
import { Link, useParams, useNavigate } from "react-router-dom";

const BACKEND_URL = "http://localhost:8081";
export default function UserPhotos({ token, currentUser }) {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Quản lý state input bình luận cho mỗi photo
  const [newComments, setNewComments] = useState({});

  useEffect(() => {
    const fetchPhotos = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`${BACKEND_URL}/api/photosOfUser/${userId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.status === 401) {
          navigate("/login");
          return;
        }

        if (!res.ok) {
          setError("Không tìm thấy ảnh cho người dùng này.");
          setPhotos([]);
          setLoading(false);
          return;
        }

        const data = await res.json();
        setPhotos(data);
      } catch (err) {
        console.error("Lỗi khi fetch photos:", err);
        setError("Lỗi mạng khi tải ảnh.");
        setPhotos([]);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchPhotos();
    } else {
      navigate("/login");
    }
  }, [userId, token, navigate]);

  // Cập nhật bình luận
const updateComment = async (photoId, commentId) => {
  await fetch(
    `${BACKEND_URL}/api/photosOfUser/comment/${photoId}/${commentId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ comment: editText }),
    }
  );
  setEditId(null);
  window.location.reload();
};

// Xoá bình luận
const deleteComment = async (photoId, commentId) => {
  await fetch(
    `${BACKEND_URL}/api/photosOfUser/comment/${photoId}/${commentId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  window.location.reload();
};


  const handleCommentSubmit = async (photoId) => {
    const commentText = (newComments[photoId] || "").trim();
    if (!commentText) return;

    try {
      const res = await fetch(
        `${BACKEND_URL}/api/photosOfUser/comment/${photoId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ comment: commentText }),
        }
      );

      if (res.status === 401) {
        navigate("/login");
        return;
      }

      if (!res.ok) {
        alert("Gửi bình luận thất bại.");
        return;
      }

      const data = await res.json();

      setPhotos((prevPhotos) =>
        prevPhotos.map((p) =>
          p._id === photoId
            ? {
                ...p,
                comments: [
                  ...(p.comments || []),
                  {
                    _id: data.comment._id,
                    comment: data.comment.comment,
                    date_time: data.comment.date_time,
                    user: currentUser,
                  },
                ],
              }
            : p
        )
      );

      setNewComments((prev) => ({ ...prev, [photoId]: "" }));
    } catch (err) {
      console.error("Lỗi khi gửi bình luận:", err);
      alert("Không thể gửi bình luận do lỗi mạng.");
    }
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }

  return (
    <div>
      <Typography variant="h5" gutterBottom>
        Photos of User ID: {userId}
      </Typography>

      {photos.length > 0 ? (
        photos.map((photo) => (
          <Card key={photo._id} sx={{ mb: 4 }}>
            <CardMedia
              component="img"
              image={`${BACKEND_URL}/api/photosOfUser/file/${photo.file_name}`}
              // image={require(`../../images/${photo.file_name}`)}
              alt={`Photo by User ID: ${userId}`}
              sx={{
                width: 300,
                maxHeight: 400,
                objectFit: "cover",
                mx: "auto",
                mt: 2,
              }}
            />

            <CardContent>
              <Typography variant="body2" color="text.secondary">
                {new Date(photo.date_time).toLocaleString()}
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Typography variant="h6" gutterBottom>
                Comments
              </Typography>

              {photo.comments && photo.comments.length > 0 ? (
                photo.comments.map((c, idx) => (
                  <Box key={idx} sx={{ mb: 2 }}>
                    <MuiLink
                      component={Link}
                      to={`/users/${c.user._id}`}
                      underline="hover"
                      variant="subtitle2"
                    >
                      {c.user.first_name} {c.user.last_name}
                    </MuiLink>

                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                    >
                      {new Date(c.date_time).toLocaleString()}
                    </Typography>

                    <Typography variant="body2">{c.comment}</Typography>

                    <Divider sx={{ mt: 1 }} />
                  </Box>
                ))
              ) : (
                <Typography variant="body2">No comments.</Typography>
              )}

              <Typography variant="body2">{c.comment}</Typography>

              {c.user_id === currentUser._id && (
                <Box mt={1}>
                  <Button
                    size="small"
                    onClick={() => {
                      setEditId(c._id);
                      setEditText(c.comment);
                    }}
                  >
                    Sửa
                  </Button>
              
                  <Button
                    size="small"
                    color="error"
                    onClick={() => deleteComment(photo._id, c._id)}
                  >
                    Xoá
                  </Button>
                </Box>
              )}

              {/* Phần thêm comment mới */}
              <TextField
                variant="outlined"
                size="small"
                fullWidth
                value={newComments[photo._id] || ""}
                onChange={(e) =>
                  setNewComments((prev) => ({
                    ...prev,
                    [photo._id]: e.target.value,
                  }))
                }
                placeholder="Viết bình luận..."
                sx={{ mt: 2 }}
              />

              <Button
                variant="contained"
                size="small"
                sx={{ mt: 1 }}
                onClick={() => handleCommentSubmit(photo._id)}
              >
                Gửi
              </Button>
            </CardContent>
          </Card>
        ))
      ) : (
        <Typography variant="body2">No photos found for this user.</Typography>
      )}
    </div>
  );
}
