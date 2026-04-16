import mongoose from "mongoose";

const sourceItemSchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    source: { type: String, required: true },
    title: { type: String, required: true },
    summary: String,
    url: String,
    metadata: mongoose.Schema.Types.Mixed,
    score: Number
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
    structuredResponse: {
      answer: String,
      publications: [sourceItemSchema],
      clinicalTrials: [sourceItemSchema]
    }
  },
  { timestamps: true, _id: false }
);

const conversationSchema = new mongoose.Schema(
  {
    userId: { type: String, index: true },
    messages: [messageSchema]
  },
  { timestamps: true }
);

export const Conversation = mongoose.model("Conversation", conversationSchema);
