// Device Management Service for Role-based Authentication
const admin = require('../firebase');
const crypto = require('crypto');

class DeviceService {
  constructor() {
    if (admin.disabled) {
      this.db = null;
      console.warn('⚠️ [DeviceService] Firebase disabled - device management unavailable');
    } else {
      const { FieldValue } = require('firebase-admin/firestore');
      this.db = admin.firestore();
      this.FieldValue = FieldValue;
    }
    this.SALT = process.env.DEVICE_FINGERPRINT_SALT || 'bakhmaro-device-salt-2024';
  }

  // Generate device ID from credential or fallback to client fingerprint
  generateDeviceId(credentialId = null, clientId = null, uaHash = null) {
    if (credentialId) {
      return crypto.createHash('sha256')
        .update(credentialId, 'base64url')
        .digest('hex');
    }
    
    if (clientId && uaHash) {
      return crypto.createHash('sha256')
        .update(`${clientId}|${uaHash}`)
        .digest('hex');
    }
    
    throw new Error('Insufficient data to generate device ID');
  }

  // Create privacy-safe fingerprint hash
  hashFingerprint(fingerprint) {
    return crypto.createHash('sha256')
      .update(this.SALT + JSON.stringify(fingerprint))
      .digest('hex');
  }

  // Truncate IP for privacy (IPv4: /24, IPv6: /48)
  truncateIP(ip) {
    if (ip.includes(':')) { // IPv6
      const parts = ip.split(':');
      return parts.slice(0, 3).join(':') + '::';
    } else { // IPv4
      const parts = ip.split('.');
      return parts.slice(0, 3).join('.') + '.0';
    }
  }

  // Register a new device for a user
  async registerDevice({
    userId,
    clientId,
    fingerprint,
    uaInfo,
    credentialId = null,
    ip,
    aaguid = null,
    trustDevice = false
  }) {
    if (!this.db) {
      console.warn('⚠️ [DEVICE] Device registration skipped - Firebase disabled');
      return null;
    }
    
    try {
      const deviceId = this.generateDeviceId(credentialId, clientId, uaInfo.hash);
      const fingerprintHash = this.hashFingerprint(fingerprint);
      const truncatedIP = this.truncateIP(ip);
      
      // Gurulo operates with a single Super Admin profile
      const userRole = 'SUPER_ADMIN';
      
      const deviceData = {
        deviceId,
        primaryCredentialIdHash: credentialId ? 
          crypto.createHash('sha256').update(credentialId, 'base64url').digest('hex') : null,
        userId,
        rolesSnapshot: [userRole],
        clientId,
        fingerprintHash,
        uaHash: uaInfo.hash,
        aaguid,
        platform: uaInfo.platform || 'unknown',
        os: uaInfo.os || 'unknown',
        trusted: trustDevice,
        firstSeenAt: this.FieldValue.serverTimestamp(),
        lastSeenAt: this.FieldValue.serverTimestamp(),
        firstSeenIP: truncatedIP,
        lastSeenIP: truncatedIP,
        ipHistory: [truncatedIP],
        loginCount: 1,
        createdAt: this.FieldValue.serverTimestamp(),
        updatedAt: this.FieldValue.serverTimestamp()
      };

      await this.db.collection('devices').doc(deviceId).set(deviceData, { merge: true });
      
      console.log(`📱 [DEVICE] Registered device ${deviceId} for user ${userId} with role ${userRole}, trusted: ${trustDevice}`);
      return deviceId;
    } catch (error) {
      console.error('❌ [DEVICE] Registration error:', error);
      throw error;
    }
  }

  // Recognize device by client fingerprint
  async recognizeDevice(clientId, fingerprint, uaInfo) {
    if (!this.db) {
      return {
        recognized: false,
        device: null,
        suggestedAuthMethod: 'standard'
      };
    }
    
    try {
      const fingerprintHash = this.hashFingerprint(fingerprint);
      const deviceId = this.generateDeviceId(null, clientId, uaInfo.hash);
      
      const deviceDoc = await this.db.collection('devices').doc(deviceId).get();
      
      if (!deviceDoc.exists) {
        return {
          recognized: false,
          device: null,
          suggestedAuthMethod: 'register'
        };
      }
      
      const deviceData = deviceDoc.data();
      
      // Verify fingerprint match
      if (deviceData.fingerprintHash !== fingerprintHash) {
        console.warn('⚠️ [DEVICE] Fingerprint mismatch for device', deviceId);
        return {
          recognized: false,
          device: null,
          suggestedAuthMethod: 'register'
        };
      }
      
      // Determine auth method based on role and credentials
      let suggestedAuthMethod = 'password';
      if (deviceData.primaryCredentialIdHash) {
        suggestedAuthMethod = 'passkey';
      } else if (deviceData.rolesSnapshot.includes('SUPER_ADMIN')) {
        suggestedAuthMethod = 'passkey'; // Admin should use passkey
      }
      
      return {
        recognized: true,
        device: {
          deviceId: deviceData.deviceId,
          registeredRole: deviceData.rolesSnapshot[0] || 'SUPER_ADMIN',
          lastSeenAt: deviceData.lastSeenAt,
          trusted: deviceData.trusted,
          hasPasskey: !!deviceData.primaryCredentialIdHash
        },
        suggestedAuthMethod
      };
    } catch (error) {
      console.error('❌ [DEVICE] Recognition error:', error);
      return {
        recognized: false,
        device: null,
        suggestedAuthMethod: 'register'
      };
    }
  }

