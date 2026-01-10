const mongoose = require('mongoose');

const chatRoomSchema = new mongoose.Schema({
  participants: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
      },
      userType: {
        type: String,
        enum: ['male', 'female'],
        required: true
      }
    }
  ],

  isDisappearing: {
    type: Boolean,
    default: false
  },

  disappearingAfterHours: {
    type: Number,
    default: 24
  },

  lastMessage: {
    type: String
  },

  lastMessageAt: {
    type: Date
  },

  roomKey: {
    type: String,
    unique: true,
    index: true
  },

  isDeletedFor: [
    {
      type: mongoose.Schema.Types.ObjectId
    }
  ],

  lastReadBy: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
      },
      userType: {
        type: String,
        enum: ['male', 'female'],
        required: true
      },
      lastReadAt: {
        type: Date,
        default: Date.now
      }
    }
  ],

  disappearingEnabledBy: {
    userId: {
      type: mongoose.Schema.Types.ObjectId
    },
    userType: {
      type: String,
      enum: ['male', 'female']
    },
    enabledAt: {
      type: Date,
      default: Date.now
    }
  }

}, { timestamps: true });

// Create unique index on roomKey
chatRoomSchema.index({ roomKey: 1 }, { unique: true });

module.exports = mongoose.model('ChatRoom', chatRoomSchema);