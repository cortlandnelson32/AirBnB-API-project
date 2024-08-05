const express = require('express');
const { Spot, Review, User, SpotImage, sequelize } = require('../../db/models')
const { requireAuth } = require('../../utils/auth');
const { check } = require('express-validator');
const { handleValidationErrors } = require('../../utils/validation');
const { process_params } = require('express/lib/router');
const router = express.Router();

//validate spots
const validateSpot = [
    check('address')
      .exists({ checkFalsy: true })
      .notEmpty()
      .withMessage('Street address is required'),
    check('city')
      .exists({ checkFalsy: true })
      .notEmpty()
      .withMessage('city is required'),
    check('state')
      .exists({ checkFalsy: true })
      .notEmpty()
      .withMessage('state is required'),
    check('country')
      .exists({ checkFalsy: true })
      .notEmpty()
      .withMessage('country is required'),
    check('lat')
      .exists({ checkFalsy: true })
      .notEmpty()
      .isFloat({
        min: -90,
        max: 90
      })
      .withMessage('Latitude must be within -90 and 90'),
    check('lng')
      .exists({ checkFalsy: true })
      .notEmpty()
      .isFloat({
        min: -180,
        max: 180
      })
      .withMessage('Latitude must be within -180 and 180'),
    check('name')
      .exists({ checkFalsy: true })
      .notEmpty()
      .isLength({max: 50})
      .withMessage("Name must be less than 50 characters"),
    check('description')
      .notEmpty()
      .withMessage('Description is required'),
    check('price')
      .exists({ checkFalsy: true })
      .notEmpty()
      //must be positive
      .isFloat({min: 0})
      .withMessage("Price per day must be a positive number"),
    handleValidationErrors
]

//Get all Spots
router.get('/', async (req, res)=> {
    //create query for preview Image to use in sequelize.literal within the attributes arrray
    const previewImageQuery = `(
        SELECT url FROM SpotImages
        WHERE SpotImages.spotId = spot.id
        LIMIT 1
        )`;
    
    //find all spots
    const spots = await Spot.findAll({
        include: [
            {
                model: Review,
                attributes: []
            },
            {
                model: SpotImage,
                attributes: []
            }
        ],
        attributes: [
            'id',
            'ownerId',
            'address',
            'city',
            'state',
            'country',
            'lat',
            'lng',
            'name',
            'description',
            'price',
            'createdAt',
            'updatedAt',
            [sequelize.fn('AVG', sequelize.col('Reviews.stars')), 'avgRating'],
            [sequelize.literal(previewImageQuery), 'previewImage']
        ]
    });
    
    //return results
    return res.json({Spots: spots});
});

//Get all Spots owned by the Current User
router.get('/current', requireAuth, async (req, res) => {
    //create query for preview Image to use in sequelize.literal within the attributes arrray
    const previewImageQuery = `(
        SELECT url FROM SpotImages
        WHERE SpotImages.spotId = spot.id
        LIMIT 1
        )`;
    
    //find all spots
    const spots = await Spot.findAll({
        where: {ownerId: req.user.id}, //current user
        include: [
            {
                model: Review,
                attributes: []
            },
            {
                model: SpotImage,
                attributes: []
            }
        ],
        attributes: [
            'id',
            'ownerId',
            'address',
            'city',
            'state',
            'country',
            'lat',
            'lng',
            'name',
            'description',
            'price',
            'createdAt',
            'updatedAt',
            [sequelize.fn('AVG', sequelize.col('Reviews.stars')), 'avgRating'],
            [sequelize.literal(previewImageQuery), 'previewImage']
        ],
        
        
    })

    return res.json({Spots: spots})
})

//Get details of a Spot from an id
router.get('/:spotId', async (req, res) => {
    const { spotId } = req.params;

    //check if spot exists or if spot belongs to current user
    if(!spot || spot.ownerId !== req.user.id) {
        return res.status(404).json({
            message: "Spot couldn't be found"
        })
    };

    //get spot by id
    const spot = await Spot.findByPk(spotId, {
        include: [
            {
                model: SpotImage,
                attributes:['id', 'url', 'preview']
            },
            {
                model: User,
                as: 'Owner',
                attributes: ['id', 'firstName', 'lastName']
            },
            {
                model: Review,
                attributes: []
            }

        ],
        attributes: [
            'id',
            'ownerId',
            'address',
            'city',
            'state',
            'country',
            'lat',
            'lng',
            'name',
            'description',
            'price',
            'createdAt',
            'updatedAt',
            [sequelize.fn('AVG', sequelize.col('Reviews.stars')), 'avgRating']
        ]  
    });

    //calculate number of reviews for specific spot
    const numReviews = await Review.count({
        where: {
            spotId: spotId
        }
    })

    
    //create data object
    const data= {
        id: spot.id,
        ownerId: spot.ownerId,
        address: spot.address,
        city: spot.city,
        state: spot.state,
        country: spot.country,
        lat: spot.lat,
        lng: spot.lng,
        name: spot.name,
        description: spot.description,
        price: spot.price,
        createdAt: spot.createdAt,
        updatedAt: spot.updatedAt,
        numReviews: numReviews,
        avgStarRating: spot.avgRating,
        SpotImages: spot.SpotImages,
        Owner: spot.Owner
    }

    //return data
    return res.json(data)
})

//create a spot
router.post('/', validateSpot, requireAuth, async (req, res) => {
    const {address, city, state, country, lat, lng, name, description, price } = req.body;
        
    //create new spot
    const newSpot = await Spot.create({
        ownerId: req.user.id,
        address,
        city,
        state,
        country,
        lat,
        lng,
        name,
        description,
        price
    });

    //return spot with 201 status code
    return res.status(201).json(newSpot)
});

//Add an Image to a Spot based on the Spot's id
router.post('/:spotId/images', requireAuth, async (req, res) => {
    const { spotId } = req.params;
    const {url, preview} = req.body;

    const spot = await Spot.findByPk(spotId)

    //check if spot exists or if spot belongs to current user
    if(!spot || spot.ownerId !== req.user.id) {
        return res.status(404).json({
            message: "Spot couldn't be found"
        })
    };
    
    //create new image
    const newImage = await SpotImage.create({
        spotId,
        url,
        preview
    });

    //make a little data object to res.json
    const data = {
        id: newImage.id,
        url: newImage.url,
        preview: newImage.preview
    }

    //return data with 201 status code
    return res.status(201).json(data)
});

//edit a spot
router.put('/:spotId', validateSpot, requireAuth, async (req, res) => {
    const { spotId } = req.params;
    const { address, city, state, country, lat, lng, name, description, price } = req.body;

    const spot = await Spot.findByPk(spotId);

    //check body validations errors
    //check routes/api/users.js validateSignUp array to make a better validation for spots


    //check if spot exists
    if(!spot) {
        return res.status(404).json({
            message: "Spot couldn't be found"
        })
    }

    //edit spot
    const updatedSpot = await spot.update({
        address,
        city,
        state,
        country, 
        lat,
        lng,
        name,
        description,
        price
    });
    

    return res.json(updatedSpot);
});

//delete a spot
router.delete('/:spotId', requireAuth, async (req, res) => {
    const { spotId } = req.params;

    const spot = await Spot.findByPk(spotId);

    //check if spot exists or if spot belongs to current user
    if(!spot || spot.ownerId !== req.user.id) {
        return res.status(404).json({
            message: "Spot couldn't be found"
        })
    };

    await spot.destroy();

    return res.json({
        "message": "Successfully deleted"
      });

})

module.exports = router;