  // Update device on successful login
  async updateDeviceLogin(deviceId, ip, credentialId = null) {
    if (!this.db) {
      return;
    }
    
    try {
      const truncatedIP = this.truncateIP(ip);
      const updateData = {
        lastSeenAt: this.FieldValue.serverTimestamp(),
        lastSeenIP: truncatedIP,
        loginCount: this.FieldValue.increment(1),
        updatedAt: this.FieldValue.serverTimestamp()
      };
      
      // Add to IP history if new
      const deviceDoc = await this.db.collection('devices').doc(deviceId).get();
      if (deviceDoc.exists) {
        const currentIPs = deviceDoc.data().ipHistory || [];
        if (!currentIPs.includes(truncatedIP)) {
          updateData.ipHistory = this.FieldValue.arrayUnion(truncatedIP);
          // Keep only last 10 IPs
          if (currentIPs.length >= 10) {
            updateData.ipHistory = [...currentIPs.slice(-9), truncatedIP];
          }
        }
      }
      
      // Update credential if provided
      if (credentialId) {
        updateData.primaryCredentialIdHash = 
          crypto.createHash('sha256').update(credentialId, 'base64url').digest('hex');
      }
      
      await this.db.collection('devices').doc(deviceId).update(updateData);
      console.log(`📱 [DEVICE] Updated login for device ${deviceId}`);
    } catch (error) {
      console.error('❌ [DEVICE] Update login error:', error);
      throw error;
    }
  }

  // Set device trust status
  async setDeviceTrust(deviceId, trusted) {
    if (!this.db) {
      return;
    }
    
    try {
      await this.db.collection('devices').doc(deviceId).update({
        trusted,
        updatedAt: this.FieldValue.serverTimestamp()
      });
      console.log(`📱 [DEVICE] Set trust=${trusted} for device ${deviceId}`);
    } catch (error) {
      console.error('❌ [DEVICE] Set trust error:', error);
      throw error;
    }
  }

  // Get all devices for a user
  async getUserDevices(userId) {
    if (!this.db) {
      return [];
    }
    
    try {
      const snapshot = await this.db.collection('devices')
        .where('userId', '==', userId)
        .orderBy('lastSeenAt', 'desc')
        .get();

      const devices = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        devices.push({
          deviceId: doc.id,
          clientId: data.clientId,
          registeredRole: data.rolesSnapshot?.[0] || 'SUPER_ADMIN',
          firstSeenAt: data.firstSeenAt?.toDate() || new Date(),
          lastSeenAt: data.lastSeenAt?.toDate() || new Date(),
          firstSeenIP: data.firstSeenIP || 'N/A',
          uaInfo: data.uaInfo || {},
          credentialId: data.primaryCredentialIdHash ? 'present' : null,
          trusted: data.trusted || false
        });
      });

      console.log(`📱 [DEVICE] Found ${devices.length} devices for user ${userId}`);
      return devices;
    } catch (error) {
      console.error('❌ [DEVICE] Get user devices error:', error);
      throw error;
    }
  }

  // Remove a user's device
  async removeUserDevice(userId, deviceId) {
    if (!this.db) {
      return;
    }
    
    try {
      // Verify device belongs to user
      const deviceDoc = await this.db.collection('devices').doc(deviceId).get();
      
      if (!deviceDoc.exists) {
        throw new Error('Device not found');
      }

      const deviceData = deviceDoc.data();
      if (deviceData.userId !== userId) {
        throw new Error('Device does not belong to user');
      }

      // Soft delete - mark as removed instead of actual deletion for audit trail
      await this.db.collection('devices').doc(deviceId).update({
        removed: true,
        removedAt: this.FieldValue.serverTimestamp(),
        updatedAt: this.FieldValue.serverTimestamp()
      });

      console.log(`📱 [DEVICE] Removed device ${deviceId} for user ${userId}`);
    } catch (error) {
      console.error('❌ [DEVICE] Remove device error:', error);
      throw error;
    }
  }

}

module.exports = new DeviceService();