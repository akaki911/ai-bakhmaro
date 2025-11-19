const express = require('express');
const multer = require('multer');
const router = express.Router();
const { requireAssistantAuth } = require('../middleware/authz');
const gitWorkspaceManager = require('../services/git_workspace_manager');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Number(process.env.WORKSPACE_UPLOAD_LIMIT_MB || 100) * 1024 * 1024,
  },
});

router.post(
  '/upload',
  requireAssistantAuth,
  upload.single('archive'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'Upload field "archive" is required' });
      }

      const summary = await gitWorkspaceManager.replaceLocalWorkspaceFromZip(req.file.buffer, {
        preserveGit: req.body?.preserveGit !== 'false',
      });

      res.json({
        success: true,
        workspace: summary,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('�?O [Workspace Upload] Failed:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

module.exports = router;
