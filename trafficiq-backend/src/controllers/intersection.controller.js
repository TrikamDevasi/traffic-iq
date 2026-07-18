  /**
 * Intersection Controller
 * CRUD operations + geospatial nearby query + paginated listing.
 * All writes are admin-only; reads are authenticated viewers.
 */

const Intersection = require('../models/Intersection');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');

// -- List (paginated, filterable) ----------------------------------
// GET /intersections?page=1&limit=20&highway=AH-GN&isActive=true&search=Thaltej

async function listIntersections(req, res, next) {
  try {
    const page   = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit  = Math.min(100, parseInt(req.query.limit, 10) || 20);
    const skip   = (page - 1) * limit;

    const filter = {};
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
    if (req.query.highway)  filter.highway = { $regex: req.query.highway, $options: 'i' };
    if (req.query.search)   filter.name    = { $regex: req.query.search,  $options: 'i' };

    const [items, total] = await Promise.all([
      Intersection.find(filter).sort({ intersectionId: 1 }).skip(skip).limit(limit).lean(),
      Intersection.countDocuments(filter),
    ]);

    return ApiResponse.paginated(res, 'Intersections retrieved', items, { page, limit, total });
  } catch (err) {
    next(err);
  }
}

// -- Get single ----------------------------------------------------
// GET /intersections/:id   (intersectionId string, e.g. INT-001)

async function getIntersection(req, res, next) {
  try {
    const doc = await Intersection.findOne({ intersectionId: req.params.id });
    if (!doc) return ApiResponse.error(res, `Intersection ${req.params.id} not found`, 404);
    return ApiResponse.success(res, 'Intersection retrieved', doc);
  } catch (err) {
    next(err);
  }
}

// -- Nearby (geospatial) -------------------------------------------
// GET /intersections/nearby?lat=23.06&lng=72.54&radius=2000

async function getNearby(req, res, next) {
  try {
    const lat    = parseFloat(req.query.lat);
    const lng    = parseFloat(req.query.lng);
    const radius = parseInt(req.query.radius, 10) || 2000; // metres

    if (isNaN(lat) || isNaN(lng)) {
      return ApiResponse.error(res, 'lat and lng query params are required and must be numbers', 400);
    }

    const items = await Intersection.find({
      isActive: true,
      location: {
        $nearSphere: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: radius,
        },
      },
    }).lean();

    return ApiResponse.success(res, `${items.length} intersection(s) within ${radius}m`, items);
  } catch (err) {
    next(err);
  }
}

// -- Create (admin) ------------------------------------------------
// POST /intersections

async function createIntersection(req, res, next) {
  try {
    const doc = await Intersection.create(req.body);
    logger.info(`[IntersectionCtrl] Created: ${doc.intersectionId} by user ${req.user.id}`);
    return ApiResponse.success(res, 'Intersection created', doc, 201);
  } catch (err) {
    next(err);
  }
}

// -- Update (admin) ------------------------------------------------
// PUT /intersections/:id

async function updateIntersection(req, res, next) {
  try {
    const doc = await Intersection.findOneAndUpdate(
      { intersectionId: req.params.id },
      req.body,
      { new: true, runValidators: true },
    );
    if (!doc) return ApiResponse.error(res, `Intersection ${req.params.id} not found`, 404);
    logger.info(`[IntersectionCtrl] Updated: ${req.params.id} by user ${req.user.id}`);
    return ApiResponse.success(res, 'Intersection updated', doc);
  } catch (err) {
    next(err);
  }
}

// -- Delete (admin) ------------------------------------------------
// DELETE /intersections/:id

async function deleteIntersection(req, res, next) {
  try {
    const doc = await Intersection.findOneAndDelete({ intersectionId: req.params.id });
    if (!doc) return ApiResponse.error(res, `Intersection ${req.params.id} not found`, 404);
    logger.info(`[IntersectionCtrl] Deleted: ${req.params.id} by user ${req.user.id}`);
    return ApiResponse.success(res, 'Intersection deleted');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listIntersections,
  getIntersection,
  getNearby,
  createIntersection,
  updateIntersection,
  deleteIntersection,
};
