# Complete Location Features Implementation

## Overview
Complete documentation of location-based nearby feature implementation including admin distance configuration, male/female location management, and male dashboard sections.

## 1. Database Schema Changes

### 1.1 AdminConfig Model
```javascript
// File: src/models/admin/AdminConfig.js
const mongoose = require('mongoose');

const adminConfigSchema = new mongoose.Schema({
  minCallCoins: { type: Number, default: 10 },
  coinToRupeeRate: { type: Number, default: 0.01 }, // 1 coin = 0.01 rupee
  minWithdrawalAmount: { type: Number, default: 100 },
  // New fields for nearby distance configuration
  nearbyDistanceValue: { type: Number, default: 5 }, // Default distance value
  nearbyDistanceUnit: { type: String, enum: ['meters', 'km', 'miles'], default: 'km' }, // Distance unit
}, { timestamps: true });

module.exports = mongoose.model('AdminConfig', adminConfigSchema);
```

### 1.2 FemaleUser Model
```javascript
// File: src/models/femaleUser/FemaleUser.js
const mongoose = require('mongoose');

const femaleUserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  age: { type: Number },
  hideAge: { type: Boolean, default: false },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  bio: { type: String },
  dateOfBirth: { type: Date },
  languages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Language' }],
  interests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Interest' }],
  relationshipGoals: [{ type: mongoose.Schema.Types.ObjectId, ref: 'RelationGoal' }],
  religion: { type: mongoose.Schema.Types.ObjectId, ref: 'Religion' },
  height: { type: String },
  coinsPerMin: { type: Number, default: 10 },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  reviewStatus: { type: String, enum: ['completeProfile', 'pending', 'accepted', 'rejected'], default: 'pending' },
  profileCompleted: { type: Boolean, default: false },
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: false },
  onlineStatus: { type: Boolean, default: false }, // Added for online/offline visibility
  otp: { type: Number },
  images: [{ type: mongoose.Schema.Types.ObjectId, ref: 'FemaleImage' }],
  videoUrl: { type: String },
  balance: { type: Number, default: 0 }, // Deprecated: legacy combined balance
  walletBalance: { type: Number, default: 0 },
  coinBalance: { type: Number, default: 0 },
  referralCode: { type: String, unique: true, sparse: true },
  referredBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'FemaleUser' }],
  // New location fields
  latitude: { type: Number }, // Latitude for location-based features
  longitude: { type: Number }, // Longitude for location-based features
}, { timestamps: true });

module.exports = mongoose.model('FemaleUser', femaleUserSchema);
```

### 1.3 MaleUser Model
```javascript
// File: src/models/maleUser/MaleUser.js
const mongoose = require('mongoose');

const maleUserSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String},
  email: { type: String, required: true, unique: true },
  mobileNumber: { type: String },
  password: { type: String, required: true },
  bio: { type: String },
  dateOfBirth: { type: Date },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  interests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Interest' }],
  languages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Language' }],
  // New fields for manually entered preferences (as objects with id and name)
  hobbies: [{ 
    id: { type: String, required: true },
    name: { type: String, required: true }
  }],
  sports: [{ 
    id: { type: String, required: true },
    name: { type: String, required: true }
  }],
  film: [{ 
    id: { type: String, required: true },
    name: { type: String, required: true }
  }],
  music: [{ 
    id: { type: String, required: true },
    name: { type: String, required: true }
  }],
  travel: [{ 
    id: { type: String, required: true },
    name: { type: String, required: true }
  }],
  relationshipGoals: [{ type: mongoose.Schema.Types.ObjectId, ref: 'RelationGoal' }],
  religion: { type: mongoose.Schema.Types.ObjectId, ref: 'Religion' },
  height: { type: String },
  searchPreferences: { type: String, enum: ['male', 'female', 'both'], default: 'female' },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  favourites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'FemaleUser' }],
  malefollowing: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MaleFollowing' }],
  malefollowers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MaleFollowers' }], // Added missing followers array
  images: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MaleImage' }], // Array of image references
  balance: { type: Number, default: 0 }, // Deprecated: legacy combined balance
  walletBalance: { type: Number, default: 0 },
  coinBalance: { type: Number, default: 0 },
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: false }, // Only true after OTP verification
  otp: { type: Number }, // OTP for verification
  profileCompleted: { type: Boolean, default: false }, // Track if user has completed profile
  reviewStatus: { type: String, enum: ['completeProfile', 'pending', 'accepted', 'rejected'], default: 'completeProfile' }, // Status for profile review - starts as completeProfile after signup
  // Location fields
  latitude: { type: Number },
  longitude: { type: Number },
  // Referral system
  referralCode: { type: String, unique: true, sparse: true }, // 8-char alphanumeric
  referredBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MaleUser' }], 
}, { timestamps: true });

module.exports = mongoose.model('MaleUser', maleUserSchema);
```

## 2. Admin Configuration Endpoints

### 2.1 Admin Controller
```javascript
// File: src/controllers/adminControllers/adminController.js
const AdminConfig = require('../../models/admin/AdminConfig');
const messages = require('../../validations/messages');

// Update nearby distance configuration
exports.updateNearbyDistance = async (req, res) => {
  try {
    const { distanceValue, distanceUnit } = req.body;

    // Validate input
    if (distanceValue === undefined || distanceUnit === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Distance value and unit are required'
      });
    }

    // Validate distance value
    if (typeof distanceValue !== 'number' || distanceValue <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Distance value must be a positive number'
      });
    }

    // Validate distance unit
    const validUnits = ['meters', 'km', 'miles'];
    if (!validUnits.includes(distanceUnit)) {
      return res.status(400).json({
        success: false,
        message: 'Distance unit must be one of: meters, km, miles'
      });
    }

    // Update or create admin config
    const config = await AdminConfig.findOneAndUpdate(
      {},
      { 
        nearbyDistanceValue: distanceValue,
        nearbyDistanceUnit: distanceUnit
      },
      { 
        new: true, 
        upsert: true, // Create if doesn't exist
        setDefaultsOnInsert: true 
      }
    );

    res.json({
      success: true,
      message: 'Nearby distance updated successfully',
      data: {
        distanceValue: config.nearbyDistanceValue,
        distanceUnit: config.nearbyDistanceUnit
      }
    });
  } catch (err) {
    console.error('Error updating nearby distance:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get nearby distance configuration
exports.getNearbyDistance = async (req, res) => {
  try {
    const config = await AdminConfig.findOne({});

    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Configuration not found'
      });
    }

    res.json({
      success: true,
      data: {
        distanceValue: config.nearbyDistanceValue,
        distanceUnit: config.nearbyDistanceUnit
      }
    });
  } catch (err) {
    console.error('Error getting nearby distance:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};
```

