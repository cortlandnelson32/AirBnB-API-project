
const express = require("express");
const router = express.Router();

const { requireAuth } = require("../../utils/auth");

const { SpotImage, Spot } = require("../../db/models");

router.delete("/:imageId", requireAuth, async (req, res) => {
	const img = await SpotImage.findByPk(req.params.imageId);
	if (!img) {
		return res.status(404).json({
			message: "Spot Image couldn't be found",
		});
	}

    const spot = await Spot.findByPk(img.spotId);
	if (req.user.id !== spot.ownerId) {
		return res.status(403).json({
			message: "Forbidden",
		});
	};

	await img.destroy();
	return res.json({
		message: "Successfully deleted",
	});
});

module.exports = router;
