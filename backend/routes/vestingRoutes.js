import express from 'express';
import {createVesting,getAllVesting} from '../controllers/vestingController.js'

const router = express.Router();

router.route('/createVesting').post(createVesting);
router.route('/getAllVesting').get(getAllVesting);


export default router;