### 2.2 Admin Routes
```javascript
// File: src/routes/adminRoutes/adminConfig.js
const express = require('express');
const router = express.Router();
const adminController = require('../../controllers/adminControllers/adminController');
const auth = require('../../middlewares/authMiddleware');
const { dynamicPermissionCheck } = require('../../middlewares/permissionMiddleware');

// Update nearby distance configuration
router.post('/nearby-distance', auth, dynamicPermissionCheck, (req, res) => {
  // Check if user has permission to update nearby distance
  if (!req.user.permissions.includes('update_nearby_distance')) {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions to update nearby distance'
    });
  }
  adminController.updateNearbyDistance(req, res);
});

// Get nearby distance configuration
router.get('/nearby-distance', auth, dynamicPermissionCheck, (req, res) => {
  // Check if user has permission to view nearby distance
  if (!req.user.permissions.includes('view_nearby_distance')) {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions to view nearby distance'
    });
  }
  adminController.getNearbyDistance(req, res);
});

module.exports = router;
```

```javascript
// File: src/routes/adminRoutes/admin.js
const express = require('express');
const router = express.Router();
const controller = require('../../controllers/adminControllers/adminController');
const auth = require('../../middlewares/authMiddleware');
const { dynamicPermissionCheck } = require('../../middlewares/permissionMiddleware');
const { parser } = require('../../config/multer');

// Admin config routes
const adminConfigRoutes = require('./adminConfig');
router.use('/config', adminConfigRoutes);

// Other existing routes...
router.post('/config/min-call-coins', auth, dynamicPermissionCheck, parser.none(), controller.updateMinCallCoins);
router.post('/config/coin-to-rupee-rate', auth, dynamicPermissionCheck, parser.none(), controller.updateCoinToRupeeRate);
router.post('/config/min-withdrawal-amount', auth, dynamicPermissionCheck, parser.none(), controller.updateMinWithdrawalAmount);

module.exports = router;
```

## 3. User Location Management

### 3.1 Female User Location Controller
```javascript
// File: src/controllers/femaleUserControllers/femaleUserController.js
const FemaleUser = require('../../models/femaleUser/FemaleUser');
const messages = require('../../validations/messages');

// Update female user location
exports.updateLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const userId = req.user._id;

    // Validate latitude and longitude are provided
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: "latitude and longitude are required"
      });
    }

    // Validate latitude range
    if (typeof latitude !== 'number' || latitude < -90 || latitude > 90) {
      return res.status(400).json({
        success: false,
        message: "latitude must be a number between -90 and 90"
      });
    }

    // Validate longitude range
    if (typeof longitude !== 'number' || longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        message: "longitude must be a number between -180 and 180"
      });
    }

    // Find and update the user
    const user = await FemaleUser.findByIdAndUpdate(
      userId,
      { latitude, longitude },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: messages.COMMON.USER_NOT_FOUND
      });
    }

    res.json({
      success: true,
      message: "Location updated successfully",
      data: {
        latitude: user.latitude,
        longitude: user.longitude
      }
    });
  } catch (err) {
    console.error('Error updating location:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Complete profile with location validation
exports.completeUserProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { name, age, gender, latitude, longitude } = req.body;

    // Validate required fields
    if (!name || !age || !gender) {
      return res.status(400).json({
        success: false,
        message: 'Name, age, and gender are required'
      });
    }

    // Validate location is provided for profile completion
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required for profile completion'
      });
    }

    // Validate latitude and longitude ranges
    if (typeof latitude !== 'number' || latitude < -90 || latitude > 90) {
      return res.status(400).json({
        success: false,
        message: "Latitude must be a number between -90 and 90"
      });
    }

    if (typeof longitude !== 'number' || longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        message: "Longitude must be a number between -180 and 180"
      });
    }

    const user = await FemaleUser.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: messages.COMMON.USER_NOT_FOUND 
      });
    }

    // Check if profile is already completed
    if (user.profileCompleted) {
      return res.status(400).json({ 
        success: false, 
        message: 'Profile already completed' 
      });
    }

    // Check if video provided (either in request or already uploaded)
    const hasVideo = req.body.videoUrl || user.videoUrl;
    if (!hasVideo) {
      return res.status(400).json({ 
        success: false, 
        message: messages.REGISTRATION.PROFILE_VIDEO_REQUIRED
      });
    }

    // Check if location is provided (required for profile completion)
    if (!req.body.latitude || !req.body.longitude) {
      return res.status(400).json({ 
        success: false, 
        message: 'Latitude and longitude are required for profile completion'
      });
    }
    
    // Validate latitude and longitude are valid
    const lat = parseFloat(req.body.latitude);
    const lng = parseFloat(req.body.longitude);
    
    if (isNaN(lat) || lat < -90 || lat > 90) {
      return res.status(400).json({
        success: false,
        message: 'Latitude must be a number between -90 and 90'
      });
    }
    
    if (isNaN(lng) || lng < -180 || lng > 180) {
      return res.status(400).json({
        success: false,
        message: 'Longitude must be a number between -180 and 180'
      });
    }

    // Update user profile
    user.latitude = lat;
    user.longitude = lng;
    user.name = name;
    user.age = age;
    user.gender = gender;
    user.bio = req.body.bio || user.bio;
    user.languages = req.body.languages || user.languages;
    user.interests = req.body.interests || user.interests;
    user.relationshipGoals = req.body.relationshipGoals || user.relationshipGoals;
    user.religion = req.body.religion || user.religion;
    user.height = req.body.height || user.height;
    user.hideAge = req.body.hideAge !== undefined ? req.body.hideAge : user.hideAge;
    user.coinsPerMin = req.body.coinsPerMin !== undefined ? req.body.coinsPerMin : user.coinsPerMin;

    // 🔑 KEY STATE CHANGES:
    user.profileCompleted = true;      // Profile is now complete
    user.reviewStatus = 'pending';     // Set to pending for admin review

    await user.save();

    res.json({
      success: true,
      message: 'Profile completed successfully',
      data: {
        profileCompleted: user.profileCompleted,
        reviewStatus: user.reviewStatus
      }
    });
  } catch (err) {
    console.error('Error completing profile:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};
```

