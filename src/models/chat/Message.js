const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  chatRoomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatRoom',
    required: true
  },

  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },

  senderType: {
    type: String,
    enum: ['male', 'female'],
    required: true
  },

  type: {
    type: String,
    enum: ['text', 'image', 'video', 'audio', 'emoji'],
    required: true
  },

  content: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },

  mediaMetadata: {
    thumbnail: String,  // Thumbnail URL for videos/images
    duration: Number,   // Duration for audio/video (seconds)
    width: Number,      // Image/video dimensions
    height: Number,
    fileSize: Number,   // File size in bytes
    mimeType: String    // Original mime type
  },

  isMedia: {
    type: Boolean,
    default: false
  },

  isDeletedFor: [
    {
      type: mongoose.Schema.Types.ObjectId
    }
  ],

  expireAt: {
    type: Date
  },

  isDeletedForEveryone: {
    type: Boolean,
    default: false
  },

  deletedForEveryoneAt: {
    type: Date
  }

}, { timestamps: true });

// Add TTL index for automatic message deletion
messageSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Message', messageSchema);