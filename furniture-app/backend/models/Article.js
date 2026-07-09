import mongoose from "mongoose";

const articleSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  content: { type: String, required: true },
  image: { type: String, default: "" },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Represents the author (Admin)
  published_date: { type: Date, default: Date.now }
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

const Article = mongoose.models.Article || mongoose.model("Article", articleSchema);
export default Article;
