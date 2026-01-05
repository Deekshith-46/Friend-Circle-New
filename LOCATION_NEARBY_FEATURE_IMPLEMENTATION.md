# Location & Nearby Feature Implementation

## Overview

This document describes the complete implementation of the location-based nearby feature with the following components:

1. **Admin distance configuration** - Global distance setting for all users
2. **User location management** - Both male and female users can update location
3. **Online status control** - Only online females are visible
4. **Male dashboard sections** - All, Nearby, Followed, New sections

## Database Changes

### AdminConfig Model
Added two new fields:
- `nearbyDistanceValue`: Number (default: 5) - The distance value
- `nearbyDistanceUnit`: String (default: 'km', enum: ['m', 'km']) - Distance unit

### User Models
Added location fields to both models:
- `latitude`: Number - User's latitude
- `longitude`: Number - User's longitude

FemaleUser model already had `onlineStatus` field which is used for visibility control.

## API Endpoints

### Admin Configuration
- `GET /admin/config/nearby-distance` - Get current nearby distance settings
- `POST /admin/config/nearby-distance` - Update nearby distance settings

### Female User Location
- `PATCH /female-user/location` - Update female user location
- `POST /female-user/toggle-online-status` - Toggle online status (already existed)

### Male User Location
- `PATCH /male-user/location` - Update male user location

### Male Dashboard
- `GET /male-user/dashboard?section=all|nearby|followed|new&page=1&limit=10` - Get dashboard sections

## Implementation Details

### Distance Calculation
Uses the Haversine formula to calculate distance between two coordinates:
- Earth's radius: 6371 km
- Formula accounts for curvature of Earth
- Returns distance in kilometers

### Nearby Filtering Logic
1. Get male user's location
2. Get admin-configured distance limit
3. For each eligible female:
   - Calculate distance between male and female
   - Compare with admin distance (converting units if needed)
   - Include in results if within distance
4. Sort by distance (closest first)

### Section Logic

#### All Section
- Shows all online females matching base criteria
- Sorted by most recent activity

#### Nearby Section
- Shows only females within admin-configured distance
- Sorted by distance (closest first)

#### Followed Section
- Shows only females that the male is following
- Only online females

#### New Section
- Shows females registered in the last 7 days
- Only online females

### Profile Completion Requirement
- Both male and female users must provide latitude and longitude during profile completion
- Profile cannot be marked as complete without location coordinates
- Location validation ensures coordinates are within valid ranges:
  - Latitude: -90 to 90
  - Longitude: -180 to 180

### Visibility Rules
- Only users with `status: 'active'` and `reviewStatus: 'accepted'` are shown
- Only users with `onlineStatus: true` are shown
- Users that are blocked by either party are excluded
- Female age is hidden if `hideAge: true` (unless mutual follow)

## Security & Validation

### Location Validation
- Latitude must be between -90 and 90
- Longitude must be between -180 and 180
- Both coordinates must be provided

### Admin Distance Validation
- Distance value must be a positive number
- Unit must be either 'm' or 'km'

### Authentication
- All user endpoints require authentication
- Dashboard requires user to have location set

## Usage Flow

### Admin Setup
1. Admin logs in and sets nearby distance (e.g., 5 km)
2. This distance applies globally to all male users

### User Registration & Setup
1. Male user registers and completes profile
2. Female user registers and completes profile
3. Both users update their location using the location endpoints

### Daily Usage
1. Female user toggles online status to true
2. Male user accesses dashboard to see different sections
3. Nearby section shows only females within admin-configured distance

## Testing

The feature can be tested using the test script in `test/location_nearby_test.js` which demonstrates:
- Admin distance configuration
- Male and female location updates
- Online status toggling
- Dashboard section retrieval
- Distance-based filtering verification

## Privacy & Safety

- Location is saved only once during profile setup
- No live GPS tracking
- No exact distance shown to users
- Only public discovery data shown (name, age if not hidden, language, coins per minute, etc.)
- No wallet balance, KYC, exact location, or coordinates exposed
- Only online females are visible to maintain privacy

## Postman Testing

To test with Postman:
1. Set admin distance: `POST /admin/config/nearby-distance`
2. Update male location: `PATCH /male-user/location`
3. Update female location: `PATCH /female-user/location`
4. Toggle female online: `POST /female-user/toggle-online-status`
5. Get dashboard: `GET /male-user/dashboard?section=nearby`