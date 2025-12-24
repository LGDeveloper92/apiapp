const express = require('express');
const router = express.Router();
const User = require('../../models/usersModel');

router.post('/updateProfile', async (req, res) => {
    const { username, name, lastName } = req.body;
    
    const response = await User.findOneAndUpdate(
        { username: username },
        { $set: { name, lastName } },
        { new: true }
    )
    res.status(200).json({
        status: response.status === 1 ? true : false,
        msgStatus: "Profile updated successfully",
        updatedData: {
            username : response?.username,
            name : response?.name,
            lastName : response?.lastName
        }
    });     
})

router.post('/getProfile', async (req, res) => {

   try { 
    const { username } = req.body;
    console.log(username);
    const response = await User.findOne({ username });
     return res.status(200).json({
        status: response ? true : false,
        msgStatus: response ? "Profile data retrieved successfully" : "User not found",
        profileData: response ? {
            username : response?.username,
            name : response?.name,
            lastName : response?.lastName,
            email : response?.email
        } : null
    });
    } catch (error) {
        return res.status(200).json({
            status: false,
            msgStatus: "An error occurred while retrieving profile data",
            profileData: null
        });
    }

})



module.exports = router;