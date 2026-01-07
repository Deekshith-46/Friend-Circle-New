const MaleUser = require('../../models/maleUser/MaleUser');
const FemaleUser = require('../../models/femaleUser/FemaleUser');
const CallHistory = require('../../models/common/CallHistory');

// Get call history for female user (same logic as male user)
exports.getCallHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 50, skip = 0 } = req.query;

    // Find calls where the user is either caller or receiver
    const calls = await CallHistory.find({
      $or: [
        { callerId: userId },
        { receiverId: userId }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    // Transform the calls to include user details
    const transformedCalls = await Promise.all(calls.map(async (call) => {
      // Determine the other user based on the current user's role
      let otherUser;
      let otherUserId;
      let otherUserType;
      let profileImageUrl = null;
      
      if (call.callerId.toString() === userId.toString()) {
        // Current user (female) is caller, other user is receiver (male)
        otherUser = await MaleUser.findById(call.receiverId).select('firstName lastName images');
        otherUserId = call.receiverId;
        otherUserType = 'male';
        
        // Get the first image as profile picture
        if (otherUser && otherUser.images && otherUser.images.length > 0) {
          const firstImageId = otherUser.images[0];
          const MaleImage = require('../../models/maleUser/Image');
          const imageDoc = await MaleImage.findById(firstImageId);
          if (imageDoc) {
            profileImageUrl = imageDoc.imageUrl;
          }
        }
      } else {
        // Current user (female) is receiver, other user is caller (male)
        otherUser = await MaleUser.findById(call.callerId).select('firstName lastName images');
        otherUserId = call.callerId;
        otherUserType = 'male';
        
        // Get the first image as profile picture
        if (otherUser && otherUser.images && otherUser.images.length > 0) {
          const firstImageId = otherUser.images[0];
          const MaleImage = require('../../models/maleUser/Image');
          const imageDoc = await MaleImage.findById(firstImageId);
          if (imageDoc) {
            profileImageUrl = imageDoc.imageUrl;
          }
        }
      }
      
      // Build the name properly for male users
      let userName = 'Unknown User';
      if (otherUser) {
        if (otherUserType === 'male') {
          // Male users have firstName and lastName
          userName = `${otherUser.firstName || ''} ${otherUser.lastName || ''}`.trim();
          if (!userName) userName = 'Unknown User';
        } else {
          // Female users have name field
          userName = otherUser.name || 'Unknown User';
        }
      }
      
      return {
        userId: otherUserId,
        name: userName,
        profileImage: profileImageUrl,
        callType: call.callType,
        status: call.status,
        duration: call.status === 'completed' ? call.duration : 0,
        billableDuration: call.status === 'completed' ? call.billableDuration : 0,
        createdAt: call.createdAt,
        callId: call._id
      };
    }));

    const total = await CallHistory.countDocuments({
      $or: [
        { callerId: userId },
        { receiverId: userId }
      ]
    });

    return res.json({
      success: true,
      data: transformedCalls,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip)
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// Get call statistics for female user
exports.getCallStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const stats = await CallHistory.aggregate([
      { 
        $match: { 
          $or: [
            { callerId: userId },
            { receiverId: userId }
          ],
          status: 'completed' 
        } 
      },
      {
        $group: {
          _id: null,
          totalCalls: { $sum: 1 },
          totalDuration: { $sum: '$duration' },
          totalCoinsSpent: { $sum: '$totalCoins' },
          totalEarnings: { $sum: '$femaleEarning' }
        }
      }
    ]);

    const result = stats.length > 0 ? stats[0] : {
      totalCalls: 0,
      totalDuration: 0,
      totalCoinsSpent: 0,
      totalEarnings: 0
    };

    return res.json({
      success: true,
      data: result
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};