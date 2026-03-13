const express = require('express');
const router  = express.Router();
const labourEntryController = require('../controllers/labourEntryController');
const authMiddleware        = require('../middleware/auth');

// ── Dropdown data ──
router.get('/active-labours', authMiddleware, labourEntryController.getActiveLabours);

// ── Admin approval queue ──
router.get('/pending-approvals', authMiddleware, labourEntryController.getPendingApprovals);

// ── Approve / Reject actions ──
router.post('/:id/approve', authMiddleware, labourEntryController.approveLabourEntry);
router.post('/:id/reject',  authMiddleware, labourEntryController.rejectLabourEntry);

// ── CRUD ──
router.get('/',    authMiddleware, labourEntryController.getLabourEntries);
router.get('/:id', authMiddleware, labourEntryController.getLabourEntryById);
router.post('/',   authMiddleware, labourEntryController.createLabourEntry);
router.put('/:id', authMiddleware, labourEntryController.updateLabourEntry);
router.delete('/:id', authMiddleware, labourEntryController.deleteLabourEntry);

module.exports = router;