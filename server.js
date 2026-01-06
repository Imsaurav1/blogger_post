/************************************************
 * REQUIRED MODULES
 ************************************************/
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const slugify = require("slugify");
const path = require("path");

/************************************************
 * APP INIT
 ************************************************/
const app = express();

/************************************************
 * DATABASE CONNECTION
 ************************************************/
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.error("MongoDB Error:", err));

/************************************************
 * MIDDLEWARE
 ************************************************/
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true
  })
);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

/************************************************
 * DATABASE MODEL (INLINE)
 ************************************************/
const PostSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, unique: true },
    content: String, // FULL HTML
    category: String,
    author: { type: String, default: "Saurabh Kumar Jha" },
    published: { type: Boolean, default: true }
  },
  { timestamps: true }
);

const Post = mongoose.model("Post", PostSchema);

/************************************************
 * AUTH MIDDLEWARE
 ************************************************/
function isAdmin(req, res, next) {
  if (!req.session.admin) {
    return res.redirect("/admin");
  }
  next();
}

/************************************************
 * ========== ADMIN ROUTES (FIRST) ==========
 ************************************************/

// ADMIN LOGIN PAGE
app.get("/admin", (req, res) => {
  res.render("admin");
});

// ADMIN LOGIN LOGIC
app.post("/admin/login", (req, res) => {
  const { username, password } = req.body;

  if (
    username === process.env.ADMIN_USER &&
    password === process.env.ADMIN_PASS
  ) {
    req.session.admin = true;
    return res.redirect("/admin/new");
  }

  res.redirect("/admin");
});

// NEW POST PAGE
app.get("/admin/new", isAdmin, (req, res) => {
  res.render("admin");
});

// CREATE POST
app.post("/admin/create", isAdmin, async (req, res) => {
  const { title, content, category } = req.body;

  try {
    await Post.create({
      title,
      slug: slugify(title, { strict: true }),
      content,
      category
    });
    res.redirect("/");
  } catch (err) {
    res.send("Error creating post. Slug may already exist.");
  }
});

// LOGOUT
app.get("/admin/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

/************************************************
 * ========== PUBLIC ROUTES ==========
 ************************************************/

// HOME PAGE
app.get("/", async (req, res) => {
  const posts = await Post.find({ published: true }).sort({ createdAt: -1 });
  res.render("home", { posts });
});

// SINGLE POST (MUST BE LAST)
app.get("/:slug", async (req, res) => {
  const post = await Post.findOne({ slug: req.params.slug });

  if (!post) {
    return res.status(404).render("404");
  }

  res.render("post", { post });
});

/************************************************
 * 404 FALLBACK
 ************************************************/
app.use((req, res) => {
  res.status(404).render("404");
});

/************************************************
 * SERVER START
 ************************************************/
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