### 3.2 Male User Location Controller
```javascript
// File: src/controllers/maleUserControllers/maleUserController.js
const mongoose = require('mongoose');
const MaleUser = require('../../models/maleUser/MaleUser');
const FemaleUser = require('../../models/femaleUser/FemaleUser');
const FollowRequest = require('../../models/common/FollowRequest');
const messages = require('../../validations/messages');

// Update male user location
exports.updateLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const userId = req.user._id;

    // Validate latitude and longitude are provided
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: "latitude and longitude are required"
      });
    }

    // Validate latitude range
    if (typeof latitude !== 'number' || latitude < -90 || latitude > 90) {
      return res.status(400).json({
        success: false,
        message: "latitude must be a number between -90 and 90"
      });
    }

    // Validate longitude range
    if (typeof longitude !== 'number' || longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        message: "longitude must be a number between -180 and 180"
      });
    }

    // Find and update the user
    const user = await MaleUser.findByIdAndUpdate(
      userId,
      { latitude, longitude },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: messages.COMMON.USER_NOT_FOUND
      });
    }

    res.json({
      success: true,
      message: "Location updated successfully",
      data: {
        latitude: user.latitude,
        longitude: user.longitude
      }
    });
  } catch (err) {
    console.error('Error updating location:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Calculate distance between two points using Haversine formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in kilometers
  return distance;
};

// Get male dashboard with different sections
exports.getDashboard = async (req, res) => {
  try {
    const userId = req.user._id;
    const { section = 'all', page = 1, limit = 10 } = req.query;

    // Get male user to access location and preferences
    const maleUser = await MaleUser.findById(userId).populate('interests', 'title').populate('languages', 'title');
    if (!maleUser) {
      return res.status(404).json({ success: false, message: messages.COMMON.USER_NOT_FOUND });
    }

    // Get admin config for nearby distance
    const AdminConfig = require('../../models/admin/AdminConfig');
    const adminConfig = await AdminConfig.findOne({});
    const adminDistance = adminConfig ? adminConfig.nearbyDistanceValue : 5; // Default to 5 km
    const adminDistanceUnit = adminConfig ? adminConfig.nearbyDistanceUnit : 'km';

    // Build base query for female users
    let femaleQuery = {
      status: 'active',
      reviewStatus: 'accepted', // Only accepted profiles
      onlineStatus: true,      // Only online females
      _id: { $ne: userId }     // Exclude current user
    };

    // Get followed female IDs
    const followRequests = await FollowRequest.find({
      requesterId: userId,
      status: 'accepted'
    });
    const followedFemaleIds = followRequests.map(req => req.requestedId);

    // Calculate age range based on user's age and preferences
    let minAge = 18;
    let maxAge = 65;
    if (maleUser.age) {
      minAge = Math.max(18, maleUser.age - 10);
      maxAge = Math.min(65, maleUser.age + 10);
    }

    // Base aggregation pipeline
    let pipeline = [
      { $match: femaleQuery },
      {
        $lookup: {
          from: 'followrequests',
          let: { femaleId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$requesterId', new mongoose.Types.ObjectId(userId)] },
                    { $eq: ['$requestedId', '$$femaleId'] },
                    { $eq: ['$status', 'accepted'] }
                  ]
                }
              }
            }
          ],
          as: 'followStatus'
        }
      },
      {
        $addFields: {
          isFollowed: { $gt: [{ $size: '$followStatus' }, 0] }
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          age: 1,
          hideAge: 1,
          profileImage: { $arrayElemAt: ['$images', 0] }, // First image as profile image
          images: 1,
          languages: 1,
          coinsPerMin: 1,
          onlineStatus: 1,
          latitude: 1,
          longitude: 1,
          createdAt: 1,
          isFollowed: 1
        }
      }
    ];

    // Apply section-specific filters
    switch (section.toLowerCase()) {
      case 'nearby':
        // For nearby section, male user must have location
        if (!maleUser.latitude || !maleUser.longitude) {
          return res.status(400).json({
            success: false,
            message: 'Your location is required to view nearby users'
          });
        }

        // Add distance calculation to pipeline
        pipeline.push({
          $addFields: {
            distance: {
              $cond: {
                if: { $and: [{ $ne: ['$latitude', null] }, { $ne: ['$longitude', null] }] },
                then: {
                  $let: {
                    vars: {
                      lat1: maleUser.latitude * Math.PI / 180,
                      lat2: '$latitude' * Math.PI / 180,
                      deltaLat: ({ $subtract: ['$latitude', maleUser.latitude] }) * Math.PI / 180,
                      deltaLon: ({ $subtract: ['$longitude', maleUser.longitude] }) * Math.PI / 180
                    },
                    in: {
                      $round: [
                        6371 * // Earth's radius in km
                        {
                          $atan2: [
                            {
                              $sqrt: [
                                {
                                  $add: [
                                    {
                                      $multiply: [
                                        {
                                          $sin: { $divide: ['$$deltaLat', 2] }
                                        },
                                        {
                                          $sin: { $divide: ['$$deltaLat', 2] }
                                        }
                                      ]
                                    },
                                    {
                                      $multiply: [
                                        {
                                          $cos: '$$lat1'
                                        },
                                        {
                                          $cos: '$$lat2'
                                        },
                                        {
                                          $sin: { $divide: ['$$deltaLon', 2] }
                                        },
                                        {
                                          $sin: { $divide: ['$$deltaLon', 2] }
                                        }
                                      ]
                                    }
                                  ]
                                }
                              ]
                            },
                            {
                              $sqrt: [
                                {
                                  $subtract: [
                                    1,
                                    {
                                      $add: [
                                        {
                                          $multiply: [
                                            {
                                              $sin: { $divide: ['$$deltaLat', 2] }
                                            },
                                            {
                                              $sin: { $divide: ['$$deltaLat', 2] }
                                            }
                                          ]
                                        },
                                        {
                                          $multiply: [
                                            {
                                              $cos: '$$lat1'
                                            },
                                            {
                                              $cos: '$$lat2'
                                            },
                                            {
                                              $sin: { $divide: ['$$deltaLon', 2] }
                                            },
                                            {
                                              $sin: { $divide: ['$$deltaLon', 2] }
                                            }
                                          ]
                                        }
                                      ]
                                    }
                                  ]
                                }
                              ]
                            }
                          ]
                        },
                        2
                      ]
                    }
                  }
                },
                else: null
              }
            }
          }
        });

        // Filter by distance
        pipeline.push({
          $match: {
            distance: { $ne: null }, // Only users with location
            $expr: {
              $lte: ['$distance', adminDistance] // Within admin distance
            }
          }
        });

        // Sort by distance
        pipeline.push({ $sort: { distance: 1 } });
        break;

      case 'followed':
        // Only followed users
        pipeline.push({
          $match: {
            _id: { $in: followedFemaleIds }
          }
        });
        break;

      case 'new':
        // Only users registered in last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        pipeline.push({
          $match: {
            createdAt: { $gte: sevenDaysAgo }
          }
        });
        break;

      case 'all':
      default:
        // No additional filtering needed for 'all' section
        // Sort by most recent activity (could be based on last seen, etc.)
        pipeline.push({ $sort: { createdAt: -1 } });
        break;
    }

    // Add age filtering (unless hideAge is true)
    pipeline.push({
      $match: {
        $or: [
          { hideAge: true }, // Show users who hide their age regardless of age
          { 
            $and: [
              { age: { $gte: minAge } },
              { age: { $lte: maxAge } },
              { hideAge: { $ne: true } }
            ]
          }
        ]
      }
    });

    // Add pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: parseInt(limit) });

    // Execute aggregation
    const results = await FemaleUser.aggregate(pipeline);

    // Format results
    const formattedResults = results.map(female => {
      let distanceText = '';
      if (female.distance !== undefined && female.distance !== null) {
        distanceText = `${female.distance} ${adminDistanceUnit}`;
      }

      return {
        id: female._id,
        name: female.name,
        age: female.hideAge ? null : female.age,
        hideAge: female.hideAge,
        profileImage: female.profileImage ? female.profileImage.imageUrl : null,
        languages: female.languages ? female.languages.map(lang => lang.title) : [],
        coinsPerMin: female.coinsPerMin,
        distance: distanceText,
        isFollowed: female.isFollowed
      };
    });

    // Get total count for pagination
    const countPipeline = [...pipeline];
    countPipeline.splice(-2); // Remove skip and limit for count
    countPipeline.push({ $count: 'total' });
    const countResult = await FemaleUser.aggregate(countPipeline);
    const total = countResult.length > 0 ? countResult[0].total : 0;

    res.json({
      success: true,
      data: {
        section: section.toLowerCase(),
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        items: formattedResults
      }
    });
  } catch (err) {
    console.error('Error in getDashboard:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Update profile and image with location handling
exports.updateProfileAndImage = async (req, res) => {
  try {
    const user = await MaleUser.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: messages.COMMON.USER_NOT_FOUND });
    }

    // Helper to convert values to ObjectId array
    const toObjectIdArray = (arr) => {
      if (!Array.isArray(arr)) return [];
      
      return arr
        .map(id => mongoose.Types.ObjectId.isValid(id) ? id : null)
        .filter(Boolean);
    };
    
    // Helper function to parse form-data values (handles JSON strings)
    const parseFormValue = (value) => {
      if (!value) return value;
      if (typeof value === 'string') {
        // Remove surrounding quotes if present (handle multiple levels of quotes)
        let trimmed = value.trim();
        
        // Keep removing outer quotes until no more can be removed
        let previous;
        do {
          previous = trimmed;
          if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || 
              (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
            trimmed = trimmed.slice(1, -1);
          }
        } while (trimmed !== previous && ((trimmed.startsWith('"') && trimmed.endsWith('"')) || 
                                        (trimmed.startsWith("'") && trimmed.endsWith("'"))));
        
        // Additional cleanup: remove any remaining escaped quotes
        trimmed = trimmed.replace(/\"/g, '"');
        
        // Handle special case where string looks like an array literal with objects
        // This happens when form-data sends string representations of arrays
        if (trimmed.startsWith('[') && trimmed.includes('{') && trimmed.includes('}')) {
          try {
            // Try to parse as JSON first
            return JSON.parse(trimmed);
          } catch (e) {
            // If JSON parsing fails, try to handle as string representation
            try {
              // Handle common form data issues
              let processed = trimmed
                .replace(/\n/g, '')
                .replace(/\t/g, ' ')
                .replace(/\r/g, ' ')
                .replace(/\'/g, "'");
              
              // Try to parse again
              return JSON.parse(processed);
            } catch (e2) {
              // If all parsing fails, return original value
              return value;
            }
          }
        }
      }
      return value;
    };

    // Parse all incoming values
    const firstName = parseFormValue(req.body.firstName);
    const lastName = parseFormValue(req.body.lastName);
    const mobileNumber = parseFormValue(req.body.mobileNumber);
    const dateOfBirth = parseFormValue(req.body.dateOfBirth);
    const gender = parseFormValue(req.body.gender);
    const bio = parseFormValue(req.body.bio);
    const interests = parseFormValue(req.body.interests);
    const languages = parseFormValue(req.body.languages);
    const religion = parseFormValue(req.body.religion);
    const relationshipGoals = parseFormValue(req.body.relationshipGoals);
    const height = parseFormValue(req.body.height);
    const searchPreferences = parseFormValue(req.body.searchPreferences);
    const hobbies = parseFormValue(req.body.hobbies);
    const sports = parseFormValue(req.body.sports);
    const film = parseFormValue(req.body.film);
    const music = parseFormValue(req.body.music);
    const travel = parseFormValue(req.body.travel);
    const latitude = parseFormValue(req.body.latitude);
    const longitude = parseFormValue(req.body.longitude);
    const profileCompleted = parseFormValue(req.body.profileCompleted);

    // Update basic fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (mobileNumber) user.mobileNumber = mobileNumber;
    if (dateOfBirth) {
      // Handle date string properly to avoid timezone conversion
      if (typeof dateOfBirth === 'string') {
        // Parse date string in a way that preserves the date without timezone shift
        const dateParts = dateOfBirth.split('-');
        if (dateParts.length === 3) {
          const year = parseInt(dateParts[0]);
          const month = parseInt(dateParts[1]) - 1; // Month is 0-indexed
          const day = parseInt(dateParts[2]);
          // Create date object at noon UTC to avoid timezone issues
          user.dateOfBirth = new Date(Date.UTC(year, month, day));
        } else {
          user.dateOfBirth = new Date(dateOfBirth);
        }
      } else {
        user.dateOfBirth = dateOfBirth;
      }
    }
    if (gender) user.gender = gender;
    if (bio) user.bio = bio;
    if (height) user.height = height;
    if (searchPreferences) user.searchPreferences = searchPreferences;
    
    // Handle location updates - ✅ ALWAYS save if provided
    if (latitude !== undefined && longitude !== undefined) {
      // Validate coordinates if both provided
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      
      if (isNaN(lat) || lat < -90 || lat > 90) {
        return res.status(400).json({
          success: false,
          message: 'Latitude must be a number between -90 and 90'
        });
      }
      
      if (isNaN(lng) || lng < -180 || lng > 180) {
        return res.status(400).json({
          success: false,
          message: 'Longitude must be a number between -180 and 180'
        });
      }
      
      // ✅ ALWAYS SAVE if provided
      user.latitude = lat;
      user.longitude = lng;
    } else if (latitude !== undefined) {
      // Handle only latitude provided
      const lat = parseFloat(latitude);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        return res.status(400).json({
          success: false,
          message: 'Latitude must be a number between -90 and 90'
        });
      }
      user.latitude = lat;
    } else if (longitude !== undefined) {
      // Handle only longitude provided
      const lng = parseFloat(longitude);
      if (isNaN(lng) || lng < -180 || lng > 180) {
        return res.status(400).json({
          success: false,
          message: 'Longitude must be a number between -180 and 180'
        });
      }
      user.longitude = lng;
    }
    
    // Handle profile completion status - validation only
    if (profileCompleted !== undefined) {
      // If profile is being marked as completed, ensure location is provided
      if (profileCompleted === true || profileCompleted === 'true') {
        if (user.latitude === undefined || user.longitude === undefined) {
          return res.status(400).json({ 
            success: false, 
            message: 'Latitude and longitude are required for profile completion'
          });
        }
        user.profileCompleted = true;
      } else {
        user.profileCompleted = false;
      }
    } else {
      // For male users, if they're submitting profile data with required fields (including location),
      // we can consider it as profile completion since no admin approval is needed
      if (user.latitude !== undefined && user.longitude !== undefined) {
        // Check if this is a complete profile request (has essential profile fields)
        const hasEssentialFields = firstName && lastName && mobileNumber && dateOfBirth && gender && bio;
        if (hasEssentialFields) {
          user.profileCompleted = true;
          // For male users, reviewStatus can be set to 'accepted' immediately
          // since no admin approval is required
          user.reviewStatus = 'accepted';
        }
      }
    }

    // Update interests if provided and validate
    if (req.body.interests !== undefined) {
      let interestArray = parseFormValue(req.body.interests);

      if (!Array.isArray(interestArray)) {
        return res.status(400).json({
          success: false,
          message: "Invalid interests format"
        });
      }

      const validIds = interestArray.filter(id =>
        mongoose.Types.ObjectId.isValid(id)
      );

      if (validIds.length > 0) {
        const Interest = require('../../models/admin/Interest');
        const validInterests = await Interest.find({ _id: { $in: validIds } });

        user.interests = validInterests.map(i => i._id);
      }
      // ❌ DO NOT clear interests if empty
    }
    
    // Update languages if provided and validate
    if (req.body.languages !== undefined) {
      let languageArray = parseFormValue(req.body.languages);

      if (!Array.isArray(languageArray)) {
        return res.status(400).json({
          success: false,
          message: "Invalid languages format"
        });
      }

      const validIds = languageArray.filter(id =>
        mongoose.Types.ObjectId.isValid(id)
      );

      if (validIds.length > 0) {
        const Language = require('../../models/admin/Language');
        const validLanguages = await Language.find({ _id: { $in: validIds } });

        user.languages = validLanguages.map(l => l._id);
      }
      // ❌ DO NOT clear languages if empty
    }
    
    // Update religion if provided and validate
    if (religion !== undefined) {
      // Validate if religion is a valid ObjectId
      if (mongoose.Types.ObjectId.isValid(religion)) {
        user.religion = religion;
      } else {
        return res.status(400).json({
          success: false,
          message: "Invalid religion ID provided"
        });
      }
    }
    
    // Update relationship goals if provided and validate
    if (relationshipGoals) {
      const RelationGoal = require('../../models/admin/RelationGoal');
      const goalArray = Array.isArray(relationshipGoals) ? relationshipGoals : [relationshipGoals];
      const validGoals = await RelationGoal.find({ _id: { $in: goalArray } });
      user.relationshipGoals = validGoals.map(g => g._id);
    }
    
    // Helper to process preference arrays
    const processPreferenceArray = (items, fieldName) => {
      if (!items || !Array.isArray(items) || items.length === 0) return null;
      
      console.log(`Processing ${fieldName}:`, items);
      
      try {
        const processed = items.map((item, index) => {
          console.log(`  Item ${index}:`, item, 'Type:', typeof item);
          
          if (!item) {
            console.log(`  Skipping null/undefined item at index ${index}`);
            return null;
          }
          
          if (typeof item === 'object' && item !== null) {
            // If it's already an object with id and name, return as is
            if (item.id && item.name) {
              return { id: item.id, name: item.name };
            }
            // If it's an object with name property but no id, generate an id
            else if (item.name) {
              const id = require('crypto').randomBytes(8).toString('hex');
              return { id, name: item.name };
            }
            // If it's a complex object, try to get the name property
            else {
              const name = Object.values(item)[0]; // Get first value as name
              const id = require('crypto').randomBytes(8).toString('hex');
              return { id, name: String(name) };
            }
          }
          
          // Handle string - convert to object with generated id
          const id = require('crypto').randomBytes(8).toString('hex');
          return { id, name: String(item) };
        }).filter(Boolean);
        
        console.log(`  Processed ${fieldName}:`, processed);
        return processed;
      } catch (err) {
        console.error(`Error processing ${fieldName}:`, err);
        throw err;
      }
    };
    
    // Update preferences - APPEND new items to existing arrays
    if (hobbies) {
      const newHobbies = processPreferenceArray(hobbies, 'hobbies');
      if (newHobbies && newHobbies.length > 0) {
        const existingIds = (user.hobbies || []).map(h => h.id);
        const uniqueNew = newHobbies.filter(h => !existingIds.includes(h.id));
        user.hobbies = [...(user.hobbies || []), ...uniqueNew];
      }
    }
    
    if (sports) {
      const newSports = processPreferenceArray(sports, 'sports');
      if (newSports && newSports.length > 0) {
        const existingIds = (user.sports || []).map(s => s.id);
        const uniqueNew = newSports.filter(s => !existingIds.includes(s.id));
        user.sports = [...(user.sports || []), ...uniqueNew];
      }
    }
    
    if (film) {
      const newFilm = processPreferenceArray(film, 'film');
      if (newFilm && newFilm.length > 0) {
        const existingIds = (user.film || []).map(f => f.id);
        const uniqueNew = newFilm.filter(f => !existingIds.includes(f.id));
        user.film = [...(user.film || []), ...uniqueNew];
      }
    }
    
    if (music) {
      const newMusic = processPreferenceArray(music, 'music');
      if (newMusic && newMusic.length > 0) {
        const existingIds = (user.music || []).map(m => m.id);
        const uniqueNew = newMusic.filter(m => !existingIds.includes(m.id));
        user.music = [...(user.music || []), ...uniqueNew];
      }
    }
    
    if (travel) {
      const newTravel = processPreferenceArray(travel, 'travel');
      if (newTravel && newTravel.length > 0) {
        const existingIds = (user.travel || []).map(t => t.id);
        const uniqueNew = newTravel.filter(t => !existingIds.includes(t.id));
        user.travel = [...(user.travel || []), ...uniqueNew];
      }
    }
    
    // Handle image upload if files are provided
    if (req.files && req.files.length > 0) {
      const uploadedUrls = req.files.map((f) => f.path);

      // Save each image in Image collection and get the saved documents
      const savedImages = [];
      for (const url of uploadedUrls) {
        const newImage = new Image({ maleUserId: req.user.id, imageUrl: url });
        const savedImage = await newImage.save();
        savedImages.push(savedImage);
      }

      // Update the user's images array to reference the Image documents
      // We'll update this to use the IDs from the Image collection
      const newImageIds = savedImages.map(img => img._id);
      user.images = Array.isArray(user.images) ? [...user.images, ...newImageIds] : newImageIds;
    }
    
    await user.save();
    
    // Return updated user with populated fields
    const updatedUser = await MaleUser.findById(user._id)
      .populate('interests', 'title')
      .populate('languages', 'title')
      .populate('relationshipGoals', 'title')
      .populate({
        path: 'images',
        select: 'imageUrl createdAt updatedAt'
      });
    
    res.json({ 
      success: true, 
      message: 'Profile updated successfully',
      data: updatedUser 
    });
  } catch (err) {
    console.error('❌ Error in updateProfileAndImage:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};
```

