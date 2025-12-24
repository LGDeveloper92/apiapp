const express = require('express');
const router = express.Router();
const Servers = require('../../models/serversModel');

router.post('/updateServer', async (req, res) => {
    const { name, description, urlServer } = req.body;
    const response = await Servers.findOneAndUpdate(
        {},
        { $set: { name, description, urlServer } },
        { new: true }
    )
    console.log(response)
    res.status(200).json({
        status: response ? true : false,
        msgStatus: "Server updated successfully",
        updatedData: {
            name : response?.name,
            description : response?.description,
            urlServer : response?.urlServer
        }
    });     
})

router.post('/getServer', async (req, res) => {
    try {
        const response = await Servers.findOne();
        console.log(response);
        return res.status(200).json({
            status: response ? true : false,
            msgStatus: response ? "Server data retrieved successfully" : "No server data found",
            serverData: response ? {
                name: response?.name,
                description: response?.description,
                urlServer: response?.urlServer,
                registrationDate: response?.registrationDate
            } : null
        });
    } catch (error) {
        return res.status(200).json({
            status: false,
            msgStatus: "An error occurred while retrieving server data",
            serverData: null
        });
    }
})

module.exports = router;