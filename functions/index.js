
const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();

// Scheduled function to clean up old logs (runs daily at midnight UTC)
exports.cleanupOldLogs = functions.pubsub.schedule('0 0 * * *')
  .timeZone('UTC')
  .onRun(async (context) => {
    console.log('🧹 Starting log cleanup process...');
    
    try {
      // Calculate the cutoff date (90 days ago)
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90);
      const cutoffTimestamp = admin.firestore.Timestamp.fromDate(cutoffDate);
      
      console.log(`🗓️ Deleting logs older than: ${cutoffDate.toISOString()}`);
      
      // Query logs older than 90 days
      const oldLogsQuery = db.collection('logs')
        .where('timestamp', '<', cutoffTimestamp)
        .orderBy('timestamp')
        .limit(500); // Batch limit for safe deletion
      
      let totalDeleted = 0;
      let hasMore = true;
      
      while (hasMore) {
        const snapshot = await oldLogsQuery.get();
        
        if (snapshot.empty) {
          hasMore = false;
          break;
        }
        
        // Create a batch for deletion
        const batch = db.batch();
        
        snapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });
        
        // Execute the batch deletion
        await batch.commit();
        
        const batchSize = snapshot.docs.length;
        totalDeleted += batchSize;
        
        console.log(`🗑️ Deleted batch of ${batchSize} logs (total: ${totalDeleted})`);
        
        // If we got less than the limit, we're done
        if (batchSize < 500) {
          hasMore = false;
        }
        
        // Add a small delay between batches to avoid overwhelming Firestore
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      console.log(`✅ Log cleanup completed. Total logs deleted: ${totalDeleted}`);
      
      // Log the cleanup operation itself
      await db.collection('logs').add({
        timestamp: admin.firestore.Timestamp.now(),
        type: 'ACTION',
        component: 'LogCleanup',
        message: `Automated cleanup completed. Deleted ${totalDeleted} old logs.`,
        details: {
          cutoffDate: cutoffDate.toISOString(),
          deletedCount: totalDeleted
        }
      });
      
      return { success: true, deletedCount: totalDeleted };
      
    } catch (error) {
      console.error('❌ Error during log cleanup:', error);
      
      // Log the error to a separate collection for monitoring
      try {
        await db.collection('logs_errors').add({
          timestamp: admin.firestore.Timestamp.now(),
          type: 'CLEANUP_ERROR',
          message: 'Log cleanup function failed',
          error: error.message,
          stack: error.stack,
          details: {
            functionName: 'cleanupOldLogs',
            context: context
          }
        });
      } catch (logError) {
        console.error('❌ Failed to log cleanup error:', logError);
      }
      
      throw error;
    }
  });

// Manual trigger function for testing (can be called via Firebase Console or HTTP)
exports.manualLogCleanup = functions.https.onCall(async (data, context) => {
  console.log('🔧 Manual log cleanup triggered');
  
  // Check if user is authenticated and has admin role
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  try {
    // Get user role from Firestore
    const userDoc = await db.collection('users').doc(context.auth.uid).get();
    const userData = userDoc.data();
    
    if (!userData || (userData.role !== 'superAdmin' && userData.role !== 'SUPER_ADMIN')) {
      throw new functions.https.HttpsError('permission-denied', 'Only super admins can manually trigger log cleanup');
    }
    
    // Run the same cleanup logic
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);
    const cutoffTimestamp = admin.firestore.Timestamp.fromDate(cutoffDate);
    
    const oldLogsQuery = db.collection('logs')
      .where('timestamp', '<', cutoffTimestamp)
      .orderBy('timestamp')
      .limit(500);
    
    let totalDeleted = 0;
    let hasMore = true;
    
    while (hasMore) {
      const snapshot = await oldLogsQuery.get();
      
      if (snapshot.empty) {
        hasMore = false;
        break;
      }
      
      const batch = db.batch();
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      
      const batchSize = snapshot.docs.length;
      totalDeleted += batchSize;
      
      if (batchSize < 500) {
        hasMore = false;
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Log the manual cleanup
    await db.collection('logs').add({
      timestamp: admin.firestore.Timestamp.now(),
      type: 'ACTION',
      component: 'LogCleanup',
      message: `Manual cleanup completed by ${userData.email}. Deleted ${totalDeleted} old logs.`,
      userId: context.auth.uid,
      userEmail: userData.email,
      details: {
        cutoffDate: cutoffDate.toISOString(),
        deletedCount: totalDeleted,
        manual: true
      }
    });
    
    return { success: true, deletedCount: totalDeleted };
    
  } catch (error) {
    console.error('❌ Error during manual log cleanup:', error);
    
    await db.collection('logs_errors').add({
      timestamp: admin.firestore.Timestamp.now(),
      type: 'MANUAL_CLEANUP_ERROR',
      message: 'Manual log cleanup failed',
      error: error.message,
      userId: context.auth?.uid,
      details: { manual: true }
    });
    
    throw new functions.https.HttpsError('internal', `Cleanup failed: ${error.message}`);
  }
});