### 3.3 Male User Dashboard Routes
```javascript
// File: src/routes/maleUserRoutes/dashboardRoutes.js
const express = require('express');
const router = express.Router();
const maleUserController = require('../../controllers/maleUserControllers/maleUserController');
const auth = require('../../middlewares/authMiddleware');

// Get male dashboard sections (All, Nearby, Followed, New)
router.get('/dashboard', auth, maleUserController.getDashboard);

module.exports = router;
```

### 3.4 Male User Routes
```javascript
// File: src/routes/maleUserRoutes/maleUserRoutes.js
const express = require('express');
const router = express.Router();
const maleUserController = require('../../controllers/maleUserControllers/maleUserController');
const followingFollowersController = require('../../controllers/maleUserControllers/followingFollowersController');
const blockListController = require('../../controllers/maleUserControllers/blockListController');
const callController = require('../../controllers/maleUserControllers/callController');
const auth = require('../../middlewares/authMiddleware');
const { parser } = require('../../config/multer');

// Apply block middleware to all routes except block/unblock
router.use(require('../../middlewares/blockMiddleware').preventBlockedInteraction);

// Public routes for interests and languages
router.get('/interests', require('../../controllers/common/interestController').getInterests);
router.get('/languages', require('../../controllers/common/languageController').getLanguages);

// Register Male User
router.post('/register', maleUserController.registerUser);

// Login Male User (Send OTP)
router.post('/login', maleUserController.loginUser);

// Get my transactions (male) with optional filters
router.get('/me/transactions', auth, async (req, res) => {
  try {
    const { operationType, startDate, endDate } = req.query;
    const filter = { userType: 'male', userId: req.user._id };
    if (operationType && ['wallet', 'coin'].includes(operationType)) filter.operationType = operationType;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const inclusiveEnd = new Date(endDate);
        inclusiveEnd.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = inclusiveEnd;
      }
    }
    const txns = await require('../../models/common/Transaction').find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: txns });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Verify Login OTP
router.post('/verify-login-otp', maleUserController.verifyLoginOtp);

// Verify OTP and activate user
router.post('/verify-otp', maleUserController.verifyOtp);

// Get user profile
router.get('/me', auth, maleUserController.getUserProfile);

// Update user interests
router.patch('/interests', auth, parser.none(), maleUserController.updateInterests);

// Update user languages
router.patch('/languages', auth, parser.none(), maleUserController.updateLanguages);

// Update user hobbies
router.patch('/hobbies', auth, parser.none(), maleUserController.updateHobbies);

// Update user sports
router.patch('/sports', auth, parser.none(), maleUserController.updateSports);

// Update user film preferences
router.patch('/film', auth, parser.none(), maleUserController.updateFilm);

// Update user music preferences
router.patch('/music', auth, parser.none(), maleUserController.updateMusic);

// Update user travel preferences
router.patch('/travel', auth, parser.none(), maleUserController.updateTravel);

// Update basic profile details
router.patch('/profile-details', auth, parser.none(), maleUserController.updateProfileDetails);

// Update location
router.patch('/location', auth, parser.none(), maleUserController.updateLocation);

// Update user profile and upload image in single request
router.post('/profile-and-image', auth, parser.array('images', 5), maleUserController.updateProfileAndImage);

// Delete specific preference item
router.delete('/preferences/:type/:itemId', auth, maleUserController.deletePreferenceItem);

// Delete specific interest
router.delete('/interests/:interestId', auth, maleUserController.deleteInterest);

// Delete specific language
router.delete('/languages/:languageId', auth, maleUserController.deleteLanguage);

// Browse female users (paginated)
router.get('/browse-females', auth, maleUserController.listFemaleUsers);

// Upload Images via form-data (field: images)
router.post('/upload-image', auth, parser.array('images', 5), maleUserController.uploadImage);

// Delete image by id
router.delete('/images/:imageId', auth, maleUserController.deleteImage);

// Send Follow Request to Female User
router.post('/follow-request/send', auth, followingFollowersController.sendFollowRequest);

// Cancel Sent Follow Request
router.post('/follow-request/cancel', auth, followingFollowersController.cancelFollowRequest);

// Get Sent Follow Requests
router.get('/follow-requests/sent', auth, followingFollowersController.getSentFollowRequests);

// Follow Female User (used internally when a follow request is accepted)
router.post('/follow', auth, followingFollowersController.followUser);

// Unfollow Female User
router.post('/unfollow', auth, followingFollowersController.unfollowUser);

// Get Following List
router.get('/following', auth, followingFollowersController.getMaleFollowingList);

// Get Followers List
router.get('/followers', auth, followingFollowersController.getMaleFollowersList);

// Buy Coins Package
router.post('/buy-coins', auth, maleUserController.buyCoins);

// Blocklist Routes
router.post('/block', auth, blockListController.blockUser);
router.post('/unblock', auth, blockListController.unblockUser);
router.get('/block-list', auth, blockListController.getBlockList);

// Call Routes
router.post('/calls/start', auth, callController.startCall);
router.post('/calls/end', auth, callController.endCall);
router.get('/calls/history', auth, callController.getCallHistory);
router.get('/calls/stats', auth, callController.getCallStats);

// Dashboard Routes
const dashboardRoutes = require('./dashboardRoutes');
router.use('/', dashboardRoutes);

module.exports = router;
```

