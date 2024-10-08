const express = require("express");
const { Op } = require("sequelize");
const router = express.Router();
const bcrypt = require("bcryptjs");
const { check } = require('express-validator');
const { handleValidationErrors } = require('../../utils/validation');

const { requireAuth } = require("../../utils/auth");

const { Review, User, Spot, ReviewImage, Booking } = require("../../db/models");

// validate the reviews
const validateReviews = [
  check('review')
    .exists({checkFalsy: true})
    .withMessage('Review text is required'),
  check('stars')
    .exists({checkFalsy: true})
    .isInt({min: 1, max: 5})
    .withMessage('Stars must be an integer from 1 to 5'),
  handleValidationErrors
];

//get all reviews of current user
router.get("/current", requireAuth, async (req, res) => {
	const userId = req.user.id;

	const reviews = await Review.findAll({
		where: {
			userId,
		},
		include: [
			{
				model: User,
				attributes: ["id", "firstName", "lastName"],
			},
			{
				model: Spot,
				attributes: [
					"id",
					"ownerId",
					"address",
					"city",
					"state",
					"country",
					"lat",
					"lng",
					"name",
					"price",
					"previewImage"
				],
			},
			{
				model: ReviewImage,
				attributes: ["id", "url"],
			},
		],
	});

	res.json({ Reviews: reviews });
});


//edit a review
router.put('/:reviewId', requireAuth, validateReviews, async (req, res, next) => {
  const userId = req.user.id;
  const {reviewId} = req.params;
  const review = await Review.findByPk(reviewId);
  if(!review) {
    return res.status(404).json({"message": "Review couldn't be found"})
  }
  if(userId !== review.dataValues.userId) {
    return res.status(403).json({"message":"Forbidden"})
  }
  const updatedReview = await review.update(req.body)
  return res.json(updatedReview)
});

//add an image to a review based on review's id
router.post("/:reviewId/images", requireAuth, async (req, res) => {
	const { user, params } = req;
  const { reviewId } = params;
	const { url } = req.body;
	const review = await Review.findByPk(req.params.reviewId);
	if (!review) {
		return res.status(404).json({
			message: "Review couldn't be found",
		});
	}

	if (Number(req.user.id) !== review.userId) {
    return res.status(403).json({ message: "Forbidden" });
  }

	const existingImages = await ReviewImage.count({ where: { reviewId } });
	if (existingImages >= 10) {
		return res.status(403).json({
			message: "Maximum number of images for this resource was reached",   

		});
	}
  const newImage = await ReviewImage.create({
		reviewId,
		url,
	}, {
		include: [{ model: Review }],
		attributes: ['id', 'url']
	});
	return res.status(201).json({
		id: newImage.id,
		url: newImage.url,
	});
});


//delete a review
router.delete("/:reviewId", requireAuth, async (req, res) => {
	const review = await Review.findByPk(req.params.reviewId);
	if (!review) {
		return res.status(404).json({
			message: "Review couldn't be found",
		});
	}
	if (Number(req.user.id) === review.userId) {
		await review.destroy();
		return res.json({
			message: "Successfully deleted",
		});
	} else {
		res.status(403).json({message: "Forbidden"})
	}
});

module.exports = router;
