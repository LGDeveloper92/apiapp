const express = require('express');
const router = express.Router();

// In-memory data storage
let data = [];

// Route to add data
router.post('/add', (req, res) => {
    const newItem = req.body;
    data.push(newItem);
    res.status(200).json({ message: 'Data added successfully', data });
});

// Route to delete data by index
router.post('/delete', (req, res) => {
    const { index } = req.body;
    if (index >= 0 && index < data.length) {
        data.splice(index, 1);
        res.status(200).json({ message: 'Data deleted successfully', data });
    } else {
        res.status(400).json({ message: 'Invalid index' });
    }
});

// Route to update data by index
router.post('/update', (req, res) => {
    const { index, updatedItem } = req.body;
    if (index >= 0 && index < data.length) {
        data[index] = updatedItem;
        res.status(200).json({ message: 'Data updated successfully', data });
    } else {
        res.status(400).json({ message: 'Invalid index' });
    }
});

// Route to query data
router.post('/query', (req, res) => {
    res.status(200).json({ message: 'Data retrieved successfully', data });
});

module.exports = router;