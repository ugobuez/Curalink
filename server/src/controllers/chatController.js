import { Conversation } from "../models/Conversation.js";

export async function chatHistoryController(req, res) {
  const { conversationId, userId } = req.query;
  const query = {};

  if (conversationId) query._id = conversationId;
  if (userId) query.userId = userId;

  const conversations = await Conversation.find(query).sort({ updatedAt: -1 }).limit(20).lean();
  return res.status(200).json({ conversations });
}