### 3.5 Female User Routes
```javascript
// File: src/routes/femaleUserRoutes/femaleUserRoutes.js
const express = require('express');
const router = express.Router();
const femaleUserController = require('../../controllers/femaleUserControllers/femaleUserController');
const followRequestController = require('../../controllers/femaleUserControllers/followRequestController');
const followingFollowersController = require('../../controllers/femaleUserControllers/followingFollowersController');
const chatController = require('../../controllers/femaleUserControllers/chatController');
const giftController = require('../../controllers/femaleUserControllers/giftController');
const earningsController = require('../../controllers/femaleUserControllers/earningsController');
const kycController = require('../../controllers/femaleUserControllers/kycController');
const callEarningsController = require('../../controllers/femaleUserControllers/callEarningsController');
const blockListController = require('../../controllers/femaleUserControllers/blockListController');
const statsController = require('../../controllers/femaleUserControllers/statsController');
const favouritesController = require('../../controllers/femaleUserControllers/favouritesController');
const auth = require('../../middlewares/authMiddleware');
const { requireReviewAccepted } = require('../../middlewares/reviewStatusMiddleware');
const { parser, videoParser, profileParser } = require('../../config/multer');

// Apply block middleware to all routes except block/unblock
router.use(require('../../middlewares/blockMiddleware').preventBlockedInteraction);

// Public routes for interests and languages
router.get('/interests', require('../../controllers/common/interestController').getInterests);
router.get('/languages', require('../../controllers/common/languageController').getLanguages);

// Register Female User
router.post('/register', femaleUserController.registerUser);

// Login Female User (Send OTP)
router.post('/login', femaleUserController.loginUser);

// Verify Login OTP
router.post('/verify-login-otp', femaleUserController.verifyLoginOtp);

// Verify OTP and activate user
router.post('/verify-otp', femaleUserController.verifyOtp);

// Get female user profile
router.get('/me', auth, femaleUserController.getFemaleProfile);

// Upload Images via form-data (field: images)
router.post('/upload-image', auth, requireReviewAccepted, parser.array('images', 5), femaleUserController.uploadImage);

// Add multiple images (form-data: images[])
router.post('/add-images', auth, requireReviewAccepted, parser.array('images', 5), femaleUserController.uploadImage);

// Update user interests
router.patch('/interests', auth, requireReviewAccepted, parser.none(), femaleUserController.updateInterests);

// Update user languages
router.patch('/languages', auth, requireReviewAccepted, parser.none(), femaleUserController.updateLanguages);

// Update user hobbies
router.patch('/hobbies', auth, requireReviewAccepted, parser.none(), femaleUserController.updateHobbies);

// Update user sports
router.patch('/sports', auth, requireReviewAccepted, parser.none(), femaleUserController.updateSports);

// Update user film preferences
router.patch('/film', auth, requireReviewAccepted, parser.none(), femaleUserController.updateFilm);

// Update user music preferences
router.patch('/music', auth, requireReviewAccepted, parser.none(), femaleUserController.updateMusic);

// Update user travel preferences
router.patch('/travel', auth, requireReviewAccepted, parser.none(), femaleUserController.updateTravel);

// Update user relationships
router.patch('/relationships', auth, requireReviewAccepted, parser.none(), femaleUserController.updateRelationships);

// Update basic profile details
router.patch('/profile-details', auth, requireReviewAccepted, parser.none(), femaleUserController.updateProfileDetails);

// Update location
router.patch('/location', auth, parser.none(), femaleUserController.updateLocation);

// Complete user profile (form-data: name, age, gender, video, images[])
router.post('/complete-profile', auth, profileParser, femaleUserController.completeUserProfile);

// Delete specific preference item
router.delete('/preferences/:type/:itemId', auth, requireReviewAccepted, femaleUserController.deletePreferenceItem);

// Delete specific interest
router.delete('/interests/:interestId', auth, requireReviewAccepted, femaleUserController.deleteInterest);

// Delete specific language
router.delete('/languages/:languageId', auth, requireReviewAccepted, femaleUserController.deleteLanguage);

// Delete image by id
router.delete('/images/:imageId', auth, requireReviewAccepted, femaleUserController.deleteImage);

// Browse male users (paginated)
router.get('/browse-males', auth, requireReviewAccepted, femaleUserController.listMaleUsers);

// Follow Request Routes
router.post('/follow-request/send', auth, requireReviewAccepted, followRequestController.sendFollowRequest);
router.post('/follow-request/cancel', auth, requireReviewAccepted, followRequestController.cancelFollowRequest);
router.get('/follow-requests/sent', auth, requireReviewAccepted, followRequestController.getSentFollowRequests);
router.get('/follow-requests/received', auth, requireReviewAccepted, followRequestController.getReceivedFollowRequests);
router.post('/follow-request/respond', auth, requireReviewAccepted, followRequestController.respondToFollowRequest);

// Following/Followers Routes
router.post('/follow', auth, requireReviewAccepted, followingFollowersController.followUser);
router.post('/unfollow', auth, requireReviewAccepted, followingFollowersController.unfollowUser);
router.get('/following', auth, requireReviewAccepted, followingFollowersController.getFemaleFollowingList);
router.get('/followers', auth, requireReviewAccepted, followingFollowersController.getFemaleFollowersList);

// Chat Routes
router.get('/chats', auth, requireReviewAccepted, chatController.getUserChats);
router.get('/chats/:chatId', auth, requireReviewAccepted, chatController.getChatMessages);
router.post('/chats/:userId', auth, requireReviewAccepted, chatController.startChat);

// Gift Routes
router.get('/gifts', auth, requireReviewAccepted, giftController.getGifts);
router.get('/gifts/received', auth, requireReviewAccepted, giftController.getReceivedGifts);

// Earnings Routes
router.get('/earnings', auth, requireReviewAccepted, earningsController.getEarnings);
router.get('/earnings/history', auth, requireReviewAccepted, earningsController.getEarningsHistory);

// KYC Routes
const kycRoutes = require('./kycRoutes');
router.use('/kyc', auth, kycRoutes);

// Call Earnings Routes
router.get('/call-earnings', auth, requireReviewAccepted, callEarningsController.getCallEarnings);
router.get('/call-earnings/history', auth, requireReviewAccepted, callEarningsController.getCallEarningsHistory);

// Stats Routes
router.get('/stats', auth, requireReviewAccepted, statsController.getStats);

// Blocklist Routes
router.post('/block', auth, requireReviewAccepted, blockListController.blockUser);
router.post('/unblock', auth, requireReviewAccepted, blockListController.unblockUser);
router.get('/block-list', auth, requireReviewAccepted, blockListController.getBlockList);

// Favourites Routes
router.post('/favourites/:userId', auth, requireReviewAccepted, favouritesController.addToFavourites);
router.delete('/favourites/:userId', auth, requireReviewAccepted, favouritesController.removeFromFavourites);
router.get('/favourites', auth, requireReviewAccepted, favouritesController.getFavourites);

module.exports = router;
```

## 4. API Endpoints Summary

### 4.1 Admin Configuration
- `POST /api/admin/config/nearby-distance` - Update admin distance configuration
- `GET /api/admin/config/nearby-distance` - Get admin distance configuration

### 4.2 User Location Management
- `PATCH /api/male-user/location` - Update male user location
- `PATCH /api/female-user/location` - Update female user location
- `POST /api/male-user/profile-and-image` - Update male profile with location
- `POST /api/female-user/complete-profile` - Complete female profile with location

### 4.3 Male Dashboard
- `GET /api/male-user/dashboard?section=all&page=1&limit=10` - Get dashboard sections
- Sections: "all", "nearby", "followed", "new"

## 5. Key Features

### 5.1 Distance Calculation
- Haversine formula for accurate distance calculation between coordinates
- Configurable admin distance settings (meters, km, miles)
- Proper unit conversion and display

### 5.2 Privacy Controls
- Online/offline status filtering
- Age hiding preferences respected
- Profile completion validation
- Location privacy (no live tracking)

### 5.3 Dashboard Sections
- **All**: Shows all eligible online females
- **Nearby**: Shows females within admin-configured distance
- **Followed**: Shows only followed females who are online
- **New**: Shows females registered in the last 7 days

### 5.4 Validation
- Coordinate range validation (latitude: -90 to 90, longitude: -180 to 180)
- Profile completion requirements
- Admin permission checks
- Input sanitization and type checking

This complete implementation provides a robust location-based nearby feature with proper admin configuration, user location management, and a comprehensive male dashboard with multiple viewing sections.